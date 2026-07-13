# PRD — Plataforma de Acompañamiento Psicológico

> **Nombre del producto:** por definir (ver §11, Decisiones abiertas)

| | |
|---|---|
| **Versión** | 0.2 — *constitución + andamiaje construido* |
| **Fecha** | 2026-07-08 |
| **Estado** | Andamiaje construido y verificado (`npm run build` OK) · Entrevista (Fase 0) pendiente de retomar |
| **Autores** | Ernesto Ramírez — psicólogo, dirección clínica y creativa · Claude — socio de diseño y desarrollo |
| **Repositorio** | https://github.com/MetaNetMx/sintonia (público, para auditoría externa) |
| **Idioma del producto** | Español (es-MX) en código y UI |

---

## 0. Cómo se usa este documento

- Es la **fuente de verdad** del proyecto. Se revisa **antes** de escribir cualquier línea de código.
- Ante **duda, contradicción o error** de implementación, este documento manda. Si el documento está equivocado, se corrige aquí *primero* y luego se toca el código.
- Está escrito para que una **IA o persona externa** que audite el proyecto entienda de qué trata, qué está permitido y qué no.
- Es un **documento vivo**: crece por fases, con changelog al final (§12).
- **Ningún cambio de fase se da por cerrado sin acuerdo explícito de Ernesto.**

---

## 1. Visión

Una plataforma de acompañamiento psicológico / coaching que lleve el acompañamiento a territorios que la psicología convencional aún no ha caminado: **exploración interior, sentido, conciencia, conexión.**

Buscamos **máximo rigor creativo** —proponer formatos, metáforas y experiencias que nadie más ha intentado— **sin perder rigor ético**.

El **primer usuario del prototipo es Ernesto mismo**. El diseño empieza en él y desde ahí se generaliza.

---

## 2. Principios rectores — REGLAS DURAS (no se rompen nunca)

Estas reglas son la columna vertebral ética. Cualquier función, texto o flujo que las contradiga **no se construye**.

1. **Acompañamiento complementario, NO tratamiento médico.**
   - No diagnosticar. No prescribir. No prometer cura ni resultados clínicos.
   - El lenguaje del producto nunca se presenta como sustituto de atención profesional.

2. **Derivación ante crisis.**
   - Ante señales de ideación de daño (a sí mismo o a otros), deterioro, o **síntomas neurológicos/psiquiátricos nuevos**, se pausa el diseño/experiencia y se prioriza **contención + derivación a ayuda profesional y humana**.
   - Debe existir siempre una vía visible hacia ayuda real (líneas de crisis, profesional humano).

3. **No reforzar miedo ni rumiación.**
   - El contenido y las dinámicas no alimentan bucles de ansiedad, catastrofización ni auto-vigilancia obsesiva.

4. **Transparencia entre lo espiritual y lo clínico.**
   - Lo "espiritual/energético" se presenta **explícitamente como marco de exploración y sentido**, claramente distinguido de afirmaciones clínicas.
   - El usuario siempre sabe cuándo está en territorio metafórico y cuándo en territorio verificable. (Ver glosario §10.)

5. **Soberanía de los datos sensibles.**
   - Perfil, voz y conversaciones: **local primero**, cifrado cuando se pueda.
   - **Exportar** y **borrar** siempre disponibles, sin fricción.
   - **Sin claves/secretos en el cliente.** Toda API con secreto va por proxy server-side.

6. **Confort visual.**
   - Movimiento mínimo. Respetar `prefers-reduced-motion`. Nada que agreda o sobre-estimule.

---

## 3. La Fuente (guía conceptual)

- Ernesto aporta **una fuente por semana** (texto, `.md`, audio o video de YouTube): charlas de un colega que trabaja desde la idea de **sintonía con una energía / pensamiento universal**.
- La fuente es la **LENTE** con la que diseñamos la experiencia terapéutica — **guía, no dogma**.
- **Tarea de Claude con cada fuente:**
  1. Leerla y **destilarla**: ideas-fuerza, lenguaje, cosmovisión.
  2. Devolver un **mapa conceptual** en texto: temas, tensiones, y qué es **traducible** a una experiencia digital de acompañamiento.
  3. Marcar con honestidad qué afirmaciones son **metafóricas/espirituales** y cuáles podrían leerse como **clínicas** (para no confundir al usuario).

> **Estado:** ⏳ Pendiente de recibir la primera fuente.

---

## 4. Fases del proyecto (y cómo trabajamos)

No se avanza de fase sin cerrar la anterior con Ernesto.

