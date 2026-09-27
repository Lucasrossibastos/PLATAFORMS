import { HashRouter, Navigate, Route, Routes } from "react-router-dom";
import { AppProvider, rotaInicial, useApp } from "./state/AppContext.jsx";
import { MENU_ALUNO, MENU_MODERADOR } from "./navegacao.js";
import { Carregando } from "./ui/ui.jsx";
import Login from "./screens/Login.jsx";
import BoasVindas from "./screens/BoasVindas.jsx";
import Shell from "./screens/Shell.jsx";
import { AcessoBloqueado, Instalacao } from "./screens/Acesso.jsx";
import { BoasVindasPagina } from "./screens/Paginas.jsx";
import Inicio from "./screens/aluno/Inicio.jsx";
import Semana from "./screens/aluno/Semana.jsx";
import PlanoAluno from "./screens/aluno/Plano.jsx";
import QuestoesAluno from "./screens/aluno/Questoes.jsx";
import SimuladosAluno from "./screens/aluno/Simulados.jsx";
import DesempenhoAluno from "./screens/aluno/Desempenho.jsx";
import MateriaisAluno from "./screens/aluno/Materiais.jsx";
import AvisosAluno from "./screens/aluno/Avisos.jsx";
import { CursosAluno, PlaylistAluno } from "./screens/aluno/Cursos.jsx";
import { RedacaoAluno, RedacoesAluno } from "./screens/aluno/Redacao.jsx";
import Alunos from "./screens/moderador/Alunos.jsx";
import AlunoPainel from "./screens/moderador/AlunoPainel.jsx";
import { Modelo, Modelos } from "./screens/moderador/Modelos.jsx";
import Estrutura from "./screens/moderador/Estrutura.jsx";
import MateriaisModerador from "./screens/moderador/Materiais.jsx";
import AvisosModerador from "./screens/moderador/Avisos.jsx";
import Textos from "./screens/moderador/Textos.jsx";
import { CursosModerador, PlaylistModerador } from "./screens/moderador/Cursos.jsx";
import { RedacaoModerador, RedacoesModerador } from "./screens/moderador/Redacao.jsx";

function Tela({ children }) {
  const { usuario, erro, s } = useApp();
  if (erro) return <div className="tela-centro"><p className="aviso aviso--erro">Não foi possível iniciar: {erro.message}</p></div>;
  if (!s || usuario === undefined) return <div className="tela-centro"><Carregando /></div>;
  return children;
}

function Protegida({ papel, children }) {
  const { usuario } = useApp();
  if (!usuario) return <Navigate to="/entrar" replace />;
  if (usuario.semPerfil || usuario.bloqueado) return <AcessoBloqueado />;
  if (papel && usuario.role !== papel) return <Navigate to={rotaInicial(usuario)} replace />;
  return children;
}

function Raiz() {
  const { usuario } = useApp();
  return <Navigate to={usuario?.role ? rotaInicial(usuario) : "/entrar"} replace />;
}

// Logou (ou já estava logado): a primeira tela é a de boas-vindas.
function Entrada() {
  const { usuario } = useApp();
  if (usuario?.semPerfil || usuario?.bloqueado) return <AcessoBloqueado />;
  return usuario ? <Navigate to="/boas-vindas" replace /> : <Login />;
}

export default function App() {
  return (
    <AppProvider>
      <HashRouter>
        <Tela>
          <Routes>
            <Route path="/" element={<Raiz />} />
            <Route path="/entrar" element={<Entrada />} />
            <Route path="/instalar" element={<Instalacao />} />
            <Route path="/boas-vindas" element={<Protegida><BoasVindas /></Protegida>} />
            <Route path="/aluno" element={<Protegida papel="aluno"><Shell menu={MENU_ALUNO} /></Protegida>}>
              <Route index element={<Navigate to="inicio" replace />} />
              <Route path="inicio" element={<Inicio />} />
              <Route path="semana" element={<Semana />} />
              <Route path="plano" element={<PlanoAluno />} />
              <Route path="questoes" element={<QuestoesAluno />} />
              <Route path="simulados" element={<SimuladosAluno />} />
              <Route path="desempenho" element={<DesempenhoAluno />} />
              <Route path="materiais" element={<MateriaisAluno />} />
              <Route path="avisos" element={<AvisosAluno />} />
              <Route path="cursos" element={<CursosAluno />} />
              <Route path="cursos/:id" element={<PlaylistAluno />} />
              <Route path="redacao" element={<RedacoesAluno />} />
              <Route path="redacao/:id" element={<RedacaoAluno />} />
              <Route path="boas-vindas" element={<BoasVindasPagina />} />
              <Route path="*" element={<Navigate to="inicio" replace />} />
            </Route>
            <Route path="/moderador" element={<Protegida papel="moderador"><Shell menu={MENU_MODERADOR} /></Protegida>}>
              <Route index element={<Navigate to="alunos" replace />} />
              <Route path="alunos" element={<Alunos />} />
              <Route path="alunos/:id" element={<AlunoPainel />} />
              <Route path="planos" element={<Modelos />} />
              <Route path="planos/:id" element={<Modelo />} />
              <Route path="estrutura" element={<Estrutura />} />
              <Route path="materiais" element={<MateriaisModerador />} />
              <Route path="avisos" element={<AvisosModerador />} />
              <Route path="textos" element={<Textos />} />
              <Route path="cursos" element={<CursosModerador />} />
              <Route path="cursos/:id" element={<PlaylistModerador />} />
              <Route path="redacao" element={<RedacoesModerador />} />
              <Route path="redacao/:id" element={<RedacaoModerador />} />
              <Route path="*" element={<Navigate to="alunos" replace />} />
            </Route>
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </Tela>
      </HashRouter>
    </AppProvider>
  );
}
