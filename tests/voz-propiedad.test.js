// Propiedad de las voces (auditoria 2026-07-12): api/voz-borrar solo borra
// voces CLONADAS creadas por esta app; nunca voces de catalogo ni ajenas.
import { describe, it, expect } from 'vitest';
import { esVozBorrable } from '../api/voz-borrar.js';

describe('esVozBorrable', () => {
  it('acepta clones con la etiqueta de la app', () => {
    expect(esVozBorrable({ category: 'cloned', labels: { app: 'sintonia' } })).toBe(true);
    // labels puede venir serializado como string desde el proveedor.
    expect(esVozBorrable({ category: 'cloned', labels: '{"app":"sintonia"}' })).toBe(true);
  });

  it('acepta clones legado creados antes de la etiqueta (por su descripcion)', () => {
    expect(
      esVozBorrable({
        category: 'cloned',
        labels: {},
        description: 'Voz clonada con consentimiento explicito del usuario. Dato biometrico.',
      }),
    ).toBe(true);
  });

  it('rechaza voces de catalogo y clones ajenos', () => {
    expect(esVozBorrable({ category: 'premade', labels: { app: 'sintonia' } })).toBe(false);
    expect(esVozBorrable({ category: 'professional', labels: {} })).toBe(false);
    expect(esVozBorrable({ category: 'cloned', labels: { app: 'otra-app' } })).toBe(false);
    expect(esVozBorrable({ category: 'cloned', labels: {}, description: 'otro origen' })).toBe(
      false,
    );
    expect(esVozBorrable(null)).toBe(false);
  });
});
