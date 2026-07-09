import Layout from './componentes/Layout.jsx';
import Rutas from './rutas.jsx';
import Aviso from './seguridad/Aviso.jsx';

// App shell. El Layout envuelve las rutas de la aplicacion.
// El <Aviso/> de seguridad (acompanamiento complementario, NO tratamiento medico,
// PRD §2.1) queda visible de forma global, al pie de cada pagina.
// El <ModalCrisis/> NO se monta aqui: vive en la pagina de Acompanamiento, junto al
// estado del chat (useAcompanamiento) que lo dispara.
export default function App() {
  return (
    <Layout>
      <Rutas />
      <footer className="mt-12">
        <Aviso />
      </footer>
    </Layout>
  );
}