| Fase | Descripción | Estado |
|---|---|---|
| **Fuente** | Destilar la fuente y devolver mapa conceptual + distinción metafórico/clínico | ⏳ Esperando la fuente |
| **Fase 0 — Entrevista** | Claude entrevista a Ernesto (una pregunta a la vez, tono cálido y directo) y construye un *perfil vivo*. Al cerrar: resumen + **3 conceptos** de plataforma | ⏸️ Pausada (pospuesta por decisión de Ernesto para adelantar el andamiaje) |
| **Fase 1 — Elección de concepto** | Ernesto elige un concepto con Claude | ⬜ Pendiente |
| **Fase 2 — Arquitectura** | Diseño técnico y de experiencia por incrementos | 🟡 Andamiaje inicial construido y verificado (ver §13) |
| **Fase 3+ — Construcción** | Se construye por incrementos, revisando este PRD antes de cada uno | 🟡 En marcha (andamiaje) |

> **Nota (2026-07-08):** por decisión de Ernesto se adelantó la **construcción del andamiaje técnico** (scaffold) antes de cerrar la entrevista y la elección de concepto. El andamiaje es **neutral respecto al concepto final**: implementa las reglas duras y los subsistemas base (voz, IA, datos, seguridad, fuentes), no una apuesta creativa concreta. La entrevista (Fase 0) y la elección de concepto (Fase 1) quedan pendientes de retomar.

---

## 5. Perfil del usuario primario (Ernesto) — *documento vivo*

> Se completa durante la Fase 0. Campos a llenar con la entrevista:
> - Qué busca / qué lo mueve
> - Qué formatos le resuenan
> - Qué lo haría sentir *acompañado*
> - Tono y lenguaje que le funcionan / lo alejan
> - Señales de contexto (no clínicas) relevantes para el diseño

*(Vacío por ahora — se llena pregunta a pregunta.)*

---

## 6. Arquitectura de voz *(clave del producto)*

- Integración con **ElevenLabs vía API**. Se empieza clonando **la voz de Ernesto** (él aporta la key).
- **Objetivo final:** que cualquier usuario pueda clonar **su propia voz** y recibir meditaciones guiadas donde se escuche **a sí mismo guiándose**.
- **La voz es dato biométrico** y se trata como tal.

**Requisitos de diseño (desde ya):**
- **Flujo de consentimiento explícito** para clonar voz: qué se graba, dónde se guarda, cuánto tiempo, cómo se borra. Consentimiento informado, revocable.
- **Capa de TTS configurable con respaldo:** si ElevenLabs falla o no hay consentimiento/clonación, degradar a **Web Speech API**.
- **Manejo de la key server-side / por proxy** — nunca embebida en el cliente.

---

## 7. Privacidad y manejo de datos

- **Local primero** (estado local + IndexedDB), cifrado cuando sea posible.
- **Exportar** y **borrar** todo, siempre, sin fricción.
- Datos sensibles cubiertos: **perfil, voz, conversaciones**.
- Ningún secreto vive en el cliente; toda llamada con credencial pasa por función serverless / proxy.

---

## 8. Accesibilidad y confort visual

- Respetar `prefers-reduced-motion` (movimiento mínimo por defecto).
- Contraste y legibilidad cuidados; nada de estímulos abruptos.
- La calma es un requisito funcional, no un adorno.

---

## 9. Stack técnico *(tentativo — a discutir en Fase 2)*

- **Frontend:** React 18 + Vite + Tailwind, **PWA instalable**.
- **Estado/datos:** estado local + IndexedDB.
- **IA:** API de **Anthropic** vía **proxy server-side**.
- **Voz:** **ElevenLabs** con **respaldo Web Speech**.
- **Deploy:** **Vercel** con funciones serverless.
- **Idioma:** es-MX en código y UI.

> **Confirmado y en uso (v0.2):** stack implementado en el andamiaje. Decisiones adicionales: **JavaScript + JSX** (no TypeScript) y **Tailwind v4** (config CSS-first, sin `tailwind.config.js`).

---

## 10. Glosario: lo metafórico/espiritual vs. lo clínico

> Se construye al destilar la fuente (Fase Fuente). Objetivo: que ningún término espiritual/energético se presente al usuario como afirmación clínica sin marcarlo.

*(Vacío por ahora.)*

---

## 11. Decisiones

**Decididas (v0.2):**
- **Lenguaje:** JavaScript + JSX (no TypeScript), para iterar con menos fricción. Reversible.
- **Estilos:** Tailwind v4 (config CSS-first, sin `tailwind.config.js`).
- **Ubicación:** la app vive en `terapia/`, subcarpeta del repo git `sergi/` (el transcriptor de YouTube, en Python). El build de Vite es solo cliente; las funciones `/api` las despliega Vercel con **Root Directory = `terapia`**.
- **Nombre provisional:** `Sintonía` (constante `NOMBRE_APP` en `src/config/app.js`). Se cambia en un solo lugar.
- **Modelo IA por defecto:** `claude-sonnet-5` (configurable por `ANTHROPIC_MODEL`; lista blanca en `api/_lib/config.js`).

