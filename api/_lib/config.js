// api/_lib/config.js
// Configuracion y utilidades compartidas por las funciones serverless (/api/*).
// REGLA DURA (PRD §2.5 / §7): ningun secreto vive en el cliente. Estas claves
// se leen SOLO desde process.env en el servidor y NUNCA se devuelven ni se
// registran en logs. Cualquier variable con prefijo VITE_ quedaria embebida en
// el bundle del navegador: por eso estas NO lo llevan.

// --- Lectura de variables de entorno (server-side) ---

// Clave de Anthropic (IA de acompanamiento).
export const ANTHROPIC_API_KEY = process.env.ANTHROPIC_API_KEY || '';

// Modelo por defecto. El cliente NO puede imponer un modelo arbitrario;
// solo puede pedir uno de la lista blanca (ver MODELOS_PERMITIDOS).
export const ANTHROPIC_MODEL = process.env.ANTHROPIC_MODEL || 'claude-sonnet-5';

// Clave de ElevenLabs (voz / TTS / clonacion).
export const ELEVENLABS_API_KEY = process.env.ELEVENLABS_API_KEY || '';

// Modo USO PERSONAL (fail-closed, hallazgo Critico 2026-07-15): funciones que
// asumen UN solo usuario en la cuenta (p. ej. "recuperar mi voz", que expone
// las voces clonadas de la cuenta) solo se activan con esta bandera explicita.
// En cualquier despliegue sin ella, esas funciones quedan APAGADAS: la
// etiqueta app=sintonia prueba que la app creo la voz, no de quien es.
export const USO_PERSONAL = process.env.SINTONIA_USO_PERSONAL === '1';

// Lista blanca de modelos que el cliente puede solicitar de forma explicita.
// Si pide algo fuera de esta lista, se ignora y se usa ANTHROPIC_MODEL.
export const MODELOS_PERMITIDOS = [
  'claude-sonnet-5', // equilibrado (por defecto)
  'claude-opus-4-8', // maxima profundidad
  'claude-haiku-4-5-20251001', // rapido / ligero
];

// Resuelve el modelo a usar: respeta la peticion del cliente solo si esta en
// la lista blanca; de lo contrario cae al modelo por defecto del entorno.
export function resolverModelo(modeloSolicitado) {
  if (modeloSolicitado && MODELOS_PERMITIDOS.includes(modeloSolicitado)) {
    return modeloSolicitado;
  }
  return ANTHROPIC_MODEL;
}

// --- CORS mismo-origen ---
// Las funciones viven en el mismo dominio que la app (Vercel), asi que no
// necesitamos abrir CORS a terceros. Rechazamos peticiones cuyo Origin no
// coincida con el host, para evitar uso cruzado desde otros sitios.
export function aplicarCorsMismoOrigen(req, res) {
  const origin = req.headers.origin;
  const host = req.headers.host;

  // Los navegadores SIEMPRE envian Origin en peticiones de escritura (POST y
  // el preflight OPTIONS); solo las lecturas same-origin (GET/HEAD de fetch o
  // navegacion) pueden llegar sin el. Una escritura sin Origin viene de un
  // cliente no-navegador (curl, script) y se rechaza (hallazgo P2 de la
  // auditoria: antes se permitia cualquier peticion sin Origin).
  // HONESTIDAD TECNICA: Origin es falsificable fuera del navegador; esto sube
  // la barrera pero NO sustituye rate limiting de plataforma ni autenticacion
  // (ver deuda en PRD §13 antes de exponer llaves reales a trafico publico).
  if (!origin) {
    return req.method === 'GET' || req.method === 'HEAD';
  }

  let originHost = '';
  try {
    originHost = new URL(origin).host;
  } catch {
    originHost = '';
  }

  if (originHost && host && originHost === host) {
    // Mismo origen: eco del Origin para que el navegador acepte la respuesta.
    res.setHeader('Access-Control-Allow-Origin', origin);
    res.setHeader('Vary', 'Origin');
    res.setHeader('Access-Control-Allow-Methods', 'POST, OPTIONS');
    res.setHeader('Access-Control-Allow-Headers', 'Content-Type');
    return true;
  }

  // Origen distinto: no autorizado.
  return false;
}

// --- Helpers de respuesta JSON ---

