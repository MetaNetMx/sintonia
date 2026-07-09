# Notas de sesión — 2026-07-07 / 2026-07-08

> Bitácora de trabajo entre Ernesto (dirección clínica y creativa) y Claude
> (socio de diseño y desarrollo). Complementa al **PRD.md**, que sigue siendo
> la fuente de verdad. Versión del proyecto al cierre: **v0.6**.

---

## Decisiones clave (y su porqué)

| # | Decisión | Porqué |
|---|---|---|
| 1 | **PRD.md como fuente de verdad** — se revisa antes de tocar código; ante duda o auditoría externa, el PRD manda | Petición explícita de Ernesto; permite que otras IAs auditen el proyecto |
| 2 | **Construir el andamiaje antes de cerrar la entrevista (Fase 0)** | Ernesto priorizó tener app funcionando; la Fase 0 queda pausada, no cancelada |
| 3 | **Stack:** React 18 + Vite + Tailwind v4 (CSS-first) + PWA, JavaScript/JSX (no TS), IndexedDB (idb), deploy Vercel | Menos fricción para iterar; local-first por privacidad (PRD §7) |
| 4 | **Nombre provisional "Sintonía"** — una sola constante `NOMBRE_APP` | Reversible en un solo lugar; nombre definitivo pendiente |
| 5 | **Primera fuente destilada:** charla 53 "Información" → `fuentes/2026-28-informacion-destilado.md` | Ritual semanal: Ernesto entrega fuente → Claude destila → todo se reconfigura |
| 6 | **Eje comida/agua-como-salud EXCLUIDO del producto** (vive solo en el destilado) | Zona roja ética: riesgo de miedo/ortorexia y lectura clínica (PRD §2.1, §2.3) |
| 7 | **Palabra ambiente: "sintonía"** | Elegida por Ernesto entre las opciones del destilado |
| 8 | **Sesiones cortas y enfocadas** — feedback de Ernesto: las charlas largas no funcionan | Reemplaza el flujo largo (§14) por la **Sesión exprés** (§16) |
| 9 | **Algoritmo "de la fuente a la práctica":** guion **auto-generado** por la app (`api/guion.js`), sesión **exprés ~4 turnos**, **la fuente abre** | Las 3 decisiones las tomó Ernesto; auto-reflexivo: fuente nueva → preguntas y prácticas nuevas sin reprogramar |
| 10 | **Voz:** ElevenLabs con respaldo Web Speech; transcripción con ElevenLabs Scribe (una sola clave); selector filtrado a **solo voces mexicanas** | Pedido de Ernesto; en plan gratuito las voces MX no funcionan por API → fallback a voz de catálogo hasta el plan pro |
| 11 | **Repo propio y público:** https://github.com/MetaNetMx/sintonia | Para auditoría por IAs externas con solo la URL; verificado sin secretos |

## Qué se construyó y verificó

- **Andamiaje completo** (v0.2): app shell, 6 páginas, seguridad (crisis→contención, SAPTEL/Línea de la Vida/911), datos local-first con exportar/borrar, proxies serverless sin secretos en cliente. `npm run build` verde.
- **Sesión exprés** (v0.5–v0.6): Apertura (la fuente propone) → Resonar (IA elige UN eje) → Concretar (2ª pregunta) → Práctica personalizada + cierre + meditación escuchable. Guion generado en vivo desde la charla 53 (4 ejes, filtrado éticamente). **Verificado E2E: 3 turnos reales sanos.**
- **Conversación por voz** (v0.4): notas de voz → Scribe → IA → respuesta con voz natural. TTS y STT verificados con la clave real (23 voces, audio real, transcripción correcta es-MX).
- **Puente de desarrollo**: `npm run dev` sirve `/api` localmente leyendo `.env.local` (sin necesitar Vercel).

## Bugs corregidos en la sesión

1. **Contrato cliente↔proxy de IA** (`rol/contenido` vs `role/content`) — habría roto el chat en runtime.
2. **`.env.local` no tenía precedencia** sobre una clave ambiente inválida → la IA daba 401. Corregido en `vite.config.js`.
3. **TTS 502**: la voz por defecto no existía en la cuenta → ahora toma la primera voz válida; y si la voz elegida requiere plan de pago (402), reintenta con voz de catálogo.
4. **Respuestas vacías en la Sesión exprés** (el error "No pude conectar…"): `claude-sonnet-5` razona internamente por defecto y ese razonamiento consumía el `max_tokens`. Fix: el proxy trata `maxTokens` como presupuesto de TEXTO y suma margen de razonamiento (+3072); modo exprés usa `esfuerzo: low` (turnos más ágiles).

## Estado actual

- **Corre local completo:** `cd terapia && npm run dev` → http://localhost:5173 (requiere `ANTHROPIC_API_KEY` en `.env.local`; ya puesta).
- **ElevenLabs:** clave gratuita puesta; voz natural funciona con voz de catálogo (no mexicana aún).
- **Repo:** publicado y al día (`main`, v0.6).

## Próximos pasos

1. **[Ernesto, mañana]** Poner la clave **pro de ElevenLabs** en `.env.local` y reiniciar `npm run dev` → entran solas las **voces mexicanas** (selector ya filtrado a es-MX).
2. **[Juntos]** Construir la **clonación de la voz de Ernesto** (grabación + consentimiento ya diseñados): cierra la visión de "escucharte a ti mismo guiándote". Incluye reconciliar el contrato de `voz-clonar` y crear `api/voz-borrar.js` (revocación real del dato biométrico) — deuda PRD §13.
3. **[Ernesto]** Probar la Sesión exprés arreglada y dar feedback del ritmo (¿4 turnos se sienten bien?).
4. **[Semanal]** Entregar la **fuente #2** → Claude destila → registrar en `src/fuentes/registro.js` → el algoritmo regenera preguntas y prácticas solo.
5. **[Pendiente]** Retomar la **entrevista (Fase 0)** y los **3 conceptos** de plataforma; decidir **nombre definitivo**.
6. **[Deuda técnica]** Cifrado en reposo de IndexedDB; iconos PWA (192/512); deploy a Vercel (Root Directory = `terapia`, env vars server-side).

## Cómo pedir una auditoría externa

> "Audita https://github.com/MetaNetMx/sintonia — lee primero PRD.md (reglas
> éticas §2, voz §6, algoritmo central §16, deuda §13) y evalúa si el código
> cumple lo que el PRD promete."
