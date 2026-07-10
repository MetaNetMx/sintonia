// Fuentes dinamicas (PRD §3, decision 2026-07-09): Ernesto actualiza la
// fuente semanal desde la app; la dinamica mas reciente es la activa y el
// registro estatico del repo es el respaldo.
import 'fake-indexeddb/auto';
import { describe, it, expect } from 'vitest';
import {
  guardarFuenteDinamica,
  listarFuentesDinamicas,
  eliminarFuenteDinamica,
  cargarFuenteActiva,
  lenteDeFuente,
} from '../src/fuentes/dinamicas.js';
import { FUENTES } from '../src/fuentes/registro.js';
import { LENTE_ACTIVA } from '../src/fuentes/lente.js';
import { idDeFuente, destiladoValido } from '../api/destilar.js';

describe('fuentes dinamicas: activar una fuente nueva desde la app', () => {
  it('sin dinamicas, la activa es la estatica del registro', async () => {
    const activa = await cargarFuenteActiva();
    expect(activa.id).toBe(FUENTES[0].id);
    expect(activa.dinamica).toBeUndefined();
  });

  it('guardar una dinamica la vuelve la activa (con su lente propia)', async () => {
    await guardarFuenteDinamica({
      id: '2026-07-15-charla-54-el-perdon',
      titulo: 'Charla 54 — El perdón',
      fecha: '2026-07-15',
      resumen: 'El perdón como soltar el acuerdo con la ofensa.',
      destilado: '## Esencia\nPerdonar es dejar de sostener…',
      lente: 'Trabajas con la lente de la charla "El perdón"…\nLIMITES DE ESTA LENTE…',
    });

    const activa = await cargarFuenteActiva();
    expect(activa.id).toBe('2026-07-15-charla-54-el-perdon');
    expect(activa.dinamica).toBe(true);
    expect(lenteDeFuente(activa)).toContain('El perdón');
  });

  it('la mas reciente gana y quitar una regresa a la anterior', async () => {
    // Segunda fuente con creadaEn posterior garantizada.
    const b = await guardarFuenteDinamica({
      id: '2026-07-22-charla-55',
      titulo: 'Charla 55',
      destilado: '## Esencia\nOtra ensenanza…',
    });
    b.creadaEn = new Date(Date.now() + 1000).toISOString();
    const { STORES, put } = await import('../src/datos/db.js');
    await put(STORES.FUENTES, b);

    expect((await cargarFuenteActiva()).id).toBe('2026-07-22-charla-55');

    await eliminarFuenteDinamica('2026-07-22-charla-55');
    expect((await cargarFuenteActiva()).id).toBe('2026-07-15-charla-54-el-perdon');

    const lista = await listarFuentesDinamicas();
    expect(lista.find((f) => f.fuenteId === '2026-07-22-charla-55')).toBeUndefined();
  });

  it('no convive con el cache de guiones: solo lista claves fuente:', async () => {
    const { STORES, put } = await import('../src/datos/db.js');
    await put(STORES.FUENTES, { id: 'guion:x', guion: { esencia: 'g' } });
    const lista = await listarFuentesDinamicas();
    expect(lista.every((f) => f.id.startsWith('fuente:'))).toBe(true);
  });

  it('una fuente sin destilado no se guarda', async () => {
    await expect(guardarFuenteDinamica({ id: 'x', destilado: '  ' })).rejects.toThrow();
  });

  it('lenteDeFuente cae a la lente curada si la fuente no trae la suya', () => {
    expect(lenteDeFuente({ lente: '' })).toBe(LENTE_ACTIVA);
    expect(lenteDeFuente(null)).toBe(LENTE_ACTIVA);
  });
});

describe('api/destilar: contratos de id y validacion', () => {
  it('idDeFuente: fecha + slug ASCII sin acentos', () => {
    const id = idDeFuente('Charla 54 — El Perdón', new Date('2026-07-15T12:00:00Z'));
    expect(id).toBe('2026-07-15-charla-54-el-perdon');
    expect(idDeFuente('', new Date('2026-07-15T12:00:00Z'))).toBe('2026-07-15-fuente');
  });

  it('destiladoValido exige resumen, destilado y lente con sustancia', () => {
    const valido = {
      resumen: 'Un resumen con suficiente sustancia para pasar.',
      destilado: 'x'.repeat(400),
      lente: 'y'.repeat(150),
    };
    expect(destiladoValido(valido)).toBe(true);
    expect(destiladoValido({ ...valido, lente: 'corta' })).toBe(false);
    expect(destiladoValido({ ...valido, destilado: 'corto' })).toBe(false);
    expect(destiladoValido(null)).toBe(false);
  });
});
