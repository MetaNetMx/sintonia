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
export async function guardarConsentimientoVoz({ casillas, usos } = {}) {
  // Si ya habia consentimiento con voz clonada, el voiceId se CONSERVA:
  // aceptar de nuevo no debe perder la unica referencia para borrar esa voz
  // en el proveedor (hallazgo Alta de la auditoria 2026-07-09: antes se
  // restablecia a null y la voz quedaba huerfana). Los USOS previos tambien
  // se conservan salvo que se pasen explicitamente.
  // Lectura FAIL-CLOSED (hallazgo Media 2026-07-15): si el registro previo no
  // se puede LEER, este guardado se aborta (el throw sube al llamador, que lo
  // trata como "consentimiento no registrado"). Continuar con voiceId=null y
  // escribir despues podria sobreescribir la unica referencia a la voz remota.
  // "No hay registro" (undefined) es distinto y sigue siendo valido.
  const previo = await leerConsentimientoVoz();
  const voiceIdPrevio = previo?.voiceId || null;
  const usosPrevios = previo?.usos || null;

  const registro = {
    id: CLAVE_CONSENTIMIENTO_VOZ,
    tipo: 'voz',
    otorgado: true,
    fecha: new Date().toISOString(),
    casillas: { ...(casillas || {}) },
    // Usos de la voz clonada (hallazgo Alta 2026-07-12): guiar meditaciones
    // es el uso base consentido; usarla en CONVERSACIONES (leer respuestas de
    // la IA con la voz de la persona) requiere opt-in explicito, apagado por
    // defecto.
    usos: {
      meditaciones: true,
      conversaciones: usos
        ? usos.conversaciones === true
        : usosPrevios?.conversaciones === true,
    },
    // Se llena al clonar la voz (asignarVoiceId); necesario para poder
    // borrarla tambien en el proveedor al revocar.
    voiceId: voiceIdPrevio,
  };
  await put(STORES.CONSENTIMIENTOS, registro);
  return registro;
}

/**
 * Activa o desactiva el uso de la voz clonada en CONVERSACIONES (opt-in,
 * revocable en cualquier momento). Requiere consentimiento vigente.
 * @param {boolean} permitido
 */
export async function establecerUsoConversacionVoz(permitido) {
  const registro = await leerConsentimientoVoz();
  if (!registro || registro.otorgado !== true) {
    throw new Error('No hay consentimiento de voz registrado.');
  }
  registro.usos = { meditaciones: true, ...(registro.usos || {}), conversaciones: permitido === true };
  registro.actualizadoEn = new Date().toISOString();
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
