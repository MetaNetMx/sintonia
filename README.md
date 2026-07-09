# Acompanamiento (nombre provisional: "Sintonia")

Plataforma de **acompanamiento psicologico / coaching**. **No es tratamiento medico**: es
un apoyo complementario, nunca un sustituto de atencion profesional. El primer usuario del
prototipo es el propio psicologo (Ernesto).

> El nombre visible de la app es **provisional**. Nunca se escribe a mano: se importa siempre
> desde [`src/config/app.js`](src/config/app.js) (constante `NOMBRE_APP`).

## Fuente de verdad

El documento [`PRD.md`](PRD.md) es la fuente de verdad del proyecto: reglas duras, voz,
privacidad, accesibilidad y stack. **Se lee antes de escribir codigo** y no se contradice.

## Como correr

Requisitos: Node >= 18.

```bash
npm install
npm run dev        # servidor de desarrollo (Vite)
npm run build      # build de produccion (solo cliente) en dist/
npm run preview    # sirve el build para revisarlo
```

## Seguridad: NUNCA hay secretos en el cliente

- Ninguna clave / API key vive en el codigo del navegador.
- Toda llamada con credencial (Anthropic, ElevenLabs) pasa por **funciones serverless** en
  `api/`, que leen `process.env`. El cliente solo llama rutas `/api/*`.
- El build de Vite es **solo cliente** y no depende de `api/`.
- Variables de entorno: ver [`.env.example`](.env.example). Copiar a `.env.local` (ignorado
  por git). No usar el prefijo `VITE_` con secretos.

## Despliegue (Vercel)

Se despliega en Vercel con **Root Directory = `terapia`**. El framework es Vite
(ver [`vercel.json`](vercel.json)). Las funciones serverless viven en `api/` (dentro de este
mismo directorio raiz) y Vercel las despliega automaticamente; el cliente solo las consume por
rutas `/api/*`.

## Stack

React 18 + Vite + Tailwind CSS v4 (config CSS-first) + react-router-dom v6 + IndexedDB (`idb`) +
PWA (`vite-plugin-pwa`). JavaScript + JSX (sin TypeScript). Local-first: sin backend de datos.