**Decidida (v0.6):** **Repositorio propio:** `terapia/` tiene su propio repo git publicado en **https://github.com/MetaNetMx/sintonia** (público, para auditoría por IAs externas). El transcriptor sigue en su repo aparte.

**Abiertas:**
- **Nombre definitivo** del producto.
- **Concepto de producto** (pendiente de Fase 0/1): la apuesta creativa concreta.
- **Alcance del primer incremento con fuente real.**

---

## 12. Changelog

- **v0.6 (2026-07-08):** **Fix crítico del proxy de IA:** `claude-sonnet-5` razona internamente por defecto (adaptive thinking) y ese razonamiento consume `max_tokens`; con el límite exprés de 400 la respuesta podía llegar **vacía** ("No pude conectar…"). Ahora el proxy trata `maxTokens` como presupuesto de TEXTO y suma un margen de razonamiento (+3072), y acepta `esfuerzo` (`low` en modo exprés → turnos más ágiles). `api/guion.js` sube a 6000 tokens. ✔️ Verificado E2E: 3 turnos completos con texto sano. Proyecto publicado en GitHub para auditoría externa.
- **v0.5 (2026-07-08):** **Algoritmo "de la fuente a la práctica"** (§16): la Sesión larga se reemplaza por una **Sesión exprés** (~4 turnos) que **abre la fuente** y aterriza en una práctica concreta. Nuevo endpoint `api/guion.js` que genera automáticamente el guion (ejes + preguntas concretas + prácticas) desde el destilado de la fuente activa, con las reglas duras integradas; caché por fuente en IndexedDB (auto-reflexivo: fuente nueva → guion nuevo); guion de respaldo curado. Respuestas breves (`maxTokens` acotado). **Fix de API de voz:** si la voz elegida requiere plan de pago (402), el TTS reintenta con una voz de catálogo usable (verificado: 200 audio/mpeg). ✔️ Generador verificado en vivo con la charla 53 (guion de 4 ejes, filtrado éticamente).
- **v0.4 (2026-07-08):** Nueva modalidad **Conversación por voz** (ruta `/conversacion`): entrada por notas de voz (ElevenLabs Scribe `scribe_v2`), salida con **voz natural de ElevenLabs** (quita lo robótico de Web Speech), UI estilo chat con micrófono, reproducción automática y selector de voz. Nuevos proxies `api/transcribir.js` y `api/voces.js`; `api/tts.js` usa ahora una voz por defecto **auto** (la primera voz válida de la cuenta si no se da `voiceId`/`ELEVENLABS_VOICE_ID`, para no depender de un id fijo). ✔️ **Verificado end-to-end con la clave real:** 23 voces listadas, TTS (`audio/mpeg`) y STT (transcripción correcta es-MX). Ver §15.
- **v0.3 (2026-07-08):** Primera fuente destilada ("Información", charla 53) y registrada; lente filtrada por seguridad (`src/fuentes/lente.js`). Construida la **experiencia central: Flujo personal / Sesión de indagación** (Nombrar → Reflejar → Indagar → Practicar → Cierre), guiada por IA a la medida de cada persona, con meditación final por voz. Corregido el contrato `rol/contenido` ↔ `role/content` del proxy de IA. Añadido un **puente de desarrollo** (`api-dev` en `vite.config.js`) para servir `/api` bajo `npm run dev` con `.env.local` (con precedencia sobre el entorno). **Verificado el round-trip real con Claude** (`claude-sonnet-5`). Ver §14.
- **v0.2 (2026-07-08):** Andamiaje técnico construido y verificado (`npm install` + `npm run build` OK). Estructura completa: app shell (React 18 + Vite + Tailwind v4 + PWA), 6 páginas cableadas, capa de voz (ElevenLabs + respaldo Web Speech) con consentimiento biométrico, IA por proxy `/api/anthropic`, datos local-first (IndexedDB) con exportar/borrar, seguridad (detección de crisis + recursos es-MX + avisos), y canal de fuentes. Decisiones de §11 resueltas. Lista blanca de modelos actualizada a IDs vigentes. Ver §13 (estado y pendientes).
- **v0.1 (2026-07-07):** Creación del documento. Constitución (visión, reglas duras, arquitectura de voz, privacidad, accesibilidad, stack tentativo) y estructura de fases. Placeholders para fuente, perfil de usuario, conceptos y glosario. Sin código.

---

## 13. Estado de construcción — v0.7 (actualizado 2026-07-09)

