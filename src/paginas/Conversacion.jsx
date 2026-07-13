import { useCallback, useEffect, useRef, useState } from 'react';
import { useAcompanamiento } from '../ia/useAcompanamiento.js';
import { componerSistema } from '../ia/prompts.js';
import { cargarFuenteActiva, lenteDeFuente } from '../fuentes/dinamicas.js';
import { obtenerGuion } from '../flujo/guion.js';
import { directorVoz, separarMeditacion } from '../flujo/etapas.js';
import { iniciarGrabacion, soportaGrabacion } from '../voz/clonacion.js';
import { transcribir } from '../voz/transcribir.js';
import { listarVoces } from '../voz/voces.js';
import { useTTS } from '../voz/useTTS.js';
import { useVozPropia } from '../voz/useVozPropia.js';
import ModalCrisis from '../seguridad/ModalCrisis.jsx';

// Texto de salida acotado: respuestas hablables de 2-3 frases; el cierre lleva
// practica + meditacion hablada (3-4 frases) y necesita mas espacio. El proxy
// suma aparte el margen de razonamiento.
const MAX_TOKENS_VOZ = 420;

// Conversacion por voz (PRD §15): hablas por notas de voz (ElevenLabs Scribe) y
// la app responde con voz natural (ElevenLabs). Misma lente + seguridad que la
// Sesion. La FUENTE dirige tambien aqui (decision de Ernesto, 2026-07-09): el
// guion derivado de la fuente + un director por turno hacen la charla muy corta
// y la aterrizan en UNA practica concreta (~3 turnos), en vez de chat abierto.
// Requiere ELEVENLABS_API_KEY para voz/transcripcion; sin ella, avisa.
export default function Conversacion() {
  const [guion, setGuion] = useState(null);
  const [fuente, setFuente] = useState(null);
  useEffect(() => {
    let vivo = true;
    cargarFuenteActiva().then((f) => {
      if (!vivo) return;
      setFuente(f);
      obtenerGuion(f).then(({ guion: g }) => {
        if (vivo) setGuion(g);
      });
    });
    return () => {
      vivo = false;
    };
  }, []);

  const sistema = useCallback(
    ({ turno }) =>
      componerSistema({ lente: lenteDeFuente(fuente) }) + '\n\n' + directorVoz({ guion, turno }),
    [guion, fuente]
  );
  const { mensajes, cargando, error, crisis, enviar, reconocerCrisis, reiniciar } =
    useAcompanamiento({ sistema, maxTokens: MAX_TOKENS_VOZ, esfuerzo: 'low' });
  const tts = useTTS();

  const [grabando, setGrabando] = useState(false);
  const [procesando, setProcesando] = useState(false);
  const [errorVoz, setErrorVoz] = useState(null);
  const [texto, setTexto] = useState('');
  const [voces, setVoces] = useState([]);
  const [voiceId, setVoiceId] = useState('');
  const [mostrarTexto, setMostrarTexto] = useState(true);

  const controlRef = useRef(null);
  const ultimoHabladoRef = useRef(null);
  const puedeGrabar = soportaGrabacion();

  // Cargar voces disponibles (si hay ElevenLabs configurado).
  useEffect(() => {
    let vivo = true;
    listarVoces().then((lista) => {
      if (vivo) setVoces(lista);
    });
    return () => {
      vivo = false;
    };
  }, []);

  // Si la persona clono su voz, la conversacion la usa por defecto (puede
  // cambiarla en el selector).
  const { vozPropia } = useVozPropia();
  useEffect(() => {
    if (vozPropia) setVoiceId((actual) => actual || vozPropia);
  }, [vozPropia]);

  // Reproducir automaticamente la ultima respuesta del asistente. Si trae
  // MEDITACION: (cierre del turno 3), se separa: se habla completa (cierre +
  // meditacion, sin el marcador) y la meditacion se GUARDA para re-escucharla
  // en la pagina Meditaciones (hallazgo Media 2026-07-09: la meditacion de
  // voz no se guardaba nunca).
  useEffect(() => {
    const ultimo = mensajes[mensajes.length - 1];
    if (!ultimo || ultimo.rol !== 'asistente' || ultimo.id === ultimoHabladoRef.current) return;
    ultimoHabladoRef.current = ultimo.id;

    const { cierre, meditacion } = separarMeditacion(ultimo.contenido);
    const hablado = meditacion ? `${cierre}\n\n${meditacion}` : ultimo.contenido;
    // El cierre con meditacion se habla en estilo meditacion (mas lento y
    // estable); el resto de la charla, en estilo conversacion (baja latencia).
    tts.hablar({
      texto: hablado,
      voiceId: voiceId || undefined,
      estilo: meditacion ? 'meditacion' : 'conversacion',
    });

    if (meditacion) {
      import('../datos/meditaciones.js')
        .then((m) =>
          m.guardarMeditacion({
            texto: meditacion,
            fuenteId: fuente?.id || null,
            titulo: fuente?.titulo
              ? `Meditación — ${fuente.titulo} (voz)`
              : 'Meditación — conversación por voz',
          })
        )
        .catch(() => {
          /* sin persistencia disponible */
        });
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [mensajes]);

  const iniciar = async () => {
    if (!puedeConversar) return;
    setErrorVoz(null);
    tts.detener();
    try {
      controlRef.current = await iniciarGrabacion();
      setGrabando(true);
    } catch {
      setErrorVoz('No pude acceder al micrófono. Revisa los permisos del navegador.');
    }
  };

  const detenerYEnviar = async () => {
    if (!controlRef.current) return;
    setGrabando(false);
    setProcesando(true);
    try {
      const audio = await controlRef.current.detener();
      controlRef.current = null;
      const dicho = await transcribir(audio, { idioma: 'es' });
      if (dicho && dicho.trim()) {
        enviar(dicho.trim());
      } else {
        setErrorVoz('No alcancé a entender el audio. ¿Lo intentamos de nuevo?');
      }
    } catch {
      setErrorVoz(
        'No pude transcribir. ¿Está configurada la voz? (falta ELEVENLABS_API_KEY en .env.local)'
      );
    } finally {
      setProcesando(false);
    }
  };

  const ocupado = cargando || procesando;
  // Compuerta de estados (hallazgo Media 2026-07-09):
  // - listo: no se conversa hasta tener fuente Y guion (evita que el primer
  //   turno use la lente estatica mientras carga la dinamica).
  // - sesionCerrada: el turno 3 cierra con practica y meditacion; despues se
  //   invita a una conversacion nueva (el director tambien lo respalda).
  // - contencion: crisis alta = estado terminal; el hook ademas bloquea enviar.
  const listo = Boolean(fuente && guion);
  const turnosUsuario = mensajes.filter((m) => m.rol === 'usuario').length;
  const sesionCerrada = turnosUsuario >= 3 && !cargando;
  const contencion = crisis.nivel === 'alto';
  const puedeConversar = listo && !sesionCerrada && !contencion;

  const enviarTexto = (evento) => {
    evento.preventDefault();
    const limpio = texto.trim();
    if (!limpio || cargando || !puedeConversar) return;
    setTexto('');
    tts.detener();
    enviar(limpio);
  };

  const nuevaConversacion = () => {
    tts.detener();
    ultimoHabladoRef.current = null;
    setTexto('');
    setErrorVoz(null);
    reiniciar();
  };

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">
        Conversar por voz
      </h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Háblale como una nota de voz y te responde con voz. Con calma, una idea a
        la vez. Es un espacio de exploración, no un tratamiento.
      </p>

      {/* Selector de voz (si hay voces disponibles) */}
      {voces.length > 0 && (
        <div className="mt-4 flex items-center gap-2">
          <label htmlFor="voz" className="text-sm text-[var(--color-texto-suave)]">
            Voz:
          </label>
          <select
            id="voz"
            value={voiceId}
            onChange={(e) => setVoiceId(e.target.value)}
            className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-1.5 text-sm text-[var(--color-texto)]"
          >
            <option value="">Voz por defecto</option>
            {vozPropia && <option value={vozPropia}>Mi voz</option>}
            {voces.map((v) => (
              <option key={v.voiceId} value={v.voiceId}>
                {v.nombre}
              </option>
            ))}
          </select>
        </div>
      )}

      <div
        className="mt-6 flex min-h-[18rem] flex-col gap-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4"
        aria-live="polite"
      >
        {mensajes.length === 0 && (
          <p className="m-auto max-w-prose text-center text-[var(--color-texto-tenue)]">
            Toca el micrófono y cuéntame qué estás viviendo. Sin prisa.
          </p>
        )}

        {mensajes.map((mensaje) => {
          const esUsuario = mensaje.rol === 'usuario';
          return (
            <div
              key={mensaje.id}
              className={esUsuario ? 'flex justify-end' : 'flex flex-col items-start gap-1'}
            >
              <p
                className={[
                  'max-w-[85%] whitespace-pre-wrap rounded-[var(--radius-suave)] px-4 py-2.5 leading-relaxed',
                  esUsuario
                    ? 'bg-[var(--color-superficie-alta)] text-[var(--color-texto)]'
                    : 'border border-[var(--color-borde)] text-[var(--color-texto-suave)]',
                ].join(' ')}
              >
                {mostrarTexto || esUsuario ? mensaje.contenido : '🔊 Mensaje de voz'}
              </p>
              {!esUsuario && (
                <button
                  type="button"
                  onClick={() =>
                    tts.hablar({
                      texto: mensaje.contenido,
                      voiceId: voiceId || undefined,
                      estilo: 'conversacion',
                    })
                  }
                  className="text-xs text-[var(--color-acento)]"
                  aria-label="Escuchar esta respuesta de nuevo"
                >
                  ▶ Escuchar
                </button>
              )}
            </div>
          );
        })}

        {ocupado && (
          <p className="text-sm text-[var(--color-texto-tenue)]">
            {procesando ? 'Transcribiendo…' : 'Pensando…'}
          </p>
        )}
      </div>

      {crisis.nivel === 'atencion' && !crisis.activa && (
        <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
          Si sientes que necesitas hablar con una persona, no tienes que
          atravesarlo en soledad; hay líneas de apoyo disponibles.
        </p>
      )}
      {(error || errorVoz) && (
        <p className="mt-3 text-sm text-[var(--color-texto-suave)]">
          {errorVoz || 'No pude conectar con el servicio. Reintenta en un momento.'}
        </p>
      )}

      {!listo && (
        <p className="mt-3 text-sm text-[var(--color-texto-tenue)]">
          Preparando la conversación con la fuente de esta semana…
        </p>
      )}

      {/* Contencion terminal: tras crisis alta la charla no continua. */}
      {contencion && (
        <div className="mt-5 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="max-w-prose text-[var(--color-texto)]">
            Esta conversación se queda aquí, en contención. Lo que compartiste
            merece apoyo humano directo: SAPTEL (55 5259 8121), Línea de la Vida
            (800 911 2000) o, si hay riesgo inmediato, 911.
          </p>
          <button
            type="button"
            onClick={nuevaConversacion}
            className="mt-4 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-[var(--color-texto)]"
          >
            Empezar una conversación nueva
          </button>
        </div>
      )}

      {/* Cierre de sesion: 3 turnos -> practica + meditacion, y a descansar. */}
      {sesionCerrada && !contencion && (
        <div className="mt-5 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5">
          <p className="max-w-prose text-[var(--color-texto-suave)]">
            La charla cerró con una práctica y tu meditación quedó guardada en
            <strong> Meditaciones</strong> para re-escucharla cuando quieras.
          </p>
          <button
            type="button"
            onClick={nuevaConversacion}
            className="mt-4 rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-4 py-2 text-[var(--color-texto)]"
          >
            Nueva conversación
          </button>
        </div>
      )}

      {/* Control de grabacion (nota de voz) */}
      <div className="mt-5 flex flex-col items-center gap-3">
        {puedeGrabar ? (
          !grabando ? (
            <button
              type="button"
              onClick={iniciar}
              disabled={ocupado || !puedeConversar}
              className="flex h-16 w-16 items-center justify-center rounded-full bg-[var(--color-acento)] text-2xl text-[var(--color-acento-contraste)] disabled:opacity-40"
              aria-label="Grabar nota de voz"
            >
              🎙️
            </button>
          ) : (
            <button
              type="button"
              onClick={detenerYEnviar}
              className="flex h-16 w-16 items-center justify-center rounded-full border-2 border-[var(--color-acento)] text-2xl text-[var(--color-texto)]"
              aria-label="Detener y enviar la nota de voz"
            >
              ⏹️
            </button>
          )
        ) : (
          <p className="text-sm text-[var(--color-texto-tenue)]">
            Este navegador no permite grabar; usa el campo de texto.
          </p>
        )}
        <p className="text-xs text-[var(--color-texto-tenue)]">
          {grabando ? 'Grabando… toca para enviar' : 'Toca para hablar'}
        </p>
      </div>

      {/* Texto de respaldo + controles */}
      <form onSubmit={enviarTexto} className="mt-4 flex gap-2">
        <label htmlFor="texto-voz" className="sr-only">
          Escribe si prefieres
        </label>
        <input
          id="texto-voz"
          type="text"
          value={texto}
          onChange={(e) => setTexto(e.target.value)}
          placeholder="…o escribe aquí"
          className="flex-1 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] px-3 py-2 text-[var(--color-texto)] placeholder:text-[var(--color-texto-tenue)]"
        />
        <button
          type="submit"
          disabled={ocupado || !texto.trim() || !puedeConversar}
          className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-4 py-2 font-medium text-[var(--color-acento-contraste)] disabled:opacity-40"
        >
          Enviar
        </button>
      </form>

      <div className="mt-4 flex flex-wrap gap-4 text-sm">
        <button
          type="button"
          onClick={() => setMostrarTexto((v) => !v)}
          className="text-[var(--color-texto-suave)]"
        >
          {mostrarTexto ? 'Ocultar texto' : 'Mostrar texto'}
        </button>
        {mensajes.length > 0 && (
          <button
            type="button"
            onClick={nuevaConversacion}
            className="text-[var(--color-texto-suave)]"
          >
            Nueva conversación
          </button>
        )}
      </div>

      <ModalCrisis abierto={crisis.activa} onCerrar={reconocerCrisis} />
    </section>
  );
}
