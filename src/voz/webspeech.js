// Respaldo de voz con la Web Speech API del navegador (sin red, sin credenciales).
// Se usa cuando ElevenLabs falla o no hay voz clonada / consentimiento.

const IDIOMA_PREFERIDO = 'es-MX';

/**
 * Busca la mejor voz disponible priorizando es-MX y luego cualquier espanol.
 * @returns {SpeechSynthesisVoice | null}
 */
function elegirVoz() {
  if (typeof window === 'undefined' || !window.speechSynthesis) return null;
  const voces = window.speechSynthesis.getVoices();
  if (!voces || voces.length === 0) return null;

  const exacta = voces.find((v) => v.lang === IDIOMA_PREFERIDO);
  if (exacta) return exacta;

  const espanol = voces.find((v) => v.lang && v.lang.toLowerCase().startsWith('es'));
  return espanol || null;
}

/**
 * Reproduce texto con la voz del sistema. Notifica el ciclo de vida por onEstado.
 *
 * @param {Object} params
 * @param {string} params.texto
 * @param {(estado: 'reproduciendo'|'fin'|'error', detalle?: any) => void} [params.onEstado]
 * @returns {{ detener: () => void }} Control para cancelar la locucion.
 */
export function hablarWebSpeech({ texto, onEstado }) {
  const avisar = (estado, detalle) => {
    if (typeof onEstado === 'function') onEstado(estado, detalle);
  };

  if (typeof window === 'undefined' || !window.speechSynthesis) {
    avisar('error', new Error('Este navegador no soporta sintesis de voz.'));
    return { detener: () => {} };
  }
  if (!texto || !texto.trim()) {
    avisar('error', new Error('No hay texto para leer.'));
    return { detener: () => {} };
  }

  const sintetizador = window.speechSynthesis;
  // Cancelamos cualquier locucion previa para no encimar voces.
  sintetizador.cancel();

  const enunciado = new SpeechSynthesisUtterance(texto);
  enunciado.lang = IDIOMA_PREFERIDO;
  enunciado.rate = 0.95; // Ritmo sereno, acorde al confort del PRD.
  enunciado.pitch = 1;

  const voz = elegirVoz();
  if (voz) {
    enunciado.voice = voz;
    enunciado.lang = voz.lang;
  }

  enunciado.onstart = () => avisar('reproduciendo');
  enunciado.onend = () => avisar('fin');
  enunciado.onerror = (evento) => {
    // 'canceled'/'interrupted' ocurren en una detencion voluntaria: no son fallo.
    if (evento && (evento.error === 'canceled' || evento.error === 'interrupted')) {
      avisar('fin');
      return;
    }
    avisar('error', evento);
  };

  sintetizador.speak(enunciado);

  return {
    detener: () => sintetizador.cancel(),
  };
}
