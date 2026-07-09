import { useEffect, useState } from 'react';
import { leerPerfil, guardarPerfil } from '../datos/perfil.js';

// Campos del "perfil vivo" (PRD §5). Texto libre; crece con el uso y la
// entrevista. Local primero: se guarda en este dispositivo (IndexedDB).
const CAMPOS = [
  { id: 'busca', etiqueta: '¿Qué buscas en este espacio?' },
  { id: 'mueve', etiqueta: '¿Qué te mueve?' },
  {
    id: 'formatos',
    etiqueta: '¿Qué formatos te resuenan? (conversar, meditar, escribir…)',
  },
  { id: 'notas', etiqueta: 'Notas libres' },
];

export default function Perfil() {
  const [datos, setDatos] = useState({});
  const [estado, setEstado] = useState('cargando'); // cargando | listo | guardando | guardado

  useEffect(() => {
    let vivo = true;
    leerPerfil()
      .then((perfil) => {
        if (!vivo) return;
        setDatos(perfil || {});
        setEstado('listo');
      })
      .catch(() => {
        if (vivo) setEstado('listo');
      });
    return () => {
      vivo = false;
    };
  }, []);

  const cambiar = (id, valor) => {
    setDatos((prev) => ({ ...prev, [id]: valor }));
    if (estado === 'guardado') setEstado('listo');
  };

  const guardar = async () => {
    setEstado('guardando');
    try {
      await guardarPerfil(datos);
      setEstado('guardado');
    } catch {
      setEstado('listo');
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">Perfil</h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Tu historia y tus preferencias viven aquí, en tu dispositivo. Puedes
        exportarlas o borrarlas cuando quieras desde Ajustes.
      </p>

      {estado === 'cargando' ? (
        <p className="mt-6 text-[var(--color-texto-tenue)]">Cargando…</p>
      ) : (
        <div className="mt-6 flex flex-col gap-5">
          {CAMPOS.map((campo) => (
            <div key={campo.id}>
              <label
                htmlFor={campo.id}
                className="block text-sm text-[var(--color-texto-suave)]"
              >
                {campo.etiqueta}
              </label>
              <textarea
                id={campo.id}
                value={datos[campo.id] || ''}
                onChange={(evento) => cambiar(campo.id, evento.target.value)}
                rows={3}
                className="mt-2 w-full resize-y rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-3 text-[var(--color-texto)]"
              />
            </div>
          ))}

          <div className="flex items-center gap-4">
            <button
              type="button"
              onClick={guardar}
              disabled={estado === 'guardando'}
              className="rounded-[var(--radius-suave)] bg-[var(--color-acento)] px-5 py-2.5 font-medium text-[var(--color-acento-contraste)] disabled:opacity-40"
            >
              {estado === 'guardando' ? 'Guardando…' : 'Guardar'}
            </button>
            {estado === 'guardado' && (
              <span className="text-sm text-[var(--color-texto-suave)]">
                Guardado en este dispositivo.
              </span>
            )}
          </div>
        </div>
      )}
    </section>
  );
}
