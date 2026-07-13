import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import { useTTS } from '../voz/useTTS.js';
import { useVozPropia } from '../voz/useVozPropia.js';
import { vocesPropiasRemotas } from '../voz/voces.js';
import ConsentimientoVoz from '../voz/ConsentimientoVoz.jsx';
import GrabacionVoz from '../voz/GrabacionVoz.jsx';

// Meditaciones (PRD §16): SOLO las nacidas de tus charlas — la conversacion
// (Sesion expres o voz) y la fuente activa se tejen en una meditacion a la
// medida. Sin charla previa no hay material, asi que aqui NO hay meditaciones
// genericas (decision de Ernesto, 2026-07-12): sin guardadas, la pagina
// invita a tener la primera charla. "Tu propia voz" si queda disponible
// siempre: prepara (o RECUPERA) la voz clonada para cuando lleguen.
export default function Meditaciones() {
  const { reproduciendo, cargando, error, motor, hablar, detener } = useTTS();
  const [mostrarConsent, setMostrarConsent] = useState(false);
  const [consentDado, setConsentDado] = useState(false);
  const [mensajeVoz, setMensajeVoz] = useState('');

  // La voz clonada de la persona (si existe): las meditaciones se escuchan
  // con SU voz — "escucharte a ti mismo guiandote" (PRD §6).
  const { vozPropia, vozEnConversacion, recargarVozPropia } = useVozPropia();
  const escuchar = (t) =>
    hablar({ texto: t, voiceId: vozPropia || undefined, estilo: 'meditacion' });

  // Carga el consentimiento EXISTENTE al abrir (hallazgo Alta 2026-07-09).
  useEffect(() => {
    let vivo = true;
    import('../datos/consentimientos.js')
      .then((m) => m.leerConsentimientoVoz())
      .then((registro) => {
        if (vivo && registro?.otorgado === true) setConsentDado(true);
      })
      .catch(() => {
        /* sin persistencia disponible */
      });
    return () => {
      vivo = false;
    };
  }, []);

  // Meditaciones nacidas de las sesiones (empalme fuente + lo compartido).
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

  // RECUPERACION de la voz (2026-07-12): el voiceId vive en este dispositivo;
  // en un navegador nuevo se pierde la referencia, pero la voz etiquetada
  // sigue en la cuenta. Si hay consentimiento y no hay voz local, se busca
  // una recuperable para re-vincularla sin volver a grabar.
  const [vozRemota, setVozRemota] = useState(null);
  useEffect(() => {
    if (!consentDado || vozPropia) {
      setVozRemota(null);
      return undefined;
    }
    let vivo = true;
    vocesPropiasRemotas().then((lista) => {
      if (vivo) setVozRemota(lista[0] || null);
    });
    return () => {
      vivo = false;
    };
  }, [consentDado, vozPropia]);

  const recuperarVoz = async () => {
    if (!vozRemota) return;
    setMensajeVoz('');
    try {
      const m = await import('../datos/consentimientos.js');
      await m.asignarVoiceId(vozRemota.voiceId);
      recargarVozPropia();
    } catch {
      setMensajeVoz('No se pudo recuperar tu voz en este dispositivo. Intenta de nuevo.');
    }
  };

  const cambiarUsoConversacion = async (permitido) => {
    try {
      const m = await import('../datos/consentimientos.js');
      await m.establecerUsoConversacionVoz(permitido);
      recargarVozPropia();
    } catch {
      /* sin persistencia disponible */
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">Meditaciones</h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Tus meditaciones <strong>nacen de tus charlas</strong>: lo que compartes
        en la Sesión exprés o en la conversación por voz se teje con la fuente
        activa en una meditación a tu medida. Sin charla no hay meditación —
        le faltaría tu contexto.
      </p>

      {guardadas.length === 0 ? (
        <div className="mt-6 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="max-w-prose text-[var(--color-texto)]">
            Aún no tienes meditaciones. Tu primera meditación nacerá de tu
            primera charla.
          </p>
          <div className="mt-4 flex flex-wrap gap-3">
            <Link
              to="/acompanamiento"
              className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)]"
            >
              Empezar una Sesión exprés
            </Link>
            <Link
              to="/conversacion"
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-5 py-2.5 text-[var(--color-texto)]"
            >
              Conversar por voz
            </Link>
          </div>
        </div>
      ) : (
        <div className="mt-6">
          <h2 className="text-lg font-medium text-[var(--color-texto)]">Tus meditaciones</h2>
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
                  onClick={() => escuchar(m.texto)}
                  disabled={cargando}
                  className="mt-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-sm text-[var(--color-texto)] disabled:cursor-not-allowed disabled:opacity-40"
                >
                  Escuchar
                </button>
              </li>
            ))}
          </ul>

          {reproduciendo && (
            <button
              type="button"
              onClick={detener}
              className="mt-4 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-5 py-2.5 text-[var(--color-texto)]"
            >
              Detener
            </button>
          )}
          {motor === 'webspeech' && (
            <p className="mt-3 text-sm text-[var(--color-texto-tenue)]">
              Usando la voz del sistema (respaldo).
            </p>
          )}
          {error && (
            <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
              No se pudo reproducir la voz en este dispositivo.
            </p>
          )}
        </div>
      )}

      <div className="mt-10 rounded-[var(--radius-suave)] border border-[var(--color-borde)] p-5">
        <h2 className="text-lg font-medium text-[var(--color-texto)]">Tu propia voz</h2>
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
                recargarVozPropia();
              }}
              onRechazar={() => setMostrarConsent(false)}
            />
          </div>
        )}

        {consentDado && !vozPropia && (
          <div className="mt-2">
            {vozRemota && (
              <div className="mt-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4">
                <p className="text-[var(--color-texto)]">
                  Encontramos una voz tuya creada antes con esta app
                  (&ldquo;{vozRemota.nombre}&rdquo;). Puedes recuperarla sin
                  volver a grabar.
                </p>
                <button
                  type="button"
                  onClick={recuperarVoz}
                  className="mt-3 rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)]"
                >
                  Recuperar mi voz
                </button>
              </div>
            )}
            <GrabacionVoz
              onCreada={() => {
                recargarVozPropia();
              }}
            />
          </div>
        )}

        {consentDado && vozPropia && (
          <div className="mt-4">
            <p className="text-[var(--color-texto-suave)]">
              Tu voz está lista. Las meditaciones de esta página se reproducen
              con <strong>tu propia voz</strong>. Puedes revocar el
              consentimiento y borrarla cuando quieras desde Ajustes.
            </p>
            <button
              type="button"
              onClick={() => escuchar('Hola. Esta es tu voz, acompañándote.')}
              disabled={cargando}
              className="mt-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-sm text-[var(--color-texto)] disabled:opacity-40"
            >
              Probar mi voz
            </button>

            <label className="mt-4 flex cursor-pointer items-start gap-3 text-sm text-[var(--color-texto-suave)]">
              <input
                type="checkbox"
                checked={vozEnConversacion}
                onChange={(e) => cambiarUsoConversacion(e.target.checked)}
                className="mt-0.5 h-5 w-5 accent-[var(--color-acento)]"
              />
              <span>
                Usar mi voz también en las conversaciones (las respuestas de la
                IA sonarán con mi voz). Puedes cambiarlo cuando quieras.
              </span>
            </label>
          </div>
        )}

        {mensajeVoz && (
          <p role="status" className="mt-3 text-sm text-[var(--color-texto-suave)]">
            {mensajeVoz}
          </p>
        )}
      </div>
    </section>
  );
}
