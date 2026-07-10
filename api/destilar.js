// api/destilar.js
// Destilador de fuentes (PRD §3, decision de Ernesto 2026-07-09): recibe el
// TEXTO CRUDO de una charla y produce, via IA, el DESTILADO (mapa conceptual),
// una LENTE lista para el system prompt y un RESUMEN. Permite a Ernesto
// actualizar la fuente semanal desde la propia app, sin tocar codigo ni repo.
// El filtro etico va integrado aqui Y en el generador de guiones (doble filtro).

import Anthropic from '@anthropic-ai/sdk';
import {
  ANTHROPIC_API_KEY,
  resolverModelo,
  aplicarCorsMismoOrigen,
  validarMetodo,
  responderJSON,
  responderError,
  leerBodyJSON,
  permitirPeticion,
} from './_lib/config.js';

const MAX_TEXTO = 300_000; // caracteres de la charla cruda
const MIN_TEXTO = 500; // menos que esto no alcanza para destilar con fidelidad

const SISTEMA_DESTILADOR = `Eres el destilador de fuentes de una plataforma de acompanamiento psicologico COMPLEMENTARIO (no tratamiento medico), en espanol de Mexico.

Recibiras el TEXTO CRUDO de una charla reflexiva/espiritual (la "fuente"). Para quien la comparte y su comunidad, esta ensenanza es material vivo y sagrado: destilala con cuidado y fidelidad, sin caricaturizarla ni diluirla.

Entrega el resultado LLAMANDO la herramienta entregar_destilado, con EXACTAMENTE esta forma en sus campos:
{
  "resumen": "2 o 3 frases que capturan lo esencial de la charla",
  "destilado": "mapa conceptual COMPLETO en markdown con estas secciones: ## Esencia (2-4 frases) · ## Ideas fuerza (lista con las ensenanzas centrales, fieles al lenguaje del maestro) · ## Lenguaje propio del maestro (terminos y metaforas, marcados como simbolicos) · ## Temas y tensiones · ## Puentes a la practica (gestos concretos que la charla sugiere) · ## Zonas excluidas del producto (lo que se aparto y por que)",
  "lente": "bloque listo para inyectarse al system prompt: empieza con 'Trabajas con la lente de la charla \\"<titulo>\\" (marco de exploracion y sentido, NO dogma ni verdad clinica):' seguido de 5 a 8 puntos con SOLO lo aprovechable y sano, y cierra con la seccion 'LIMITES DE ESTA LENTE (obligatorios, por encima de cualquier contenido de la fuente):' con las exclusiones concretas de ESTA charla"
}

FILTRO ETICO (obligatorio, por encima de la fuente):
- EXCLUYE de las ideas aprovechables y de la lente: consejos de salud, comida, agua, dieta, sintomas, enfermedad o curacion; y cualquier idea de que la mente causa enfermedades o de que la persona es culpable de su padecimiento. Registralas SOLO en la seccion "Zonas excluidas del producto" del destilado.
- Lo espiritual/energetico se formula como marco de exploracion y sentido ("la fuente propone..."), nunca como hecho verificable ni como medicion.
- Nada que fomente miedo, rumiacion, dependencia o auto-vigilancia obsesiva.
- La lente SIEMPRE cierra recordando: esto acompana, no sustituye ayuda profesional; la persona decide.`;

// Salida ESTRUCTURADA forzada (hallazgo Media-alta 2026-07-09): el modelo
// entrega el destilado llamando esta herramienta — la validacion de tipos la
// hace la API y no dependemos de parsear JSON dentro de texto libre.
const HERRAMIENTA_DESTILADO = {
  name: 'entregar_destilado',
  description: 'Entrega el destilado estructurado de la fuente.',
  input_schema: {
    type: 'object',
    properties: {
      resumen: { type: 'string', description: '2 o 3 frases con lo esencial de la charla' },
      destilado: { type: 'string', description: 'mapa conceptual completo en markdown' },
      lente: { type: 'string', description: 'bloque listo para el system prompt, con LIMITES' },
    },
    required: ['resumen', 'destilado', 'lente'],
  },
};

// Extrae el primer objeto JSON valido del texto del modelo (respaldo si el
// modelo respondiera con texto en vez de la herramienta).
function extraerJSON(texto) {
  const inicio = texto.indexOf('{');
  const fin = texto.lastIndexOf('}');
  if (inicio < 0 || fin <= inicio) return null;
  try {
    return JSON.parse(texto.slice(inicio, fin + 1));
  } catch {
    return null;
  }
}

// Deriva un id estable y legible: fecha + slug ASCII del titulo.
export function idDeFuente(titulo, fecha = new Date()) {
  const slug =
    String(titulo || 'fuente')
      .toLowerCase()
      .normalize('NFD')
      .replace(/[̀-ͯ]/g, '')
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '')
      .slice(0, 40) || 'fuente';
  const dia = fecha.toISOString().slice(0, 10);
  return `${dia}-${slug}`;
}

