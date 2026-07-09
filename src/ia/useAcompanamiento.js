// Hook de chat de acompanamiento.
// - Mantiene el hilo de mensajes.
// - Antes de enviar y al recibir, evalua senales de crisis (modulo seguridad).
// - Si el nivel es 'alto', levanta una bandera para que la UI abra ModalCrisis
//   y NO continua reforzando (no llama a la IA).
// - Persiste la conversacion via src/datos/conversaciones (import dinamico, opcional).

import { useCallback, useRef, useState } from 'react';
import { enviarMensaje } from './cliente.js';
import { SISTEMA_ACOMPANAMIENTO } from './prompts.js';
import { detectarSenalesCrisis } from '../seguridad/crisis.js';

// Genera un id simple y unico para cada mensaje del hilo.
function nuevoId() {
  return `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
}

function crearMensaje(rol, contenido) {
  return { id: nuevoId(), rol, contenido, ts: Date.now() };
}

// Mapea el hilo interno al formato que espera el cliente/proxy.
function paraCliente(mensajes) {
  return mensajes
    .filter((m) => m.rol === 'usuario' || m.rol === 'asistente')
    .map((m) => ({ rol: m.rol, contenido: m.contenido }));
}

// Persistencia local-first del hilo (upsert por id). Nunca rompe el chat si
// IndexedDB no esta disponible: en ese caso la conversacion vive en memoria.
async function persistir(conversacionId, mensajes) {
  try {
    const mod = await import('../datos/conversaciones.js');
    await mod.guardarConversacion({
      id: conversacionId,
      titulo: 'Conversación por voz',
      mensajes,
    });
  } catch {
    /* sin persistencia disponible: se continua solo en memoria */
  }
  return conversacionId;
}

// useAcompanamiento({ sistema }) => API del chat
export function useAcompanamiento({ sistema } = {}) {
  const [mensajes, setMensajes] = useState([]);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  // Bandera de crisis: la UI la observa para abrir ModalCrisis.
  const [crisis, setCrisis] = useState({ activa: false, nivel: 'ninguno', coincidencias: [] });

  const conversacionIdRef = useRef(nuevoId());
  const sistemaBase = sistema || SISTEMA_ACOMPANAMIENTO;

  // Permite a la UI cerrar/reconocer la alerta de crisis sin borrar el hilo.
  const reconocerCrisis = useCallback(() => {
    setCrisis((c) => ({ ...c, activa: false }));
  }, []);

  const reiniciar = useCallback(() => {
    conversacionIdRef.current = nuevoId();
    setMensajes([]);
    setError(null);
    setCrisis({ activa: false, nivel: 'ninguno', coincidencias: [] });
  }, []);

  const enviar = useCallback(
    async (texto) => {
      const contenido = (texto || '').trim();
      if (!contenido || cargando) return;

      setError(null);

      // 1) Evaluar senales de crisis ANTES de enviar.
      const senal = detectarSenalesCrisis(contenido);
      const msjUsuario = crearMensaje('usuario', contenido);

      // Agregar siempre el mensaje de la persona al hilo y persistir.
      const hiloConUsuario = await new Promise((resolve) => {
        setMensajes((prev) => {
          const siguiente = [...prev, msjUsuario];
          resolve(siguiente);
          return siguiente;
        });
      });
      persistir(conversacionIdRef.current, hiloConUsuario);

      // 2) Nivel alto: contener y derivar. NO se llama a la IA (no reforzar).
      if (senal.nivel === 'alto') {
        setCrisis({ activa: true, nivel: 'alto', coincidencias: senal.coincidencias || [] });
        return;
      }
      // Nivel 'atencion': se registra la senal pero se continua el acompanamiento.
      if (senal.nivel === 'atencion') {
        setCrisis({ activa: false, nivel: 'atencion', coincidencias: senal.coincidencias || [] });
      }

      // 3) Enviar a la IA por el proxy.
      setCargando(true);
      try {
        const { texto: respuestaTexto } = await enviarMensaje({
          mensajes: paraCliente(hiloConUsuario),
          sistema: sistemaBase,
        });

        // 4) Evaluar senales de crisis tambien en la respuesta recibida.
        const senalRespuesta = detectarSenalesCrisis(respuestaTexto);
        const msjAsistente = crearMensaje('asistente', respuestaTexto);

        const hiloFinal = await new Promise((resolve) => {
          setMensajes((prev) => {
            const siguiente = [...prev, msjAsistente];
            resolve(siguiente);
            return siguiente;
          });
        });
        persistir(conversacionIdRef.current, hiloFinal);

        if (senalRespuesta.nivel === 'alto') {
          setCrisis({
            activa: true,
            nivel: 'alto',
            coincidencias: senalRespuesta.coincidencias || [],
          });
        }
      } catch (err) {
        if (!(err && err.name === 'AbortError')) {
          setError(err);
        }
      } finally {
        setCargando(false);
      }
    },
    [cargando, sistemaBase]
  );

  return {
    mensajes,
    cargando,
    error,
    crisis, // { activa, nivel, coincidencias } -> la UI abre ModalCrisis si activa
    enviar,
    reconocerCrisis,
    reiniciar,
    conversacionId: conversacionIdRef.current,
  };
}
