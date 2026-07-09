// Rollback de la clonacion de voz (hallazgo P1 de la auditoria 2026-07-09):
// si la voz se crea en el proveedor pero falla guardar el voiceId localmente,
// clonarVoz debe revertir la clonacion via /api/voz-borrar para no dejar una
// voz biometrica HUERFANA (viva en el proveedor sin manera de borrarla).
import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';

vi.mock('../src/datos/consentimientos.js', () => ({
  leerConsentimientoVoz: vi.fn(),
  asignarVoiceId: vi.fn(),
}));

import { leerConsentimientoVoz, asignarVoiceId } from '../src/datos/consentimientos.js';
import { clonarVoz } from '../src/voz/clonacion.js';

// FileReader minimo para Node (clonacion.js lo usa para pasar Blob a base64).
class FileReaderFalso {
  readAsDataURL(blob) {
    blob.arrayBuffer().then(
      (buf) => {
        this.result = `data:${blob.type};base64,${Buffer.from(buf).toString('base64')}`;
        if (this.onloadend) this.onloadend();
      },
      (err) => {
        if (this.onerror) this.onerror(err);
      },
    );
  }
}

beforeEach(() => {
  vi.stubGlobal('FileReader', FileReaderFalso);
  leerConsentimientoVoz.mockResolvedValue({ otorgado: true });
});

afterEach(() => {
  vi.unstubAllGlobals();
  vi.clearAllMocks();
});

const muestra = () => new Blob([new Uint8Array([1, 2, 3])], { type: 'audio/webm' });

describe('clonarVoz: rollback si falla guardar el voiceId (P1)', () => {
  it('revierte la voz recien creada en el proveedor y lanza error', async () => {
    asignarVoiceId.mockRejectedValue(new Error('IndexedDB fallo'));
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ voiceId: 'voz-huerfana' }) }) // clonar
      .mockResolvedValueOnce({ ok: true, json: async () => ({ borrado: true }) }); // rollback
    vi.stubGlobal('fetch', fetchFalso);

    await expect(clonarVoz({ muestras: [muestra()], nombre: 'Ernesto' })).rejects.toThrow(
      /revirti/,
    );

    expect(fetchFalso).toHaveBeenCalledTimes(2);
    const [urlRollback, opcionesRollback] = fetchFalso.mock.calls[1];
    expect(urlRollback).toBe('/api/voz-borrar');
    expect(JSON.parse(opcionesRollback.body).voiceId).toBe('voz-huerfana');
  });

  it('si el rollback tambien falla, el error conserva el voiceId huerfano', async () => {
    asignarVoiceId.mockRejectedValue(new Error('IndexedDB fallo'));
    const fetchFalso = vi
      .fn()
      .mockResolvedValueOnce({ ok: true, json: async () => ({ voiceId: 'voz-imborrable' }) }) // clonar
      .mockRejectedValueOnce(new Error('red caida')); // rollback falla
    vi.stubGlobal('fetch', fetchFalso);

    let capturado;
    await clonarVoz({ muestras: [muestra()], nombre: 'Ernesto' }).catch((e) => {
      capturado = e;
    });
    // El voiceId es el UNICO rastro de la voz huerfana: debe sobrevivir en el error.
    expect(capturado).toBeInstanceOf(Error);
    expect(capturado.voiceId).toBe('voz-imborrable');
    expect(capturado.message).toMatch(/voz-imborrable/);
    expect(fetchFalso).toHaveBeenCalledTimes(2);
  });

  it('sin fallo local no hay rollback: una sola llamada al proveedor', async () => {
    asignarVoiceId.mockResolvedValue({});
    const fetchFalso = vi
      .fn()
      .mockResolvedValue({ ok: true, json: async () => ({ voiceId: 'voz-ok' }) });
    vi.stubGlobal('fetch', fetchFalso);

    const resultado = await clonarVoz({ muestras: [muestra()], nombre: 'Ernesto' });
    expect(resultado.voiceId).toBe('voz-ok');
    expect(fetchFalso).toHaveBeenCalledTimes(1);
  });

  it('sin consentimiento persistido no envia nada al proveedor', async () => {
    leerConsentimientoVoz.mockResolvedValue(undefined);
    const fetchFalso = vi.fn();
    vi.stubGlobal('fetch', fetchFalso);

    await expect(clonarVoz({ muestras: [muestra()], nombre: 'Ernesto' })).rejects.toThrow(
      /consentimiento/i,
    );
    expect(fetchFalso).not.toHaveBeenCalled();
  });
});
