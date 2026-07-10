import { useEffect, useState } from 'react';
import { useTTS } from '../voz/useTTS.js';
import ConsentimientoVoz from '../voz/ConsentimientoVoz.jsx';

// Texto de ejemplo para escuchar una guia breve. Editable por la persona.
const TEXTO_EJEMPLO = `Encuentra una postura cómoda y, si quieres, cierra los ojos.
Toma aire despacio... y suéltalo sin prisa.
No hay nada que lograr aquí. Solo estar, por un momento, contigo.`;

// Meditaciones guiadas por voz (PRD §6). Por ahora usa la voz del sistema
// (respaldo Web Speech). La voz propia clonada llega tras el consentimiento
// biometrico y la grabacion, que construiremos como siguiente incremento.
export default function Meditaciones() {
  const { reproduciendo, cargando, error, motor, hablar, detener } = useTTS();
  const [texto, setTexto] = useState(TEXTO_EJEMPLO);
  const [mostrarConsent, setMostrarConsent] = useState(false);
  const [consentDado, setConsentDado] = useState(false);

  // Meditaciones nacidas de las sesiones (empalme fuente + lo compartido,
  // PRD §16): se guardan al cierre de cada sesion para re-escucharlas.
  const [guardadas, setGuardadas] = useState([]);
  useEffect(() => {
    let vivo = true;
    import('../datos/meditaciones.js')
      .then((m) => m.listarMeditaciones())
      .then((lista) => {
        if (vivo) setGuardadas(lista);
      })
      .catch(() => {
        /* sin persistencia disponible */
      });
    return () => {
      vivo = false;
    };
  }, []);

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">
        Meditaciones
      </h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Prácticas guiadas para volver al cuerpo y a la respiración. Un marco de
        exploración y calma, a tu ritmo.
      </p>

      <label htmlFor="guion" className="mt-6 block text-sm text-[var(--color-texto-suave)]">
        Guion de la práctica
      </label>
      <textarea
        id="guion"
        value={texto}
        onChange={(evento) => setTexto(evento.target.value)}
        rows={5}
        className="mt-2 w-full resize-y rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-3 text-[var(--color-texto)]"
      />

      <div className="mt-3 flex flex-wrap items-center gap-3">
        {!reproduciendo ? (
          <button
            type="button"
            onClick={() => hablar({ texto })}
            disabled={cargando || !texto.trim()}
            className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:cursor-not-allowed disabled:opacity-40"
          >
            {cargando ? 'Preparando…' : 'Escuchar'}
          </button>
        ) : (
          <button
            type="button"
            onClick={detener}
            className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-5 py-2.5 text-[var(--color-texto)]"
          >
            Detener
          </button>
        )}

        {motor === 'webspeech' && (
          <span className="text-sm text-[var(--color-texto-tenue)]">
            Usando la voz del sistema (respaldo). Tu voz personalizada llegará
            pronto.
          </span>
        )}
      </div>

      {error && (
        <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
          No se pudo reproducir la voz en este dispositivo.
        </p>
      )}

      {guardadas.length > 0 && (
        <div className="mt-10">
          <h2 className="text-lg font-medium text-[var(--color-texto)]">
            Tus meditaciones
          </h2>
          <p className="mt-1 max-w-prose text-sm text-[var(--color-texto-suave)]">
            Nacieron de tus sesiones: la fuente y lo que tú compartiste, tejidos
            en una sola voz.
          </p>
          <ul className="mt-4 flex flex-col gap-3">
            {guardadas.map((m) => (
              <li
                key={m.id}
                className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
              >
                <div className="flex flex-wrap items-center justify-between gap-2">
                  <p className="font-medium text-[var(--color-texto)]">{m.titulo}</p>
                  <span className="text-xs text-[var(--color-texto-tenue)]">
                    {new Date(m.creadaEn).toLocaleDateString('es-MX')}
                  </span>
                </div>
                <p className="mt-2 whitespace-pre-wrap text-sm text-[var(--color-texto-suave)]">
                  {m.texto}
                </p>
                <button
                  type="button"
                  onClick={() => {
                    setTexto(m.texto);
                    hablar({ texto: m.texto });
                  }}
                  disabled={cargando}
                  className="mt-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-sm text-[var(--color-texto)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Escuchar
                </button>
              </li>
            ))}
          </ul>
        </div>
      )}

      <div className="mt-10 rounded-[var(--radius-suave)] border border-[var(--color-borde)] p-5">
        <h2 className="text-lg font-medium text-[var(--color-texto)]">
          Tu propia voz
        </h2>
        <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
          La intención de este espacio es que puedas escucharte a ti mismo
          guiándote. Para crear tu voz necesitamos tu consentimiento explícito:
          tu voz es un dato biométrico y la tratamos como tal.
        </p>

        {!consentDado && !mostrarConsent && (
          <button
            type="button"
            onClick={() => setMostrarConsent(true)}
            className="mt-4 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-[var(--color-texto)]"
          >
            Conocer y dar mi consentimiento
          </button>
        )}

        {mostrarConsent && !consentDado && (
          <div className="mt-5">
            <ConsentimientoVoz
              onAceptar={() => {
                setConsentDado(true);
                setMostrarConsent(false);
              }}
              onRechazar={() => setMostrarConsent(false)}
            />
          </div>
        )}

        {consentDado && (
          <p className="mt-4 text-[var(--color-texto-suave)]">
            Gracias. La grabación y clonación de tu voz es el siguiente paso que
            construiremos juntos. Por ahora escucharás la voz del sistema, y podrás
            revocar tu consentimiento cuando quieras desde Ajustes.
          </p>
        )}
      </div>
    </section>
  );
}
