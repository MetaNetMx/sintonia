// Meditaciones personalizadas (PRD §16): cada sesion que cierra genera una
// meditacion que EMPALMA la propuesta de la fuente con lo que la persona
// compartio en esa charla. Se guardan localmente (local-first, PRD §7) para
// poder re-escucharlas: la intencion es escucharte a ti mismo guiandote.

import { STORES, put, getAll } from './db.js';

function nuevoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

/**
 * Guarda la meditacion generada al cierre de una sesion.
 * @param {object} datos
 * @param {string} datos.texto      La meditacion (obligatoria; vacia no se guarda).
 * @param {string} [datos.fuenteId] Fuente activa que la origino.
 * @param {string} [datos.ejeId]    Eje del guion que se trabajo.
 * @param {string} [datos.titulo]   Titulo legible (p. ej. el titulo del eje).
 * @returns {Promise<object>} El registro persistido.
 */
export async function guardarMeditacion({ texto, fuenteId, ejeId, titulo } = {}) {
  const limpio = (texto || '').trim();
  if (!limpio) {
    throw new Error('Una meditacion vacia no se guarda.');
  }
  const registro = {
    id: nuevoId(),
    texto: limpio,
    fuenteId: fuenteId || null,
    ejeId: ejeId || null,
    titulo: titulo || 'Meditación de sesión',
    creadaEn: new Date().toISOString(),
  };
  await put(STORES.MEDITACIONES, registro);
  return registro;
}

/**
 * Lista las meditaciones guardadas, mas recientes primero.
 * @returns {Promise<object[]>}
 */
export async function listarMeditaciones() {
  const todas = await getAll(STORES.MEDITACIONES);
  return todas.sort((a, b) => (b.creadaEn || '').localeCompare(a.creadaEn || ''));
}
