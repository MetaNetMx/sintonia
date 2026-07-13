// Contrato de los directores de la sesion expres (PRD §16): los marcadores que
// la app parsea (EJE:, MEDITACION:) deben estar instruidos en los prompts.
import { describe, it, expect } from 'vitest';
import {
  PASOS,
  MAX_TOKENS_EXPRES,
  ESFUERZO_EXPRES,
  directorElegirEje,
  directorConcretar,
  directorPractica,
  directorVoz,
  separarEje,
} from '../src/flujo/etapas.js';
import { GUION_RESPALDO } from '../src/flujo/guion.js';

describe('directores de la sesion expres', () => {
  it('directorElegirEje instruye el marcador EJE: y lista todos los ejes', () => {
    const director = directorElegirEje(GUION_RESPALDO);
    expect(director).toContain('EJE: <id>');
    for (const eje of GUION_RESPALDO.ejes) {
      expect(director, eje.id).toContain(eje.id);
    }
  });

  it('directorConcretar usa la segunda pregunta del eje', () => {
    const eje = GUION_RESPALDO.ejes[0];
    expect(directorConcretar(eje)).toContain(eje.preguntas[1]);
  });

  it('directorPractica instruye el marcador MEDITACION: y los pasos', () => {
    const eje = GUION_RESPALDO.ejes[0];
    const director = directorPractica(eje);
    expect(director).toContain('MEDITACION:');
    expect(director).toContain(eje.practica.titulo);
  });

  it('la meditacion de la sesion expres es el EMPALME fuente + lo compartido', () => {
    const eje = GUION_RESPALDO.ejes[0];
    const director = directorPractica(eje);
    // Sensibilidad extrema a los detalles de la persona…
    expect(director).toMatch(/detalles textuales/i);
    expect(director).toMatch(/SUS palabras/);
    // …tejidos con la propuesta del eje de la fuente.
    expect(director).toContain(`"${eje.titulo}"`);
    expect(director).toMatch(/HAGA VIVIR/);
    expect(director).toMatch(/no prometas resultados ni cura/i);
    // Invitacion creativa de la fuente, y NUNCA sin contexto de la charla.
    expect(director).toMatch(/INVITACION de la fuente/);
    expect(director).toMatch(/de forma CREATIVA/);
    expect(director).toMatch(/sin charla no hay meditacion/i);
    expect(director).toMatch(/JAMAS inventes/);
  });

  it('configuracion expres: 4 pasos visibles, texto acotado, esfuerzo bajo', () => {
    expect(PASOS).toHaveLength(4);
    expect(MAX_TOKENS_EXPRES).toBeGreaterThanOrEqual(200);
    expect(MAX_TOKENS_EXPRES).toBeLessThanOrEqual(1024);
    expect(ESFUERZO_EXPRES).toBe('low');
  });
});

describe('directorVoz: la fuente dirige tambien la voz (decision 2026-07-09)', () => {
  it('turno 1: recibe TODOS los ejes y elige con el marcador EJE: parseable', () => {
    const d = directorVoz({ guion: GUION_RESPALDO, turno: 1 });
    for (const eje of GUION_RESPALDO.ejes) {
      expect(d, eje.id).toContain(eje.id);
    }
    expect(d).toContain('EJE: <id>');
    expect(d).toMatch(/la app la retira/i);
    expect(d).toMatch(/no anuncies el nombre del eje/i);
    expect(d).toMatch(/2 o 3 frases/);
  });

  it('con el eje ya parseado, los turnos 2-3 trabajan SOLO ese eje (determinista)', () => {
    const elegido = GUION_RESPALDO.ejes[1];
    const otro = GUION_RESPALDO.ejes[0];
    for (const turno of [2, 3]) {
      const d = directorVoz({ guion: GUION_RESPALDO, turno, ejeId: elegido.id });
      expect(d, `turno ${turno}`).toContain(elegido.id);
      expect(d, `turno ${turno}`).not.toContain(otro.id);
      expect(d, `turno ${turno}`).toMatch(/EJE ELEGIDO EN ESTA CHARLA/);
    }
    // La meditacion del turno 3 cita el eje elegido, no uno generico.
    const d3 = directorVoz({ guion: GUION_RESPALDO, turno: 3, ejeId: elegido.id });
    expect(d3).toContain(`"${elegido.titulo}"`);
  });

  it('separarEje extrae el marcador y limpia el contenido', () => {
    const { ejeId, contenido } = separarEje(
      `EJE: ${GUION_RESPALDO.ejes[0].id}\nHola, te escucho.`,
      GUION_RESPALDO.ejes,
    );
    expect(ejeId).toBe(GUION_RESPALDO.ejes[0].id);
    expect(contenido).toBe('Hola, te escucho.');
    // Id desconocido: no truena, devuelve contenido limpio sin eje.
    const r = separarEje('EJE: inexistente\nHola.', GUION_RESPALDO.ejes);
    expect(r.ejeId).toBeNull();
    expect(r.contenido).toBe('Hola.');
  });

  it('turno 3: cierra con LA practica del guion y sin mas preguntas', () => {
    const d = directorVoz({ guion: GUION_RESPALDO, turno: 3 });
    expect(d).toMatch(/CIERRE PRACTICO/);
    expect(d).toMatch(/no hagas mas preguntas/i);
    expect(d).toContain(GUION_RESPALDO.ejes[0].practica.titulo);
  });

  it('turno 3: guia una meditacion con marcador para separarla y guardarla', () => {
    const d = directorVoz({ guion: GUION_RESPALDO, turno: 3 });
    expect(d).toMatch(/MEDITACION:/);
    expect(d).toMatch(/detalles textuales/i);
    expect(d).toMatch(/SUS palabras/);
    expect(d).toMatch(/3 o 4 frases habladas/);
  });

  it('turno 4+: la sesion ya cerro — sin temas nuevos ni preguntas', () => {
    const d = directorVoz({ guion: GUION_RESPALDO, turno: 4 });
    expect(d).toMatch(/LA SESION YA CERRO/);
    expect(d).toMatch(/no hagas preguntas/i);
    expect(d).not.toMatch(/CIERRE PRACTICO/);
  });

  it('sin guion no truena: degrada a escuchar y UNA pregunta concreta', () => {
    const d = directorVoz({ guion: null, turno: 1 });
    expect(d).toMatch(/UNA pregunta/);
    expect(d).toMatch(/2 o 3 frases/);
  });
});
