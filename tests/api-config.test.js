// Contratos de la capa compartida de la API serverless (api/_lib/config.js):
// lista blanca de modelos, CORS mismo-origen y rate limiting (hallazgo P1).
import { describe, it, expect } from 'vitest';
import {
  resolverModelo,
  MODELOS_PERMITIDOS,
  ANTHROPIC_MODEL,
  aplicarCorsMismoOrigen,
  permitirPeticion,
} from '../api/_lib/config.js';

function resFalsa() {
  return {
    codigo: null,
    headers: {},
    cuerpo: null,
    status(c) {
      this.codigo = c;
      return this;
    },
    setHeader(k, v) {
      this.headers[k] = v;
    },
    send(b) {
      this.cuerpo = b;
    },
    end() {},
  };
}

describe('resolverModelo (lista blanca)', () => {
  it('acepta modelos de la lista blanca', () => {
    for (const modelo of MODELOS_PERMITIDOS) {
      expect(resolverModelo(modelo)).toBe(modelo);
    }
  });

  it('ignora modelos arbitrarios y cae al modelo del entorno', () => {
    expect(resolverModelo('gpt-x-hackeado')).toBe(ANTHROPIC_MODEL);
    expect(resolverModelo('')).toBe(ANTHROPIC_MODEL);
    expect(resolverModelo(undefined)).toBe(ANTHROPIC_MODEL);
  });
});

describe('aplicarCorsMismoOrigen', () => {
  it('permite mismo origen y rechaza origen cruzado', () => {
    const res = resFalsa();
    const mismo = {
      headers: { origin: 'http://localhost:5173', host: 'localhost:5173' },
    };
    const cruzado = {
      headers: { origin: 'https://malicioso.example', host: 'localhost:5173' },
    };
    expect(aplicarCorsMismoOrigen(mismo, res)).toBe(true);
    expect(aplicarCorsMismoOrigen(cruzado, res)).toBe(false);
  });

  it('sin Origin: permite lecturas (GET/HEAD) pero rechaza escrituras (P2)', () => {
    const res = resFalsa();
    // Los navegadores siempre envian Origin en POST; su ausencia = cliente
    // no-navegador (curl/script) intentando una escritura.
    const lectura = { method: 'GET', headers: { host: 'localhost:5173' } };
    const cabecera = { method: 'HEAD', headers: { host: 'localhost:5173' } };
    const escritura = { method: 'POST', headers: { host: 'localhost:5173' } };
    expect(aplicarCorsMismoOrigen(lectura, res)).toBe(true);
    expect(aplicarCorsMismoOrigen(cabecera, res)).toBe(true);
    expect(aplicarCorsMismoOrigen(escritura, res)).toBe(false);
  });
});

describe('permitirPeticion (rate limiting por IP)', () => {
  it('permite hasta el maximo y responde 429 despues', () => {
    const req = { headers: { 'x-forwarded-for': '10.0.0.1' }, socket: {} };
    const opciones = { ambito: 'test-limite', max: 3, ventanaMs: 60_000 };

    for (let i = 0; i < 3; i++) {
      expect(permitirPeticion(req, resFalsa(), opciones)).toBe(true);
    }
    const res = resFalsa();
    expect(permitirPeticion(req, res, opciones)).toBe(false);
    expect(res.codigo).toBe(429);
    expect(res.headers['Retry-After']).toBeTruthy();
  });

  it('las IPs se limitan de forma independiente', () => {
    const opciones = { ambito: 'test-ips', max: 1, ventanaMs: 60_000 };
    const reqA = { headers: { 'x-forwarded-for': '10.0.0.2' }, socket: {} };
    const reqB = { headers: { 'x-forwarded-for': '10.0.0.3' }, socket: {} };
    expect(permitirPeticion(reqA, resFalsa(), opciones)).toBe(true);
    expect(permitirPeticion(reqB, resFalsa(), opciones)).toBe(true);
    expect(permitirPeticion(reqA, resFalsa(), opciones)).toBe(false);
  });
});
