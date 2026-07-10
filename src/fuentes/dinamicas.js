// Fuentes DINAMICAS (PRD §3, decision de Ernesto 2026-07-09): la fuente
// semanal se actualiza desde la propia app — Ernesto pega la charla en la
// pagina Fuentes, /api/destilar produce destilado + lente con el filtro etico,
// y se guarda aqui (IndexedDB, local-first). La dinamica mas reciente es la
// ACTIVA; si no hay dinamicas, se usa el registro estatico del repo.
// Conviven en el store 'fuentes' con el cache de guiones ('guion:<id>').

import { STORES, put, getAll, del } from '../datos/db.js';
import { fuenteActiva as fuenteEstatica } from './registro.js';
import { LENTE_ACTIVA } from './lente.js';

const PREFIJO = 'fuente:';

/**
 * Guarda (y con ello ACTIVA) una fuente destilada por /api/destilar.
 * @param {object} fuente  { id, titulo, fecha, resumen, destilado, lente }
 * @returns {Promise<object>} El registro persistido.
 */
export async function guardarFuenteDinamica({ id, titulo, fecha, resumen, destilado, lente } = {}) {
  if (!id || typeof destilado !== 'string' || !destilado.trim()) {
    throw new Error('Fuente incompleta: falta el id o el destilado.');
  }
  const registro = {
    id: `${PREFIJO}${id}`,
    fuenteId: id,
    titulo: titulo || id,
    fecha: fecha || new Date().toISOString().slice(0, 10),
    resumen: resumen || '',
    destilado,
    lente: lente || '',
    creadaEn: new Date().toISOString(),
  };
  await put(STORES.FUENTES, registro);
  return registro;
}

/** Lista las fuentes dinamicas, mas recientes primero. */
export async function listarFuentesDinamicas() {
  const todo = await getAll(STORES.FUENTES);
  return todo
    .filter((r) => typeof r?.id === 'string' && r.id.startsWith(PREFIJO))
    .sort((a, b) => (b.creadaEn || '').localeCompare(a.creadaEn || ''));
}

/** Quita una fuente dinamica; la activa pasa a la anterior (o a la estatica). */
export async function eliminarFuenteDinamica(fuenteId) {
  await del(STORES.FUENTES, `${PREFIJO}${fuenteId}`);
  // Invalida tambien los guiones cacheados de esa fuente (hallazgo Media
  // 2026-07-09: quedaban huerfanos y podian re-servirse).
  try {
    const todo = await getAll(STORES.FUENTES);
    await Promise.all(
      todo
        .filter(
          (r) =>
            typeof r?.id === 'string' && r.id.startsWith('guion:') && r.fuenteId === fuenteId
        )
        .map((r) => del(STORES.FUENTES, r.id))
    );
  } catch {
    /* limpieza de cache opcional */
  }
}

/**
 * La fuente activa de la app: la dinamica mas reciente o, si no hay,
 * la estatica del registro del repo. Nunca lanza: sin IndexedDB cae
 * a la estatica.
 * @returns {Promise<object|null>}
 */
export async function cargarFuenteActiva() {
  try {
    const dinamicas = await listarFuentesDinamicas();
    if (dinamicas.length > 0) {
      const f = dinamicas[0];
      return {
        id: f.fuenteId,
        titulo: f.titulo,
        fecha: f.fecha,
        resumen: f.resumen,
        destilado: f.destilado,
        lente: f.lente,
        dinamica: true,
      };
    }
  } catch {
    /* sin IndexedDB: cae a la estatica */
  }
  return fuenteEstatica();
}

/**
 * Lente para el system prompt: la generada junto con la fuente (ya filtrada
 * por /api/destilar) o, para el registro estatico, la lente curada a mano.
 * @param {object|null} fuente
 * @returns {string}
 */
export function lenteDeFuente(fuente) {
  const propia = (fuente?.lente || '').trim();
  return propia || LENTE_ACTIVA;
}
