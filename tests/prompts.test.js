// Metodo del analista (decision de Ernesto, 2026-07-12): analisis riguroso,
// disonancia cognitiva honesta e interaccion socratica — SIEMPRE subordinados
// a las reglas duras del PRD §2.
import { describe, it, expect } from 'vitest';
import { componerSistema, SISTEMA_ACOMPANAMIENTO } from '../src/ia/prompts.js';

describe('metodo del analista en el system prompt', () => {
  it('incluye los tres movimientos: analisis, disonancia y metodo socratico', () => {
    const s = componerSistema({ lente: 'lente de prueba con sustancia' });
    expect(s).toMatch(/ANALISIS RIGUROSO DE LA FUENTE/);
    expect(s).toMatch(/DISONANCIA COGNITIVA HONESTA/);
    expect(s).toMatch(/INTERACCION SOCRATICA/);
    expect(s).toMatch(/UNA sola pregunta por turno/);
    expect(s).toMatch(/NO MAS DE 3 preguntas/i);
    expect(s).toMatch(/invitacion formal a indagar/i);
  });

  it('las reglas duras van primero y el metodo se les subordina', () => {
    for (const s of [SISTEMA_ACOMPANAMIENTO, componerSistema({ lente: 'x'.repeat(20) })]) {
      const posReglas = s.indexOf('REGLAS QUE NUNCA ROMPES');
      const posMetodo = s.indexOf('PROPOSITO Y METODO');
      expect(posReglas).toBeGreaterThanOrEqual(0);
      expect(posMetodo).toBeGreaterThan(posReglas);
      expect(s).toMatch(/subordinado a las reglas/i);
      // La disonancia se suspende ante crisis: manda la contencion.
      expect(s).toMatch(/SE SUSPENDE y manda la contencion/);
    }
  });

  it('la disonancia no impone la fuente: ambas perspectivas y la persona decide', () => {
    const s = SISTEMA_ACOMPANAMIENTO;
    expect(s).toMatch(/AMBAS perspectivas/);
    expect(s).toMatch(/La persona siempre decide/);
  });

  it('invita, no presiona (auditoria 2026-07-12): permiso antes de confrontar', () => {
    const s = SISTEMA_ACOMPANAMIENTO;
    expect(s).not.toMatch(/obligue/);
    expect(s).toMatch(/la INVITE a pensar/);
    expect(s).toMatch(/pide permiso/i);
    expect(s).toMatch(/que ELLA misma quiera alcanzar/);
  });
});