### Qué existe y funciona
- **Compila y empaqueta:** `npm install` + `npm run build` sin errores (Vite 6, PWA con service worker generado).
- **App shell:** React 18 + React Router v6, Layout + navegación, tokens de calma y `prefers-reduced-motion` por defecto.
- **6 páginas cableadas:** Inicio · Acompañamiento (chat + ModalCrisis) · Meditaciones (TTS con respaldo + consentimiento de voz) · Perfil (perfil vivo) · Fuentes (visor de destilados) · Ajustes (exportar/borrar/borrar-voz).
- **Seguridad:** heurística de señales de crisis, recursos es-MX (SAPTEL, Línea de la Vida, 911), aviso global "no es tratamiento médico", modal de contención accesible.
- **Voz:** capa TTS con ElevenLabs (por proxy) y respaldo Web Speech; consentimiento biométrico explícito y revocable.
- **Datos:** IndexedDB local-first con exportar-todo (JSON) y borrar-todo / borrar-voz con confirmación.
- **IA:** cliente por proxy `/api/anthropic`; system prompt con las reglas duras y hueco para inyectar la "lente" de la fuente semanal.
- **Clonación y revocación de voz (server-side):** contrato unificado cliente↔servidor en `src/voz/clonacion.js` ↔ `api/voz-clonar.js` (JSON base64 + `consentimiento: true`), consentimiento biométrico persistido en IndexedDB (`src/datos/consentimientos.js`) y borrado REAL en el proveedor vía `api/voz-borrar.js`: `borrarVoz()` y `borrarTodo()` borran la voz remota primero y abortan si el proveedor falla; si clonar funciona pero falla guardar el `voiceId`, la clonación se revierte (sin voces huérfanas).
- **Protección de la API:** rate limiting por IP en todos los endpoints `/api`, límites de tamaño de entrada en `/api/anthropic` y CORS mismo-origen que exige `Origin` en las escrituras.
- **Calidad:** suite de tests (`npm test`, vitest) sobre los contratos críticos y CI en GitHub Actions (tests + build en cada push/PR).

### Cómo correrlo
- **Local completo:** pon `ANTHROPIC_API_KEY` en `terapia/.env.local` y corre `cd terapia && npm run dev` → `localhost:5173`. Un **puente de desarrollo** en `vite.config.js` (plugin `api-dev`) sirve las funciones de `api/` localmente, así que la Sesión de indagación **responde con Claude sin necesidad de Vercel**. ✔️ Verificado (2026-07-08): round-trip real con `claude-sonnet-5`. `.env.local` tiene **precedencia** sobre el entorno del sistema.
- **Voz premium (opcional):** agrega `ELEVENLABS_API_KEY`; sin ella, el TTS usa Web Speech.
- **Producción:** en Vercel las funciones `api/` se sirven nativas (el puente solo aplica en dev). Configurar **Root Directory = `terapia`** y las env vars en el proyecto. Ninguna clave se expone al cliente.

### Pendientes / deuda conocida (a resolver en próximos incrementos)
1. **Cifrado en reposo pendiente.** Los datos sensibles se guardan hoy en claro en IndexedDB; la frontera de cifrado está marcada con TODO en `src/datos/db.js` (§7).
2. **Iconos PWA pendientes** (192×192 y 512×512) antes de producción.
3. **Prototipo de un solo usuario** (Ernesto): sin autenticación multiusuario todavía.
4. **Deploy:** al publicar en Vercel, configurar **Root Directory = `terapia`**.
5. **Seguridad de producción — BLOQUEANTE para un despliegue público (auditoría 2026-07-09).** Los endpoints `/api` no tienen autenticación: `destilar`/`voz-clonar`/`anthropic` consumen las llaves globales de la cuenta y el CORS mismo-origen + rate limit en memoria NO son autorización. Aceptable solo en uso local o en un deploy privado (p. ej. Vercel Deployment Protection). Antes de tráfico público: autenticación real, identidad por usuario, rate limit distribuido (Upstash Redis / Vercel Firewall) y/o captcha en rutas costosas (§2.5). **Mitigación implementada (2026-07-12):** `voz-clonar` etiqueta las voces que crea (`labels.app=sintonia`) y `voz-borrar` verifica **propiedad** antes de borrar — solo elimina clones creados por esta app (403 `voz_no_propia` para cualquier otra voz de la cuenta); el abuso de cuota sigue requiriendo la protección de plataforma.
> **Resuelto (2026-07-09, auditoría externa 2026-07-08):** el desajuste de contrato de la clonación y el borrado server-side de la voz que antes aparecían aquí como deuda — ver "Qué existe y funciona".
> **Resuelto (2026-07-12, plan pro de ElevenLabs):** la **UI de grabación + clonación de la voz propia** (`src/voz/GrabacionVoz.jsx` en Meditaciones) — la visión "escucharte a ti mismo guiándote" (§6) quedó operativa de punta a punta; ver §15.

