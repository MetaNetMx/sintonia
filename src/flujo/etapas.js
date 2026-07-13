// Etapas y directores de la SESION EXPRES (PRD §16): un recorrido corto y
// enfocado (~4 turnos) que ABRE LA FUENTE y aterriza en UNA practica concreta.
// Los directores se construyen desde el GUION derivado de la fuente activa,
// asi que cambian solos cuando cambia la fuente semanal.

// Pasos para el indicador de progreso de la UI.
export const PASOS = [
  { id: 'apertura', etiqueta: 'La fuente' },
  { id: 'resonar', etiqueta: 'Resonar' },
  { id: 'concretar', etiqueta: 'Concretar' },
  { id: 'practica', etiqueta: 'Práctica' },
];

// Limite de TEXTO de salida para mantener el modo expres realmente breve
// (el proxy suma aparte el margen para el razonamiento interno del modelo).
// 500: el cierre lleva practica + meditacion tejida (4-6 frases) sin cortarse.
export const MAX_TOKENS_EXPRES = 500;

// Esfuerzo de razonamiento bajo: turnos agiles, menos espera (sesion corta).
export const ESFUERZO_EXPRES = 'low';

// Instruccion transversal de brevedad (se anexa a todos los turnos).
export const BREVEDAD = `BREVEDAD OBLIGATORIA: esta es una sesion EXPRES. Responde en maximo 4 lineas, una sola idea por turno, sin listas salvo que el director lo pida. Nada de rodeos ni resúmenes largos.`;

/**
 * Turno 1 — la persona respondio a la pregunta de apertura de la fuente.
 * La IA elige UN eje del guion y hace su primera pregunta concreta.
 */
export function directorElegirEje(guion) {
  const lista = guion.ejes
    .map((e) => `- ${e.id}: ${e.titulo} — ${e.idea} | primera pregunta: ${e.preguntas[0]}`)
    .join('\n');
  return `ETAPA RESONAR (turno 1 de 3). La persona acaba de responder a la pregunta de apertura de la fuente.
EJES DISPONIBLES DEL GUION:
${lista}

Elige el UNICO eje que mas resuene con lo que dijo. Tu respuesta DEBE empezar exactamente con la linea "EJE: <id>" (uno de los ids listados), seguida de un salto de linea. Despues: 1 o 2 frases calidas que reflejen lo que dijo a traves de ese eje (como hipotesis suave, jamas diagnostico) y cierra con la PRIMERA pregunta del eje, adaptada a sus palabras. Maximo 4 lineas despues de la linea EJE.`;
}

/**
 * Turno 2 — segunda pregunta concreta del eje elegido.
 */
export function directorConcretar(eje) {
  const segunda = eje.preguntas[1] || eje.preguntas[0];
  return `ETAPA CONCRETAR (turno 2 de 3). Sigues en el eje "${eje.titulo}". En UNA frase reconoce lo que la persona acaba de decir (sin repetirlo entero) y haz SOLO esta pregunta, adaptada a sus palabras: "${segunda}". Maximo 3 lineas.`;
}

/**
 * Extrae el marcador "EJE: <id>" de la primera linea de una respuesta.
 * Lo comparten la sesion expres (useFlujo) y la conversacion por voz
 * (hallazgo Media 2026-07-12: el eje de voz ahora se parsea y persiste en
 * vez de confiar en que el modelo lo recuerde implicitamente).
 * @param {string} texto
 * @param {Array<{id: string}>} ejes
 * @returns {{ ejeId: string|null, contenido: string }}
 */
export function separarEje(texto, ejes) {
  const m = String(texto || '').match(/^\s*EJE:\s*([a-z0-9-]+)\s*\n?/i);
  if (!m) return { ejeId: null, contenido: String(texto || '').trim() };
  const id = m[1].toLowerCase();
  const existe = (ejes || []).some((e) => e.id === id);
  return {
    ejeId: existe ? id : null,
    contenido: texto.slice(m[0].length).trim(),
  };
}

/**
 * Separa la meditacion final marcada con "MEDITACION:" del resto del texto.
 * La usan la sesion expres (useFlujo) y la conversacion por voz (Conversacion)
 * para mostrar/guardar la meditacion como pieza propia.
 * @param {string} texto
 * @returns {{ cierre: string, meditacion: string }}
 */
