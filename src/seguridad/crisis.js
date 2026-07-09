// Deteccion heuristica de senales de riesgo en texto libre (es-MX).
//
// IMPORTANTE (regla dura del PRD, §2.2): esto NO es un diagnostico ni una
// evaluacion clinica. Es una heuristica de coincidencia de patrones de lenguaje
// pensada solo para SUGERIR cuando conviene priorizar contencion y derivacion a
// ayuda humana profesional. Puede tener falsos positivos y falsos negativos.
// Nunca debe usarse para etiquetar a la persona ni para tomar decisiones
// automaticas que sustituyan el criterio humano.

// Normaliza el texto: minusculas y sin acentos, para comparar de forma robusta
// sin depender de como haya escrito la persona.
function normalizar(texto) {
  return (texto || '')
    .toLowerCase()
    .normalize('NFD')
    .replace(/[̀-ͯ]/g, ''); // marcas diacriticas combinantes
}

// Cada patron es una expresion regular ya sin acentos (el texto se normaliza
// antes de comparar). Se agrupan por nivel de prioridad de contencion.
//
// 'alto'     -> ideacion de dano a si mismo o a otros: prioridad maxima.
// 'atencion' -> deterioro emocional marcado, o sintomas neurologicos/psiquiatricos
//               nuevos que ameritan revision profesional humana.
const PATRONES = {
  alto: [
    // Ideacion suicida o de dano a si mismo.
    { re: /\bquiero\s+morir(me)?\b/, etiqueta: 'ideacion de muerte' },
    { re: /\bme\s+quiero\s+morir\b/, etiqueta: 'ideacion de muerte' },
    { re: /\bya\s+no\s+quiero\s+vivir\b/, etiqueta: 'no querer vivir' },
    { re: /\bno\s+quiero\s+(seguir\s+)?vivir\b/, etiqueta: 'no querer vivir' },
    { re: /\bmejor\s+(estar|estaria)\s+muerto\b/, etiqueta: 'ideacion de muerte' },
    { re: /\bquitarme\s+la\s+vida\b/, etiqueta: 'ideacion suicida' },
    { re: /\bacabar\s+con\s+(mi\s+vida|todo)\b/, etiqueta: 'ideacion suicida' },
    { re: /\bmatarme\b/, etiqueta: 'ideacion suicida' },
    { re: /\bsuicid(arme|arme|io|arme)?\b/, etiqueta: 'suicidio' },
    { re: /\bsuicidarme\b/, etiqueta: 'ideacion suicida' },
    { re: /\bpensar?\s+en\s+(el\s+)?suicid/, etiqueta: 'ideacion suicida' },
    { re: /\bno\s+vale\s+la\s+pena\s+(seguir|vivir)\b/, etiqueta: 'desesperanza profunda' },
    { re: /\bhacerme\s+dano\b/, etiqueta: 'dano a si mismo' },
    { re: /\blastimarme\b/, etiqueta: 'dano a si mismo' },
    { re: /\bcortarme\b/, etiqueta: 'autolesion' },
    { re: /\bautolesion(arme|ar)?\b/, etiqueta: 'autolesion' },
    { re: /\bplan\s+para\s+(morir|matarme)\b/, etiqueta: 'plan de dano' },
    // Ideacion de dano a otros.
    { re: /\bquiero\s+(hacer(le)?\s+)?dano\s+a\b/, etiqueta: 'dano a otros' },
    { re: /\bmatar\s+a\s+(alguien|el|ella|ellos|mi)\b/, etiqueta: 'dano a otros' },
    { re: /\bhacerle\s+dano\s+a\s+(alguien|el|ella|otros)\b/, etiqueta: 'dano a otros' },
    { re: /\blastimar\s+a\s+(alguien|el|ella|otros)\b/, etiqueta: 'dano a otros' },
  ],
  atencion: [
    // Deterioro emocional marcado / desesperanza.
    { re: /\bno\s+le\s+veo\s+sentido\s+a\s+(nada|la\s+vida)\b/, etiqueta: 'desesperanza' },
    { re: /\bnada\s+tiene\s+sentido\b/, etiqueta: 'desesperanza' },
    { re: /\bno\s+puedo\s+mas\b/, etiqueta: 'agotamiento profundo' },
    { re: /\bya\s+no\s+aguanto\b/, etiqueta: 'agotamiento profundo' },
    { re: /\bme\s+siento\s+(vacio|vacia)\b/, etiqueta: 'vacio emocional' },
    { re: /\bestoy\s+desesperad[oa]\b/, etiqueta: 'desesperacion' },
    { re: /\bnadie\s+me\s+(quiere|extranaria)\b/, etiqueta: 'aislamiento' },
    { re: /\bsoy\s+una\s+carga\b/, etiqueta: 'sentirse una carga' },
    { re: /\bestoy\s+solo\s+en\s+esto\b/, etiqueta: 'aislamiento' },
    // Sintomas neurologicos/psiquiatricos nuevos que ameritan revision humana.
    { re: /\bescucho\s+voces\b/, etiqueta: 'alucinaciones auditivas' },
    { re: /\bveo\s+cosas\s+que\s+no\s+(estan|existen)\b/, etiqueta: 'alucinaciones visuales' },
    { re: /\balucin(o|aciones|ando)\b/, etiqueta: 'alucinaciones' },
    { re: /\bno\s+puedo\s+(mover|sentir)\s+(el|la|mi)\b/, etiqueta: 'sintoma neurologico' },
    { re: /\bse\s+me\s+durmio\s+(medio\s+cuerpo|la\s+cara|el\s+brazo)\b/, etiqueta: 'sintoma neurologico' },
    { re: /\bconvulsion(es|e)?\b/, etiqueta: 'convulsiones' },
    { re: /\bperdi\s+(el\s+conocimiento|la\s+memoria)\b/, etiqueta: 'sintoma neurologico' },
    { re: /\bataque\s+de\s+panico\b/, etiqueta: 'crisis de panico' },
    { re: /\bno\s+he\s+(dormido|comido)\s+en\s+(dias|varios\s+dias)\b/, etiqueta: 'deterioro fisico' },
  ],
};

/**
 * Analiza un texto y sugiere un nivel de prioridad de contencion.
 *
 * @param {string} texto Texto libre escrito por la persona.
 * @returns {{ nivel: 'ninguno'|'atencion'|'alto', coincidencias: Array<{ nivel: string, etiqueta: string }> }}
 *
 * Recordatorio: heuristica de lenguaje, NO diagnostico. El nivel devuelto solo
 * orienta a la interfaz para ofrecer recursos y contencion; nunca reemplaza el
 * juicio de una persona profesional.
 */
export function detectarSenalesCrisis(texto) {
  const t = normalizar(texto);
  const coincidencias = [];

  if (!t.trim()) {
    return { nivel: 'ninguno', coincidencias };
  }

  for (const patron of PATRONES.alto) {
    if (patron.re.test(t)) {
      coincidencias.push({ nivel: 'alto', etiqueta: patron.etiqueta });
    }
  }
  for (const patron of PATRONES.atencion) {
    if (patron.re.test(t)) {
      coincidencias.push({ nivel: 'atencion', etiqueta: patron.etiqueta });
    }
  }

  let nivel = 'ninguno';
  if (coincidencias.some((c) => c.nivel === 'alto')) {
    nivel = 'alto';
  } else if (coincidencias.length > 0) {
    nivel = 'atencion';
  }

  return { nivel, coincidencias };
}
