// El "perfil vivo" del usuario (PRD §5): documento unico que crece con la
// entrevista y el uso. Local primero; exportable y borrable.
//
// TODO (cifrado): el perfil contiene datos personales sensibles; cifrar aqui
// (o en la capa db.js) antes de persistir cuando se agregue el cifrado.

import { STORES, get, put } from './db.js';

// Clave fija del documento unico de perfil dentro del store 'perfil'
// (store sin keyPath, se indexa por esta clave).
const CLAVE_PERFIL = 'actual';

/**
 * Guarda (crea o reemplaza) el perfil vivo del usuario.
 * Sella siempre 'actualizadoEn' y conserva 'creadoEn' del registro previo.
 * @param {object} perfil  Datos del perfil (campos libres del "perfil vivo").
 * @returns {Promise<object>} El perfil guardado, con marcas de tiempo.
 */
export async function guardarPerfil(perfil) {
  const previo = await get(STORES.PERFIL, CLAVE_PERFIL);
  const ahora = new Date().toISOString();

  const aGuardar = {
    ...perfil,
    creadoEn: previo?.creadoEn ?? ahora,
    actualizadoEn: ahora,
  };

  await put(STORES.PERFIL, aGuardar, CLAVE_PERFIL);
  return aGuardar;
}

/**
 * Lee el perfil vivo del usuario.
 * @returns {Promise<object|undefined>} El perfil, o undefined si aun no existe.
 */
export async function leerPerfil() {
  return get(STORES.PERFIL, CLAVE_PERFIL);
}