export function separarMeditacion(texto) {
  const re = /MEDITACI[ÓO]N\s*:/i;
  const encontrada = String(texto || '').match(re);
  if (!encontrada) return { cierre: String(texto || '').trim(), meditacion: '' };
  return {
    cierre: texto.slice(0, encontrada.index).trim(),
    meditacion: texto.slice(encontrada.index + encontrada[0].length).trim(),
  };
}

// Serializa los ejes del guion de forma compacta para el director de voz:
// el modelo necesita COMPRENDER la fuente completa (ideas, preguntas y
// practicas) para elegir el eje y aterrizarlo, no solo un titulo.
function resumenEjes(guion) {
  return guion.ejes
    .map((e) => {
      const p = e.practica || {};
      const pasos = Array.isArray(p.pasos) ? p.pasos.join(' | ') : '';
      return `- ${e.id}: ${e.titulo} — ${e.idea}
  preguntas: ${e.preguntas.join(' / ')}
  practica: ${p.titulo || ''}: ${pasos}`;
    })
    .join('\n');
}

/**
 * Contrato de la MEDITACION (decision de Ernesto, 2026-07-09): la meditacion
 * es el EMPALME de dos hilos — la propuesta de la fuente y lo que la persona
 * compartio en ESTA charla (texto o audio). No es un cierre generico: cambia
 * en cada sesion porque cambian sus dos hilos, y exige sensibilidad extrema
 * a los detalles de lo dicho para que lo que la fuente propone se VIVA.
 * @param {{ eje?: object|null, formato: 'texto'|'voz' }} params  Sin eje
 *   (modo voz: el modelo lo eligio en silencio), se refiere al eje sostenido
 *   en la charla.
 */
export function instruccionMeditacion({ eje, formato } = {}) {
  const p = eje?.practica || {};
  const marco = [eje?.idea, p.marco].filter(Boolean).join(' / ');
  const nombreEje = eje?.titulo
    ? `"${eje.titulo}" (${marco})`
    : 'que elegiste y sostuviste en esta charla';
  const extension =
    formato === 'voz' ? '3 o 4 frases habladas' : '4 a 6 frases cortas y respirables';
  return `LA MEDITACION — empalme de la fuente con lo compartido:
- Antes de escribirla, RELEE toda la charla y recoge 2 o 3 detalles textuales de lo que la persona dijo (sus palabras exactas, sus imagenes, nombres, sensaciones). Se extremadamente sensible a esos detalles: ahi vive la meditacion.
- Tejelos con la propuesta del eje ${nombreEje} de modo que la meditacion HAGA VIVIR lo que la fuente propone dentro de la situacion concreta que la persona conto — no que lo mencione ni lo resuma.
- La meditacion es la INVITACION de la fuente hecha voz para ESTA persona: creala de forma CREATIVA — una imagen guia, una respiracion, un gesto interior, una escena de su propia vida; la forma la eliges tu segun lo que la charla pida, nunca como plantilla repetida.
- Construyela SOLO con lo que la persona realmente compartio en ESTA charla: sin charla no hay meditacion. Si compartio poco, hazla mas breve y anclada en lo poco que si dijo; JAMAS inventes detalles, nombres o situaciones que no dio.
- En segunda persona, tiempo presente, ${extension}, con pausas naturales, hecha para escucharse en voz.
- Si la persona nombro algo con sus palabras, usa SUS palabras, no tus sinonimos.
- La intencion es que lo que la fuente propone ocurra en su vida; no prometas resultados ni cura.`;
}

/**
 * Director de la CONVERSACION POR VOZ (decision de Ernesto, 2026-07-09):
 * en audio la charla debe ser MUY corta y dirigida — la fuente no es adorno,
 * se comprende y se aplica. En ~3 turnos la nota de voz aterriza en UNA
 * practica concreta derivada del guion de la fuente.
 * @param {{ guion: object|null, turno: number, ejeId?: string|null }} params
 *   turno = numero de intercambios completados + 1. ejeId = eje elegido en el
 *   turno 1 (marcador "EJE:" parseado por la app); con el, los turnos 2-3
 *   trabajan SOLO ese eje de forma determinista.
 */
