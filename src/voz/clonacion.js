// Clonacion de voz: envia muestras al proxy serverless /api/voz-clonar
// (la key de ElevenLabs vive server-side) y ofrece helpers de grabacion
// con MediaRecorder. La voz es dato biometrico: solo se clona con consentimiento.

import { CONFIG } from '../config/app.js';

// Limite total de audio crudo por peticion. El proxy recibe JSON base64
// (~+33% de tamano) y las plataformas serverless limitan el cuerpo (~4.5 MB
// en Vercel), asi que acotamos aqui con margen.
const MAX_BYTES_TOTAL = 3 * 1024 * 1024;

// Convierte un Blob a base64 (sin el prefijo "data:...;base64,").
function blobABase64(blob) {
  return new Promise((resolve, reject) => {
    const lector = new FileReader();
    lector.onerror = () => reject(new Error('No se pudo leer la grabacion.'));
    lector.onloadend = () => {
      const resultado = String(lector.result || '');
      const coma = resultado.indexOf(',');
      resolve(coma >= 0 ? resultado.slice(coma + 1) : resultado);
    };
    lector.readAsDataURL(blob);
  });
}

/**
 * Envia muestras de audio al proxy para crear una voz clonada.
 * Contrato UNIFICADO con api/voz-clonar.js (hallazgo P2 de la auditoria):
 * JSON con muestras en base64 y consentimiento explicito.
 *
 * REQUISITO ETICO: verifica el consentimiento biometrico persistido ANTES de
 * enviar nada. Sin registro de consentimiento, no se clona.
 *
 * @param {Object} params
 * @param {Blob[]} params.muestras  Grabaciones de la voz de la persona.
 * @param {string} params.nombre    Nombre para identificar la voz.
 * @returns {Promise<{ voiceId: string }>}
 * @throws {Error} Si falta consentimiento, datos, o el proxy responde error.
 */
export async function clonarVoz({ muestras, nombre }) {
  if (!muestras || muestras.length === 0) {
    throw new Error('Se necesita al menos una muestra de audio para clonar la voz.');
  }
  if (!nombre || !nombre.trim()) {
    throw new Error('Falta el nombre para la voz clonada.');
  }

  // 1) Verificar el consentimiento persistido (dato biometrico, PRD §6).
  const consentimientos = await import('../datos/consentimientos.js');
  const consentimiento = await consentimientos.leerConsentimientoVoz();
  if (!consentimiento || consentimiento.otorgado !== true) {
    throw new Error('Falta el consentimiento explícito para clonar la voz.');
  }

  // 2) Validar tamano total antes de codificar.
  const totalBytes = muestras.reduce((suma, m) => suma + (m?.size || 0), 0);
  if (totalBytes > MAX_BYTES_TOTAL) {
    throw new Error('Las grabaciones superan el tamaño máximo permitido; graba muestras más cortas.');
  }

  // 3) Codificar a base64 (contrato JSON del proxy).
  const carga = await Promise.all(
    muestras.map(async (muestra, i) => ({
      nombreArchivo: `muestra-${i + 1}.${(muestra.type || 'audio/webm').split('/')[1].split(';')[0]}`,
      tipo: muestra.type || 'audio/webm',
      datosBase64: await blobABase64(muestra),
    }))
  );

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.endpoints.clonarVoz, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ nombre: nombre.trim(), consentimiento: true, muestras: carga }),
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

  let datos;
  try {
    datos = await respuesta.json();
  } catch (errorParse) {
    // La voz PUDO haberse creado en el proveedor; sin cuerpo legible no hay
    // id para revertirla (garantia pendiente server-side).
    throw new Error('El servicio de clonacion respondio en un formato inesperado.', {
      cause: errorParse,
    });
  }
  if (!datos || !datos.voiceId) {
    throw new Error('El servicio no devolvio un identificador de voz.');
  }

  // 4) Asociar el voiceId al consentimiento: imprescindible para poder borrar
  // la voz tambien en el proveedor al revocar (PRD §6). Si este guardado
  // falla, la voz recien creada quedaria HUERFANA en el proveedor (existiria
  // sin que la app conserve como borrarla), asi que se revierte la clonacion
  // via /api/voz-borrar antes de reportar el error.
  try {
    await consentimientos.asignarVoiceId(datos.voiceId);
  } catch (errorGuardado) {
    let revertida = false;
    try {
      const borrado = await fetch(CONFIG.endpoints.borrarVoz, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ voiceId: datos.voiceId }),
      });
      revertida = borrado.ok;
    } catch {
      // La revocacion remota tampoco respondio; se informa abajo.
    }
    // El voiceId viaja en el error: si la reversion fallo, es el UNICO rastro
    // de la voz huerfana (la key del proveedor es server-side; la persona no
    // tiene cuenta ahi desde la cual borrarla).
    const error = new Error(
      revertida
        ? 'No se pudo guardar la voz clonada en este dispositivo; se revirtió la clonación. Intenta de nuevo.'
        : `No se pudo guardar la voz clonada ni revertirla en el proveedor. Conserva este identificador para poder borrarla después: ${datos.voiceId}`,
      { cause: errorGuardado },
    );
    error.voiceId = datos.voiceId;
    throw error;
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
