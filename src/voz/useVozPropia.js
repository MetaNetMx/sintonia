// Hook: la VOZ PROPIA clonada de la persona, si existe (PRD §6).
// Lee el consentimiento persistido y devuelve el voiceId de la voz clonada,
// o null si no hay. Las paginas lo usan para que meditaciones y respuestas
// suenen con la voz de la persona: "escucharte a ti mismo guiandote".

import { useCallback, useEffect, useState } from 'react';

export function useVozPropia() {
  const [voiceId, setVoiceId] = useState(null);
  // Uso en conversaciones: opt-in separado (hallazgo Alta 2026-07-12) — el
  // consentimiento base cubre meditaciones; leer respuestas de la IA con la
  // voz de la persona requiere permiso explicito, apagado por defecto.
  const [enConversacion, setEnConversacion] = useState(false);

  const recargar = useCallback(() => {
    let vivo = true;
    import('../datos/consentimientos.js')
      .then((m) => m.leerConsentimientoVoz())
      .then((registro) => {
        if (!vivo) return;
        const otorgado = registro?.otorgado === true;
        setVoiceId(otorgado ? registro.voiceId || null : null);
        setEnConversacion(otorgado && registro?.usos?.conversaciones === true);
      })
      .catch(() => {
        /* sin persistencia disponible */
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(recargar, [recargar]);

  return { vozPropia: voiceId, vozEnConversacion: enConversacion, recargarVozPropia: recargar };
}
