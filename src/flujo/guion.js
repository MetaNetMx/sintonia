// Obtencion del GUION de sesion derivado de la fuente activa (PRD §16).
// Algoritmo auto-reflexivo:
//   1. Verifica la fuente activa (registro de fuentes).
//   2. Busca su guion en cache local (IndexedDB, clave por id de fuente).
//   3. Si no existe, lo GENERA via /api/guion a partir del destilado.
//   4. Si la generacion falla, usa un guion de respaldo curado.
// Cuando la fuente semanal cambia (id nuevo), el guion se regenera solo.

import { CONFIG } from '../config/app.js';
import { fuenteActiva as fuenteEstatica } from '../fuentes/registro.js';

// Guion de respaldo, curado a mano desde el destilado de la charla 53
// "Informacion". Garantiza que la sesion funcione aun sin generacion.
// Excluye las zonas rojas del destilado (comida/agua como salud, clinica).
export const GUION_RESPALDO = {
  esencia:
    'La fuente propone que todo lo que vivimos —relaciones, conversaciones, medios, memorias— es "información" que nos habita y nos estructura. El trabajo es darte cuenta de qué te alimenta y elegir, con el corazón, con qué sigues de acuerdo.',
  preguntaApertura:
    '¿En qué parte de tu vida sientes, esta semana, que estás "ingiriendo" algo que no te sienta bien: una relación, una conversación que se repite, lo que consumes en pantallas?',
  ejes: [
    {
      id: 'discernimiento-informacion',
      titulo: 'Elegir de qué te alimentas',
      idea: 'Ingerimos información todo el tiempo sin darnos cuenta; se puede elegir con discernimiento.',
      preguntas: [
        '¿Qué contenido, conversación o ambiente notaste esta semana que te deja cargado o inquieto después?',
        '¿Qué señal aparece en ti justo después (tensión, cansancio, aceleración, ganas de seguir ahí)?',
      ],
      practica: {
        titulo: 'Tres días de observación',
        pasos: [
          'Elige UN ámbito: conversaciones, pantallas o un vínculo.',
          'Durante 3 días, anota qué "ingeriste" ahí y cómo te sentó.',
          'Al tercer día, elige UNA cosa de la que te despides por una semana.',
        ],
        marco: 'La fuente lo llama dejar de alimentarte de información que no te sienta bien.',
      },
    },
    {
      id: 'desacuerdo-sin-conflicto',
      titulo: 'Desacuerdo sin conflicto',
      idea: 'Dejar de estar de acuerdo no es pelear: el corazón simplemente deja de sintonizar.',
      preguntas: [
        '¿Con qué situación o acuerdo tácito ya no estás de acuerdo, aunque sigas actuando como si sí?',
        '¿Qué te detiene de nombrarlo: miedo al conflicto, a decepcionar, a quedarte fuera?',
      ],
      practica: {
        titulo: 'Nombrar un desacuerdo',
        pasos: [
          'Elige UN desacuerdo pequeño y real.',
          'Nómbralo esta semana a la persona implicada, sin justificarte: "me di cuenta de que ya no estoy de acuerdo con…".',
          'Observa qué pasa en ti después de decirlo.',
        ],
        marco: 'La fuente: el desacuerdo no tiene por qué ser un conflicto.',
      },
    },
    {
      id: 'amar-no-es-apoyar',
      titulo: 'Amar sin sostener lo que pesa',
      idea: 'El amor ama, pero amar no significa apoyar lo que no te representa.',
      preguntas: [
        '¿Qué estás sosteniendo por amor (o por costumbre) que en el fondo te está costando?',
        '¿Cómo sería seguir queriendo a esa persona sin seguir cargando eso?',
      ],
      practica: {
        titulo: 'Un límite amoroso',
        pasos: [
          'Identifica UNA cosa que sostienes y te pesa.',
          'Formula un límite en una frase que empiece con afecto: "te quiero, y ya no voy a…".',
          'Dilo o escríbelo esta semana.',
        ],
        marco: 'La fuente: que el amor ame no significa que sustente lo que no le representa.',
      },
    },
    {
      id: 'proyeccion-memorias',
      titulo: 'Lo que le pides al otro sin darte cuenta',
      idea: 'A veces buscamos en alguien de hoy lo que nos faltó antes, y se lo exigimos sin verlo.',
      preguntas: [
        'En tu relación más tensa, ¿qué le estás pidiendo a esa persona que quizá no le corresponde darte?',
        '¿De cuándo —o de quién— viene originalmente esa petición?',
      ],
      practica: {
        titulo: 'Devolver la petición',
        pasos: [
          'Completa por escrito: "le estoy pidiendo a ___ que haga de ___".',
          'Pregúntate qué de eso puedes darte tú, o pedir de forma directa y adulta.',
          'La próxima vez que aparezca la exigencia, respira y nómbrala por dentro.',
        ],
        marco: 'La fuente lo describe como memorias no saciadas que intentamos completar en otros.',
      },
    },
  ],
};

// Validacion de forma (espejo de la del servidor). Endurecida por el hallazgo
// Media-alta 2026-07-09: antes aceptaba ejes con id invalido, una sola
// pregunta o cero pasos, y el flujo (que usa preguntas[1] y los pasos) se
// degradaba en silencio.
const ID_KEBAB = /^[a-z0-9]+(?:-[a-z0-9]+)*$/;

