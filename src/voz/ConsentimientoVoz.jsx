// Consentimiento explicito para clonar la voz (PRD §2.5 y §6).
// La voz es DATO BIOMETRICO: el consentimiento es informado, explicito, revocable
// y con borrado. Este componente explica que se graba, donde se guarda, cuanto
// tiempo y como se borra, y exige aceptacion casilla por casilla.

import { useState } from 'react';
import { NOMBRE_APP } from '../config/app.js';

/**
 * Guarda el consentimiento en el almacen local sin romper si src/datos aun no existe.
 * Usa import dinamico y asume la firma del contrato (abrirDB + store 'consentimientos').
 * @param {Object} registro
 */
async function guardarConsentimiento(registro) {
  try {
    const modulo = await import('../datos/db.js');
    if (typeof modulo.abrirDB !== 'function') return;
    const db = await modulo.abrirDB();
    // El contrato define el store 'consentimientos'. Escribimos de forma tolerante.
    await db.put('consentimientos', registro);
  } catch {
    // Si el modulo de datos aun no esta disponible, no bloqueamos la experiencia.
    // La capa que consume onAceptar puede persistir por su cuenta.
  }
}

const CASILLAS = [
  {
    id: 'biometrico',
    texto: 'Entiendo que mi voz es un dato biometrico y que se usara para crear una voz personalizada.',
  },
  {
    id: 'local',
    texto: 'Entiendo que mis grabaciones se guardan primero en este dispositivo (local-first).',
  },
  {
    id: 'revocable',
    texto: 'Se que puedo revocar este consentimiento y borrar mi voz en cualquier momento, sin friccion.',
  },
];

/**
 * @param {Object} props
 * @param {(datos: { fecha: string, casillas: Record<string, boolean> }) => void} [props.onAceptar]
 * @param {() => void} [props.onRechazar]
 */
export default function ConsentimientoVoz({ onAceptar, onRechazar }) {
  const [marcadas, setMarcadas] = useState({});
  const [guardando, setGuardando] = useState(false);

  const todasMarcadas = CASILLAS.every((c) => marcadas[c.id]);

  const alternar = (id) => {
    setMarcadas((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const aceptar = async () => {
    if (!todasMarcadas || guardando) return;
    setGuardando(true);
    const registro = {
      tipo: 'voz',
      otorgado: true,
      fecha: new Date().toISOString(),
      casillas: { ...marcadas },
    };
    await guardarConsentimiento(registro);
    setGuardando(false);
    if (typeof onAceptar === 'function') {
      onAceptar({ fecha: registro.fecha, casillas: registro.casillas });
    }
  };

  return (
    <section
      aria-labelledby="titulo-consentimiento-voz"
      className="mx-auto max-w-xl rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-6"
    >
      <h2
        id="titulo-consentimiento-voz"
        className="text-xl font-medium text-[var(--color-texto)]"
      >
        Consentimiento para clonar tu voz
      </h2>

      <p className="mt-3 text-[var(--color-texto-suave)]">
        En {NOMBRE_APP} tu voz puede acompanarte: podras escucharte a ti mismo guiando tus
        meditaciones. Antes de grabar, queremos que sepas con claridad que implica.
      </p>

      <dl className="mt-5 space-y-4">
        <div>
          <dt className="font-medium text-[var(--color-texto)]">Que se graba</dt>
          <dd className="text-[var(--color-texto-suave)]">
            Breves muestras de tu voz leyendo textos. Solo audio; nada mas.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-texto)]">Donde se guarda</dt>
          <dd className="text-[var(--color-texto-suave)]">
            Primero en este dispositivo (local-first). El envio para crear la voz pasa por un
            servicio seguro; ninguna clave vive en la app.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-texto)]">Cuanto tiempo</dt>
          <dd className="text-[var(--color-texto-suave)]">
            El tiempo que tu decidas. Se conserva mientras quieras usar tu voz y ni un momento
            mas de lo necesario.
          </dd>
        </div>
        <div>
          <dt className="font-medium text-[var(--color-texto)]">Como se borra</dt>
          <dd className="text-[var(--color-texto-suave)]">
            Desde Ajustes puedes borrar tu voz y tus grabaciones cuando quieras. El borrado es
            inmediato y sin friccion.
          </dd>
        </div>
      </dl>

      <fieldset className="mt-6 space-y-3">
        <legend className="sr-only">Confirmaciones necesarias</legend>
        {CASILLAS.map((casilla) => (
          <label
            key={casilla.id}
            className="flex cursor-pointer items-start gap-3 text-[var(--color-texto)]"
          >
            <input
              type="checkbox"
              checked={!!marcadas[casilla.id]}
              onChange={() => alternar(casilla.id)}
              className="mt-1 h-5 w-5 accent-[var(--color-acento)]"
            />
            <span>{casilla.texto}</span>
          </label>
        ))}
      </fieldset>

      <div className="mt-7 flex flex-wrap gap-3">
        <button
          type="button"
          onClick={aceptar}
          disabled={!todasMarcadas || guardando}
          className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] transition-opacity disabled:cursor-not-allowed disabled:opacity-40"
        >
          {guardando ? 'Guardando…' : 'Doy mi consentimiento'}
        </button>
        <button
          type="button"
          onClick={() => {
            if (typeof onRechazar === 'function') onRechazar();
          }}
          className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] px-5 py-2.5 text-[var(--color-texto-suave)]"
        >
          Ahora no
        </button>
      </div>

      <p className="mt-4 text-sm text-[var(--color-texto-tenue)]">
        Puedes revocar este consentimiento en cualquier momento. Tu decision es reversible.
      </p>
    </section>
  );
}
