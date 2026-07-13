// Sintesis de voz con ElevenLabs a traves del proxy serverless /api/tts.
// REGLA DURA: la key de ElevenLabs vive server-side; el cliente solo llama /api/tts.
// Si algo falla, lanzamos un error para que src/voz/tts.js degrade a Web Speech.

import { CONFIG } from '../config/app.js';

/**
 * Solicita audio sintetizado al proxy y devuelve un objeto Audio reproducible.
 * No reproduce por si mismo: quien llama decide cuando hacer audio.play().
 *
 * @param {Object} params
 * @param {string} params.texto   Texto a sintetizar.
 * @param {string} [params.voiceId] Identificador de la voz (clonada o de catalogo).
 * @param {'conversacion'|'meditacion'} [params.estilo] Estilo de locucion (modelo
 *   y ajustes de voz los resuelve el servidor; ver api/tts.js).
 * @returns {Promise<{ audio: HTMLAudioElement, revocar: () => void }>}
 * @throws {Error} Si no hay texto/voiceId, si la red falla o el proxy responde error.
 */
export async function sintetizarElevenLabs({ texto, voiceId, estilo }) {
  if (!texto || !texto.trim()) {
    throw new Error('No hay texto para sintetizar.');
  }
  // voiceId es opcional: si no se pasa, el servidor usa su voz por defecto.

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.endpoints.tts, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ texto, voiceId, estilo }),
    });
  } catch (error) {
    // Fallo de red: relanzamos para permitir la degradacion.
    throw new Error(`No se pudo contactar el servicio de voz: ${error.message}`);
  }

  if (!respuesta.ok) {
    let detalle = `HTTP ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo && cuerpo.error) detalle = cuerpo.error;
    } catch {
      // El cuerpo no era JSON; nos quedamos con el status.
    }
    throw new Error(`El servicio de voz respondio con error: ${detalle}`);
  }

  const blob = await respuesta.blob();
  if (!blob || blob.size === 0) {
    throw new Error('El servicio de voz devolvio audio vacio.');
  }

  const url = URL.createObjectURL(blob);
  const audio = new Audio(url);
  audio.preload = 'auto';

  // Liberamos el objeto URL cuando ya no se necesita para no fugar memoria.
  const revocar = () => URL.revokeObjectURL(url);
  audio.addEventListener('ended', revocar, { once: true });

  return { audio, revocar };
}