export function directorVoz({ guion, turno, ejeId }) {
  const base = `CONVERSACION POR VOZ (turno ${turno}). La persona habla por notas de voz y tu respuesta se ESCUCHA, no se lee: maximo 2 o 3 frases habladas, naturales y calidas, en espanol de Mexico. Nada de listas ni formato. Una sola idea o UNA pregunta por turno. La charla NO es abierta: tu la diriges, con suavidad, hacia algo concreto de la fuente.`;

  if (!guion) {
    return `${base}
Aun no hay guion de la fuente: escucha, refleja en una frase y devuelve UNA pregunta concreta.`;
  }

  // Con el eje ya elegido (turnos 2-3), el director trabaja SOLO ese eje.
  const ejeElegido = ejeId ? guion.ejes.find((e) => e.id === ejeId) : null;
  const ejes = resumenEjes(ejeElegido ? { ejes: [ejeElegido] } : guion);

  if (turno <= 1) {
    return `${base}
EJES DEL GUION DE LA FUENTE (compréndelos; no los recites):
${ejes}
Elige el UNICO eje que mas resuene con lo que dijo. Tu respuesta DEBE empezar exactamente con la linea "EJE: <id>" (uno de los ids listados; la app la retira antes de mostrar y reproducir — la persona no la ve ni la escucha). Despues: 1 frase que refleje lo dicho a traves de ese eje + la primera pregunta del eje, adaptada a sus palabras. No anuncies el nombre del eje en lo hablado.`;
  }
  if (turno === 2) {
    return `${base}
${ejeElegido ? 'EJE ELEGIDO EN ESTA CHARLA (trabaja solo este):' : 'EJES DEL GUION (sigue en el eje que elegiste en el turno anterior):'}
${ejes}
Una frase de reconocimiento + la segunda pregunta del eje, concreta y adaptada a sus palabras.`;
  }
  if (turno === 3) {
    return `${base}
${ejeElegido ? 'EJE ELEGIDO EN ESTA CHARLA (trabaja solo este):' : 'EJES DEL GUION (sigue en el eje ya elegido):'}
${ejes}
CIERRE PRACTICO — no alargues mas la charla: propon LA practica del eje, personalizada con SUS palabras, en maximo 3 frases habladas: que hacer, cuando, y como notara que la hizo. Es propuesta, no obligacion; no prometas resultados. Despidete en UNA frase que le devuelva su autoridad interna; no hagas mas preguntas.
Al final, en una linea aparte que empiece EXACTAMENTE con "MEDITACION:", agrega la meditacion hablada que cierra la charla (la app la separa, la guarda para re-escucharla y la reproduce).
${instruccionMeditacion({ eje: ejeElegido, formato: 'voz' })}`;
  }

  // Turno 4 en adelante: la sesion ya cerro (la UI ademas bloquea el envio;
  // esto es la red de seguridad si algo llega igual).
  return `${base}
LA SESION YA CERRO con una practica y una meditacion. No abras temas nuevos, no propongas otra practica y no hagas preguntas: agradece en UNA frase calida y sugiere, con suavidad, retomar lo que quiera seguir explorando en una proxima sesion.`;
}

/**
 * Turno 3 — practica personalizada del eje + cierre + meditacion breve.
 */
export function directorPractica(eje) {
  const p = eje.practica || {};
  const pasos = Array.isArray(p.pasos) ? p.pasos.join(' | ') : '';
  return `ETAPA PRACTICA Y CIERRE (turno 3 de 3, ultimo). A partir de lo que la persona compartio, propon la practica del eje "${eje.titulo}", personalizada con SUS palabras y su situacion:
- Titulo: ${p.titulo || 'Practica de la semana'}
- Pasos base: ${pasos}
- Marco: ${p.marco || ''}

Presentala en 3 a 5 lineas como propuesta (no obligacion), con los pasos claros y aterrizados a lo que conto. Cierra con UNA frase que le devuelva su autoridad interna.

Al final, en una linea aparte que empiece EXACTAMENTE con "MEDITACION:", escribe la meditacion de cierre.
${instruccionMeditacion({ eje, formato: 'texto' })}`;
}
