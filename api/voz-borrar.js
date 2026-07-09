// api/voz-borrar.js
// Borrado REMOTO de una voz clonada en ElevenLabs (DELETE /v1/voices/{id}).
// Es la mitad server-side de la revocacion del consentimiento biometrico
// (PRD §6): borrarVoz() en el cliente limpia IndexedDB Y llama aqui para que
// la voz deje de existir tambien en el proveedor. Sin este paso, "borrar voz"
// seria una promesa falsa (hallazgo P1 de la auditoria externa 2026-07-08).

import {
  ELEVENLABS_API_KEY,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
  permitirPeticion,
} from './_lib/config.js';

const VOICES_URL = 'https://api.elevenlabs.io/v1/voices';

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;
  if (!permitirPeticion(req, res, { ambito: 'voz-borrar', max: 5 })) return;

  if (!ELEVENLABS_API_KEY) {
    return responderError(res, 503, 'Borrado de voz no disponible', 'sin_configuracion');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { voiceId } = body;
  if (typeof voiceId !== 'string' || !/^[A-Za-z0-9_-]{1,64}$/.test(voiceId)) {
    return responderError(res, 400, 'Falta un "voiceId" valido');
  }

  try {
    const upstream = await fetch(`${VOICES_URL}/${encodeURIComponent(voiceId)}`, {
      method: 'DELETE',
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
    });

    // 404 = la voz ya no existe en el proveedor: para efectos de revocacion,
    // el resultado deseado ya se cumple.
    if (upstream.ok || upstream.status === 404) {
      return responderJSON(res, 200, { borrado: true });
    }

    console.error('[api/voz-borrar] ElevenLabs respondio', upstream.status);
    return responderError(res, 502, 'No se pudo borrar la voz en el proveedor', 'fallo_proveedor');
  } catch (err) {
    console.error('[api/voz-borrar] error de red hacia ElevenLabs:', err?.name || 'Error');
    return responderError(res, 502, 'No se pudo borrar la voz en el proveedor', 'error_red');
  }
}
