// Registro de fuentes destiladas.
//
// Cada fuente semanal que Ernesto entrega (texto, .md o video de YouTube) se
// destila con la plantilla de fuentes/plantilla-destilado.md y se registra
// aqui para que aparezca en la vista de Fuentes (ver PRD §3 y §10).
//
// El id debe coincidir con el nombre del destilado en la carpeta fuentes/
// (nomenclatura AAAA-SS-titulo, en ASCII sin acentos).

/**
 * @typedef {Object} Fuente
 * @property {string} id            Identificador estable (ej. '2026-28-sintonia-y-silencio').
 * @property {string} titulo        Titulo legible de la fuente.
 * @property {string} fecha         Fecha de la fuente en formato AAAA-MM-DD.
 * @property {string} resumen       Resumen breve (dos o tres frases).
 * @property {string} rutaDestilado Ruta relativa al .md del destilado en fuentes/.
 */

// El destilado completo se importa como texto (?raw) para alimentar el
// algoritmo "de la fuente a la practica" (generacion del guion, PRD §16).
import destiladoInformacion from '../../fuentes/2026-28-informacion-destilado.md?raw';

/** @type {Fuente[]} */
export const FUENTES = [
  {
    id: '2026-28-informacion',
    titulo: 'Información (charla 53)',
    fecha: '2026-07-08',
    resumen:
      'Todo es información: cuerpo, agua, comida, relaciones, medios y memorias ' +
      'contienen información que ingerimos sin darnos cuenta y que nos estructura. ' +
      'El trabajo es discernir de qué nos alimentamos y sintonizar el corazón con ' +
      'lo que "calibra" alto.',
    rutaDestilado: 'fuentes/2026-28-informacion-destilado.md',
    destilado: destiladoInformacion,
  },
];

/**
 * Fuente activa: la primera del registro (la mas reciente). Cuando Ernesto
 * entrega una fuente nueva, se agrega al inicio y TODO el flujo se reconfigura
 * solo (guion nuevo, preguntas nuevas, practicas nuevas).
 * @returns {Fuente | null}
 */
export function fuenteActiva() {
  return FUENTES[0] || null;
}

/**
 * Devuelve una fuente destilada por su id.
 * @param {string} id
 * @returns {Fuente | undefined}
 */
export async function leerFuente(id) {
  return FUENTES.find((fuente) => fuente.id === id);
}
