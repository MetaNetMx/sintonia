// Clonacion de voz: envia muestras al proxy serverless /api/voz-clonar
// (la key de ElevenLabs vive server-side) y ofrece helpers de grabacion
// con MediaRecorder. La voz es dato biometrico: solo se clona con consentimiento.

import { CONFIG } from '../config/app.js';

/**
 * Envia muestras de audio al proxy para crear una voz clonada.
 * El cliente nunca ve la key: solo llama /api/voz-clonar.
 *
 * @param {Object} params
 * @param {Blob[]} params.muestras  Grabaciones de la voz de la persona.
 * @param {string} params.nombre    Nombre para identificar la voz.
 * @returns {Promise<{ voiceId: string }>}
 * @throws {Error} Si faltan datos o el proxy responde con error.
 */
export async function clonarVoz({ muestras, nombre }) {
  if (!muestras || muestras.length === 0) {
    throw new Error('Se necesita al menos una muestra de audio para clonar la voz.');
  }
  if (!nombre || !nombre.trim()) {
    throw new Error('Falta el nombre para la voz clonada.');
  }

  const formulario = new FormData();
  formulario.append('nombre', nombre);
  muestras.forEach((muestra, i) => {
    const ext = (muestra.type && muestra.type.split('/')[1]) || 'webm';
    formulario.append('muestras', muestra, `muestra-${i + 1}.${ext}`);
  });

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.endpoints.clonarVoz, {
      method: 'POST',
      body: formulario, // El navegador arma el Content-Type multipart con boundary.
    });
  } catch (error) {
    throw new Error(`No se pudo contactar el servicio de clonacion: ${error.message}`);
  }

  if (!respuesta.ok) {
    let detalle = `HTTP ${respuesta.status}`;
    try {
      const cuerpo = await respuesta.json();
      if (cuerpo && cuerpo.error) detalle = cuerpo.error;
    } catch {
      // Cuerpo no-JSON; nos quedamos con el status.
    }
    throw new Error(`El servicio de clonacion respondio con error: ${detalle}`);
  }

  const datos = await respuesta.json();
  if (!datos || !datos.voiceId) {
    throw new Error('El servicio no devolvio un identificador de voz.');
  }
  return { voiceId: datos.voiceId };
}

// ---------------------------------------------------------------------------
// Helpers de grabacion con MediaRecorder.
// ---------------------------------------------------------------------------

/**
 * Indica si el navegador puede grabar audio.
 * @returns {boolean}
 */
export function soportaGrabacion() {
  return (
    typeof navigator !== 'undefined' &&
    !!navigator.mediaDevices &&
    typeof navigator.mediaDevices.getUserMedia === 'function' &&
    typeof window !== 'undefined' &&
    typeof window.MediaRecorder !== 'undefined'
  );
}

/**
 * Elige un mimeType de audio soportado por el navegador.
 * @returns {string} mimeType o '' para que el navegador decida.
 */
function elegirMimeType() {
  if (typeof MediaRecorder === 'undefined' || !MediaRecorder.isTypeSupported) return '';
  const candidatos = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg;codecs=opus', 'audio/mp4'];
  return candidatos.find((t) => MediaRecorder.isTypeSupported(t)) || '';
}

/**
 * Inicia una grabacion de audio. Devuelve un control para detenerla,
 * que resuelve con el Blob resultante.
 *
 * @returns {Promise<{ detener: () => Promise<Blob>, cancelar: () => void }>}
 * @throws {Error} Si no hay soporte o se niega el permiso de microfono.
 */
export async function iniciarGrabacion() {
  if (!soportaGrabacion()) {
    throw new Error('Este navegador no permite grabar audio.');
  }

  const flujo = await navigator.mediaDevices.getUserMedia({ audio: true });
  const mimeType = elegirMimeType();
  const grabadora = new MediaRecorder(flujo, mimeType ? { mimeType } : undefined);
  const fragmentos = [];

  grabadora.addEventListener('dataavailable', (evento) => {
    if (evento.data && evento.data.size > 0) fragmentos.push(evento.data);
  });

  grabadora.start();

  // Libera el microfono al terminar.
  const soltarFlujo = () => flujo.getTracks().forEach((pista) => pista.stop());

  return {
    detener: () =>
      new Promise((resolver) => {
        grabadora.addEventListener(
          'stop',
          () => {
            soltarFlujo();
            const tipo = grabadora.mimeType || mimeType || 'audio/webm';
            resolver(new Blob(fragmentos, { type: tipo }));
          },
          { once: true },
        );
        if (grabadora.state !== 'inactive') grabadora.stop();
      }),
    cancelar: () => {
      if (grabadora.state !== 'inactive') grabadora.stop();
      soltarFlujo();
    },
  };
}
