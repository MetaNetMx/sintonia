// Exportacion de datos (PRD §7: exportar SIEMPRE disponible, sin friccion).
// Junta todos los stores en un unico JSON y dispara su descarga en el navegador.
//
// TODO (cifrado): si los datos se guardan cifrados, decidir aqui si la
// exportacion sale descifrada (requiere passphrase del usuario) o como respaldo
// cifrado. Por defecto, exportar en claro para que el usuario tenga control real
// de sus datos, pero advertirlo en la UI.

import { LISTA_STORES, getAll, NOMBRE_DB, NUMERO_VERSION } from './db.js';

/**
 * Reune el contenido de todos los stores en un objeto serializable.
 * @returns {Promise<object>} { app, version, exportadoEn, datos: { [store]: registros[] } }
 */
export async function recolectarTodo() {
  const datos = {};
  for (const store of LISTA_STORES) {
    datos[store] = await getAll(store);
  }
  return {
    app: NOMBRE_DB,
    version: NUMERO_VERSION,
    exportadoEn: new Date().toISOString(),
    datos,
  };
}

/**
 * Exporta todos los datos locales y dispara la descarga de un archivo JSON.
 * @param {object} [opciones]
 * @param {boolean} [opciones.descargar=true]  Si false, solo devuelve el objeto sin descargar.
 * @returns {Promise<object>} El objeto exportado (util para pruebas o previsualizacion).
 */
export async function exportarTodo({ descargar = true } = {}) {
  const paquete = await recolectarTodo();

  if (descargar && typeof document !== 'undefined') {
    const json = JSON.stringify(paquete, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);

    // Nombre de archivo en ASCII (sin acentos), con fecha para trazabilidad.
    const fecha = paquete.exportadoEn.slice(0, 10); // YYYY-MM-DD
    const enlace = document.createElement('a');
    enlace.href = url;
    enlace.download = `sintonia-datos-${fecha}.json`;
    document.body.appendChild(enlace);
    enlace.click();
    document.body.removeChild(enlace);
    URL.revokeObjectURL(url);
  }

  return paquete;
}
