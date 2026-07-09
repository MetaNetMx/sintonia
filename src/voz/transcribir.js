// Transcripcion de voz (voz -> texto) via el proxy /api/transcribir (ElevenLabs
// Scribe). La key vive server-side; el cliente solo manda el audio.

import { CONFIG } from '../config/app.js';

// Convierte un Blob de audio a base64 (sin el prefijo "data:...;base64,").
function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer el audio.'));
    lector.onloadend = () => {
      const resultado = String(lector.result || '');
      const coma = resultado.indexOf(',');
      resolve(coma >= 0 ? resultado.slice(coma + 1) : resultado);
    };
    lector.readAsDataURL(blob);
  });
}

/**
 * Transcribe una nota de voz a texto.
 * @param {Blob} audio  Grabacion (p. ej. la que devuelve iniciarGrabacion()).
 * @param {Object} [opciones]
 * @param {string} [opciones.idioma='es']  Codigo ISO-639-1.
 * @returns {Promise<string>} El texto transcrito.
 */
export async function transcribir(audio, { idioma = 'es' } = {}) {
  if (!audio || !audio.size) throw new Error('No hay audio para transcribir.');

  const audioBase64 = await blobABase64(audio);

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.endpoints.transcribir, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ audioBase64, tipo: audio.type || 'audio/webm', idioma }),
    });
  } catch (error) {
    throw new Error(`No se pudo contactar el servicio de transcripcion: ${error.message}`);
  }

  if (!respuesta.ok) {
    let detalle = `HTTP ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo && cuerpo.error) detalle = cuerpo.error;
    } catch {
      /* cuerpo no-JSON */
    }
    throw new Error(detalle);
  }

  const datos = await respuesta.json();
  return (datos && datos.texto) || '';
}