---

> **Actualizado (v0.5):** este flujo largo fue **reemplazado por la Sesión exprés del §16** (feedback de Ernesto: las sesiones eran muy largas). Se conserva como referencia de diseño.

## 14. Experiencia central — Flujo personal (Sesión de indagación) *(superseded por §16)*

**Requisito de Ernesto (v0.3):** el corazón del producto es una **sesión guiada, interactiva y a la medida de cada persona**. La app *lleva* a la persona por un flujo personal según su situación particular, usando la fuente destilada como lente. No es un chat libre: es un recorrido que la app conduce.

**Etapas del flujo** (`src/flujo/etapas.js`, orquestadas por `src/flujo/useFlujo.js`, UI en `src/paginas/Acompanamiento.jsx`):
1. **Nombrar** — la persona describe su situación (texto libre). Invitación abierta.
2. **Reflejar** — la IA le devuelve, a través de la lente, qué "información / acuerdos / memorias" podrían estar operando, como **hipótesis suaves** (nunca diagnóstico). Cierra con una pregunta.
3. **Indagar** — 1–2 preguntas abiertas, **una a la vez**, ancladas a lo que emerge.
4. **Practicar** — la IA propone **una práctica concreta y a medida** (ritual de discernimiento / desacuerdo sin conflicto / indagar una proyección / pausa de sintonía). Propuesta, no obligación.
5. **Cierre** — síntesis breve + una **meditación personalizada** que puede escucharse por voz (TTS con respaldo Web Speech).

**Lente (`src/fuentes/lente.js`):** al system prompt se inyecta una versión **filtrada por seguridad** del destilado: incluye sintonía, acuerdo del corazón, desacuerdo≠conflicto, amar≠apoyar, proyección-como-pregunta, discernimiento/voluntad; **excluye** el eje comida/agua-como-salud y "la mente causa enfermedad".

**Seguridad:** cada entrada pasa por `detectarSenalesCrisis`; en nivel alto se **detiene** el flujo y se abre contención/derivación (ModalCrisis). Las reglas duras (§2) mandan sobre la lente.

**Personalización y datos:** el recorrido y la práctica se generan a partir de lo que la persona trae; la sesión se guarda local-first en el store `conversaciones` (IndexedDB).

**Decisiones aplicadas:** eje comida/agua **excluido** del producto (solo vive en el destilado, §13); palabra ambiente: **"sintonía"**.

**Pendiente de esta experiencia:** requiere el proxy `/api` con `ANTHROPIC_API_KEY` para responder (con `vite dev` no responde). Afinar el número de rondas de indagación con uso real; considerar alimentar el "perfil vivo" (§5) a partir de las sesiones.

---

## 15. Conversación por voz (estilo nota de voz)

**Requisito de Ernesto (v0.4):** poder **hablar** y que la app **responda con voz**, tipo nota de voz de WhatsApp; y quitar lo robótico.

- **Voz → texto (entrada):** notas de voz transcritas con **ElevenLabs Scribe** (`api/transcribir.js`, modelo `scribe_v2`; `scribe_v1` se depreca 2026-07-09). El cliente graba con `MediaRecorder` (`src/voz/clonacion.js`) y manda el audio en base64 al proxy.
- **Texto → voz (salida):** **ElevenLabs** (`api/tts.js`, `eleven_multilingual_v2`, es-MX), que reemplaza la voz robótica de Web Speech. Voz por defecto de catálogo (override con `ELEVENLABS_VOICE_ID` o el selector de voz); respaldo a Web Speech si falla o no hay key.
- **UI (`src/paginas/Conversacion.jsx`, ruta `/conversacion`):** burbujas estilo chat, botón de micrófono (grabar → enviar), reproducción automática de la respuesta, selector de voz (poblado por `api/voces.js`) y campo de texto de respaldo; se puede ocultar/mostrar el texto.
- **Misma base ética:** reutiliza la **lente** filtrada y la **detección de crisis** (vía `useAcompanamiento`), con un **director por turno derivado del guion de la fuente** (`directorVoz`, ver §16): charla muy corta que aterriza en una práctica.

**Decisiones aplicadas (v0.4):** voz de salida = **voz ElevenLabs de catálogo por ahora** (clonar la de Ernesto queda como siguiente incremento, §13/deuda 1); transcripción = **ElevenLabs Scribe** (un solo proveedor/clave).

**Requiere:** `ELEVENLABS_API_KEY` en `.env.local` (habilita voz natural + transcripción). Sin ella, la conversación por **texto** funciona y el TTS cae a Web Speech.

