// Nombre visible de la app. PROVISIONAL. Importar SIEMPRE desde aqui; nunca hardcodear.
export const NOMBRE_APP = 'Sintonia'; /* PROVISIONAL */

// Configuracion global: flags, modelo de IA por defecto y endpoints serverless.
// El cliente solo llama rutas /api/*; los secretos viven server-side.
export const CONFIG = {
  modeloIA: 'claude-sonnet-5',
  endpoints: {
    anthropic: '/api/anthropic',
    guion: '/api/guion',
    tts: '/api/tts',
    transcribir: '/api/transcribir',
    voces: '/api/voces',
    clonarVoz: '/api/voz-clonar',
    borrarVoz: '/api/voz-borrar',
    destilar: '/api/destilar',
  },
  flags: {
    vozHabilitada: true,
  },
};
