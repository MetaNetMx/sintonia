# Canal de fuentes semanales

Este es el buzón donde Ernesto deja **una fuente por semana**: las charlas del
colega que trabaja desde la idea de sintonía con una energía / pensamiento
universal. La fuente es la **lente** con la que diseñamos la experiencia de
acompañamiento — guía, no dogma (ver PRD §3).

Con cada fuente que dejes aquí, Claude devuelve un **destilado**: ideas-fuerza,
lenguaje, cosmovisión, un mapa de temas y tensiones, qué es traducible a una
experiencia digital, y la marca honesta de qué es metafórico/espiritual y qué
podría leerse como clínico (ver PRD §10).

---

## Cómo entregar la fuente semanal

Elige la vía que te sea más cómoda. Cualquiera de las tres funciona:

1. **Pegar el texto** directamente en el chat con Claude.
2. **Dejar un archivo `.md`** (o `.txt`) aquí, en esta carpeta `fuentes/`.
3. **Dar el enlace de YouTube** de la charla. Claude puede apoyarse en el
   transcriptor para obtener el texto antes de destilar.

> Si la fuente es audio o video sin transcripción, avísalo: primero
> conseguimos el texto y luego destilamos.

---

## Nomenclatura sugerida

Para mantener orden y poder ubicar cada fuente por semana, nombra los archivos
así (ASCII, sin acentos ni espacios; usa guiones):

```
AAAA-SS-titulo-corto.md
```

- `AAAA` — año (ej. `2026`)
- `SS` — número de semana del año (ej. `28`)
- `titulo-corto` — dos o tres palabras que la identifiquen

Ejemplos:

```
2026-28-sintonia-y-silencio.md
2026-29-la-energia-que-observa.md
```

El destilado que produce Claude se guarda junto a la fuente con el sufijo
`-destilado`:

```
2026-28-sintonia-y-silencio-destilado.md
```

---

## Qué hace Claude con cada fuente

1. La **lee y destila** siguiendo `plantilla-destilado.md`.
2. Devuelve el **mapa conceptual** en texto: temas, tensiones y qué es
   traducible a la experiencia digital.
3. **Marca con honestidad** qué afirmaciones son metafóricas/espirituales y
   cuáles podrían confundirse con afirmaciones clínicas, para que el usuario
   nunca lea una metáfora como si fuera un diagnóstico.

El destilado terminado se registra en `src/fuentes/registro.js` para que
aparezca en la vista de Fuentes de la app.

---

## Archivos de esta carpeta

- `README.md` — este documento.
- `plantilla-destilado.md` — la plantilla que Claude rellena por cada fuente.
- `EJEMPLO-destilado.md` — un destilado de ejemplo, como guía de forma.
- Tus fuentes semanales (`AAAA-SS-titulo.md`) y sus destilados.
