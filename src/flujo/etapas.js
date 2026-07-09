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
export const MAX_TOKENS_EXPRES = 400;

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
 * Director de la CONVERSACION POR VOZ (decision de Ernesto, 2026-07-09):
 * en audio la charla debe ser MUY corta y dirigida — la fuente no es adorno,
 * se comprende y se aplica. En ~3 turnos la nota de voz aterriza en UNA
 * practica concreta derivada del guion de la fuente.
 * @param {{ guion: object|null, turno: number }} params  turno = numero de
 *   intervenciones de la persona (1 = primera nota de voz).
 */
export function directorVoz({ guion, turno }) {
  const base = `CONVERSACION POR VOZ (turno ${turno}). La persona habla por notas de voz y tu respuesta se ESCUCHA, no se lee: maximo 2 o 3 frases habladas, naturales y calidas, en espanol de Mexico. Nada de listas ni formato. Una sola idea o UNA pregunta por turno. La charla NO es abierta: tu la diriges, con suavidad, hacia algo concreto de la fuente.`;

  if (!guion) {
    return `${base}
Aun no hay guion de la fuente: escucha, refleja en una frase y devuelve UNA pregunta concreta.`;
  }

  const ejes = resumenEjes(guion);
  if (turno <= 1) {
    return `${base}
EJES DEL GUION DE LA FUENTE (compréndelos; no los recites):
${ejes}
Elige en silencio el UNICO eje que mas resuene con lo que dijo (no anuncies el eje ni su nombre). Responde: 1 frase que refleje lo dicho a traves de ese eje + la primera pregunta del eje, adaptada a sus palabras.`;
  }
  if (turno === 2) {
    return `${base}
EJES DEL GUION (sigue en el eje que elegiste en el turno anterior):
${ejes}
Una frase de reconocimiento + la segunda pregunta del eje, concreta y adaptada a sus palabras.`;
  }
  return `${base}
EJES DEL GUION (sigue en el eje ya elegido):
${ejes}
CIERRE PRACTICO — no alargues mas la charla: propon LA practica del eje, personalizada con SUS palabras, en maximo 3 frases habladas: que hacer, cuando, y como notara que la hizo. Es propuesta, no obligacion; no prometas resultados. Cierra con UNA frase que le devuelva su autoridad interna y despidete breve. No hagas mas preguntas.`;
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

Presentala en 3 a 5 lineas como propuesta (no obligacion), con los pasos claros y aterrizados a lo que conto. Cierra con UNA frase que le devuelva su autoridad interna. Al final, en una linea aparte que empiece EXACTAMENTE con "MEDITACION:", escribe una meditacion de 3 frases en segunda persona, hecha a su medida, para escucharse en voz. No prometas resultados ni cura.`;
}
