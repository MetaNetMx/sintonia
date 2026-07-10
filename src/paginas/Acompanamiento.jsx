import { useState } from 'react';
import { useFlujo } from '../flujo/useFlujo.js';
import { PASOS } from '../flujo/etapas.js';
import { useTTS } from '../voz/useTTS.js';
import ModalCrisis from '../seguridad/ModalCrisis.jsx';

// Sesion EXPRES (PRD §16): la fuente abre, la app conduce, ~4 turnos.
// Apertura (la fuente propone) -> Resonar (elige eje + 1a pregunta) ->
// Concretar (2a pregunta) -> Practica + cierre + meditacion.
// El guion se deriva de la fuente activa: si la fuente cambia, todo cambia.
export default function Acompanamiento() {
  const {
    fuente,
    guion,
    cargandoGuion,
    etapa,
    eje,
    mensajes,
    cargando,
    error,
    crisis,
    meditacion,
    enviar,
    reconocerCrisis,
    reiniciar,
  } = useFlujo();
  const [texto, setTexto] = useState('');
  const tts = useTTS();

  const cerrada = etapa === 'cerrada';
  const idxActual = cerrada ? PASOS.length : PASOS.findIndex((p) => p.id === etapa);

  const mandar = () => {
    const limpio = texto.trim();
    if (!limpio || cargando || cargandoGuion) return;
    setTexto('');
    enviar(limpio);
  };

  const onSubmit = (evento) => {
    evento.preventDefault();
    mandar();
  };

  const alTeclear = (evento) => {
    if (evento.key === 'Enter' && !evento.shiftKey) {
      evento.preventDefault();
      mandar();
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">
        Sesión exprés
      </h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Corta y práctica: la fuente de esta semana propone, tú aterrizas. Unos
        minutos, una práctica concreta.
      </p>

      {/* Indicador de progreso del recorrido. */}
      <ol className="mt-6 flex flex-wrap gap-2" aria-label="Etapas de la sesión">
        {PASOS.map((paso, i) => {
          const estado = i < idxActual ? 'hecho' : i === idxActual ? 'actual' : 'futuro';
          return (
            <li
              key={paso.id}
              aria-current={estado === 'actual' ? 'step' : undefined}
              className={[
                'rounded-full px-3 py-1 text-xs',
                estado === 'actual'
                  ? 'bg-[var(--color-acento)] text-[var(--color-acento-contraste)]'
                  : estado === 'hecho'
                    ? 'border border-[var(--color-borde)] text-[var(--color-texto-suave)]'
                    : 'border border-[var(--color-borde)] text-[var(--color-texto-tenue)]',
              ].join(' ')}
            >
              {paso.etiqueta}
            </li>
          );
        })}
        {eje && (
          <li className="rounded-full border border-[var(--color-acento-suave)] px-3 py-1 text-xs text-[var(--color-acento)]">
            {eje.titulo}
          </li>
        )}
      </ol>

      <div
        className="mt-6 flex min-h-[16rem] flex-col gap-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
        aria-live="polite"
      >
        {cargandoGuion && (
          <p className="m-auto text-center text-[var(--color-texto-tenue)]">
            Preparando la sesión con la fuente de esta semana…
          </p>
        )}

        {/* APERTURA: la fuente propone. */}
        {!cargandoGuion && guion && mensajes.length === 0 && (
          <div className="m-auto max-w-prose text-center">
            {fuente && (
              <p className="text-xs uppercase tracking-wide text-[var(--color-texto-tenue)]">
                {fuente.titulo}
              </p>
            )}
            <p className="mt-3 leading-relaxed text-[var(--color-texto)]">{guion.esencia}</p>
            <p className="mt-4 text-[var(--color-acento)]">{guion.preguntaApertura}</p>
          </div>
        )}

        {mensajes.map((mensaje) => {
          const esUsuario = mensaje.rol === 'usuario';
          return (
            <div
              key={mensaje.id}
              className={esUsuario ? 'flex justify-end' : 'flex justify-start'}
            >
              <p
                className={[
                  'max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-suave)] px-4 py-2.5 leading-relaxed',
                  esUsuario
                    ? 'bg-[var(--color-superficie-alta)] text-[var(--color-texto)]'
                    : 'border border-[var(--color-borde)] text-[var(--color-texto-suave)]',
                ].join(' ')}
              >
                {mensaje.contenido}
              </p>
            </div>
          );
        })}

        {cargando && (
          <p className="text-sm text-[var(--color-texto-tenue)]">Escuchando…</p>
        )}
      </div>

      {crisis.nivel === 'atencion' && !crisis.activa && (
        <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
          Si sientes que necesitas hablar con una persona, no tienes que
          atravesarlo en soledad; hay líneas de apoyo disponibles.
        </p>
      )}

      {error && (
        <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
          No pude conectar con el servicio de acompañamiento. Reintenta en un
          momento.
        </p>
      )}

      {/* Contencion terminal: tras crisis alta la sesion NO continua (la unica
          salida es una sesion nueva); el hook ademas bloquea enviar(). */}
      {crisis.nivel === 'alto' ? (
        <div className="mt-5 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="max-w-prose text-[var(--color-texto)]">
            Esta sesión se queda aquí, en contención. Lo que compartiste merece
            apoyo humano directo: SAPTEL (55 5259 8121), Línea de la Vida
            (800 911 2000) o, si hay riesgo inmediato, 911.
          </p>
          <button
            type="button"
            onClick={() => {
              tts.detener();
              setTexto('');
              reiniciar();
            }}
            className="mt-4 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-[var(--color-texto)]"
          >
            Empezar una sesión nueva
          </button>
        </div>
      ) : cerrada ? (
        <div className="mt-5">
          {meditacion && (
            <div className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
              <h2 className="text-lg font-medium text-[var(--color-texto)]">
                Una meditación para ti
              </h2>
              <p className="mt-2 whitespace-pre-wrap leading-relaxed text-[var(--color-texto-suave)]">
                {meditacion}
              </p>
              <div className="mt-4 flex flex-wrap gap-3">
                {!tts.reproduciendo ? (
                  <button
                    type="button"
                    onClick={() => tts.hablar({ texto: meditacion })}
                    disabled={tts.cargando}
                    className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:opacity-40"
                  >
                    {tts.cargando ? 'Preparando…' : 'Escuchar'}
                  </button>
                ) : (
                  <button
                    type="button"
                    onClick={tts.detener}
                    className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-5 py-2.5 text-[var(--color-texto)]"
                  >
                    Detener
                  </button>
                )}
              </div>
            </div>
          )}
          <button
            type="button"
            onClick={() => {
              tts.detener();
              setTexto('');
              reiniciar();
            }}
            className="mt-5 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-[var(--color-texto)]"
          >
            Nueva sesión
          </button>
        </div>
      ) : (
        <form onSubmit={onSubmit} className="mt-4">
          <label htmlFor="respuesta" className="sr-only">
            Escribe tu respuesta
          </label>
          <textarea
            id="respuesta"
            value={texto}
            onChange={(evento) => setTexto(evento.target.value)}
            onKeyDown={alTeclear}
            rows={3}
            disabled={cargandoGuion}
            placeholder={etapa === 'apertura' ? 'Responde con lo primero que aparezca…' : 'Escribe aquí…'}
            className="w-full resize-y rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-3 text-[var(--color-texto)] placeholder:text-[var(--color-texto-tenue)] disabled:opacity-50"
          />
          <div className="mt-3 flex justify-end">
            <button
              type="submit"
              disabled={cargando || cargandoGuion || !texto.trim()}
              className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:cursor-not-allowed disabled:opacity-40"
            >
              Responder
            </button>
          </div>
        </form>
      )}

      <ModalCrisis abierto={crisis.activa} onCerrar={reconocerCrisis} />
    </section>
  );
}
