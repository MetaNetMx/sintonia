// Contrato del algoritmo "de la fuente a la practica" (PRD §16): la validacion
// de guiones y la salud del guion de respaldo curado.
import { describe, it, expect } from 'vitest';
import { guionValido, GUION_RESPALDO } from '../src/flujo/guion.js';

describe('guionValido', () => {
  it('acepta el guion de respaldo curado', () => {
    expect(guionValido(GUION_RESPALDO)).toBe(true);
  });

  it('rechaza guiones sin esencia, sin apertura o sin ejes', () => {
    expect(guionValido(null)).toBe(false);
    expect(guionValido({})).toBe(false);
    expect(guionValido({ ...GUION_RESPALDO, esencia: '' })).toBe(false);
    expect(guionValido({ ...GUION_RESPALDO, preguntaApertura: '' })).toBe(false);
    expect(guionValido({ ...GUION_RESPALDO, ejes: [] })).toBe(false);
  });

  it('rechaza ejes malformados', () => {
    const roto = {
      ...GUION_RESPALDO,
      ejes: [{ id: 'x', titulo: 'X', preguntas: [], practica: { titulo: 'p', pasos: [] } }],
    };
    expect(guionValido(roto)).toBe(false);
  });
});

describe('GUION_RESPALDO (curado)', () => {
  it('tiene entre 3 y 5 ejes, cada uno con 2 preguntas y practica accionable', () => {
    expect(GUION_RESPALDO.ejes.length).toBeGreaterThanOrEqual(3);
    expect(GUION_RESPALDO.ejes.length).toBeLessThanOrEqual(5);
    for (const eje of GUION_RESPALDO.ejes) {
      expect(eje.preguntas.length, eje.id).toBeGreaterThanOrEqual(2);
      expect(eje.practica.pasos.length, eje.id).toBeGreaterThanOrEqual(2);
    }
  });

  it('excluye la zona roja etica (comida/agua como salud, PRD §2)', () => {
    const texto = JSON.stringify(GUION_RESPALDO).toLowerCase();
    // Terminos que el destilado marca como zona roja y NO deben operacionalizarse.
    for (const prohibido of ['dieta', 'no bebas', 'agua del grifo', 'enfermedad']) {
      expect(texto).not.toContain(prohibido);
    }
  });
});