**Honestidad sobre retención (auditoría 2026-07-09):** el audio y el texto que pasan por ElevenLabs (STT/TTS/clonación) usan la **retención predeterminada del proveedor**; las muestras de clonación **no son elegibles para retención cero** en ese servicio. Lo que la app SÍ garantiza: la voz clonada se elimina de la cuenta vía API al revocar (verificado, con aborto si falla), y todo lo local se borra. El texto de consentimiento (`ConsentimientoVoz.jsx`) nombra al proveedor y refleja estos límites — la promesa nunca debe exceder lo que el sistema puede cumplir (§2.5).

**Voces (estado 2026-07-12, plan pro activo — verificado con la API real):** el selector se filtra a **solo voces mexicanas** (acento `mexican` / locale `es-MX`); la cuenta tiene 2 usables por API (Enrique Mondragón — calmado, ideal para acompañar — y MexiTony), **verificadas con audio real generado** (adiós al 402). La clave es **restringida** (buena práctica): solo permisos de voces/TTS/STT/clonación; `user_read` y `models_read` no están y la app no los necesita. El reintento con voz de catálogo se conserva como red de seguridad.

**Estilos de locución (2026-07-12):** `api/tts.js` acepta `estilo` — `conversacion` usa `eleven_turbo_v2_5` (baja latencia, ~50% menos costo) y `meditacion` usa `eleven_multilingual_v2` con habla más lenta y estable (`speed` 0.85, `stability` 0.7). Las meditaciones (página Meditaciones, cierre de la Sesión exprés y cierre hablado de la voz) usan `meditacion`; el ida-vuelta de la charla usa `conversacion`.

**Voz propia (2026-07-12, deuda §13 saldada):** con el plan pro quedó **desbloqueada la clonación instantánea** y se construyó la **UI de grabación** (`src/voz/GrabacionVoz.jsx`, en Meditaciones tras el consentimiento): la persona lee un texto guía (≥30s), crea su voz vía `api/voz-clonar`, y desde entonces **las meditaciones suenan con su propia voz** (`useVozPropia`). La revocación real vía Ajustes ya existía (§6).

**Recuperación de la voz propia (decisión de Ernesto, 2026-07-12):** el `voiceId` vive local-first en cada dispositivo; al cambiar de navegador la referencia se pierde aunque la voz siga en la cuenta. Como las voces de la app van **etiquetadas**, `api/voces.js` las reporta como `propias` y la página Meditaciones ofrece **"Recuperar mi voz"** (re-vincula con `asignarVoiceId`, sin volver a grabar ni duplicar clones). Un **perfil multiusuario** sigue siendo la solución definitiva y queda atado al bloqueante de autenticación (§13.5).

**Meditaciones solo con charla previa (decisión de Ernesto, 2026-07-12):** la página Meditaciones ya **no ofrece meditaciones genéricas** (se retiró el reproductor de ejemplo del andamiaje): la meditación se construye con la conversación de la persona + la fuente activa, y sin charla no hay material. Sin meditaciones guardadas, la página invita a empezar la primera charla (Sesión exprés o voz); "Tu propia voz" sí queda siempre disponible para preparar o recuperar la voz clonada.

**Usos de la voz propia (auditoría 2026-07-12):** el consentimiento base cubre **guiar meditaciones**. Que las **respuestas de la conversación** (análisis, preguntas, disonancias de la IA) suenen con la voz de la persona es un **opt-in separado y apagado por defecto** (`usos.conversaciones`): casilla opcional en el consentimiento y toggle reversible en Meditaciones (`establecerUsoConversacionVoz`). Sin ese permiso, la conversación no auto-selecciona la voz propia ni la ofrece en el selector.

---

## 16. Algoritmo "de la fuente a la práctica" — Sesión exprés

**Requisito de Ernesto (v0.5):** las sesiones eran demasiado largas. Quiere sesiones **enfocadas y prácticas**, con **preguntas concretas derivadas de la fuente**, y que el sistema sea **flexible y auto-reflexivo**: cuando la fuente semanal cambie, las preguntas cambian solas. Decisiones tomadas: guion **generado automáticamente por la app**, sesión **exprés (~4 turnos)**, y **la fuente abre** la sesión.

