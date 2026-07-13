// Estilos de locucion del proxy TTS (plan pro ElevenLabs, 2026-07-12):
// conversacion = agil y economica; meditacion = lenta, estable y expresiva.
import { describe, it, expect } from 'vitest';
import { AJUSTES_ESTILO, resolverEstilo } from '../api/tts.js';

describe('estilos de voz (api/tts.js)', () => {
  it('resolverEstilo cae a conversacion ante valores desconocidos', () => {
    expect(resolverEstilo('meditacion')).toBe('meditacion');
    expect(resolverEstilo('conversacion')).toBe('conversacion');
    expect(resolverEstilo('otro')).toBe('conversacion');
    expect(resolverEstilo(undefined)).toBe('conversacion');
    // Un nombre heredado de Object no cuenta como estilo.
    expect(resolverEstilo('toString')).toBe('conversacion');
  });

  it('la meditacion habla mas lento y estable que la conversacion', () => {
    const m = AJUSTES_ESTILO.meditacion.voice_settings;
    const c = AJUSTES_ESTILO.conversacion.voice_settings;
    expect(m.speed).toBeLessThan(c.speed);
    expect(m.stability).toBeGreaterThan(c.stability);
  });

  it('cada estilo usa el modelo verificado en la cuenta', () => {
    expect(AJUSTES_ESTILO.conversacion.modelo).toBe('eleven_turbo_v2_5');
    expect(AJUSTES_ESTILO.meditacion.modelo).toBe('eleven_multilingual_v2');
  });
});
