// Contrato de los directores de la sesion expres (PRD §16): los marcadores que
// la app parsea (EJE:, MEDITACION:) deben estar instruidos en los prompts.
import { describe, it, expect } from 'vitest';
import {
  PASOS,
  MAX_TOKENS_EXPRES,
  ESFUERZO_EXPRES,
  directorElegirEje,
  directorConcretar,
  directorPractica,
} from '../src/flujo/etapas.js';
import { GUION_RESPALDO } from '../src/flujo/guion.js';

describe('directores de la sesion expres', () => {
  it('directorElegirEje instruye el marcador EJE: y lista todos los ejes', () => {
    const director = directorElegirEje(GUION_RESPALDO);
    expect(director).toContain('EJE: <id>');
    for (const eje of GUION_RESPALDO.ejes) {
      expect(director, eje.id).toContain(eje.id);
    }
  });

  it('directorConcretar usa la segunda pregunta del eje', () => {
    const eje = GUION_RESPALDO.ejes[0];
    expect(directorConcretar(eje)).toContain(eje.preguntas[1]);
  });

  it('directorPractica instruye el marcador MEDITACION: y los pasos', () => {
    const eje = GUION_RESPALDO.ejes[0];
    const director = directorPractica(eje);
    expect(director).toContain('MEDITACION:');
    expect(director).toContain(eje.practica.titulo);
  });

  it('configuracion expres: 4 pasos visibles, texto acotado, esfuerzo bajo', () => {
    expect(PASOS).toHaveLength(4);
    expect(MAX_TOKENS_EXPRES).toBeGreaterThanOrEqual(200);
    expect(MAX_TOKENS_EXPRES).toBeLessThanOrEqual(1024);
    expect(ESFUERZO_EXPRES).toBe('low');
  });
});
