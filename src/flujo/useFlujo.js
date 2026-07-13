// Orquestador de la SESION EXPRES (PRD §16): la fuente abre, la app conduce.
//
// Algoritmo "de la fuente a la practica":
//   0. Verifica la fuente activa y obtiene su GUION (cache -> generar -> respaldo).
//   APERTURA  la UI muestra la esencia de la fuente + su pregunta de apertura.
//   Turno 1   la persona responde -> la IA elige UN eje y hace su 1a pregunta.
//   Turno 2   la persona responde -> 2a pregunta concreta del eje.
//   Turno 3   la persona responde -> practica personalizada + cierre + meditacion.
// Total: ~4 intercambios. La seguridad envuelve cada entrada; en crisis 'alto'
// se detiene el flujo y se prioriza contencion (PRD §2.2).

import { useCallback, useEffect, useRef, useState } from 'react';
import { enviarMensaje } from '../ia/cliente.js';
import { componerSistema } from '../ia/prompts.js';
import { cargarFuenteActiva, lenteDeFuente } from '../fuentes/dinamicas.js';
import { detectarSenalesCrisis } from '../seguridad/crisis.js';
import { obtenerGuion } from './guion.js';
import {
  BREVEDAD,
  MAX_TOKENS_EXPRES,
  ESFUERZO_EXPRES,
  directorElegirEje,
  directorConcretar,
  directorPractica,
  separarEje,
  separarMeditacion,
} from './etapas.js';

function nuevoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crearMensaje(rol, contenido) {
  return { id: nuevoId(), rol, contenido, ts: Date.now() };
}

// Mapea el hilo al formato del proxy, fusionando turnos consecutivos del mismo rol.
function paraCliente(mensajes) {
  const salida = [];
  for (const m of mensajes) {
    if (m.rol !== 'usuario' && m.rol !== 'asistente') continue;
    const ultimo = salida[salida.length - 1];
    if (ultimo && ultimo.rol === m.rol) {
      ultimo.contenido += '\n\n' + m.contenido;
    } else {
      salida.push({ rol: m.rol, contenido: m.contenido });
    }
  }
  return salida;
}

// separarEje y separarMeditacion viven en etapas.js (los comparte la voz).

// separarMeditacion vive en etapas.js (la comparte la conversacion por voz).

// Guarda la meditacion de cierre (empalme fuente+persona, PRD §16) para poder
// re-escucharla desde la pagina Meditaciones. No rompe la sesion si falla.
async function persistirMeditacion({ texto, fuenteId, ejeId, titulo }) {
  try {
    const mod = await import('../datos/meditaciones.js');
    await mod.guardarMeditacion({ texto, fuenteId, ejeId, titulo });
  } catch {
    /* sin persistencia disponible */
  }
}

// Persistencia local-first al cerrar (upsert unificado; no rompe si falla).
async function persistirSesion(idConversacion, mensajes, tituloEje) {
  try {
    const mod = await import('../datos/conversaciones.js');
    await mod.guardarConversacion({
      id: idConversacion,
      titulo: tituloEje ? `Sesión exprés — ${tituloEje}` : 'Sesión exprés',
      mensajes,
    });
  } catch {
    /* sin persistencia disponible */
  }
}

/**
 * Hook de la sesion expres.
 */
