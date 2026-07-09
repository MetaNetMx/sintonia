// Borrado de datos (PRD §5, §7: borrar SIEMPRE disponible, sin friccion).
// El borrado es DESTRUCTIVO e IRREVERSIBLE: no hay papelera ni deshacer.
// La confirmacion del usuario es responsabilidad de la UI que invoca estas
// funciones (p. ej. un modal); aqui se documenta el contrato y se exige un
// gesto de confirmacion explicito por parametro para evitar borrados accidentales.

import { LISTA_STORES, STORES, limpiarStore } from './db.js';
import { CONFIG } from '../config/app.js';

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
 * Borra los datos de VOZ (dato biometrico, PRD §6): el consentimiento local Y
 * la voz clonada en el PROVEEDOR (via /api/voz-borrar). Es la implementacion
 * real del derecho a revocar (hallazgo P1 de la auditoria: antes solo se
 * limpiaba IndexedDB y la voz seguia existiendo en ElevenLabs).
 *
 * Si el borrado remoto FALLA, NO se borra el registro local (conserva el
 * voiceId para poder reintentar) y se devuelve { borrado: false, remoto: 'fallo' }.
 *
 * La UI DEBE pedir confirmacion explicita y pasar { confirmado: true }.
 *
 * @param {object} opciones
 * @param {boolean} opciones.confirmado  Debe ser true (gesto de confirmacion de la UI).
 * @returns {Promise<{ borrado: boolean, remoto: 'ok'|'fallo'|'no_aplica' }>}
 */
export async function borrarVoz({ confirmado } = {}) {
  if (confirmado !== true) {
    return { borrado: false, remoto: 'no_aplica' };
  }

  // 1) ¿Hay una voz clonada en el proveedor? (voiceId en el consentimiento)
  let remoto = 'no_aplica';
  try {
    const consentimientos = await import('./consentimientos.js');
    const registro = await consentimientos.leerConsentimientoVoz();
    if (registro?.voiceId) {
      try {
        const respuesta = await fetch(CONFIG.endpoints.borrarVoz, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ voiceId: registro.voiceId }),
        });
        remoto = respuesta.ok ? 'ok' : 'fallo';
      } catch {
        remoto = 'fallo';
      }
    }
  } catch {
    /* sin registro local: solo limpieza local */
  }

  // 2) Si el proveedor NO borro, conservamos el registro (y su voiceId) para
  // poder reintentar: revocar debe ser verdad, no solo un mensaje en la UI.
  if (remoto === 'fallo') {
    return { borrado: false, remoto };
  }

  await limpiarStore(STORES.CONSENTIMIENTOS);
  return { borrado: true, remoto };
}
