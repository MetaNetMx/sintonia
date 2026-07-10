import { useEffect, useState } from 'react';
import { FUENTES } from './registro.js';
import { CONFIG } from '../config/app.js';
import {
  guardarFuenteDinamica,
  listarFuentesDinamicas,
  eliminarFuenteDinamica,
} from './dinamicas.js';

// VistaFuentes: permite ACTUALIZAR la fuente semanal desde la app (PRD §3,
// decision de Ernesto 2026-07-09) y lista las fuentes destiladas (dinamicas +
// registro del repo). Pegar la charla (o subir el .txt/.md) → la IA la destila
// con el filtro etico → queda ACTIVA y todo el flujo se reconfigura solo.
// Sobrio y calmado (PRD §8): sin movimiento agresivo, foco visible.
export default function VistaFuentes() {
  const [seleccionada, setSeleccionada] = useState(null);
  const [dinamicas, setDinamicas] = useState([]);

  const [titulo, setTitulo] = useState('');
  const [texto, setTexto] = useState('');
  const [procesando, setProcesando] = useState(false);
  const [mensaje, setMensaje] = useState(null); // { tipo: 'ok'|'error', texto }

  const cargarDinamicas = () => {
    listarFuentesDinamicas()
      .then(setDinamicas)
      .catch(() => {
        /* sin persistencia disponible */
      });
  };
  useEffect(cargarDinamicas, []);

  const subirArchivo = async (evento) => {
    const archivo = evento.target.files?.[0];
    if (!archivo) return;
    try {
      const contenido = await archivo.text();
      setTexto(contenido);
      if (!titulo.trim()) setTitulo(archivo.name.replace(/\.(txt|md)$/i, ''));
      setMensaje(null);
    } catch {
      setMensaje({ tipo: 'error', texto: 'No se pudo leer el archivo.' });
    }
  };

  const destilarYActivar = async () => {
    const charla = texto.trim();
    if (charla.length < 500) {
      setMensaje({
        tipo: 'error',
        texto: 'Pega la charla completa: se necesita más texto para destilarla con fidelidad.',
      });
      return;
    }
    setProcesando(true);
    setMensaje(null);
    try {
      const respuesta = await fetch(CONFIG.endpoints.destilar, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          titulo: titulo.trim() || 'Fuente de la semana',
          texto: charla,
        }),
      });
      if (!respuesta.ok) {
        let detalle = `HTTP ${respuesta.status}`;
        try {
          const cuerpo = await respuesta.json();
          if (cuerpo?.error) detalle = cuerpo.error;
        } catch {
          /* cuerpo no-JSON */
        }
        throw new Error(detalle);
      }
      const { fuente } = await respuesta.json();
      await guardarFuenteDinamica(fuente);
      setTitulo('');
      setTexto('');
      cargarDinamicas();
      setMensaje({
        tipo: 'ok',
        texto: `Lista: "${fuente.titulo}" quedó destilada y ACTIVA. Las próximas sesiones (texto y voz) ya la usan; el guion, las preguntas, las prácticas y las meditaciones se regeneran solos.`,
      });
    } catch (err) {
      setMensaje({ tipo: 'error', texto: `No se pudo destilar la fuente: ${err.message}` });
    } finally {
      setProcesando(false);
    }
  };

  const eliminar = async (fuenteId) => {
    const seguro = window.confirm(
      '¿Quitar esta fuente destilada de la app? La fuente activa pasará a la anterior.'
    );
    if (!seguro) return;
    try {
      await eliminarFuenteDinamica(fuenteId);
      cargarDinamicas();
    } catch {
      /* sin persistencia disponible */
    }
  };

  // La activa: la dinamica mas reciente o, si no hay, la primera del registro.
  const idActiva = dinamicas[0]?.fuenteId || FUENTES[0]?.id;

  return (
    <section>
      <Encabezado />

      {/* Actualizar la fuente de la semana: el unico punto de contacto de
          Ernesto con el sistema — pegar y pulsar un boton. */}
      <div className="mt-6 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
        <h2 className="text-lg font-medium text-[var(--color-texto)]">
          Actualizar la fuente de la semana
        </h2>
        <p className="mt-1 max-w-prose text-sm text-[var(--color-texto-suave)]">
          Pega el texto de la charla (o sube el archivo). La app la destila con
          cuidado y filtro ético, y la deja activa: preguntas, prácticas y
          meditaciones se renuevan solas.
        </p>

        <label htmlFor="titulo-fuente" className="mt-4 block text-sm text-[var(--color-texto-suave)]">
          Título (ej. “Charla 54 — El perdón”)
        </label>
        <input
          id="titulo-fuente"
          type="text"
          value={titulo}
          onChange={(e) => setTitulo(e.target.value)}
          disabled={procesando}
          className="mt-1 w-full rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-fondo)] p-2.5 text-[var(--color-texto)]"
        />

        <label htmlFor="texto-fuente" className="mt-3 block text-sm text-[var(--color-texto-suave)]">
          Texto completo de la charla
        </label>
        <textarea
          id="texto-fuente"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          disabled={procesando}
          rows={8}
          placeholder="Pega aquí la charla completa…"
          className="mt-1 w-full resize-y rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-fondo)] p-3 text-[var(--color-texto)]"
        />

        <div className="mt-3 flex flex-wrap items-center gap-3">
          <button
            type="button"
            onClick={destilarYActivar}
            disabled={procesando || !texto.trim()}
            className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {procesando ? 'Destilando con cuidado…' : 'Destilar y activar'}
          </button>

          <label className="cursor-pointer rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2.5 text-sm text-[var(--color-texto)]">
            Subir archivo (.txt / .md)
            <input
              type="file"
              accept=".txt,.md,text/plain,text/markdown"
              onChange={subirArchivo}
              disabled={procesando}
              className="hidden"
            />
          </label>
        </div>

        {mensaje && (
          <p
            role="status"
            className={`mt-4 text-sm ${
              mensaje.tipo === 'ok'
                ? 'text-[var(--color-texto)]'
                : 'text-[var(--color-texto-suave)]'
            }`}
          >
            {mensaje.texto}
          </p>
        )}
      </div>

      <ul className="mt-6 flex flex-col gap-3">
        {dinamicas.map((fuente) => {
          const abierta = seleccionada === fuente.id;
          return (
            <li
              key={fuente.id}
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)]"
            >
              <button
                type="button"
                onClick={() => setSeleccionada(abierta ? null : fuente.id)}
                aria-expanded={abierta}
                className="flex w-full flex-col items-start gap-1 p-4 text-left"
              >
                <span className="flex items-center gap-2 text-lg font-medium text-[var(--color-texto)]">
                  {fuente.titulo}
                  {fuente.fuenteId === idActiva && <BadgeActiva />}
                </span>
                <span className="text-sm text-[var(--color-texto-tenue)]">{fuente.fecha}</span>
                <span className="mt-1 text-[var(--color-texto-suave)]">{fuente.resumen}</span>
              </button>

              {abierta && (
                <div className="border-t border-[var(--color-borde)] p-4 text-sm text-[var(--color-texto-suave)]">
                  <pre className="max-h-96 overflow-y-auto whitespace-pre-wrap font-sans">
                    {fuente.destilado}
                  </pre>
                  <button
                    type="button"
                    onClick={() => eliminar(fuente.fuenteId)}
                    className="mt-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-3 py-1.5 text-xs text-[var(--color-texto-suave)]"
                  >
                    Quitar esta fuente
                  </button>
                </div>
              )}
            </li>
          );
        })}

        {FUENTES.map((fuente) => {
          const abierta = seleccionada === fuente.id;
          return (
            <li
              key={fuente.id}
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)]"
            >
              <button
                type="button"
                onClick={() => setSeleccionada(abierta ? null : fuente.id)}
                aria-expanded={abierta}
                className="flex w-full flex-col items-start gap-1 p-4 text-left"
              >
                <span className="flex items-center gap-2 text-lg font-medium text-[var(--color-texto)]">
                  {fuente.titulo}
                  {fuente.id === idActiva && <BadgeActiva />}
                </span>
                <span className="text-sm text-[var(--color-texto-tenue)]">{fuente.fecha}</span>
                <span className="mt-1 text-[var(--color-texto-suave)]">{fuente.resumen}</span>
              </button>

              {abierta && (
                <div className="border-t border-[var(--color-borde)] p-4 text-sm text-[var(--color-texto-suave)]">
                  <p>
                    El mapa conceptual completo (ideas-fuerza, cosmovision, temas,
                    tensiones y la distincion entre lo metaforico y lo clinico)
                    vive en el destilado:
                  </p>
                  <p className="mt-2 font-mono text-[var(--color-texto-tenue)]">
                    {fuente.rutaDestilado}
                  </p>
                </div>
              )}
            </li>
          );
        })}
      </ul>
    </section>
  );
}

function BadgeActiva() {
  return (
    <span className="rounded-full border border-[var(--color-acento)] px-2 py-0.5 text-xs font-normal text-[var(--color-acento)]">
      Activa
    </span>
  );
}

function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">Fuentes</h1>
      <p className="mt-2 text-[var(--color-texto-suave)]">
        Las charlas y lecturas que iluminan el camino de exploracion, destiladas
        en un mapa conceptual. Son una lente, no un dogma.
      </p>
    </div>
  );
}
