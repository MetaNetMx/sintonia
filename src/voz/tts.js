// Capa de TTS configurable con respaldo (PRD §6).
// Intenta ElevenLabs (voz natural). Si el cliente no pasa voiceId, el servidor
// usa su voz por defecto. Si falla, no hay key, o el navegador bloquea el audio,
// degrada a Web Speech para que la experiencia nunca se rompa.

import { sintetizarElevenLabs } from './elevenlabs.js';
import { hablarWebSpeech } from './webspeech.js';

// Motores disponibles. Coincide con el contrato de API publica.
export const MOTOR = {
  ELEVENLABS: 'elevenlabs',
  WEBSPEECH: 'webspeech',
};

/**
 * Habla un texto eligiendo el mejor motor disponible con respaldo automatico.
 *
 * @param {Object} params
 * @param {string} params.texto
 * @param {string} [params.voiceId]  Voz (clonada o de catalogo). Sin ella, el servidor usa la voz por defecto.
 * @param {'conversacion'|'meditacion'} [params.estilo]  Estilo de locucion: la
 *   meditacion habla mas lenta y estable (Web Speech lo ignora).
 * @param {(estado: 'cargando'|'reproduciendo'|'fin'|'error', info?: any) => void} [params.onEstado]
 * @returns {Promise<{ detener: () => void, motor: string }>}
 */
export async function hablar({ texto, voiceId, estilo, onEstado }) {
  const avisar = (estado, info) => {
    if (typeof onEstado === 'function') onEstado(estado, info);
  };

  // 1) Intentar ElevenLabs (voz natural).
  try {
    avisar('cargando', { motor: MOTOR.ELEVENLABS });
    const { audio, revocar } = await sintetizarElevenLabs({ texto, voiceId, estilo });

    audio.addEventListener('playing', () => avisar('reproduciendo', { motor: MOTOR.ELEVENLABS }), {
      once: true,
    });
    audio.addEventListener('ended', () => avisar('fin', { motor: MOTOR.ELEVENLABS }), { once: true });
    audio.addEventListener('error', () => avisar('error', { motor: MOTOR.ELEVENLABS }), { once: true });

    await audio.play();

    return {
      motor: MOTOR.ELEVENLABS,
      detener: () => {
        audio.pause();
        audio.currentTime = 0;
        revocar();
      },
    };
  } catch (error) {
    // No disponible / sin key / autoplay bloqueado: degradamos a Web Speech.
    avisar('cargando', { motor: MOTOR.WEBSPEECH, motivo: error.message });
  }

  // 2) Respaldo local con la voz del sistema.
  const control = hablarWebSpeech({
    texto,
    onEstado: (estado, detalle) => avisar(estado, { motor: MOTOR.WEBSPEECH, detalle }),
  });

  return {
    motor: MOTOR.WEBSPEECH,
    detener: control.detener,
  };
}
