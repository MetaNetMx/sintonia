import { NavLink } from 'react-router-dom';

// Enlaces a las 6 secciones. Foco visible y aria-labels para accesibilidad.
const SECCIONES = [
  { a: '/', texto: 'Inicio', etiqueta: 'Ir a Inicio' },
  { a: '/acompanamiento', texto: 'Sesión', etiqueta: 'Ir a la Sesión de indagación' },
  { a: '/conversacion', texto: 'Voz', etiqueta: 'Ir a Conversar por voz' },
  { a: '/meditaciones', texto: 'Meditaciones', etiqueta: 'Ir a Meditaciones' },
  { a: '/perfil', texto: 'Perfil', etiqueta: 'Ir a Perfil' },
  { a: '/fuentes', texto: 'Fuentes', etiqueta: 'Ir a Fuentes' },
  { a: '/ajustes', texto: 'Ajustes', etiqueta: 'Ir a Ajustes' },
];

export default function Navegacion() {
  return (
    <nav aria-label="Navegacion principal">
      <ul className="flex flex-wrap gap-1">
        {SECCIONES.map(({ a, texto, etiqueta }) => (
          <li key={a}>
            <NavLink
              to={a}
              end={a === '/'}
              aria-label={etiqueta}
              className={({ isActive }) =>
                [
                  'inline-block rounded-lg px-3 py-2 text-sm transition-colors',
                  isActive
                    ? 'bg-[var(--color-superficie-alta)] text-[var(--color-texto)]'
                    : 'text-[var(--color-texto-suave)] hover:text-[var(--color-texto)]',
                ].join(' ')
              }
            >
              {texto}
            </NavLink>
          </li>
        ))}
      </ul>
    </nav>
  );
}
