// Contrato del algoritmo "de la fuente a la practica" (PRD §16): la validacion
// de guiones y la salud del guion de respaldo curado.
import { describe, it, expect } from 'vitest';
import { guionValido, respaldoNeutro, GUION_RESPALDO } from '../src/flujo/guion.js';

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

  it('endurecido (auditoria 2026-07-09): id kebab, 2 preguntas, 2+ pasos con sustancia', () => {
    const base = GUION_RESPALDO.ejes[0];
    const conEje = (eje) => ({ ...GUION_RESPALDO, ejes: [{ ...base, ...eje }] });
    expect(guionValido(conEje({ id: 'ID Invalido!' }))).toBe(false);
    expect(guionValido(conEje({ preguntas: ['una sola'] }))).toBe(false);
    expect(guionValido(conEje({ preguntas: ['ok', '   '] }))).toBe(false);
    expect(guionValido(conEje({ practica: { ...base.practica, pasos: ['solo uno'] } }))).toBe(
      false,
    );
    expect(guionValido(conEje({ practica: { ...base.practica, titulo: '' } }))).toBe(false);
  });
});

describe('respaldoNeutro (auditoria 2026-07-09): sin mezclar fuentes', () => {
  it('deriva de la fuente actual y pasa la validacion', () => {
    const fuente = { id: 'x', titulo: 'El perdón', resumen: 'Soltar el acuerdo con la ofensa.' };
    const neutro = respaldoNeutro(fuente);
    expect(guionValido(neutro)).toBe(true);
    expect(JSON.stringify(neutro)).toContain('El perdón');
    // No debe hablar de la charla curada de "Informacion".
    expect(JSON.stringify(neutro).toLowerCase()).not.toContain('ingerimos');
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
