import { useState } from 'react';
import { exportarTodo } from '../datos/exportar.js';
import { borrarTodo, borrarVoz } from '../datos/borrar.js';

// Ajustes: soberania de datos (PRD §5, §7). Exportar y borrar SIEMPRE
// disponibles, sin friccion. El borrado es irreversible: pedimos confirmacion
// explicita antes de invocar las funciones (que ademas exigen { confirmado: true }).
export default function Ajustes() {
  const [mensaje, setMensaje] = useState('');
  const [ocupado, setOcupado] = useState(false);

  const exportar = async () => {
    setOcupado(true);
    try {
      await exportarTodo();
      setMensaje('Se descargó una copia de todos tus datos.');
    } catch {
      setMensaje('No se pudo exportar en este momento.');
    } finally {
      setOcupado(false);
    }
  };

  const borrar = async () => {
    const seguro = window.confirm(
      'Esto borrará TODOS tus datos de este dispositivo (perfil, conversaciones, consentimientos, fuentes y meditaciones) de forma irreversible. ¿Continuar?'
    );
    if (!seguro) return;
    setOcupado(true);
    try {
      const resultado = await borrarTodo({ confirmado: true });
      if (resultado.borrado) {
        setMensaje('Se borraron todos tus datos locales.');
      } else {
        setMensaje(
          'No se pudo borrar la voz clonada en el proveedor, así que no se borró nada (se conserva el registro para poder reintentar). Inténtalo de nuevo en un momento.'
        );
      }
    } catch {
      setMensaje('Algo falló al borrar; no se completó. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  const borrarDatosVoz = async () => {
    const seguro = window.confirm(
      'Esto revocará tu consentimiento y borrará tus datos de voz (también la voz clonada en el proveedor, si existe). ¿Continuar?'
    );
    if (!seguro) return;
    setOcupado(true);
    try {
      const resultado = await borrarVoz({ confirmado: true });
      if (resultado.borrado) {
        setMensaje(
          resultado.remoto === 'ok'
            ? 'Se borraron tus datos de voz, incluida la voz clonada en el proveedor.'
            : 'Se borraron tus datos de voz y se revocó el consentimiento.'
        );
      } else {
        setMensaje(
          'No se pudo borrar la voz en el proveedor. Tus datos locales se conservaron para poder reintentar; vuelve a intentarlo en un momento.'
        );
      }
    } catch {
      setMensaje('Algo falló al borrar tus datos de voz; no se completó. Inténtalo de nuevo.');
    } finally {
      setOcupado(false);
    }
  };

  return (
    <section>
      <h1 className="text-2xl font-medium text-[var(--color-texto)]">Ajustes</h1>
      <p className="mt-2 max-w-prose text-[var(--color-texto-suave)]">
        Tus datos son tuyos. Viven en este dispositivo y puedes llevártelos o
        borrarlos cuando quieras.
      </p>
      <p className="mt-3 max-w-prose text-sm text-[var(--color-texto-tenue)]">
        Transparencia: por ahora tus datos se guardan <strong>sin cifrar</strong> en
        el almacenamiento de este navegador. Si usas un equipo compartido,
        exporta y borra tus datos al terminar.
      </p>

      <div className="mt-8 flex flex-col gap-4">
        <Accion
          titulo="Exportar mis datos"
          desc="Descarga una copia en formato JSON de todo lo guardado en este dispositivo."
          boton="Exportar"
          onClick={exportar}
          ocupado={ocupado}
        />
        <Accion
          titulo="Borrar mis datos de voz"
          desc="Revoca el consentimiento de voz y borra tus grabaciones y consentimientos. Irreversible."
          boton="Borrar voz"
          onClick={borrarDatosVoz}
          ocupado={ocupado}
          peligro
        />
        <Accion
          titulo="Borrar todo"
          desc="Elimina por completo tus datos de este dispositivo. Irreversible."
          boton="Borrar todo"
          onClick={borrar}
          ocupado={ocupado}
          peligro
        />
      </div>

      {mensaje && (
        <p
          role="status"
          className="mt-6 text-sm text-[var(--color-texto-suave)]"
        >
          {mensaje}
        </p>
      )}
    </section>
  );
}

function Accion({ titulo, desc, boton, onClick, ocupado, peligro }) {
  return (
    <div className="flex flex-col gap-3 rounded-[var(--radius-suave)] border border-[var(--color-borde)] bg-[var(--color-superficie)] p-5 sm:flex-row sm:items-center sm:justify-between">
      <div>
        <p className="font-medium text-[var(--color-texto)]">{titulo}</p>
        <p className="mt-1 text-sm text-[var(--color-texto-suave)]">{desc}</p>
      </div>
      <button
        type="button"
        onClick={onClick}
        disabled={ocupado}
        className={[
          'shrink-0 rounded-[var(--radius-suave)] px-4 py-2 font-medium disabled:opacity-40',
          peligro
            ? 'border border-[var(--color-borde)] text-[var(--color-texto)]'
            : 'bg-[var(--color-acento)] text-[var(--color-acento-contraste)]',
        ].join(' ')}
      >
        {boton}
      </button>
    </div>
  );
}