**El algoritmo (implementado):**
1. **Verificar fuente activa** — `fuenteActiva()` en `src/fuentes/registro.js` (la primera del registro; cada entrada lleva su destilado completo importado como texto).
2. **Obtener el guion** — `src/flujo/guion.js`: caché local (IndexedDB, clave `guion:<fuenteId>`) → generación vía **`api/guion.js`** (Claude convierte el destilado en JSON: `esencia`, `preguntaApertura`, 3–5 `ejes` con 2 preguntas concretas y 1 práctica c/u; **reglas duras integradas al prompt**: sin comida/agua/salud, sin clínica, sin miedo) → **respaldo curado** (`GUION_RESPALDO`) si falla.
3. **Sesión exprés (~4 turnos)** — `src/flujo/useFlujo.js` + `src/paginas/Acompanamiento.jsx`:
   - **Apertura** (sin costo de IA): la UI muestra la esencia de la fuente + su pregunta de apertura.
   - **Turno 1 — Resonar:** la persona responde; la IA **elige UN eje** (marcador `EJE: <id>` parseado por la app), refleja breve y hace la 1ª pregunta concreta del eje.
   - **Turno 2 — Concretar:** 2ª pregunta concreta del eje, adaptada.
   - **Turno 3 — Práctica y cierre:** práctica del eje personalizada + cierre en una frase + meditación breve (`MEDITACION:`) escuchable por voz.
   - Brevedad forzada: instrucción transversal + `maxTokens` ≈ 400 (acotado server-side).
4. **Auto-reflexivo** — al registrar una fuente nueva (id nuevo al inicio de `FUENTES` con su destilado `?raw`), el guion se regenera y **toda la sesión cambia sola**: esencia, apertura, ejes, preguntas y prácticas.

**Seguridad:** sin cambios — cada entrada pasa por `detectarSenalesCrisis`; nivel alto detiene el flujo y abre contención (§2.2). Las reglas duras van tanto en el system prompt de sesión como en el generador de guiones (doble filtro).

**Verificado (2026-07-08):** generación en vivo con la charla 53 → guion de 4 ejes (darse cuenta de la información, sintonía del corazón, desacuerdo sin conflicto, memorias proyectadas), preguntas situadas y prácticas de días, sin zonas rojas. Build verde.

**Ritual semanal de Ernesto (actualizado 2026-07-09):** abre la página **Fuentes** en la app → pega el texto de la charla (o sube el .txt/.md) → pulsa **"Destilar y activar"** → el algoritmo hace el resto. Ya no se toca código ni repo (el flujo por registro estático sigue existiendo como respaldo curado).

### La fuente se aplica, no se cita — y en voz la charla es corta (decisión de Ernesto, 2026-07-09)

**Requisito de Ernesto:** el algoritmo "de la fuente a la práctica" no es exclusivo de la Sesión exprés: la IA debe **comprender** la fuente y **usarla prácticamente en toda charla, texto o audio**. Para Ernesto esta enseñanza proviene de fuentes que él considera **divinas** y debe tratarse con esa reverencia: su propósito es una **transformación real** en la persona, no acompañamiento decorativo. En **audio**, además, la charla debe ser **muy corta** y el sistema debe **proponer y dirigir** hacia algo concreto — no conversación abierta.

**Implementado (v0.8):**
- **System prompt (`src/ia/prompts.js`):** el bloque de la lente instruye comprender la fuente (no citarla mecánicamente), tratarla con reverencia y cuidado como material vivo, y hacer que **cada conversación aterrice en UNA aplicación práctica y vivible** (algo que la persona pueda hacer HOY). La transparencia espiritual/clínico (§2.4) se mantiene intacta: la lente se ofrece, no se impone, y las reglas duras mandan.
- **Conversación por voz (`src/paginas/Conversacion.jsx` + `directorVoz` en `src/flujo/etapas.js`):** la voz usa el **mismo guion derivado de la fuente** que la Sesión exprés, con un director por turno: turno 1 elige un eje **en silencio** (sin anunciarlo) y hace su primera pregunta; turno 2 concreta; turno 3 propone **LA práctica personalizada** y cierra sin más preguntas. Respuestas de 2–3 frases habladas (`maxTokens` 300, esfuerzo `low`): en ~3 notas de voz la charla aterriza en práctica.
- **Sin guion disponible** (fuente aún no genera): el director degrada a escuchar + una pregunta concreta; la seguridad (§2.2) envuelve cada turno igual que siempre.

### El método del analista (decisión de Ernesto, 2026-07-12)

**Requisito de Ernesto:** la IA actúa como **analista experto en conciencia y comportamiento humano**, con rigor lógico, al servicio del propósito del proyecto: acompañar a la persona a indagar en su vida y elevar su nivel de conciencia. Tres movimientos obligatorios:

1. **Análisis riguroso de la fuente:** comprenderla paso a paso — tesis principales, conceptos clave (fractales, calibración, códigos de información) y propuestas prácticas. La fuente es una **invitación formal a indagar**, no un texto a recitar.
2. **Disonancia cognitiva honesta:** si la persona contradice la propuesta de la fuente, la IA no le da la razón de inmediato ni le impone la fuente: **pide permiso antes de sostener la tensión** ("¿quieres que miremos juntos esa tensión?"), pone **ambas perspectivas sobre la mesa**, las analiza con lógica y ofrece una **conclusión matizada** que invite —nunca presione— a pensar más hondo. La persona siempre decide y marca su propio ritmo (ajuste por auditoría 2026-07-12: invitación, no obligación).
3. **Interacción socrática (mandatorio):** la función principal es **preguntar** — UNA sola pregunta por turno y **no más de 3 por sesión**, diseñadas para aterrizar la fuente en la vida diaria, relaciones o hábitos. Aplica a texto y voz.

