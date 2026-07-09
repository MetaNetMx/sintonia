// Contrato critico de seguridad (PRD §2.2): la deteccion de señales de crisis
// debe disparar contencion en frases de riesgo y no alarmar en frases neutras.
import { describe, it, expect } from 'vitest';
import { detectarSenalesCrisis } from '../src/seguridad/crisis.js';

describe('detectarSenalesCrisis', () => {
  it('marca nivel alto ante ideacion de daño a si mismo', () => {
    const frases = [
      'ya no quiero vivir',
      'Me quiero morir',
      'he pensado en quitarme la vida',
      'quiero cortarme',
    ];
    for (const frase of frases) {
      expect(detectarSenalesCrisis(frase).nivel, frase).toBe('alto');
    }
  });

  it('marca nivel alto ante ideacion de daño a otros', () => {
    expect(detectarSenalesCrisis('a veces quiero hacer daño a mi jefe').nivel).toBe('alto');
  });

  it('marca nivel atencion ante deterioro o sintomas nuevos', () => {
    const frases = ['ya no puedo más', 'últimamente escucho voces', 'tuve un ataque de pánico'];
    for (const frase of frases) {
      expect(detectarSenalesCrisis(frase).nivel, frase).toBe('atencion');
    }
  });

  it('es robusta a acentos y mayusculas', () => {
    expect(detectarSenalesCrisis('YA NO QUIERO VIVIR ASÍ').nivel).toBe('alto');
  });

  it('no alarma en frases neutras', () => {
    const frases = [
      'hoy me fue bien en el trabajo',
      'quiero vivir más tranquilo',
      'me gustaría hablar de mi hermano',
    ];
    for (const frase of frases) {
      expect(detectarSenalesCrisis(frase).nivel, frase).toBe('ninguno');
    }
  });

  it('devuelve ninguno en entradas vacias', () => {
    expect(detectarSenalesCrisis('').nivel).toBe('ninguno');
    expect(detectarSenalesCrisis(undefined).nivel).toBe('ninguno');
  });
});