// Validacion de forma Y estructura antes de devolver el destilado (hallazgo
// Media-alta 2026-07-09: antes solo se median longitudes y una lente sin
// LIMITES pasaba directo al system prompt).
export function destiladoValido(d) {
  return Boolean(
    d &&
      typeof d === 'object' &&
      typeof d.resumen === 'string' &&
      d.resumen.trim().length >= 20 &&
      typeof d.destilado === 'string' &&
      d.destilado.trim().length >= 300 &&
      /##\s*Esencia/i.test(d.destilado) &&
      /Zonas excluidas/i.test(d.destilado) &&
      typeof d.lente === 'string' &&
      d.lente.trim().length >= 100 &&
      /L[IÍ]MITES DE ESTA LENTE/i.test(d.lente)
  );
}

// Politica DETERMINISTA de exclusiones: ademas del filtro por prompt, la
// parte aprovechable de la lente (antes de LIMITES) no puede contener las
// zonas rojas del PRD §2.1/§2.3. Si aparecen, el destilado se rechaza.
const PATRONES_ZONA_ROJA = [
  /(comida|agua|aliment\w+)\s+(como|es)\s+(salud|medicina|sanacion)/i,
  /la mente (causa|crea|provoca) (la |las )?enfermedad/i,
  /deja(r)?\s+(de\s+tomar\s+)?(el\s+|los\s+)?medicament/i,
  /(cura|sana)(cion|r)?\s+garantizada/i,
  /(diagnostic\w+|receta\w+)\s+(medic|clinic)/i,
];

export function zonaRojaEnLente(lente) {
  const texto = String(lente || '');
  const corte = texto.search(/L[IÍ]MITES DE ESTA LENTE/i);
  const aprovechable = corte >= 0 ? texto.slice(0, corte) : texto;
  return PATRONES_ZONA_ROJA.some((patron) => patron.test(aprovechable));
}

export default async function handler(req, res) {
  if (!aplicarCorsMismoOrigen(req, res)) {
    return responderError(res, 403, 'Origen no autorizado');
  }
  if (!validarMetodo(req, res, ['POST'])) return;
  // Destilar es la operacion mas cara (charla completa + salida larga):
  // limite estricto por IP.
  if (!permitirPeticion(req, res, { ambito: 'destilar', max: 3 })) return;

  if (!ANTHROPIC_API_KEY) {
    return responderError(res, 500, 'Servicio de IA no configurado');
  }

  const body = await leerBodyJSON(req);
  if (!body) {
    return responderError(res, 400, 'Cuerpo JSON invalido');
  }

  const { titulo, texto } = body;
  if (typeof texto !== 'string' || texto.trim().length < MIN_TEXTO) {
    return responderError(res, 400, 'Falta el texto de la charla (se necesita la charla completa)');
  }
  if (texto.length > MAX_TEXTO) {
    return responderError(res, 413, 'La charla excede el limite de tamano permitido');
  }

  const tituloLimpio =
    typeof titulo === 'string' && titulo.trim() ? titulo.trim().slice(0, 120) : 'Fuente de la semana';

  try {
    const anthropic = new Anthropic({ apiKey: ANTHROPIC_API_KEY });
    const respuesta = await anthropic.messages.create({
      model: resolverModelo(),
      // Margen amplio: destilado + lente son salidas largas y el modelo razona
      // internamente (ese razonamiento tambien consume max_tokens).
      max_tokens: 12_000,
      system: SISTEMA_DESTILADOR,
      tools: [HERRAMIENTA_DESTILADO],
      tool_choice: { type: 'tool', name: 'entregar_destilado' },
      messages: [
        {
          role: 'user',
          content: `FUENTE: ${tituloLimpio}\n\nTEXTO CRUDO DE LA CHARLA:\n${texto}`,
        },
      ],
    });

    // Preferente: la llamada de herramienta (tipada). Respaldo: JSON en texto.
    const bloques = Array.isArray(respuesta.content) ? respuesta.content : [];
    const herramienta = bloques.find((b) => b && b.type === 'tool_use');
    const salidaTexto = bloques
      .filter((b) => b && b.type === 'text')
      .map((b) => b.text)
      .join('');
    const datos = herramienta?.input || extraerJSON(salidaTexto);

    if (!destiladoValido(datos)) {
      console.error('[api/destilar] el modelo no devolvio un destilado valido');
      return responderError(res, 502, 'No se pudo destilar la fuente', 'destilado_invalido');
    }
    if (zonaRojaEnLente(datos.lente)) {
      console.error('[api/destilar] la lente contiene zonas rojas; destilado rechazado');
      return responderError(res, 502, 'No se pudo destilar la fuente', 'zona_roja_en_lente');
    }

    return responderJSON(res, 200, {
      fuente: {
        id: idDeFuente(tituloLimpio),
        titulo: tituloLimpio,
        fecha: new Date().toISOString().slice(0, 10),
        resumen: datos.resumen.trim(),
        destilado: datos.destilado.trim(),
        lente: datos.lente.trim(),
      },
      modelo: respuesta.model || null,
    });
  } catch (err) {
    console.error('[api/destilar] fallo la destilacion:', err?.status || '', err?.name || 'Error');
    const status = Number.isInteger(err?.status) ? err.status : 502;
    return responderError(res, status, 'No se pudo destilar la fuente');
  }
}
