// api/tts.js
// Proxy server-side hacia ElevenLabs Text-to-Speech.
// El cliente (src/voz/elevenlabs.js) manda { texto, voiceId } y recibe audio
// (audio/mpeg). La xi-api-key NUNCA sale al cliente.
//
// DEGRADACION (PRD §6): si falta la key o ElevenLabs falla, respondemos un
// error claro con JSON para que el cliente degrade a Web Speech API
// (src/voz/webspeech.js) sin romper la experiencia.

import {
  ELEVENLABS_API_KEY,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderError,
  leerBodyJSON,
  permitirPeticion,
} from './_lib/config.js';

const ELEVENLABS_URL = 'https://api.elevenlabs.io/v1/text-to-speech';
const MODELO_TTS = 'eleven_multilingual_v2'; // soporta es-MX
const MAX_TEXTO = 5000; // limite defensivo de caracteres
// Voz de catalogo por defecto (ultimo recurso). Se prefiere ELEVENLABS_VOICE_ID,
// el voiceId del cliente, o la primera voz valida de la cuenta (ver abajo).
const VOZ_DEFAULT = '21m00Tcm4TlvDq8ikWAM';
const VOCES_URL = 'https://api.elevenlabs.io/v1/voices';

// Cuando no se especifica voz, usamos la primera voz disponible de la cuenta,
// para no depender de un id fijo que quiza no exista. Se cachea en memoria.
let vozPorDefectoCache = null;
async function obtenerVozPorDefecto() {
  if (vozPorDefectoCache) return vozPorDefectoCache;
  try {
    const r = await fetch(VOCES_URL, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
    });
    if (r.ok) {
      const d = await r.json();
      const voces = Array.isArray(d?.voices) ? d.voices : [];
      // Preferimos una voz mexicana (es-MX); si no hay, la primera disponible.
      const esMx = (v) => {
        const l = v?.labels || {};
        return (l.accent || '').toLowerCase().includes('mex') || (l.locale || '').toLowerCase().includes('mx');
      };
      const elegida = voces.find(esMx) || voces[0];
      if (elegida?.voice_id) {
        vozPorDefectoCache = elegida.voice_id;
        return vozPorDefectoCache;
      }
    }
  } catch {
    /* si falla, caemos al id fijo */
  }
  return VOZ_DEFAULT;
}

// Primera voz de catalogo (premade), usable via API en cualquier plan (incluido
// el gratuito). Respaldo cuando la voz elegida requiere plan de pago.
let vozUsableCache = null;
async function obtenerVozUsable() {
  if (vozUsableCache) return vozUsableCache;
  try {
    const r = await fetch(VOCES_URL, {
      headers: { 'xi-api-key': ELEVENLABS_API_KEY, Accept: 'application/json' },
    });
    if (r.ok) {
      const d = await r.json();
      const voces = Array.isArray(d?.voices) ? d.voices : [];
      const premade = voces.find((v) => v.category === 'premade');
      if (premade?.voice_id) {
        vozUsableCache = premade.voice_id;
        return vozUsableCache;
      }
    }
  } catch {
    /* sin respaldo disponible */
  }
  return null;
}

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;
  if (!permitirPeticion(req, res, { ambito: 'tts', max: 30 })) return;

  // Sin key -> el cliente debe degradar a Web Speech.
  if (!ELEVENLABS_API_KEY) {
    return responderError(res, 503, 'Voz premium no disponible', 'sin_configuracion');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { texto } = body;

  // --- Validacion de entrada ---
  if (typeof texto !== 'string' || !texto.trim()) {
    return responderError(res, 400, 'Falta el "texto" a sintetizar');
  }
  if (texto.length > MAX_TEXTO) {
    return responderError(res, 400, 'El texto excede el limite permitido');
  }

  // Voz: la del cliente, o ELEVENLABS_VOICE_ID, o la primera voz de la cuenta.
  const voiceIdSolicitada =
    (typeof body.voiceId === 'string' && body.voiceId.trim()) ||
    process.env.ELEVENLABS_VOICE_ID ||
    '';
  const voiceId = voiceIdSolicitada || (await obtenerVozPorDefecto());

  // voiceId debe verse como un id simple (evita inyeccion en la ruta).
  if (!/^[A-Za-z0-9_-]{1,64}$/.test(voiceId)) {
    return responderError(res, 400, 'voiceId con formato invalido');
  }

  const pedirAudio = (voz) =>
    fetch(`${ELEVENLABS_URL}/${encodeURIComponent(voz)}`, {
      method: 'POST',
      headers: {
        'xi-api-key': ELEVENLABS_API_KEY,
        'Content-Type': 'application/json',
        Accept: 'audio/mpeg',
      },
      body: JSON.stringify({
        text: texto,
        model_id: MODELO_TTS,
        voice_settings: { stability: 0.5, similarity_boost: 0.75 },
      }),
    });

  try {
    let upstream = await pedirAudio(voiceId);

    // Voz no permitida en el plan actual (402/403; p. ej. voces de biblioteca
    // en plan gratuito): reintenta UNA vez con una voz de catalogo usable, para
    // dar voz natural en lugar de caer al respaldo robotico del navegador.
    if (!upstream.ok && (upstream.status === 402 || upstream.status === 403)) {
      const respaldo = await obtenerVozUsable();
      if (respaldo && respaldo !== voiceId) {
        console.error('[api/tts] voz no incluida en el plan; usando voz de catalogo');
        upstream = await pedirAudio(respaldo);
        if (upstream.ok) vozPorDefectoCache = respaldo;
      }
    }

    if (!upstream.ok) {
      // No reenviamos el cuerpo crudo del proveedor (puede traer detalles de
      // cuenta). Log minimo y error generico para que el cliente degrade.
      console.error('[api/tts] ElevenLabs respondio', upstream.status);
      return responderError(
        res,
        502,
        'No se pudo sintetizar la voz',
        'fallo_proveedor'
      );
    }

    const audio = Buffer.from(await upstream.arrayBuffer());
    res.status(200);
    res.setHeader('Content-Type', 'audio/mpeg');
    res.setHeader('Content-Length', String(audio.length));
    res.setHeader('Cache-Control', 'no-store');
    return res.send(audio);
  } catch (err) {
    console.error('[api/tts] error de red hacia ElevenLabs:', err?.name || 'Error');
    return responderError(res, 502, 'No se pudo sintetizar la voz', 'error_red');
  }
}
