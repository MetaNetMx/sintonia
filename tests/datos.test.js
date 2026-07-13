// Contratos de persistencia local-first (PRD §7) sobre IndexedDB simulado.
// Cubre los hallazgos P1 (consentimiento con id estable) y P2 (upsert de
// conversaciones) de la auditoria externa 2026-07-08.
import 'fake-indexeddb/auto';
import { describe, it, expect, vi, afterEach } from 'vitest';
import {
  guardarConversacion,
  leerConversacion,
  listarConversaciones,
} from '../src/datos/conversaciones.js';
import {
  guardarConsentimientoVoz,
  leerConsentimientoVoz,
  asignarVoiceId,
  revocarConsentimientoVoz,
} from '../src/datos/consentimientos.js';
import { borrarTodo } from '../src/datos/borrar.js';
import { guardarMeditacion, listarMeditaciones } from '../src/datos/meditaciones.js';

describe('consentimiento de voz (P1)', () => {
  it('persiste con id estable y se puede leer de vuelta', async () => {
    const registro = await guardarConsentimientoVoz({ casillas: { biometrico: true } });
    expect(registro.id).toBe('voz');
    const leido = await leerConsentimientoVoz();
    expect(leido).toBeDefined();
    expect(leido.otorgado).toBe(true);
    expect(leido.casillas.biometrico).toBe(true);
    expect(leido.voiceId).toBeNull();
  });

  it('asigna el voiceId de la voz clonada al consentimiento', async () => {
    await guardarConsentimientoVoz({});
    await asignarVoiceId('abc123XYZ');
    const leido = await leerConsentimientoVoz();
    expect(leido.voiceId).toBe('abc123XYZ');
  });

  it('asignarVoiceId falla si no hay consentimiento (no se clona sin consentir)', async () => {
    await revocarConsentimientoVoz();
    await expect(asignarVoiceId('otro')).rejects.toThrow();
  });
});

describe('conversaciones (P2): upsert real', () => {
  it('crea y luego actualiza conservando creadaEn', async () => {
    const creada = await guardarConversacion({
      id: 'c1',
      titulo: 'Prueba',
      mensajes: [{ rol: 'usuario', contenido: 'hola', ts: Date.now() }],
    });
    expect(creada.mensajes).toHaveLength(1);
    expect(creada.mensajes[0].creadoEn).toBeTruthy();

    const actualizada = await guardarConversacion({
      id: 'c1',
      mensajes: [
        { rol: 'usuario', contenido: 'hola', ts: Date.now() },
        { rol: 'asistente', contenido: 'te escucho', ts: Date.now() },
      ],
    });
    expect(actualizada.creadaEn).toBe(creada.creadaEn);
    expect(actualizada.titulo).toBe('Prueba'); // conserva el titulo previo
    expect(actualizada.mensajes).toHaveLength(2);

    const leida = await leerConversacion('c1');
    expect(leida.mensajes).toHaveLength(2);
  });

  it('exige id (no siembra conversaciones huerfanas)', async () => {
    await expect(guardarConversacion({ mensajes: [] })).rejects.toThrow();
  });

  it('filtra mensajes con roles invalidos', async () => {
    const c = await guardarConversacion({
      id: 'c2',
      mensajes: [{ rol: 'sistema', contenido: 'x' }, { rol: 'usuario', contenido: 'ok' }],
    });
    expect(c.mensajes).toHaveLength(1);
  });
});

describe('borrado (PRD §7): guardas de confirmacion', () => {
  it('borrarTodo no borra sin confirmacion explicita', async () => {
    await guardarConversacion({ id: 'c3', mensajes: [] });
    const resultado = await borrarTodo({});
    expect(resultado.borrado).toBe(false);
    expect(await leerConversacion('c3')).toBeDefined();
  });

  it('borrarTodo borra con confirmacion', async () => {
    const resultado = await borrarTodo({ confirmado: true });
    expect(resultado.borrado).toBe(true);
    expect(await listarConversaciones()).toHaveLength(0);
  });
});

