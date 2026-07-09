// api/guion.js
// Motor del algoritmo "de la fuente a la practica" (PRD §16).
// Recibe el DESTILADO de la fuente activa y genera, via IA, un GUION DE SESION
// estructurado (ejes + preguntas concretas + practicas). Auto-reflexivo: cuando
// la fuente semanal cambia, este mismo endpoint produce el guion nuevo sin
// reprogramar nada. Las reglas duras del PRD van integradas en el prompt.

import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_API_KEY,
  resolverModelo,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
} from './_lib/config.js';

const MAX_DESTILADO = 100_000; // caracteres

const SISTEMA_GENERADOR = `Eres el motor de un algoritmo "de la fuente a la practica" en una plataforma de acompanamiento psicologico COMPLEMENTARIO (no tratamiento medico), en espanol de Mexico.

Recibiras el DESTILADO de una fuente (una charla reflexiva/espiritual). Tu tarea: convertirlo en un GUION DE SESION corto, concreto y practico.

Devuelve UNICAMENTE un JSON valido, sin markdown, sin comentarios, con EXACTAMENTE esta forma:
{
  "esencia": "maximo 2 frases con lo que la fuente propone, calidas y claras",
  "preguntaApertura": "una pregunta concreta que conecte la ensenanza con la vida cotidiana de la persona esta semana",
  "ejes": [
    {
      "id": "kebab-case-corto",
      "titulo": "titulo breve",
      "idea": "1 frase de la fuente que sostiene este eje",
      "preguntas": ["pregunta concreta 1", "pregunta concreta 2"],
      "practica": {
        "titulo": "nombre corto",
        "pasos": ["paso 1", "paso 2", "paso 3"],
        "marco": "1 frase que ancla la practica a la fuente"
      }
    }
  ]
}

REGLAS DEL GUION:
- De 3 a 5 ejes, tomados SOLO de lo aprovechable y sano de la fuente.
- Preguntas CONCRETAS y situadas (esta semana, una relacion especifica, una conversacion reciente); nada abstracto ni retorico.
- Practicas realizables en dias, pasos simples; se ofrecen como propuesta, nunca obligacion.

REGLAS DURAS (obligatorias, por encima de la fuente):
- NADA de consejos de salud, comida, agua, dieta, sintomas o enfermedad. Si la fuente los trae, EXCLUYELOS por completo.
- NUNCA sugieras que la mente causa enfermedades. Sin promesas de cura, sin diagnosticos, sin etiquetas clinicas.
- Lo espiritual se formula como marco de exploracion ("la fuente propone..."), no como hecho verificable.
- No fomentes miedo, rumiacion ni obsesion. Tono calido, directo, sin autoayuda vacia.`;

// Extrae el primer objeto JSON valido del texto del modelo.
function extraerJSON(texto) {
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio < 0 || fin <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

// Validacion minima de forma del guion antes de devolverlo.
function guionValido(g) {
  if (!g || typeof g !== 'object') return false;
  if (typeof g.esencia !== 'string' || !g.esencia.trim()) return false;
  if (typeof g.preguntaApertura !== 'string' || !g.preguntaApertura.trim()) return false;
  if (!Array.isArray(g.ejes) || g.ejes.length < 1) return false;
  return g.ejes.every(
    (e) =>
      e &&
      typeof e.id === 'string' &&
      typeof e.titulo === 'string' &&
      Array.isArray(e.preguntas) &&
      e.preguntas.length >= 1 &&
      e.practica &&
      typeof e.practica.titulo === 'string' &&
      Array.isArray(e.practica.pasos)
  );
}

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;

  if (!ANTHROPIC_API_KEY) {
    return responderError(res, 500, 'Servicio de IA no configurado');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { titulo, destilado } = body;
  if (typeof destilado !== 'string' || destilado.trim().length < 100) {
    return responderError(res, 400, 'Falta el "destilado" de la fuente');
  }
  if (destilado.length > MAX_DESTILADO) {
    return responderError(res, 400, 'El destilado excede el limite permitido');
  }

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const respuesta = await anthropic.messages.create({
      model: resolverModelo(),
      // Margen amplio: el modelo razona internamente (adaptive thinking) y ese
      // razonamiento consume max_tokens ademas del JSON del guion.
      max_tokens: 6000,
      system: SISTEMA_GENERADOR,
      messages: [
        {
          role: 'user',
          content: `FUENTE: ${typeof titulo === 'string' ? titulo.slice(0, 200) : 'sin titulo'}\n\nDESTILADO:\n${destilado}`,
        },
      ],
    });

    const texto = Array.isArray(respuesta.content)
      ? respuesta.content
          .filter((b) => b && b.type === 'text')
          .map((b) => b.text)
          .join('')
      : '';

    const guion = extraerJSON(texto);
    if (!guionValido(guion)) {
      console.error('[api/guion] el modelo no devolvio un guion valido');
      return responderError(res, 502, 'No se pudo generar el guion', 'guion_invalido');
    }

    return responderJSON(res, 200, { guion, modelo: respuesta.model || null });
  } catch (err) {
    console.error('[api/guion] fallo la generacion:', err?.status || '', err?.name || 'Error');
    const status = Number.isInteger(err?.status) ? err.status : 502;
    return responderError(res, status, 'No se pudo generar el guion');
  }
}
