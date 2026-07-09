// Cliente de IA. Habla SOLO por el proxy serverless /api/anthropic.
// NUNCA incluye claves ni secretos: eso vive server-side (ver PRD §2.5, §9).

import { CONFIG } from '../config/app.js';

// Error tipado para que la UI pueda distinguir fallos de red/servidor.
export class ErrorIA extends Error {
  constructor(mensaje, { estado, causa } = {}) {
    super(mensaje);
    this.name = 'ErrorIA';
    this.estado = estado ?? null; // codigo HTTP si aplica
    this.causa = causa ?? null;
  }
}

// Extrae el texto de la respuesta del proxy de forma tolerante a formatos:
// admite { texto }, { contenido }, o el shape crudo de Anthropic { content: [...] }.
function extraerTexto(datos) {
  if (!datos) return '';
  if (typeof datos === 'string') return datos;
  if (typeof datos.texto === 'string') return datos.texto;
  if (typeof datos.contenido === 'string') return datos.contenido;
  if (Array.isArray(datos.content)) {
    return datos.content
      .filter((b) => b && b.type === 'text' && typeof b.text === 'string')
      .map((b) => b.text)
      .join('')
      .trim();
  }
  return '';
}

// enviarMensaje({ mensajes, sistema }) => Promise<{ texto, crudo }>
// - mensajes: [{ rol|role: 'usuario'|'user'|'asistente'|'assistant', contenido|content: string }]
// - sistema: system prompt (usar SISTEMA_ACOMPANAMIENTO / componerSistema de prompts.js)
// - opciones.signal: AbortSignal opcional para cancelar la peticion.
export async function enviarMensaje({ mensajes, sistema, maxTokens, esfuerzo } = {}, opciones = {}) {
  if (!Array.isArray(mensajes)) {
    throw new ErrorIA('Se requiere un arreglo de mensajes.');
  }

  const cuerpo = {
    modelo: CONFIG.modeloIA,
    sistema: sistema ?? '',
    mensajes,
    // Modo expres: limita la longitud del TEXTO de respuesta (el proxy suma
    // internamente el margen de razonamiento) y agiliza con esfuerzo bajo.
    ...(Number.isInteger(maxTokens) ? { maxTokens } : {}),
    ...(typeof esfuerzo === 'string' ? { esfuerzo } : {}),
  };

  let respuesta;
  try {
    respuesta = await fetch(CONFIG.endpoints.anthropic, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(cuerpo),
      signal: opciones.signal,
    });
  } catch (err) {
    if (err && err.name === 'AbortError') throw err;
    throw new ErrorIA('No se pudo conectar con el servicio de acompanamiento.', {
      causa: err,
    });
  }

  if (!respuesta.ok) {
    let detalle = '';
    try {
      const errJson = await respuesta.json();
      detalle = errJson?.error || errJson?.mensaje || '';
    } catch {
      /* respuesta sin JSON */
    }
    throw new ErrorIA(
      detalle || `El servicio respondio con un error (${respuesta.status}).`,
      { estado: respuesta.status }
    );
  }

  let datos;
  try {
    datos = await respuesta.json();
  } catch (err) {
    throw new ErrorIA('La respuesta del servicio no es valida.', { causa: err });
  }

  const texto = extraerTexto(datos);
  if (!texto) {
    throw new ErrorIA('El servicio no devolvio contenido de texto.');
  }

  return { texto, crudo: datos };
}