describe('borrado con voz clonada (P1): la voz remota se borra primero', () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('borrarTodo ABORTA sin tocar nada local si el proveedor falla', async () => {
    await guardarConversacion({ id: 'c4', mensajes: [] });
    await guardarConsentimientoVoz({});
    await asignarVoiceId('voz-viva');
    vi.stubGlobal('fetch', vi.fn(async () => ({ ok: false })));

    const resultado = await borrarTodo({ confirmado: true });
    expect(resultado.borrado).toBe(false);
    expect(resultado.remoto).toBe('fallo');
    // Nada se borro: la conversacion y el voiceId siguen para poder reintentar.
    expect(await leerConversacion('c4')).toBeDefined();
    expect((await leerConsentimientoVoz()).voiceId).toBe('voz-viva');
  });

  it('borrarTodo aborta tambien si la red falla (fetch lanza)', async () => {
    await guardarConversacion({ id: 'c5', mensajes: [] });
    await guardarConsentimientoVoz({});
    await asignarVoiceId('voz-viva');
    vi.stubGlobal(
      'fetch',
      vi.fn(async () => {
        throw new Error('red caida');
      }),
    );

    const resultado = await borrarTodo({ confirmado: true });
    expect(resultado.borrado).toBe(false);
    expect(resultado.remoto).toBe('fallo');
    expect(await leerConversacion('c5')).toBeDefined();
  });

  it('con consentimiento pero sin voz clonada no llama al proveedor y borra todo', async () => {
    // Partir sin voz clonada previa: guardar ahora CONSERVA el voiceId
    // anterior (fix de la auditoria), asi que primero se revoca.
    await revocarConsentimientoVoz();
    await guardarConsentimientoVoz({}); // voiceId queda null
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);

    const resultado = await borrarTodo({ confirmado: true });
    expect(resultado.borrado).toBe(true);
    expect(resultado.remoto).toBe('no_aplica');
    expect(fetchFalso).not.toHaveBeenCalled();
    expect(await leerConsentimientoVoz()).toBeUndefined();
  });

  it('borrarTodo borra la voz en el proveedor y despues todo lo local', async () => {
    await guardarConsentimientoVoz({});
    await asignarVoiceId('voz-viva');
    const fetchFalso = vi.fn(async () => ({ ok: true }));
    vi.stubGlobal('fetch', fetchFalso);

    const resultado = await borrarTodo({ confirmado: true });
    expect(resultado.borrado).toBe(true);
    expect(resultado.remoto).toBe('ok');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
    expect(await listarConversaciones()).toHaveLength(0);
    expect(await leerConsentimientoVoz()).toBeUndefined();
  });
});

describe('meditaciones (PRD §16): el empalme se guarda para re-escucharse', () => {
  it('guarda con metadatos de fuente y eje, y lista recientes primero', async () => {
    const a = await guardarMeditacion({
      texto: 'Respira y nota el acuerdo de tu corazon.',
      fuenteId: 'charla-53',
      ejeId: 'sintonia-corazon',
      titulo: 'Meditación — Sintonía del corazón',
    });
    expect(a.id).toBeTruthy();
    expect(a.creadaEn).toBeTruthy();

    // Segunda meditacion con fecha posterior garantizada.
    const b = await guardarMeditacion({ texto: 'Vuelve a tu respiracion.' });
    b.creadaEn = new Date(Date.now() + 1000).toISOString();
    const { STORES, put } = await import('../src/datos/db.js');
    await put(STORES.MEDITACIONES, b);

    const lista = await listarMeditaciones();
    expect(lista.length).toBeGreaterThanOrEqual(2);
    expect(lista[0].id).toBe(b.id); // mas reciente primero
    expect(lista.find((m) => m.id === a.id).fuenteId).toBe('charla-53');
  });

  it('una meditacion vacia no se guarda', async () => {
    await expect(guardarMeditacion({ texto: '   ' })).rejects.toThrow();
    await expect(guardarMeditacion({})).rejects.toThrow();
  });
});

describe('re-consentir no pierde la voz clonada (auditoria 2026-07-09)', () => {
  it('guardarConsentimientoVoz conserva el voiceId previo', async () => {
    await guardarConsentimientoVoz({});
    await asignarVoiceId('voz-remota-123');

    // Aceptar de nuevo (p. ej. reabrir Meditaciones y re-consentir).
    await guardarConsentimientoVoz({ casillas: { biometrico: true } });

    const leido = await leerConsentimientoVoz();
    expect(leido.voiceId).toBe('voz-remota-123');
    expect(leido.casillas.biometrico).toBe(true);
  });
});

describe('usos de la voz clonada (auditoria 2026-07-12): opt-in por uso', () => {
  it('el uso en conversaciones esta APAGADO por defecto', async () => {
    await revocarConsentimientoVoz();
    await guardarConsentimientoVoz({});
    const leido = await leerConsentimientoVoz();
    expect(leido.usos.meditaciones).toBe(true);
    expect(leido.usos.conversaciones).toBe(false);
  });

  it('establecerUsoConversacionVoz activa/desactiva y persiste', async () => {
    const { establecerUsoConversacionVoz } = await import('../src/datos/consentimientos.js');
    await establecerUsoConversacionVoz(true);
    expect((await leerConsentimientoVoz()).usos.conversaciones).toBe(true);
    await establecerUsoConversacionVoz(false);
    expect((await leerConsentimientoVoz()).usos.conversaciones).toBe(false);
  });

  it('re-consentir conserva el uso previo salvo eleccion explicita', async () => {
    const { establecerUsoConversacionVoz } = await import('../src/datos/consentimientos.js');
    await establecerUsoConversacionVoz(true);
    // Re-consentir sin tocar usos: se conserva.
    await guardarConsentimientoVoz({ casillas: { biometrico: true } });
    expect((await leerConsentimientoVoz()).usos.conversaciones).toBe(true);
    // Re-consentir eligiendo explicitamente apagado: gana la eleccion.
    await guardarConsentimientoVoz({ usos: { conversaciones: false } });
    expect((await leerConsentimientoVoz()).usos.conversaciones).toBe(false);
  });
});
