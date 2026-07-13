import { useEffect, useRef, useState } from 'react';
import { iniciarGrabacion, soportaGrabacion, clonarVoz } from './clonacion.js';

// Grabacion de muestras + clonacion de la voz propia (PRD §6, deuda §13
// saldada 2026-07-12 con el plan pro de ElevenLabs). Solo se monta DESPUES
// del consentimiento biometrico persistido; clonarVoz() lo re-verifica antes
// de enviar nada al proveedor.

// Texto guia para leer en voz alta: tono de acompanamiento, sin contenido
// sensible, pensado para capturar el registro calmado de la voz.
const TEXTO_GUIA = `Estoy aquí, conmigo. Respiro despacio y dejo que este momento sea suficiente.
Lo que siento tiene lugar, y puedo mirarlo con calma, sin prisa por resolverlo.
Hoy me acompaño con la misma paciencia que le ofrecería a alguien que quiero.
Paso a paso, con el corazón atento, vuelvo a lo que de verdad me importa.`;

const MIN_SEGUNDOS_MUESTRA = 8;
const MIN_SEGUNDOS_TOTAL = 30; // recomendacion para un clon decente
const MAX_MUESTRAS = 3;

export default function GrabacionVoz({ onCreada }) {
  const [muestras, setMuestras] = useState([]); // { blob, segundos }
  const [grabando, setGrabando] = useState(false);
  const [creando, setCreando] = useState(false);
  const [mensaje, setMensaje] = useState('');
  const controlRef = useRef(null);
  const inicioRef = useRef(0);

  const puedeGrabar = soportaGrabacion();
  const segundosTotales = Math.round(muestras.reduce((s, m) => s + m.segundos, 0));
  const listaParaCrear = muestras.length > 0 && segundosTotales >= MIN_SEGUNDOS_TOTAL;

  // Suelta el microfono si la persona sale de la pantalla a media grabacion
  // (hallazgo Alta 2026-07-12: el stream quedaba vivo al desmontar).
  useEffect(() => {
    return () => {
      if (controlRef.current) {
        controlRef.current.cancelar();
        controlRef.current = null;
      }
    };
  }, []);

  const empezar = async () => {
    // controlRef como candado: clics rapidos no deben abrir varios streams
    // de getUserMedia (solo el ultimo quedaria bajo control).
    if (grabando || creando || controlRef.current) return;
    setMensaje('');
    try {
      controlRef.current = await iniciarGrabacion();
      inicioRef.current = Date.now();
      setGrabando(true);
    } catch {
      setMensaje('No pude acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  const detener = async () => {
    if (!controlRef.current) return;
    setGrabando(false);
    try {
      const blob = await controlRef.current.detener();
      controlRef.current = null;
      const segundos = (Date.now() - inicioRef.current) / 1000;
      if (segundos < MIN_SEGUNDOS_MUESTRA) {
        setMensaje(`Esa muestra quedó muy corta (${Math.round(segundos)}s). Lee el texto completo, con calma.`);
        return;
      }
      setMuestras((prev) => [...prev, { blob, segundos }]);
    } catch {
      setMensaje('No se pudo guardar esa grabación. Intenta de nuevo.');
    }
  };

  const cancelar = () => {
    if (controlRef.current) {
      controlRef.current.cancelar();
      controlRef.current = null;
    }
    setGrabando(false);
  };

  const quitar = (indice) => {
    setMuestras((prev) => prev.filter((_, i) => i !== indice));
  };

  const crear = async () => {
    if (!listaParaCrear || creando) return;
    setCreando(true);
    setMensaje('');
    try {
      const { voiceId } = await clonarVoz({
        muestras: muestras.map((m) => m.blob),
        nombre: 'Mi voz',
      });
      setMuestras([]);
      if (typeof onCreada === 'function') onCreada(voiceId);
    } catch (error) {
      setMensaje(error.message || 'No se pudo crear tu voz. Intenta de nuevo.');
    } finally {
      setCreando(false);
    }
  };

  if (!puedeGrabar) {
    return (
      <p className="mt-4 text-sm text-[var(--color-texto-suave)]">
        Este navegador no permite grabar audio; abre la app en un navegador con
        micrófono para crear tu voz.
      </p>
    );
  }

  return (
    <div className="mt-5">
      <p className="text-sm text-[var(--color-texto-suave)]">
        Graba {MAX_MUESTRAS === 1 ? 'una lectura' : `de 1 a ${MAX_MUESTRAS} lecturas`} de este
        texto con tu voz natural (junta al menos {MIN_SEGUNDOS_TOTAL} segundos en total):
      </p>
      <blockquote className="mt-3 whitespace-pre-wrap rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-fondo)] p-4 text-[var(--color-texto)]">
        {TEXTO_GUIA}
      </blockquote>

      <div className="mt-4 flex flex-wrap items-center gap-3">
        {!grabando ? (
          <button
            type="button"
            onClick={empezar}
            disabled={creando || muestras.length >= MAX_MUESTRAS}
            className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            🎙️ Grabar muestra
          </button>
        ) : (
          <>
            <button
              type="button"
              onClick={detener}
              className="rounded-[var(--radius-suave)] border-2 border-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-texto)]"
            >
              ⏹️ Detener y guardar
            </button>
            <button
              type="button"
              onClick={cancelar}
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2.5 text-sm text-[var(--color-texto-suave)]"
            >
              Cancelar
            </button>
          </>
        )}
      </div>

      {muestras.length > 0 && (
        <ul className="mt-4 flex flex-col gap-2">
          {muestras.map((m, i) => (
            <li
              key={i}
              className="flex items-center justify-between rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-sm text-[var(--color-texto-suave)]"
            >
              <span>
                Muestra {i + 1} — {Math.round(m.segundos)}s
              </span>
              <button
                type="button"
                onClick={() => quitar(i)}
                disabled={creando}
                className="text-xs text-[var(--color-texto-tenue)]"
              >
                Quitar
              </button>
            </li>
          ))}
        </ul>
      )}

      <div className="mt-4 flex flex-wrap items-center gap-3">
        <button
          type="button"
          onClick={crear}
          disabled={!listaParaCrear || creando || grabando}
          className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:cursor-not-allowed disabled:opacity-40"
        >
          {creando ? 'Creando tu voz…' : 'Crear mi voz'}
        </button>
        <span className="text-xs text-[var(--color-texto-tenue)]">
          {segundosTotales}s de {MIN_SEGUNDOS_TOTAL}s recomendados
        </span>
      </div>

      {mensaje && (
        <p role="status" className="mt-3 text-sm text-[var(--color-texto-suave)]">
          {mensaje}
        </p>
      )}
    </div>
  );
}
