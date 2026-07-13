// Lista de voces disponibles (para el selector de voz de la Conversacion).
// Llama al proxy /api/voces; si no hay key/voces, devuelve [] sin romper la UI.

import { CONFIG } from '../config/app.js';

/**
 * @returns {Promise<Array<{ voiceId: string, nombre: string, idioma: string|null }>>}
 */
export async function listarVoces() {
  try {
    const respuesta = await fetch(CONFIG.endpoints.voces);
    if (!respuesta.ok) return [];
    const datos = await respuesta.json();
    return Array.isArray(datos?.voces) ? datos.voces : [];
  } catch {
    return [];
  }
}

/**
 * Voces clonadas que ESTA app creo en la cuenta (etiquetadas). Permiten
 * recuperar la voz propia en un dispositivo nuevo sin volver a grabar.
 * @returns {Promise<Array<{ voiceId: string, nombre: string }>>}
 */
export async function vocesPropiasRemotas() {
  try {
    const respuesta = await fetch(CONFIG.endpoints.voces);
    if (!respuesta.ok) return [];
    const datos = await respuesta.json();
    return Array.isArray(datos?.propias) ? datos.propias : [];
  } catch {
    return [];
  }
}
