// api/anthropic.js
// Proxy server-side hacia la API de Anthropic (IA de acompanamiento).
// El cliente (src/ia/cliente.js) llama a esta ruta con { mensajes, sistema }
// y NUNCA ve la ANTHROPIC_API_KEY.
//
// NOTA SOBRE REGLAS DURAS (PRD §2): el system prompt (parametro `sistema`,
// definido en src/ia/prompts.js como SISTEMA_ACOMPANAMIENTO) DEBE reforzar las
// reglas duras del PRD: acompanamiento complementario y NO tratamiento medico,
// no diagnosticar, no prescribir, no prometer cura, derivar ante crisis, no
// reforzar miedo ni rumiacion, y distinguir lo espiritual/energetico de lo
// clinico. Este proxy no las puede garantizar por si solo; el prompt manda.

import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_API_KEY,
  resolverModelo,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
  permitirPeticion,
} from './_lib/config.js';

// Limite defensivo de mensajes para evitar payloads abusivos.
const MAX_MENSAJES = 100;
// Tope del TEXTO de respuesta que puede pedir el cliente.
const MAX_TEXTO_SALIDA = 1024;
// claude-sonnet-5 razona internamente por defecto (adaptive thinking) y ese
// razonamiento consume max_tokens. Sin margen, la respuesta puede llegar vacia
// o cortada (stop_reason: max_tokens). Este margen cubre el razonamiento.
const MARGEN_RAZONAMIENTO = 3072;
// Niveles de esfuerzo de razonamiento que el cliente puede pedir.
const ESFUERZOS_PERMITIDOS = ['low', 'medium', 'high'];
// Limites de tamano de entrada (caracteres) para proteger costos y la key
// (hallazgo P1 de la auditoria externa: sin esto, un abusador podria mandar
// payloads enormes y quemar la cuota).
const MAX_CARACTERES_ENTRADA = 60_000;
const MAX_CARACTERES_SISTEMA = 30_000;

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;
  if (!permitirPeticion(req, res, { ambito: 'anthropic', max: 20 })) return;

  // La key es server-side: si falta, es un error de configuracion del servidor.
  if (!ANTHROPIC_API_KEY) {
    return responderError(res, 500, 'Servicio de IA no configurado');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { mensajes, sistema, modelo } = body;

  // --- Validacion de entrada ---
  if (!Array.isArray(mensajes) || mensajes.length === 0) {
    return responderError(res, 400, 'Falta el arreglo "mensajes"');
  }
  if (mensajes.length > MAX_MENSAJES) {
    return responderError(res, 400, 'Demasiados mensajes en la conversacion');
  }

  // Normaliza y valida cada mensaje: solo roles user/assistant y contenido texto.
  const mensajesLimpios = [];
  for (const m of mensajes) {
    if (!m || typeof m !== 'object') {
      return responderError(res, 400, 'Mensaje con formato invalido');
    }
    // Acepta claves en ingles (role/content) o espanol (rol/contenido).
    const rolCrudo = m.role || m.rol;
    const rol = rolCrudo === 'assistant' || rolCrudo === 'asistente' ? 'assistant' : 'user';
    const contenido =
      typeof m.content === 'string'
        ? m.content
        : typeof m.contenido === 'string'
          ? m.contenido
          : '';
    if (!contenido.trim()) {
      return responderError(res, 400, 'Mensaje sin contenido de texto');
    }
    mensajesLimpios.push({ role: rol, content: contenido });
  }

  // Limite de tamano total de la entrada (mensajes + sistema).
  const totalCaracteres = mensajesLimpios.reduce((suma, m) => suma + m.content.length, 0);
  if (totalCaracteres > MAX_CARACTERES_ENTRADA) {
    return responderError(res, 413, 'La conversacion excede el limite de entrada permitido');
  }

  // El system prompt es opcional a nivel de transporte, pero el cliente debe
  // enviarlo siempre (ver prompts.js). Se acepta solo texto.
  const systemPrompt = typeof sistema === 'string' ? sistema : undefined;
  if (systemPrompt && systemPrompt.length > MAX_CARACTERES_SISTEMA) {
    return responderError(res, 413, 'El system prompt excede el limite permitido');
  }

  // El cliente no puede imponer un modelo arbitrario: solo lista blanca.
  const modeloFinal = resolverModelo(modelo);

  // maxTokens del cliente = presupuesto de TEXTO deseado. Al total le sumamos
  // el margen de razonamiento interno para que el texto nunca llegue vacio.
  const textoDeseado = Number.isInteger(body.maxTokens)
    ? Math.min(Math.max(body.maxTokens, 64), MAX_TEXTO_SALIDA)
    : MAX_TEXTO_SALIDA;
  const maxTokens = textoDeseado + MARGEN_RAZONAMIENTO;

  // Esfuerzo de razonamiento opcional ('low' agiliza los turnos breves).
  const esfuerzo = ESFUERZOS_PERMITIDOS.includes(body.esfuerzo) ? body.esfuerzo : null;

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });

    const respuesta = await anthropic.messages.create({
      model: modeloFinal,
      max_tokens: maxTokens,
      system: systemPrompt,
      messages: mensajesLimpios,
      ...(esfuerzo ? { output_config: { effort: esfuerzo } } : {}),
    });

    // Extrae el texto de los bloques de contenido.
    const texto = Array.isArray(respuesta.content)
      ? respuesta.content
          .filter((b) => b && b.type === 'text')
          .map((b) => b.text)
          .join('')
      : '';

    return responderJSON(res, 200, {
      texto,
      modelo: respuesta.model || modeloFinal,
      motivoParada: respuesta.stop_reason || null,
    });
  } catch (err) {
    // No filtramos la key ni el error crudo del proveedor. Log minimo y seguro.
    console.error('[api/anthropic] fallo la llamada a la IA:', err?.status || '', err?.name || 'Error');
    const status = Number.isInteger(err?.status) ? err.status : 502;
    return responderError(res, status, 'No se pudo obtener respuesta de la IA');
  }
}
