// Hook de reproduccion de voz. Envuelve la capa hablar() con estado de React
// y garantiza que solo suene una locucion a la vez.

import { useCallback, useEffect, useRef, useState } from 'react';
import { hablar } from './tts.js';

/**
 * @returns {{
 *   reproduciendo: boolean,
 *   cargando: boolean,
 *   error: Error|null,
 *   motor: string|null,
 *   hablar: (params: { texto: string, voiceId?: string }) => Promise<void>,
 *   detener: () => void,
 * }}
 */
export function useTTS() {
  const [reproduciendo, setReproduciendo] = useState(false);
  const [cargando, setCargando] = useState(false);
  const [error, setError] = useState(null);
  const [motor, setMotor] = useState(null);

  // Control de la locucion en curso, para poder detenerla.
  const controlRef = useRef(null);
  const montadoRef = useRef(true);

  useEffect(() => {
    montadoRef.current = true;
    return () => {
      montadoRef.current = false;
      // Al desmontar, cortamos cualquier audio para no dejar voz colgada.
      if (controlRef.current) controlRef.current.detener();
    };
  }, []);

  const detener = useCallback(() => {
    if (controlRef.current) {
      controlRef.current.detener();
      controlRef.current = null;
    }
    if (montadoRef.current) {
      setReproduciendo(false);
      setCargando(false);
    }
  }, []);

  const iniciar = useCallback(
    async ({ texto, voiceId } = {}) => {
      // Cortamos lo anterior antes de empezar algo nuevo.
      detener();
      if (!montadoRef.current) return;

      setError(null);
      setCargando(true);

      try {
        const control = await hablar({
          texto,
          voiceId,
          onEstado: (estado, info) => {
            if (!montadoRef.current) return;
            if (info && info.motor) setMotor(info.motor);

            if (estado === 'cargando') {
              setCargando(true);
            } else if (estado === 'reproduciendo') {
              setCargando(false);
              setReproduciendo(true);
            } else if (estado === 'fin') {
              setReproduciendo(false);
              setCargando(false);
            } else if (estado === 'error') {
              setReproduciendo(false);
              setCargando(false);
              setError(new Error('No se pudo reproducir la voz.'));
            }
          },
        });

        if (!montadoRef.current) {
          // Se desmonto mientras cargaba: no dejamos audio sonando.
          control.detener();
          return;
        }
        controlRef.current = control;
        setMotor(control.motor);
      } catch (e) {
        if (montadoRef.current) {
          setError(e instanceof Error ? e : new Error(String(e)));
          setCargando(false);
          setReproduciendo(false);
        }
      }
    },
    [detener],
  );

  return {
    reproduciendo,
    cargando,
    error,
    motor,
    hablar: iniciar,
    detener,
  };
}
