// Borrado de datos (PRD §5, §7: borrar SIEMPRE disponible, sin friccion).
// El borrado es DESTRUCTIVO e IRREVERSIBLE: no hay papelera ni deshacer.
// La confirmacion del usuario es responsabilidad de la UI que invoca estas
// funciones (p. ej. un modal); aqui se documenta el contrato y se exige un
// gesto de confirmacion explicito por parametro para evitar borrados accidentales.

import { LISTA_STORES, STORES, limpiarStore } from './db.js';

/**
 * Borra TODA la base de datos local: perfil, conversaciones, consentimientos,
 * fuentes y meditaciones. Operacion irreversible.
 *
 * La UI DEBE pedir confirmacion explicita al usuario antes de llamar y pasar
 * { confirmado: true }. Sin ese gesto, la funcion no borra nada.
 *
 * @param {object} opciones
 * @param {boolean} opciones.confirmado  Debe ser true (gesto de confirmacion de la UI).
 * @returns {Promise<{ borrado: boolean, stores: string[] }>}
 */
export async function borrarTodo({ confirmado } = {}) {
  if (confirmado !== true) {
    // Guarda de seguridad: exige confirmacion explicita.
    return { borrado: false, stores: [] };
  }

  for (const store of LISTA_STORES) {
    await limpiarStore(store);
  }

  return { borrado: true, stores: LISTA_STORES };
}

/**
 * Borra unicamente los datos de VOZ (dato biometrico, PRD §6): consentimientos
 * de voz y las muestras de voz asociadas. Es la implementacion del derecho a
 * revocar el consentimiento de clonacion de voz. Operacion irreversible.
 *
 * Deja intactos perfil, conversaciones, fuentes y meditaciones (salvo el audio
 * clonado de estas ultimas, que no se persiste como muestra biometrica aqui).
 *
 * La UI DEBE pedir confirmacion explicita y pasar { confirmado: true }.
 *
 * @param {object} opciones
 * @param {boolean} opciones.confirmado  Debe ser true (gesto de confirmacion de la UI).
 * @returns {Promise<{ borrado: boolean }>}
 */
export async function borrarVoz({ confirmado } = {}) {
  if (confirmado !== true) {
    return { borrado: false };
  }

  // Los consentimientos de voz y las muestras biometricas viven en el store
  // 'consentimientos'. Se limpia por completo ese store.
  // TODO: si en el futuro 'consentimientos' guarda tambien consentimientos NO
  // relacionados con la voz, filtrar aqui por tipo (index 'porTipo') en lugar
  // de limpiar todo el store.
  await limpiarStore(STORES.CONSENTIMIENTOS);

  return { borrado: true };
}
