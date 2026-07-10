// Registro del consentimiento de VOZ (dato biometrico, PRD §6).
// Documento unico con id estable 'voz' en el store 'consentimientos'
// (que tiene keyPath: 'id'). Corrige el hallazgo P1 de la auditoria externa
// (2026-07-08): antes se guardaba un registro SIN id, el put fallaba y el
// error se tragaba en silencio, dejando "consentimiento dado" sin evidencia.

import { STORES, get, put, del } from './db.js';

export const CLAVE_CONSENTIMIENTO_VOZ = 'voz';

/**
 * Guarda (o reemplaza) el consentimiento de voz vigente.
 * @param {object} [datos]
 * @param {Record<string, boolean>} [datos.casillas]  Casillas aceptadas en la UI.
 * @returns {Promise<object>} El registro persistido.
 * @throws Si IndexedDB no esta disponible o la escritura falla — el llamador
 *         DEBE tratar el fallo como "consentimiento no registrado".
 */
export async function guardarConsentimientoVoz({ casillas } = {}) {
  // Si ya habia consentimiento con voz clonada, el voiceId se CONSERVA:
  // aceptar de nuevo no debe perder la unica referencia para borrar esa voz
  // en el proveedor (hallazgo Alta de la auditoria 2026-07-09: antes se
  // restablecia a null y la voz quedaba huerfana).
  let voiceIdPrevio = null;
  try {
    const previo = await leerConsentimientoVoz();
    if (previo?.voiceId) voiceIdPrevio = previo.voiceId;
  } catch {
    /* sin registro previo legible: si la DB esta rota, el put de abajo fallara */
  }

  const registro = {
    id: CLAVE_CONSENTIMIENTO_VOZ,
    tipo: 'voz',
    otorgado: true,
    fecha: new Date().toISOString(),
    casillas: { ...(casillas || {}) },
    // Se llena al clonar la voz (asignarVoiceId); necesario para poder
    // borrarla tambien en el proveedor al revocar.
    voiceId: voiceIdPrevio,
  };
  await put(STORES.CONSENTIMIENTOS, registro);
  return registro;
}

/**
 * Lee el consentimiento de voz vigente (undefined si no existe).
 */
export async function leerConsentimientoVoz() {
  return get(STORES.CONSENTIMIENTOS, CLAVE_CONSENTIMIENTO_VOZ);
}

/**
 * Asocia el voiceId de la voz clonada al consentimiento vigente.
 * @param {string} voiceId
 * @throws Si no hay consentimiento registrado (no se clona sin consentir).
 */
export async function asignarVoiceId(voiceId) {
  const registro = await leerConsentimientoVoz();
  if (!registro || registro.otorgado !== true) {
    throw new Error('No hay consentimiento de voz registrado.');
  }
  registro.voiceId = voiceId;
  registro.actualizadoEn = new Date().toISOString();
  await put(STORES.CONSENTIMIENTOS, registro);
  return registro;
}

/**
 * Elimina el registro local del consentimiento de voz.
 * (El borrado REMOTO de la voz clonada lo orquesta src/datos/borrar.js.)
 */
export async function revocarConsentimientoVoz() {
  return del(STORES.CONSENTIMIENTOS, CLAVE_CONSENTIMIENTO_VOZ);
}
