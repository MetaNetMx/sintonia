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