function textoConSustancia(v) {
  return typeof v === 'string' && v.trim().length > 0;
}

export function guionValido(g) {
  if (!g || typeof g !== 'object') return false;
  if (!textoConSustancia(g.esencia)) return false;
  if (!textoConSustancia(g.preguntaApertura)) return false;
  if (!Array.isArray(g.ejes) || g.ejes.length < 1) return false;
  return g.ejes.every(
    (e) =>
      e &&
      typeof e.id === 'string' &&
      ID_KEBAB.test(e.id) &&
      textoConSustancia(e.titulo) &&
      Array.isArray(e.preguntas) &&
      e.preguntas.length >= 2 &&
      e.preguntas.every(textoConSustancia) &&
      e.practica &&
      textoConSustancia(e.practica.titulo) &&
      Array.isArray(e.practica.pasos) &&
      e.practica.pasos.length >= 2 &&
      e.practica.pasos.every(textoConSustancia)
  );
}

// Hash corto y estable del contenido (djb2). El cache de guiones usa
// id+hash: dos destilaciones distintas del mismo dia/titulo NO comparten
// guion (hallazgo Media 2026-07-09: re-destilar sobrescribia la fuente
// pero devolvia el guion viejo).
export function hashTexto(texto) {
  let h = 5381;
  for (let i = 0; i < texto.length; i++) {
    h = ((h << 5) + h + texto.charCodeAt(i)) >>> 0;
  }
  return h.toString(36);
}

// Respaldo NEUTRO derivado de la fuente actual: si la generacion falla para
// una fuente que NO es la curada del repo, no se responde con el guion de
// otra charla (hallazgo Media 2026-07-09: una fuente "El perdon" recibia en
// silencio el guion de "Informacion").
export function respaldoNeutro(fuente) {
  const titulo = fuente?.titulo || 'la fuente de esta semana';
  const resumen = (fuente?.resumen || '').trim();
  return {
    esencia:
      resumen ||
      `Esta semana la fuente es "${titulo}". Aun sin guion generado, la sesion puede acompanarte a aterrizarla en tu vida.`,
    preguntaApertura: `Pensando en "${titulo}", ¿que parte de tu vida se te vino a la mente al escucharla o leerla?`,
    ejes: [
      {
        id: 'resonancia-personal',
        titulo: 'Lo que resono en ti',
        idea: 'Cuando algo de la fuente resuena, esta senalando un lugar de tu vida que pide atencion.',
        preguntas: [
          '¿Que frase o idea de la fuente se te quedo, y en que situacion concreta de esta semana la ves?',
          '¿Que te gustaria hacer distinto ahi, aunque sea algo pequeno?',
        ],
        practica: {
          titulo: 'Llevarla a un momento del dia',
          pasos: [
            'Elige UN momento cotidiano de esta semana.',
            'Antes de ese momento, recuerda la idea de la fuente que te resono.',
            'Despues, anota en una linea que cambio al mirarlo asi.',
          ],
          marco: `Derivado directamente de "${titulo}".`,
        },
      },
    ],
  };
}

// El respaldo curado solo aplica a SU fuente; para cualquier otra, el neutro.
function respaldoPara(fuente) {
  return fuente?.id === fuenteEstatica()?.id
    ? GUION_RESPALDO
    : respaldoNeutro(fuente);
}

/**
 * Devuelve el guion de la fuente dada: cache -> generacion -> respaldo.
 * @param {object|null} fuente  Entrada del registro (con .id, .titulo, .destilado).
 * @returns {Promise<{ guion: object, origen: 'cache'|'generado'|'respaldo' }>}
 */
export async function obtenerGuion(fuente) {
  if (!fuente) return { guion: GUION_RESPALDO, origen: 'respaldo' };
  // Clave por id + hash del destilado: contenido nuevo => guion nuevo.
  const clave = `guion:${fuente.id}:${hashTexto(fuente.destilado || '')}`;

  // 1) Cache local (IndexedDB, store 'fuentes').
  try {
    const db = await import('../datos/db.js');
    const registro = await db.get(db.STORES.FUENTES, clave);
    if (registro?.guion && guionValido(registro.guion)) {
      return { guion: registro.guion, origen: 'cache' };
    }
  } catch {
    /* sin cache disponible */
  }

  // 2) Generacion via IA a partir del destilado.
  try {
    const respuesta = await fetch(CONFIG.endpoints.guion, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ titulo: fuente.titulo, destilado: fuente.destilado || '' }),
    });
    if (respuesta.ok) {
      const datos = await respuesta.json();
      if (datos?.guion && guionValido(datos.guion)) {
        try {
          const db = await import('../datos/db.js');
          await db.put(db.STORES.FUENTES, {
            id: clave,
            fuenteId: fuente.id,
            guion: datos.guion,
            creadoEn: new Date().toISOString(),
          });
        } catch {
          /* cache opcional */
        }
        return { guion: datos.guion, origen: 'generado' };
      }
    }
  } catch {
    /* sin red o sin key: caemos al respaldo */
  }

  // 3) Respaldo: el curado para su fuente; neutro (derivado de la fuente
  // actual) para cualquier otra.
  return { guion: respaldoPara(fuente), origen: 'respaldo' };
}
