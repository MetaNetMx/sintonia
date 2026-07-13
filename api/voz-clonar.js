// api/voz-clonar.js
// Proxy server-side hacia ElevenLabs Voice Cloning (/v1/voices/add).
// El cliente (src/voz/clonacion.js) manda { nombre, muestras } y recibe el
// voiceId resultante. La xi-api-key NUNCA sale al cliente.
//
// =====================================================================
// DATO BIOMETRICO — MANEJO CRITICO (PRD §2.2, §2.5, §6, §7)
// =====================================================================
// La voz es DATO BIOMETRICO. Clonarla requiere:
//   1. CONSENTIMIENTO explicito, informado y revocable ANTES de llamar aqui.
//      El flujo de consentimiento vive en src/voz/ConsentimientoVoz.jsx y se
//      registra en la store "consentimientos" (IndexedDB). Este endpoint NO es
//      el lugar donde se pide consentimiento: asume que YA se otorgo. Aun asi
//      exigimos una bandera explicita `consentimiento === true` como cinturon
//      de seguridad; sin ella, rechazamos.
//   2. BORRADO: el usuario puede revocar y borrar la voz en cualquier momento
//      (src/datos/borrar.js -> borrarVoz(), que debe llamar a un endpoint de
//      borrado en ElevenLabs -DELETE /v1/voices/{voiceId}- ademas de limpiar
//      IndexedDB). El voiceId se guarda local-first; el audio crudo de las
//      muestras NO debe persistirse mas de lo necesario.
//   3. MINIMIZACION: no registramos las muestras de audio en logs ni las
//      devolvemos. Solo se reenvian a ElevenLabs para el alta de la voz.
//
// FLUJO DE CLONADO EN ELEVENLABS:
//   POST https://api.elevenlabs.io/v1/voices/add
//   Content-Type: multipart/form-data
//   Campos: name (texto), files (uno o varios audios), description/labels opc.
//   Header: xi-api-key
//   Respuesta: { voice_id }
//
// Esta es una IMPLEMENTACION BASE con validaciones. El transporte de las
// muestras de audio desde el cliente puede evolucionar (base64 vs multipart
// directo). Aqui aceptamos muestras en base64 y las reempaquetamos como
// multipart/form-data hacia ElevenLabs usando FormData/Blob (Node 18+).

import {
  ELEVENLABS_API_KEY,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
  permitirPeticion,
} from './_lib/config.js';

const ELEVENLABS_ADD_URL = 'https://api.elevenlabs.io/v1/voices/add';
const MAX_MUESTRAS = 25;
const MAX_BYTES_POR_MUESTRA = 10 * 1024 * 1024; // 10 MB por muestra

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;
  if (!permitirPeticion(req, res, { ambito: 'voz-clonar', max: 3 })) return;

  if (!ELEVENLABS_API_KEY) {
    return responderError(res, 503, 'Clonacion de voz no disponible', 'sin_configuracion');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { nombre, muestras, consentimiento } = body;

  // --- Cinturon de seguridad: consentimiento explicito obligatorio ---
  // (El consentimiento informado real se gestiona en el cliente; aqui exigimos
  //  la afirmacion explicita para no clonar voz jamas sin ella.)
  if (consentimiento !== true) {
    return responderError(
      res,
      403,
      'Se requiere consentimiento explicito para clonar la voz',
      'sin_consentimiento'
    );
  }

  // --- Validacion de entrada ---
  if (typeof nombre !== 'string' || !nombre.trim() || nombre.length > 120) {
    return responderError(res, 400, 'Falta un "nombre" valido para la voz');
  }
  if (!Array.isArray(muestras) || muestras.length === 0) {
    return responderError(res, 400, 'Faltan "muestras" de audio');
  }
  if (muestras.length > MAX_MUESTRAS) {
    return responderError(res, 400, 'Demasiadas muestras de audio');
  }

  // Cada muestra: { nombreArchivo, tipo (mime), datosBase64 }.
  const archivos = [];
  for (const m of muestras) {
    if (!m || typeof m !== 'object' || typeof m.datosBase64 !== 'string') {
      return responderError(res, 400, 'Muestra de audio con formato invalido');
    }
    const tipo = typeof m.tipo === 'string' ? m.tipo : 'audio/mpeg';
    if (!/^audio\//.test(tipo)) {
      return responderError(res, 400, 'Las muestras deben ser audio');
    }
    let bytes;
    try {
      bytes = Buffer.from(m.datosBase64, 'base64');
    } catch {
      return responderError(res, 400, 'Muestra de audio no decodificable');
    }
    if (!bytes.length || bytes.length > MAX_BYTES_POR_MUESTRA) {
      return responderError(res, 400, 'Muestra de audio vacia o demasiado grande');
    }
    const nombreArchivo =
      typeof m.nombreArchivo === 'string' && m.nombreArchivo.trim()
        ? m.nombreArchivo.slice(0, 100)
        : `muestra-${archivos.length + 1}.mp3`;
    archivos.push({ nombreArchivo, tipo, bytes });
  }

  try {
    // Reempaqueta como multipart/form-data hacia ElevenLabs (Node 18+ trae
    // FormData/Blob globales).
    const form = new FormData();
    form.append('name', nombre.trim());
    form.append(
      'description',
      'Voz clonada con consentimiento explicito del usuario. Dato biometrico.'
    );
    // Etiqueta de PROPIEDAD (hallazgo Alta 2026-07-12): api/voz-borrar solo
    // acepta borrar voces clonadas que lleven esta marca de la app.
    form.append('labels', JSON.stringify({ app: 'sintonia' }));
    for (const a of archivos) {
      const blob = new Blob([a.bytes], { type: a.tipo });
      form.append('files', blob, a.nombreArchivo);
    }

    const upstream = await fetch(ELEVENLABS_ADD_URL, {
      method: 'POST',
      headers: {
        // No fijamos Content-Type: fetch pone el boundary del multipart.
        'xi-api-key': ELEVENLABS_API_KEY,
        Accept: 'application/json',
      },
      body: form,
    });

    if (!upstream.ok) {
      console.error('[api/voz-clonar] ElevenLabs respondio', upstream.status);
      return responderError(
        res,
        502,
        'No se pudo clonar la voz',
        'fallo_proveedor'
      );
    }

    const datos = await upstream.json();
    // Solo devolvemos el identificador; nunca las muestras ni la key.
    return responderJSON(res, 200, {
      voiceId: datos?.voice_id || null,
      nombre: nombre.trim(),
    });
  } catch (err) {
    console.error('[api/voz-clonar] error hacia ElevenLabs:', err?.name || 'Error');
    return responderError(res, 502, 'No se pudo clonar la voz', 'error_red');
  }
}
