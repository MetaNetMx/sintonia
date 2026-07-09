// api/transcribir.js
// Proxy server-side hacia ElevenLabs Speech-to-Text (Scribe). El cliente
// (src/voz/transcribir.js) manda { audioBase64, tipo, idioma } y recibe { texto }.
// La xi-api-key NUNCA sale al cliente.
//
// Nota: se usa el modelo 'scribe_v2' (scribe_v1 se depreca el 2026-07-09).

import {
  ELEVENLABS_API_KEY,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
} from './_lib/config.js';

const STT_URL = 'https://api.elevenlabs.io/v1/speech-to-text';
const MODELO_STT = 'scribe_v2';
const MAX_BYTES = 25 * 1024 * 1024; // 25 MB por nota de voz

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;

  // Sin key -> transcripcion no disponible (el cliente lo maneja con un aviso).
  if (!ELEVENLABS_API_KEY) {
    return responderError(res, 503, 'Transcripcion no disponible', 'sin_configuracion');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { audioBase64, tipo, idioma } = body;
  if (typeof audioBase64 !== 'string' || !audioBase64) {
    return responderError(res, 400, 'Falta el audio a transcribir');
  }

  let bytes;
  try {
    bytes = Buffer.from(audioBase64, 'base64');
  } catch {
    return responderError(res, 400, 'Audio no decodificable');
  }
  if (!bytes.length || bytes.length > MAX_BYTES) {
    return responderError(res, 400, 'Audio vacio o demasiado grande');
  }

  const mime = typeof tipo === 'string' && /^audio\//.test(tipo) ? tipo : 'audio/webm';
  const ext = (mime.split('/')[1] || 'webm').split(';')[0];

  try {
    const form = new FormData();
    form.append('file', new Blob([bytes], { type: mime }), `nota.${ext}`);
    form.append('model_id', MODELO_STT);
    form.append('language_code', typeof idioma === 'string' && idioma ? idioma : 'es');

    const upstream = await fetch(STT_URL, {
      method: 'POST',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
      body: form,
    });

    if (!upstream.ok) {
      console.error('[api/transcribir] ElevenLabs respondio', upstream.status);
      return responderError(res, 502, 'No se pudo transcribir el audio', 'fallo_proveedor');
    }

    const datos = await upstream.json();
    return responderJSON(res, 200, { texto: (datos && datos.text) || '' });
  } catch (err) {
    console.error('[api/transcribir] error de red hacia ElevenLabs:', err?.name || 'Error');
    return responderError(res, 502, 'No se pudo transcribir el audio', 'error_red');
  }
}