export function responderJSON(res, status, cuerpo) {
  res.status(status);
  res.setHeader('Content-Type', 'application/json; charset=utf-8');
  res.send(JSON.stringify(cuerpo));
}

// Respuesta de error homogenea. IMPORTANTE: nunca incluir el valor de una key
// ni volcar el error crudo del proveedor si pudiera contener datos sensibles.
export function responderError(res, status, mensaje, detalle) {
  const cuerpo = { error: mensaje };
  if (detalle) cuerpo.detalle = String(detalle);
  return responderJSON(res, status, cuerpo);
}

// --- Limite de peticiones (rate limiting) ---
// Limitador en memoria por IP y por endpoint. HONESTIDAD TECNICA: en serverless
// cada instancia tiene su propia memoria, asi que esto es "mejor esfuerzo"; no
// sustituye un WAF / rate limiting de plataforma (p. ej. Vercel Firewall) ni
// autenticacion. Mitiga abuso casual y bucles accidentales que quemarian las
// claves (hallazgo P1 de la auditoria externa 2026-07-08).

const ventanas = new Map(); // clave "ambito:ip" -> { inicio, cuenta }
const MAX_ENTRADAS_VENTANAS = 10_000;

function ipDePeticion(req) {
  const reenviada = req.headers['x-forwarded-for'];
  if (typeof reenviada === 'string' && reenviada.length) {
    return reenviada.split(',')[0].trim();
  }
  return req.socket?.remoteAddress || 'desconocida';
}

/**
 * Permite o rechaza la peticion segun una ventana deslizante por IP.
 * Devuelve true si puede continuar; si no, responde 429 y devuelve false.
 * @param {object} req
 * @param {object} res
 * @param {object} [opciones]
 * @param {string} [opciones.ambito='global']  Nombre del endpoint.
 * @param {number} [opciones.max=30]           Peticiones permitidas por ventana.
 * @param {number} [opciones.ventanaMs=60000]  Duracion de la ventana.
 */
export function permitirPeticion(req, res, { ambito = 'global', max = 30, ventanaMs = 60_000 } = {}) {
  const clave = `${ambito}:${ipDePeticion(req)}`;
  const ahora = Date.now();

  // Evita crecimiento sin limite del mapa en instancias longevas.
  if (ventanas.size > MAX_ENTRADAS_VENTANAS) {
    for (const [k, v] of ventanas) {
      if (ahora - v.inicio >= ventanaMs) ventanas.delete(k);
    }
    if (ventanas.size > MAX_ENTRADAS_VENTANAS) ventanas.clear();
  }

  const ventana = ventanas.get(clave);
  if (!ventana || ahora - ventana.inicio >= ventanaMs) {
    ventanas.set(clave, { inicio: ahora, cuenta: 1 });
    return true;
  }

  ventana.cuenta += 1;
  if (ventana.cuenta > max) {
    res.setHeader('Retry-After', String(Math.ceil((ventana.inicio + ventanaMs - ahora) / 1000)));
    responderError(res, 429, 'Demasiadas peticiones; intenta de nuevo en un momento');
    return false;
  }
  return true;
}

// Valida el metodo HTTP. Devuelve true si es valido; si no, responde 405 y false.
// Maneja tambien el preflight OPTIONS (responde 204).
export function validarMetodo(req, res, metodosPermitidos) {
  if (req.method === 'OPTIONS') {
    res.status(204).end();
    return false;
  }
  if (!metodosPermitidos.includes(req.method)) {
    res.setHeader('Allow', metodosPermitidos.join(', '));
    responderError(res, 405, 'Metodo no permitido');
    return false;
  }
  return true;
}

// Lee y parsea el body JSON de forma segura. En el runtime de Vercel/Node,
// req.body suele venir ya parseado; si viene como string o stream, lo cubrimos.
export async function leerBodyJSON(req) {
  if (req.body && typeof req.body === 'object') return req.body;
  if (typeof req.body === 'string' && req.body.length) {
    try {
      return JSON.parse(req.body);
    } catch {
      return null;
    }
  }
  // Fallback: leer el stream manualmente.
  try {
    const chunks = [];
    for await (const chunk of req) chunks.push(chunk);
    const crudo = Buffer.concat(chunks).toString('utf-8');
    if (!crudo) return {};
    return JSON.parse(crudo);
  } catch {
    return null;
  }
}
