import { Routes, Route } from 'react-router-dom';
import Inicio from './paginas/Inicio.jsx';
import Acompanamiento from './paginas/Acompanamiento.jsx';
import Conversacion from './paginas/Conversacion.jsx';
import Meditaciones from './paginas/Meditaciones.jsx';
import Perfil from './paginas/Perfil.jsx';
import Fuentes from './paginas/Fuentes.jsx';
import Ajustes from './paginas/Ajustes.jsx';

// Definicion de las 6 rutas de la aplicacion.
export default function Rutas() {
  return (
    <Routes>
      <Route path="/" element={<Inicio />} />
      <Route path="/acompanamiento" element={<Acompanamiento />} />
      <Route path="/conversacion" element={<Conversacion />} />
      <Route path="/meditaciones" element={<Meditaciones />} />
      <Route path="/perfil" element={<Perfil />} />
      <Route path="/fuentes" element={<Fuentes />} />
      <Route path="/ajustes" element={<Ajustes />} />
    </Routes>
  );
}
