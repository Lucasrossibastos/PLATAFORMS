import { useNavigate } from "react-router-dom";
import { CalendarCheck, FileText, Flame, PenLine, Target, Trophy, Users } from "lucide-react";
import { fmtMin, vestInfo } from "../core/nucleo.js";
import { useApp, useEstudo, useFrasesDoAluno } from "../state/AppContext.jsx";
import { resumoAluno } from "../state/estudo.js";
import { Cinema } from "../ui/Cinema.jsx";
import { Botao, Estrela } from "../ui/ui.jsx";
import { primeiroNome, saudacao } from "../textos.js";

const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

/* Gate pós-login do aluno. */
function GateAluno() {
  const { db, usuario, sair } = useApp();
  const est = useEstudo();
  const navigate = useNavigate();
  const r = resumoAluno(db, usuario.uid, est);
  const aluno = db.alunos.find((a) => a.id === usuario.uid);
  const vest = vestInfo(aluno?.vestibular);
  const hero = db.welcome.hero || {};
  const ir = (tela) => navigate(`/aluno/${tela}`);
  const meta = r.proximaMeta;
  const recado = r.ultimoRecado;
  const t = useFrasesDoAluno();

  return (
    <Cinema
      nav={[
        { label: "Metas de hoje", onClick: () => ir("dashboard") },
        { label: "Semana", onClick: () => ir("semana") },
        { label: "Estudar", submenu: [
          { label: "Cursos em vídeo", onClick: () => ir("cursos") },
          { label: "Banco de Questões", onClick: () => ir("questoes") },
          { label: "Simulados", onClick: () => ir("simulados") },
          { label: "Redação", onClick: () => ir("redacao") },
        ] },
        { label: "Conquistas", onClick: () => ir("conquistas") },
      ]}
      acoes={<>
        <Botao variante="vidro" className="opcional aparece aparece--escala" style={{ "--d": "0.3s" }} onClick={sair}>Sair</Botao>
        <Botao variante="solido" className="aparece aparece--escala" style={{ "--d": "0.34s" }} onClick={() => ir("dashboard")}>Acessar a plataforma</Botao>
      </>}
      rodapeMenu={<Botao variante="vidro" onClick={sair}>Sair</Botao>}
      selo={<span className="selo-topo aparece aparece--pop" style={{ "--d": "0.22s", "--cor": vest.cor }}><i />{t("boasvindas.selo")}</span>}
      titulo={`${t("boasvindas.saudacao")}\n${t(r.metasHoje.length ? "boasvindas.comMetas" : "boasvindas.semMetas")}`}
      corDestaque={db.textos.corDestaque}
      lede={recado
        ? <>“{recado.texto}”<cite>{hero.nome} · recado do instrutor</cite></>
        : hero.subtitulo}
      stats={[
        { icone: <Flame aria-hidden="true" />, texto: <><b>{plural(r.streak, "dia", "dias")}</b> de sequência cumprindo as metas</> },
        { icone: <Target aria-hidden="true" />, texto: <><b>{r.progresso}%</b> do programa concluído</> },
        { icone: <CalendarCheck aria-hidden="true" />, texto: <><b>{r.aderencia ?? "–"}{r.aderencia != null && "%"}</b> de aderência no mês</> },
        ...(r.proximaConquista ? [{ icone: <Trophy aria-hidden="true" />, texto: <>Próxima conquista: <b>{r.proximaConquista.titulo}</b></> }] : []),
      ]}
    >
      <div className="capsula">
        <div className="capsula-texto">
          {meta ? <><span>Próxima meta ·</span>{meta.materia} · {fmtMin(meta.minutos)}</> : "Nenhuma meta pendente hoje"}
        </div>
        <Botao variante="solido" onClick={() => ir("dashboard")}>{meta ? "Começar" : "Ver o painel"}</Botao>
      </div>
      <p className="cine-dica">{plural(r.total - r.feitas, "meta aberta", "metas abertas")} hoje{r.atrasadas.some((m) => !m.done) ? ", incluindo atrasadas" : ""}</p>
    </Cinema>
  );
}

/* Gate pós-login do moderador. */
function GateModerador() {
  const { db, usuario, sair } = useApp();
  const navigate = useNavigate();
  const ir = (tela) => navigate(`/moderador/${tela}`);
  const hero = db.welcome.hero || {};
  const pendentes = db.envios.filter((e) => e.status === "pendente").length;
  const rascunhos = db.devolutivas.filter((d) => d.status === "rascunho").length;

  return (
    <Cinema
      nav={[
        { label: "Alunos", onClick: () => ir("alunos") },
        { label: "Redação", onClick: () => ir("redacao") },
        { label: "Conteúdo", submenu: [
          { label: "Textos da plataforma", onClick: () => ir("textos") },
          { label: "Cursos em vídeo", onClick: () => ir("cursos") },
          { label: "Simulados", onClick: () => ir("simulados") },
          { label: "Materiais", onClick: () => ir("materiais") },
          { label: "Boas-Vindas", onClick: () => ir("boas-vindas") },
        ] },
        { label: "Plano de Estudos", onClick: () => ir("plano") },
      ]}
      acoes={<>
        <Botao variante="vidro" className="opcional aparece aparece--escala" style={{ "--d": "0.3s" }} onClick={sair}>Sair</Botao>
        <Botao variante="solido" className="aparece aparece--escala" style={{ "--d": "0.34s" }} onClick={() => ir("alunos")}>Acessar o painel</Botao>
      </>}
      rodapeMenu={<Botao variante="vidro" onClick={sair}>Sair</Botao>}
      selo={<span className="selo-topo aparece aparece--pop" style={{ "--d": "0.22s" }}><Estrela />Painel do professor</span>}
      titulo={`${saudacao()}, ${primeiroNome(usuario.name)}.\nSua turma *está esperando*.`}
      corDestaque={db.textos.corDestaque}
      lede={hero.subtitulo}
      stats={[
        { icone: <Users aria-hidden="true" />, texto: <><b>{db.alunos.length}</b> alunos na plataforma</> },
        { icone: <FileText aria-hidden="true" />, texto: <><b>{pendentes}</b> {pendentes === 1 ? "simulado" : "simulados"} para classificar</> },
        { icone: <PenLine aria-hidden="true" />, texto: <><b>{rascunhos}</b> {rascunhos === 1 ? "devolutiva" : "devolutivas"} em rascunho</> },
      ]}
    >
      <div className="capsula">
        <div className="capsula-texto"><span>Para classificar ·</span>{plural(pendentes, "simulado", "simulados")}</div>
        <Botao variante="solido" onClick={() => ir("alunos")}>Ver alunos</Botao>
      </div>
    </Cinema>
  );
}

export default function BoasVindas() {
  const { usuario } = useApp();
  if (!usuario) return null;
  return usuario.role === "moderador" ? <GateModerador /> : <GateAluno />;
}
