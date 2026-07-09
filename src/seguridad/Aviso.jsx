// Banner discreto y calmado, siempre accesible: recuerda que este es un espacio
// de acompanamiento complementario y NO sustituye atencion profesional.
// Regla dura del PRD (§2.1): el producto nunca se presenta como tratamiento.
export default function Aviso() {
  return (
    <aside
      role="note"
      aria-label="Aviso sobre el alcance de este acompanamiento"
      className="rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] px-4 py-3"
    >
      <p className="text-sm leading-relaxed text-[var(--color-texto-suave)]">
        Este es un espacio de acompañamiento complementario. No sustituye la
        atención médica ni psicológica profesional. Si atraviesas una crisis o
        sientes que necesitas ayuda, puedes acudir a una persona profesional o a
        una línea de apoyo.
      </p>
    </aside>
  );
}
