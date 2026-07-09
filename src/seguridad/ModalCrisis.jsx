import { useEffect, useRef } from 'react';
import { RECURSOS_CRISIS } from './recursos.js';

// Modal de contencion y derivacion.
//
// Regla dura del PRD (§2.2): ante senales de crisis se prioriza CONTENCION +
// DERIVACION a ayuda humana profesional por encima de "seguir la experiencia".
// El tono es calido, breve y no alarmista. No diagnostica, no dramatiza.
//
// Accesibilidad: aria-modal, foco atrapado dentro del dialogo, cierre con Escape
// y devolucion del foco al elemento que lo abrio.
export default function ModalCrisis({ abierto, onCerrar }) {
  const dialogoRef = useRef(null);
  const focoPrevioRef = useRef(null);

  useEffect(() => {
    if (!abierto) return;

    // Recordar donde estaba el foco para devolverlo al cerrar.
    focoPrevioRef.current = document.activeElement;

    const dialogo = dialogoRef.current;

    // Mover el foco al primer elemento enfocable del dialogo.
    const enfocables = () =>
      dialogo
        ? Array.from(
            dialogo.querySelectorAll(
              'a[href], button:not([disabled]), textarea, input, select, [tabindex]:not([tabindex="-1"])'
            )
          )
        : [];

    const primeros = enfocables();
    if (primeros.length > 0) {
      primeros[0].focus();
    } else if (dialogo) {
      dialogo.focus();
    }

    // Atrapar el foco y permitir cierre con Escape.
    function alPresionarTecla(evento) {
      if (evento.key === 'Escape') {
        evento.preventDefault();
        onCerrar?.();
        return;
      }
      if (evento.key !== 'Tab') return;

      const lista = enfocables();
      if (lista.length === 0) {
        evento.preventDefault();
        return;
      }
      const primero = lista[0];
      const ultimo = lista[lista.length - 1];

      if (evento.shiftKey && document.activeElement === primero) {
        evento.preventDefault();
        ultimo.focus();
      } else if (!evento.shiftKey && document.activeElement === ultimo) {
        evento.preventDefault();
        primero.focus();
      }
    }

    document.addEventListener('keydown', alPresionarTecla);
    return () => {
      document.removeEventListener('keydown', alPresionarTecla);
      // Devolver el foco al elemento que abrio el modal.
      if (focoPrevioRef.current && focoPrevioRef.current.focus) {
        focoPrevioRef.current.focus();
      }
    };
  }, [abierto, onCerrar]);

  if (!abierto) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4"
      // Capa de fondo: al hacer clic fuera del dialogo, se cierra.
      onMouseDown={(evento) => {
        if (evento.target === evento.currentTarget) {
          onCerrar?.();
        }
      }}
    >
      {/* Velo tenue, sin destellos ni movimiento brusco. */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      <div
        ref={dialogoRef}
        role="dialog"
        aria-modal="true"
        aria-labelledby="titulo-modal-crisis"
        aria-describedby="mensaje-modal-crisis"
        tabIndex={-1}
        className="relative w-full max-w-md rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie-alta)] p-6 shadow-xl"
      >
        <h2
          id="titulo-modal-crisis"
          className="text-lg font-medium text-[var(--color-texto)]"
        >
          Estoy aquí contigo
        </h2>

        <p
          id="mensaje-modal-crisis"
          className="mt-3 text-sm leading-relaxed text-[var(--color-texto-suave)]"
        >
          Lo que sientes importa y no tienes que atravesarlo en soledad. Este
          espacio te acompaña, pero en momentos así lo más valioso es hablar con
          una persona. Estas líneas son gratuitas, confidenciales y atienden
          personas reales.
        </p>

        <ul className="mt-4 space-y-3">
          {RECURSOS_CRISIS.map((recurso) => (
            <li
              key={recurso.id}
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-3"
            >
              <div className="flex items-baseline justify-between gap-3">
                <span className="font-medium text-[var(--color-texto)]">
                  {recurso.nombre}
                </span>
                <a
                  href={`tel:${recurso.telefonoEnlace}`}
                  className="text-sm font-medium text-[var(--color-acento)] underline underline-offset-2"
                >
                  {recurso.telefono}
                </a>
              </div>
              <p className="mt-1 text-xs leading-relaxed text-[var(--color-texto-tenue)]">
                {recurso.descripcion}
              </p>
              <p className="mt-1 text-xs text-[var(--color-texto-tenue)]">
                {recurso.disponibilidad}
              </p>
            </li>
          ))}
        </ul>

        <div className="mt-6 flex justify-end">
          <button
            type="button"
            onClick={() => onCerrar?.()}
            className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-2 text-sm text-[var(--color-texto)] hover:bg-[var(--color-superficie-alta)]"
          >
            Volver cuando quieras
          </button>
        </div>
      </div>
    </div>
  );
}
