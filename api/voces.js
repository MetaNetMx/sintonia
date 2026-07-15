// api/voces.js
// Lista las voces disponibles en la cuenta de ElevenLabs para que el cliente
// pueda ofrecer un selector. GET -> { voces: [{ voiceId, nombre, idioma }] }.
// La xi-api-key vive server-side.

import {
  ELEVENLABS_API_KEY,
  USO_PERSONAL,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  permitirPeticion,
} from './_lib/config.js';
import { esVozBorrable } from './voz-borrar.js';

const VOCES_URL = 'https://api.elevenlabs.io/v1/voices';

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['GET'])) return;
  if (!permitirPeticion(req, res, { ambito: 'voces', max: 30 })) return;

  if (!ELEVENLABS_API_KEY) {
    return responderError(res, 503, 'Voces no disponibles', 'sin_configuracion');
  }

  try {
    const upstream = await fetch(VOCES_URL, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
    });
    if (!upstream.ok) {
      console.error('[api/voces] ElevenLabs respondio', upstream.status);
      return responderError(res, 502, 'No se pudieron obtener las voces', 'fallo_proveedor');
    }
    const datos = await upstream.json();
    // Solo voces de Mexico (es-MX): acento mexicano o locale MX.
    const esMexicana = (v) => {
      const l = v?.labels || {};
      const acento = (l.accent || '').toLowerCase();
      const locale = (l.locale || '').toLowerCase();
      return acento.includes('mex') || locale.includes('mx');
    };
    const lista = Array.isArray(datos?.voices) ? datos.voices : [];
    const voces = lista.filter(esMexicana).map((v) => ({
      voiceId: v.voice_id,
      nombre: v.name,
      idioma: v?.labels?.language || null,
      acento: v?.labels?.accent || null,
    }));
    // Voces PROPIAS: clones creados por esta app (mismo criterio de
    // propiedad que voz-borrar). Permiten RECUPERAR la voz en un dispositivo
    // nuevo sin volver a grabar. SOLO en modo USO PERSONAL (hallazgo Critico
    // 2026-07-15): con varios usuarios en la misma cuenta, exponer estas
    // voces permitiria usar o borrar la voz de otra persona. Fail-closed.
    const propias = USO_PERSONAL
      ? lista
          .filter((v) =>
            esVozBorrable({ category: v.category, labels: v.labels, description: v.description })
          )
          .map((v) => ({ voiceId: v.voice_id, nombre: v.name }))
      : [];
    return responderJSON(res, 200, { voces, propias });
  } catch (err) {
    console.error('[api/voces] error de red hacia ElevenLabs:', err?.name || 'Error');
    return responderError(res, 502, 'No se pudieron obtener las voces', 'error_red');
  }
}
