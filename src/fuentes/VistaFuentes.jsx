import { useState } from 'react';
import { FUENTES } from './registro.js';

// VistaFuentes: lista las fuentes destiladas y permite abrir el mapa
// conceptual de cada una. Sobrio y calmado (PRD §8): sin movimiento agresivo,
// texto legible, foco visible.
export default function VistaFuentes() {
  const [seleccionada, setSeleccionada] = useState(null);

  if (FUENTES.length === 0) {
    return (
      <section>
        <Encabezado />
        <p className="mt-6 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-4 text-[var(--color-texto-suave)]">
          Todavia no hay fuentes destiladas. Cuando Ernesto entregue la primera
          fuente de la semana, su destilado aparecera aqui.
        </p>
      </section>
    );
  }

  return (
    <section>
      <Encabezado />

      <ul className="mt-6 flex flex-col gap-3">
        {FUENTES.map((fuente) => {
          const abierta = seleccionada === fuente.id;
          return (
            <li
              key={fuente.id}
              className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)]"
            >
              <button
                type="button"
                onClick={() =>
                  setSeleccionada(abierta ? null : fuente.id)
                }
                aria-expanded={abierta}
                className="flex w-full flex-col items-start gap-1 p-4 text-left"
              >
                <span className="text-lg font-medium text-[var(--color-texto)]">
                  {fuente.titulo}
                </span>
                <span className="text-sm text-[var(--color-texto-tenue)]">
                  {fuente.fecha}
                </span>
                <span className="mt-1 text-[var(--color-texto-suave)]">
                  {fuente.resumen}
                </span>
              </button>

              {abierta && (
                <div className="border-t border-[var(--color-borde)] p-4 text-sm text-[var(--color-texto-suave)]">
                  <p>
                    El mapa conceptual completo (ideas-fuerza, cosmovision,
                    temas, tensiones y la distincion entre lo metaforico y lo
                    clinico) vive en el destilado:
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

function Encabezado() {
  return (
    <div>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">
        Fuentes
      </h1>
      <p className="mt-2 text-[var(--color-texto-suave)]">
        Las charlas y lecturas que iluminan el camino de exploracion, destiladas
        en un mapa conceptual. Son una lente, no un dogma.
      </p>
    </div>
  );
}
