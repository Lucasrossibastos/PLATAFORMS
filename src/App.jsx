import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, rotaInicial, useApp } from "./state/AppContext.jsx";
import { MENU_ALUNO, MENU_MODERADOR } from "./navegacao.js";
import Login from "./screens/Login.jsx";
import BoasVindas from "./screens/BoasVindas.jsx";
import Shell from "./screens/Shell.jsx";
import Dashboard from "./screens/aluno/Dashboard.jsx";
import Semana from "./screens/aluno/Semana.jsx";
import { BoasVindasPagina, EmBreve } from "./screens/Paginas.jsx";
import { Grao } from "./ui/ui.jsx";

function Protegida({ papel, children }) {
  const { usuario } = useApp();
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (papel && usuario.role !== papel) return <Navigate to={rotaInicial(usuario)} replace />;
  return children;
}

function Inicio() {
  const { usuario } = useApp();
  return <Navigate to={usuario ? rotaInicial(usuario) : "/entrar"} replace />;
}

// Logou (ou já estava logado): a primeira tela é a de boas-vindas.
function Entrada() {
  const { usuario } = useApp();
  return usuario ? <Navigate to="/boas-vindas" replace /> : <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Routes>
          <Route path="/" element={<Inicio />} />
          <Route path="/entrar" element={<Entrada />} />
          <Route path="/boas-vindas" element={<Protegida><BoasVindas /></Protegida>} />
          <Route path="/aluno" element={<Protegida papel="aluno"><Shell menu={MENU_ALUNO} /></Protegida>}>
            <Route index element={<Navigate to="dashboard" replace />} />
            <Route path="dashboard" element={<Dashboard />} />
            <Route path="semana" element={<Semana />} />
            <Route path="boas-vindas" element={<BoasVindasPagina />} />
            <Route path=":tela" element={<EmBreve menu={MENU_ALUNO} />} />
          </Route>
          <Route path="/moderador" element={<Protegida papel="moderador"><Shell menu={MENU_MODERADOR} /></Protegida>}>
            <Route index element={<Navigate to="alunos" replace />} />
            <Route path=":tela" element={<EmBreve menu={MENU_MODERADOR} />} />
          </Route>
          <Route path="*" element={<Navigate to="/" replace />} />
        </Routes>
      </HashRouter>
      <Grao />
    </AppProvider>
  );
}
