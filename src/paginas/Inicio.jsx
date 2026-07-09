import { Link } from 'react-router-dom';
import { NOMBRE_APP } from '../config/app.js';

// Accesos a las secciones principales. Sobrio y calmado (PRD §8).
const ACCESOS = [
  {
    a: '/acompanamiento',
    titulo: 'Sesión exprés',
    desc: 'La fuente de esta semana propone; tú aterrizas una práctica concreta. Unos minutos.',
  },
  {
    a: '/conversacion',
    titulo: 'Conversar por voz',
    desc: 'Háblale y te responde con voz, como una nota de voz. Fluido y cercano.',
  },
  {
    a: '/meditaciones',
    titulo: 'Meditaciones',
    desc: 'Prácticas guiadas para volver al cuerpo y a la respiración.',
  },
  {
    a: '/fuentes',
    titulo: 'Fuentes',
    desc: 'Las charlas que iluminan el camino, destiladas en un mapa.',
  },
  {
    a: '/perfil',
    titulo: 'Perfil',
    desc: 'Lo que buscas y lo que te mueve vive aquí, contigo.',
  },
];

export default function Inicio() {
  return (
    <section>
      <h1 className="text-3xl font-medium tracking-wide text-[var(--color-texto)]">
        {NOMBRE_APP}
      </h1>
      <p className="mt-3 max-w-prose text-[var(--color-texto-suave)]">
        Un espacio para volver a ti, con calma y a tu ritmo. Esto es exploración y
        acompañamiento —una lente para escucharte—, no un tratamiento médico.
      </p>

      <div className="mt-8 grid gap-3 sm:grid-cols-2">
        {ACCESOS.map((acceso) => (
          <Link
            key={acceso.a}
            to={acceso.a}
            className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5 transition-colors hover:bg-[var(--color-superficie-alta)]"
          >
            <span className="block text-lg font-medium text-[var(--color-texto)]">
              {acceso.titulo}
            </span>
            <span className="mt-1 block text-sm text-[var(--color-texto-suave)]">
              {acceso.desc}
            </span>
          </Link>
        ))}
      </div>
    </section>
  );
}
