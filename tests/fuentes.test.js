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
import {
  idDeFuente,
  destiladoValido,
  zonaRojaEnLente,
  contieneZonaRoja,
  politicaZonaRoja,
} from '../api/destilar.js';

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

  const DESTILADO_OK = {
    resumen: 'Un resumen con suficiente sustancia para pasar.',
    destilado: `## Esencia\n${'x'.repeat(300)}\n## Zonas excluidas del producto\nNada clinico.`,
    lente: `Trabajas con la lente de la charla "Prueba":\n${'y'.repeat(100)}\nLIMITES DE ESTA LENTE (obligatorios): nada de salud.`,
  };

  it('destiladoValido exige sustancia Y estructura (Esencia, Zonas excluidas, LIMITES)', () => {
    expect(destiladoValido(DESTILADO_OK)).toBe(true);
    // Solo longitudes ya no basta (hallazgo Media-alta 2026-07-09).
    expect(destiladoValido({ ...DESTILADO_OK, lente: 'y'.repeat(150) })).toBe(false);
    expect(destiladoValido({ ...DESTILADO_OK, destilado: 'x'.repeat(400) })).toBe(false);
    expect(destiladoValido({ ...DESTILADO_OK, lente: 'corta' })).toBe(false);
    expect(destiladoValido(null)).toBe(false);
  });

  it('detecta los parafraseos que evadian el filtro (auditoria 2026-07-15)', () => {
    expect(contieneZonaRoja('La conciencia origina tus padecimientos.')).toBe(true);
    expect(contieneZonaRoja('Abandona la quimioterapia y confia.')).toBe(true);
    expect(contieneZonaRoja('Meditar reemplaza el tratamiento medico.')).toBe(true);
    expect(contieneZonaRoja('Tus creencias generan la enfermedad que vives.')).toBe(true);
    // Frases legitimas del acompanamiento NO deben dispararse.
    expect(contieneZonaRoja('La meditacion acompana tu proceso, no lo sustituye.')).toBe(false);
    expect(contieneZonaRoja('Elegir de que te alimentas emocionalmente.')).toBe(false);
    expect(contieneZonaRoja('Deja de sostener lo que te pesa en esa relacion.')).toBe(false);
  });

  it('politicaZonaRoja revisa TODO lo aprovechable, no solo la lente', () => {
    const limpio = {
      resumen: 'Una charla sobre sintonia y discernimiento.',
      destilado: '## Esencia\nAlgo sano.\n## Zonas excluidas del producto\nSe excluyo: la mente causa enfermedad.',
      lente: 'Puntos sanos.\nLIMITES DE ESTA LENTE: nada de salud.',
    };
    // Nombrar lo excluido DENTRO de "Zonas excluidas" es legitimo.
    expect(politicaZonaRoja(limpio)).toBe(false);
    // Pero la misma frase en el resumen o en el destilado aprovechable, no.
    expect(politicaZonaRoja({ ...limpio, resumen: 'La mente causa enfermedad.' })).toBe(true);
    expect(
      politicaZonaRoja({
        ...limpio,
        destilado: '## Esencia\nAbandona la quimioterapia.\n## Zonas excluidas del producto\nnada',
      }),
    ).toBe(true);
  });

  it('zonaRojaEnLente: politica determinista sobre la parte aprovechable', () => {
    const conRoja = DESTILADO_OK.lente.replace(
      'Trabajas con la lente',
      'El agua como medicina sana. Trabajas con la lente',
    );
    expect(zonaRojaEnLente(conRoja)).toBe(true);
    expect(zonaRojaEnLente('la mente causa enfermedad y mas texto')).toBe(true);
    // Mencionar exclusiones DENTRO de LIMITES es legitimo.
    expect(zonaRojaEnLente(DESTILADO_OK.lente)).toBe(false);
    expect(
      zonaRojaEnLente(
        'Puntos sanos.\nLIMITES DE ESTA LENTE: nunca sugieras que la mente causa enfermedad.',
      ),
    ).toBe(false);
  });
});

describe('cache de guiones (auditoria 2026-07-09): sin mezclas fuente/guion', () => {
  it('eliminar una fuente dinamica invalida sus guiones cacheados', async () => {
    const { STORES, put, getAll } = await import('../src/datos/db.js');
    await guardarFuenteDinamica({
      id: 'fuente-con-cache',
      titulo: 'Con cache',
      destilado: '## Esencia\nAlgo con sustancia…',
    });
    await put(STORES.FUENTES, {
      id: 'guion:fuente-con-cache:abc123',
      fuenteId: 'fuente-con-cache',
      guion: { esencia: 'vieja' },
    });

    await eliminarFuenteDinamica('fuente-con-cache');

    const restantes = await getAll(STORES.FUENTES);
    expect(restantes.find((r) => r.id === 'fuente:fuente-con-cache')).toBeUndefined();
    expect(restantes.find((r) => r.fuenteId === 'fuente-con-cache')).toBeUndefined();
  });
});
