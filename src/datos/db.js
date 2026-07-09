// Capa local-first sobre IndexedDB usando la libreria 'idb'.
// Local primero: NADA de backend de datos. Aqui vive el estado sensible
// (perfil, conversaciones, consentimientos, fuentes, meditaciones).
//
// Soberania de datos (PRD §5, §7): todo lo que se guarda aqui se puede
// exportar (src/datos/exportar.js) y borrar (src/datos/borrar.js) sin friccion.
//
// TODO (cifrado a futuro): los valores sensibles se guardan hoy en claro dentro
// de IndexedDB. Cuando se agregue cifrado, la frontera correcta es esta capa:
// cifrar en put() antes de escribir y descifrar en get()/getAll() al leer,
// usando una clave derivada del usuario (p. ej. Web Crypto + passphrase) que
// NUNCA se persiste en claro. Los stores de 'voz'/'consentimientos' son
// prioritarios por ser dato biometrico (PRD §6).

import { openDB } from 'idb';

// Nombre y version de la base. Subir NUMERO_VERSION al cambiar el esquema.
export const NOMBRE_DB = 'sintonia-datos';
export const NUMERO_VERSION = 1;

// Nombres de los almacenes (object stores). Usar estas constantes en todo el
// codigo para evitar strings sueltos y errores de tipeo.
export const STORES = {
  PERFIL: 'perfil',
  CONVERSACIONES: 'conversaciones',
  CONSENTIMIENTOS: 'consentimientos',
  FUENTES: 'fuentes',
  MEDITACIONES: 'meditaciones',
};

// Lista de stores para iterar (exportar/borrar recorren todos).
export const LISTA_STORES = Object.values(STORES);

// Promesa unica de conexion (patron singleton) para no reabrir la DB.
let promesaDB = null;

/**
 * Abre (o crea/migra) la base de datos local y devuelve la instancia idb.
 * Es idempotente: multiples llamadas comparten la misma conexion.
 * @returns {Promise<import('idb').IDBPDatabase>}
 */
export async function abrirDB() {
  if (promesaDB) return promesaDB;

  promesaDB = openDB(NOMBRE_DB, NUMERO_VERSION, {
    upgrade(db, versionAnterior) {
      // Migracion incremental. Cada bloque agrega lo que falte segun la
      // version previa; asi subir NUMERO_VERSION no rompe datos existentes.
      if (versionAnterior < 1) {
        // 'perfil': el "perfil vivo" del usuario. Documento unico por clave fija.
        if (!db.objectStoreNames.contains(STORES.PERFIL)) {
          db.createObjectStore(STORES.PERFIL);
        }

        // 'conversaciones': cada registro es una conversacion con sus mensajes.
        if (!db.objectStoreNames.contains(STORES.CONVERSACIONES)) {
          const s = db.createObjectStore(STORES.CONVERSACIONES, { keyPath: 'id' });
          s.createIndex('porFecha', 'actualizadaEn');
        }

        // 'consentimientos': registros de consentimiento (voz biometrica, etc.).
        if (!db.objectStoreNames.contains(STORES.CONSENTIMIENTOS)) {
          const s = db.createObjectStore(STORES.CONSENTIMIENTOS, { keyPath: 'id' });
          s.createIndex('porTipo', 'tipo');
        }

        // 'fuentes': material destilado (charlas/textos) usado como lente.
        if (!db.objectStoreNames.contains(STORES.FUENTES)) {
          db.createObjectStore(STORES.FUENTES, { keyPath: 'id' });
        }

        // 'meditaciones': meditaciones guiadas generadas (texto + metadatos de audio).
        if (!db.objectStoreNames.contains(STORES.MEDITACIONES)) {
          const s = db.createObjectStore(STORES.MEDITACIONES, { keyPath: 'id' });
          s.createIndex('porFecha', 'creadaEn');
        }
      }
    },
    blocked() {
      // Otra pestana mantiene una version anterior abierta e impide la migracion.
      console.warn('[db] Migracion bloqueada por otra pestana abierta.');
    },
    blocking() {
      // Esta conexion bloquea a otra pestana que quiere migrar: cerrar para cederle paso.
      if (promesaDB) {
        promesaDB.then((db) => db.close());
        promesaDB = null;
      }
    },
    terminated() {
      // El navegador cerro la conexion de forma inesperada: forzar reapertura.
      promesaDB = null;
    },
  });

  return promesaDB;
}

// ------------------------------------------------------------------
// Helpers genericos por store. Todos abren la DB por su cuenta, asi el
// resto del codigo no necesita gestionar la conexion.
//
// TODO (cifrado): envolver el valor en put() y desenvolver en get()/getAll()
// cuando se implemente el cifrado en reposo.
// ------------------------------------------------------------------

/**
 * Lee un registro por clave.
 * @param {string} store  Nombre del store (usar STORES.*)
 * @param {IDBValidKey} clave
 */
export async function get(store, clave) {
  const db = await abrirDB();
  return db.get(store, clave);
}

/**
 * Escribe (crea o reemplaza) un registro.
 * @param {string} store  Nombre del store (usar STORES.*)
 * @param {*} valor  Objeto a guardar. En stores con keyPath, debe incluir la clave.
 * @param {IDBValidKey} [clave]  Clave explicita (para stores sin keyPath, p. ej. perfil).
 */
export async function put(store, valor, clave) {
  const db = await abrirDB();
  // Si el store tiene keyPath, 'clave' debe ir undefined.
  return clave === undefined ? db.put(store, valor) : db.put(store, valor, clave);
}

/**
 * Devuelve todos los registros de un store.
 * @param {string} store  Nombre del store (usar STORES.*)
 */
export async function getAll(store) {
  const db = await abrirDB();
  return db.getAll(store);
}

/**
 * Elimina un registro por clave.
 * @param {string} store  Nombre del store (usar STORES.*)
 * @param {IDBValidKey} clave
 */
export async function del(store, clave) {
  const db = await abrirDB();
  return db.delete(store, clave);
}

/**
 * Vacia por completo un store (borra todos sus registros).
 * @param {string} store  Nombre del store (usar STORES.*)
 */
export async function limpiarStore(store) {
  const db = await abrirDB();
  return db.clear(store);
}