export function useFlujo() {
  const [guion, setGuion] = useState(null);
  const [origenGuion, setOrigenGuion] = useState(null); // cache | generado | respaldo
  const [cargandoGuion, setCargandoGuion] = useState(true);

  const [etapa, setEtapa] = useState('apertura'); // apertura -> resonar -> concretar -> cerrada
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [crisis, setCrisis] = useState({ activa: false, nivel: 'ninguno', coincidencias: [] });
  const [meditacion, setMeditacion] = useState('');
  const [ejeId, setEjeId] = useState(null);

  const idRef = useRef(nuevoId());
  const [fuente, setFuente] = useState(null);

  // 0) Cargar la fuente activa (dinamica desde IndexedDB o estatica del
  // registro) y su guion. Cuando Ernesto activa una fuente nueva desde la
  // pagina Fuentes, la proxima sesion trae guion nuevo: todo se reconfigura.
  useEffect(() => {
    let vivo = true;
    setCargandoGuion(true);
    cargarFuenteActiva()
      .then((f) => {
        if (!vivo) return null;
        setFuente(f);
        return obtenerGuion(f);
      })
      .then((r) => {
        if (!vivo || !r) return;
        setGuion(r.guion);
        setOrigenGuion(r.origen);
        setCargandoGuion(false);
      });
    return () => {
      vivo = false;
    };
  }, []);

  const reconocerCrisis = useCallback(() => {
    setCrisis((c) => ({ ...c, activa: false }));
  }, []);

  const reiniciar = useCallback(() => {
    idRef.current = nuevoId();
    setEtapa('apertura');
    setMensajes([]);
    setError(null);
    setMeditacion('');
    setEjeId(null);
    setCrisis({ activa: false, nivel: 'ninguno', coincidencias: [] });
  }, []);

  const enviar = useCallback(
    async (texto) => {
      const contenido = (texto || '').trim();
      if (!contenido || cargando || cargandoGuion || !guion || etapa === 'cerrada') return;
      // Contencion terminal (hallazgo Alta 2026-07-09): tras crisis alta la
      // sesion no continua; la unica salida es reiniciar una sesion nueva.
      if (crisis.nivel === 'alto') return;

      setError(null);

      // Seguridad primero: evaluar la entrada.
      const senal = detectarSenalesCrisis(contenido);
      const msjUsuario = crearMensaje('usuario', contenido);
      const hilo = await new Promise((resolve) => {
        setMensajes((prev) => {
          const siguiente = [...prev, msjUsuario];
          resolve(siguiente);
          return siguiente;
        });
      });

      if (senal.nivel === 'alto') {
        // Contener y derivar; NO se continua el flujo (no reforzar).
        setCrisis({ activa: true, nivel: 'alto', coincidencias: senal.coincidencias || [] });
        return;
      }
      if (senal.nivel === 'atencion') {
        setCrisis((c) => ({ ...c, nivel: 'atencion', coincidencias: senal.coincidencias || [] }));
      }

      // Director segun la etapa del algoritmo.
      const ejeActual = guion.ejes.find((e) => e.id === ejeId) || guion.ejes[0];
      let director;
      let siguiente;
      if (etapa === 'apertura') {
        director = directorElegirEje(guion);
        siguiente = 'resonar';
      } else if (etapa === 'resonar') {
        director = directorConcretar(ejeActual);
        siguiente = 'concretar';
      } else {
        director = directorPractica(ejeActual);
        siguiente = 'cerrada';
      }

      const sistema =
        componerSistema({ lente: lenteDeFuente(fuente) }) + '\n\n' + BREVEDAD + '\n\n' + director;

      setCargando(true);
      try {
        const { texto: respuesta } = await enviarMensaje({
          mensajes: paraCliente(hilo),
          sistema,
          maxTokens: MAX_TOKENS_EXPRES,
          esfuerzo: ESFUERZO_EXPRES,
        });

        let contenidoAsistente = respuesta;

        // Turno 1: capturar el eje elegido y limpiar el marcador.
        if (etapa === 'apertura') {
          const { ejeId: id, contenido: limpio } = separarEje(respuesta, guion.ejes);
          setEjeId(id || guion.ejes[0].id);
          contenidoAsistente = limpio;
        }

        // Turno final: separar la meditacion del cierre.
        let meditacionFinal = '';
        if (siguiente === 'cerrada') {
          const { cierre, meditacion: med } = separarMeditacion(contenidoAsistente);
          contenidoAsistente = cierre || contenidoAsistente;
          if (med) {
            meditacionFinal = med;
            setMeditacion(med);
          }
        }

        const msjAsistente = crearMensaje('asistente', contenidoAsistente);
        const hiloFinal = await new Promise((resolve) => {
          setMensajes((prev) => {
            const siguiente2 = [...prev, msjAsistente];
            resolve(siguiente2);
            return siguiente2;
          });
        });

        setEtapa(siguiente);
        if (siguiente === 'cerrada') {
          const tituloEje = (guion.ejes.find((e) => e.id === (ejeId || guion.ejes[0].id)) || {})
            .titulo;
          persistirSesion(idRef.current, hiloFinal, tituloEje);
          if (meditacionFinal) {
            persistirMeditacion({
              texto: meditacionFinal,
              fuenteId: fuente?.id || null,
              ejeId: ejeId || guion.ejes[0].id,
              titulo: tituloEje ? `Meditación — ${tituloEje}` : 'Meditación de sesión',
            });
          }
        }
      } catch (err) {
        if (!(err && err.name === 'AbortError')) setError(err);
      } finally {
        setCargando(false);
      }
    },
    [cargando, cargandoGuion, guion, etapa, ejeId, fuente, crisis.nivel]
  );

  const eje = guion?.ejes.find((e) => e.id === ejeId) || null;

  return {
    fuente,
    guion,
    origenGuion,
    cargandoGuion,
    etapa,
    eje,
    mensajes,
    cargando,
    error,
    crisis,
    meditacion,
    enviar,
    reconocerCrisis,
    reiniciar,
  };
}
