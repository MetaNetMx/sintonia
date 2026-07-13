// Hook: la VOZ PROPIA clonada de la persona, si existe (PRD §6).
// Lee el consentimiento persistido y devuelve el voiceId de la voz clonada,
// o null si no hay. Las paginas lo usan para que meditaciones y respuestas
// suenen con la voz de la persona: "escucharte a ti mismo guiandote".

import { useCallback, useEffect, useState } from 'react';

export function useVozPropia() {
  const [voiceId, setVoiceId] = useState(null);

  const recargar = useCallback(() => {
    let vivo = true;
    import('../datos/consentimientos.js')
      .then((m) => m.leerConsentimientoVoz())
      .then((registro) => {
        if (vivo) setVoiceId(registro?.otorgado === true ? registro.voiceId || null : null);
      })
      .catch(() => {
        /* sin persistencia disponible */
      });
    return () => {
      vivo = false;
    };
  }, []);

  useEffect(recargar, [recargar]);

  return { vozPropia: voiceId, recargarVozPropia: recargar };
}