**Implementado (v0.11):** bloque `METODO_ANALISTA` en `src/ia/prompts.js` (entra a TODA conversación vía `componerSistema`), análisis paso a paso en el prompt del destilador (`api/destilar.js`), y refuerzo del contrato de meditación: es la **invitación de la fuente hecha voz, creada creativamente** (imagen guía, respiración, gesto — la forma la elige la IA según la charla) y **solo existe con charla previa** — sin contexto particular no se genera ni se inventan detalles. **Salvaguarda:** el método queda explícitamente **subordinado a las reglas duras §2** — la disonancia se suspende ante señales de crisis (manda la contención) y el propósito elevado nunca autoriza dogma ni presión.

### La meditación es el empalme (decisión de Ernesto, 2026-07-09)

**Requisito de Ernesto:** la meditación debe estar **en relación con la fuente Y con lo que la persona dijo** (en texto o audio): una meditación que **empalme ambos hilos** con la intención de lograr lo que la fuente propone. Cambia en cada sesión —porque cambian sus dos hilos— y exige **sensibilidad extrema a los detalles** de lo compartido.

**Implementado (v0.8):** contrato único en `instruccionMeditacion` (`src/flujo/etapas.js`), usado por ambos flujos:
- **Cómo se teje:** antes de escribirla, la IA relee toda la charla y recoge 2–3 **detalles textuales** de lo que la persona dijo (sus palabras exactas, imágenes, sensaciones); los teje con la propuesta del eje de la fuente de modo que la meditación **haga vivir** lo que la fuente propone en la situación concreta de la persona — usando **sus** palabras, no sinónimos. Sin promesas de resultados ni cura (§2).
- **Sesión exprés:** marcador `MEDITACION:` (4–6 frases respirables); `maxTokens` exprés subió a 500 para que el cierre no se corte.
- **Conversación por voz:** la meditación fluye **hablada** dentro del cierre del turno 3 (3–4 frases); `maxTokens` voz 420.
- **Se guarda para re-escucharse:** al cerrar la sesión, la meditación se persiste en IndexedDB (`src/datos/meditaciones.js`, store `meditaciones` que existía vacío) con fuente, eje y fecha; la página **Meditaciones** lista "Tus meditaciones" y las reproduce por voz — el circuito de "escucharte a ti mismo guiándote" (§6).

### Actualizar la fuente desde la app (decisión de Ernesto, 2026-07-09)

**Requisito de Ernesto:** poder **subir la actualización de la fuente de forma fácil**, sin depender de código, git ni de una sesión de desarrollo.

**Implementado (v0.9):**
- **Página Fuentes → "Actualizar la fuente de la semana":** Ernesto pega el texto crudo de la charla (o sube un `.txt`/`.md`) con un título, y pulsa un botón. Nada más.
- **`api/destilar.js` (nuevo):** la IA destila la charla en tres piezas — `resumen`, `destilado` (mapa conceptual en markdown: esencia, ideas fuerza, lenguaje del maestro, temas y tensiones, puentes a la práctica, zonas excluidas) y `lente` (lista para el system prompt, con sus LÍMITES obligatorios). El **filtro ético va integrado al prompt** (excluye comida/agua/salud y "la mente causa enfermedad"; lo espiritual como marco, no como hecho; sin miedo) — y el generador de guiones filtra de nuevo: **doble filtro**. Rate limit estricto (3/min por IP).
- **`src/fuentes/dinamicas.js` (nuevo):** las fuentes destiladas se guardan **local-first** en IndexedDB (claves `fuente:<id>` en el store `fuentes`, conviviendo con el caché de guiones `guion:<id>`). La dinámica **más reciente es la activa**; sin dinámicas, se usa el registro estático del repo (respaldo curado). `lenteDeFuente()` usa la lente generada de la fuente activa o cae a la curada.
- **Auto-reflexivo de punta a punta:** id nuevo → caché de guion vacío → `/api/guion` genera guion nuevo → Sesión exprés, Conversación por voz y meditaciones usan la fuente nueva sin tocar nada. Se puede **quitar** una fuente dinámica (la activa pasa a la anterior).
- **Nota de alcance:** las fuentes dinámicas viven en el dispositivo (privacidad local-first, PRD §7; se incluyen en exportar-todo y se borran con borrar-todo). El repo público conserva solo las fuentes curadas del registro estático — la auditoría externa del contenido dinámico se hace exportando los datos.
