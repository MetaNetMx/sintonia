import { NOMBRE_APP } from '../config/app.js';
import Navegacion from './Navegacion.jsx';

// Estructura general: cabecera con el nombre de la app y navegacion,
// y un <main> con el contenido de cada pagina. Sobrio, accesible, calmado.
export default function Layout({ children }) {
  return (
    <div className="min-h-screen bg-[var(--color-fondo)] text-[var(--color-texto)]">
      <header className="border-b border-[var(--color-borde)] bg-[var(--color-superficie)]">
        <div className="mx-auto flex max-w-3xl flex-col gap-3 px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-lg font-medium tracking-wide text-[var(--color-texto)]">
            {NOMBRE_APP}
          </p>
          <Navegacion />
        </div>
      </header>

      <main className="mx-auto max-w-3xl px-4 py-8">{children}</main>
    </div>
  );
}
