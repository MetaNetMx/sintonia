// CRUD de conversaciones y sus mensajes (PRD §7: dato sensible, local primero).
// Cada conversacion es un registro { id, titulo, mensajes[], creadaEn, actualizadaEn }.
// Cada mensaje: { id, rol: 'usuario'|'asistente', contenido, creadoEn }.
//
// TODO (cifrado): el contenido de los mensajes es sensible; cifrar aqui
// (o en la capa db.js) antes de persistir cuando se agregue el cifrado.

import { STORES, get, put, getAll, del } from './db.js';

// Genera un id razonablemente unico sin dependencias externas.
function nuevoId() {
  if (typeof crypto !== 'undefined' && crypto.randomUUID) {
    return crypto.randomUUID();
  }
  return `${Date.now()}-${Math.random().toString(36).slice(2, 10)}`;
}

/**
 * Crea una conversacion nueva (vacia) y la persiste.
 * @param {object} [opciones]
 * @param {string} [opciones.titulo]  Titulo inicial (por defecto 'Nueva conversacion').
 * @returns {Promise<object>} La conversacion creada.
 */
export async function crearConversacion({ titulo = 'Nueva conversacion' } = {}) {
  const ahora = new Date().toISOString();
  const conversacion = {
    id: nuevoId(),
    titulo,
    mensajes: [],
    creadaEn: ahora,
    actualizadaEn: ahora,
  };
  await put(STORES.CONVERSACIONES, conversacion);
  return conversacion;
}

/**
 * Lee una conversacion por id.
 * @param {string} id
 * @returns {Promise<object|undefined>}
 */
export async function leerConversacion(id) {
  return get(STORES.CONVERSACIONES, id);
}

/**
 * Lista todas las conversaciones, mas recientes primero (por actualizadaEn).
 * @returns {Promise<object[]>}
 */
export async function listarConversaciones() {
  const todas = await getAll(STORES.CONVERSACIONES);
  return todas.sort((a, b) => (a.actualizadaEn < b.actualizadaEn ? 1 : -1));
}

/**
 * Elimina una conversacion completa por id.
 * @param {string} id
 */
export async function eliminarConversacion(id) {
  return del(STORES.CONVERSACIONES, id);
}

/**
 * Agrega un mensaje a una conversacion existente y actualiza su marca de tiempo.
 * @param {string} idConversacion
 * @param {object} mensaje
 * @param {'usuario'|'asistente'} mensaje.rol
 * @param {string} mensaje.contenido
 * @returns {Promise<object>} La conversacion actualizada.
 * @throws Si la conversacion no existe.
 */
export async function agregarMensaje(idConversacion, { rol, contenido }) {
  const conversacion = await get(STORES.CONVERSACIONES, idConversacion);
  if (!conversacion) {
    throw new Error(`No existe la conversacion con id "${idConversacion}".`);
  }

  const ahora = new Date().toISOString();
  const mensaje = { id: nuevoId(), rol, contenido, creadoEn: ahora };

  conversacion.mensajes.push(mensaje);
  conversacion.actualizadaEn = ahora;

  await put(STORES.CONVERSACIONES, conversacion);
  return conversacion;
}

/**
 * Cambia el titulo de una conversacion.
 * @param {string} idConversacion
 * @param {string} titulo
 * @returns {Promise<object>} La conversacion actualizada.
 * @throws Si la conversacion no existe.
 */
export async function renombrarConversacion(idConversacion, titulo) {
  const conversacion = await get(STORES.CONVERSACIONES, idConversacion);
  if (!conversacion) {
    throw new Error(`No existe la conversacion con id "${idConversacion}".`);
  }
  conversacion.titulo = titulo;
  conversacion.actualizadaEn = new Date().toISOString();
  await put(STORES.CONVERSACIONES, conversacion);
  return conversacion;
}
