import { useMemo, useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { Archive, ArchiveRestore, ArrowLeft, Copy, Info, ListChecks, Plus } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { errosDeCampo, useAcao, useModelos, useTodosPlanos } from "../../state/hooks.js";
import { MODALIDADES, RITMOS, itensDoPlano, modeloVazio } from "../../core/plano.js";
import { fmtMin } from "../../core/nucleo.js";
import { Abas, Botao, Campo, Carregando, MensagemErro, Tile, TituloPagina, Vazio } from "../../ui/ui.jsx";
import { ArvoreMaterias, Organizacao } from "../comum/Plano.jsx";

const nomeModalidade = (id) => MODALIDADES.find((m) => m.id === id)?.nome || "";

export function Modelos() {
  const { s, ind } = useApp();
  const modelos = useModelos();
  const planos = useTodosPlanos() || [];
  const navigate = useNavigate();
  const [verArquivados, setVerArquivados] = useState(false);
  const { executar, ocupado, erro } = useAcao();
  if (!modelos || !ind) return <Carregando />;
  const lista = modelos.filter((m) => !!m.arquivado === verArquivados);
  const usando = (id) => planos.filter((p) => p.modeloId === id).length;

  return (
    <>
      <TituloPagina eyebrow="Modelos" frase="Planos *gerais*"
        texto="Um plano geral por vestibular, curso, modalidade e período. Ao aplicar num aluno, ele vira uma cópia individual: mudar o geral não mexe nos alunos."
        direita={<Botao variante="solido" icone={Plus} onClick={() => navigate("novo")}>Novo plano geral</Botao>} />
      <MensagemErro erro={erro} />
      <div className="filtros" role="tablist">
        <button type="button" role="tab" className="filtro" aria-selected={!verArquivados} onClick={() => setVerArquivados(false)}>Em uso</button>
        <button type="button" role="tab" className="filtro" aria-selected={verArquivados} onClick={() => setVerArquivados(true)}>Arquivados</button>
      </div>
      {lista.length === 0 ? <div className="cartao"><Vazio icone={ListChecks} titulo={verArquivados ? "Nenhum plano arquivado" : "Nenhum plano geral"} texto={verArquivados ? null : "Crie o primeiro: escolha o vestibular e monte a sequência de matérias."} /></div> : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Plano</th><th>Vestibular · curso</th><th>Modalidade</th><th className="num">Versão</th><th className="num">Matérias</th><th className="num">Carga</th><th className="num">Alunos</th><th><span className="sr-only">Ações</span></th></tr></thead>
            <tbody>
              {lista.map((m) => {
                const carga = itensDoPlano(m, ind).reduce((x, it) => x + it.duracao, 0);
                return (
                  <tr key={m.id}>
                    <td><Link to={m.id} className="link-aluno"><strong>{m.nome}</strong>{m.periodo && <small>{m.periodo}</small>}</Link></td>
                    <td>{ind.nomeVestibular(m.vestibularId)}{m.cursoId ? ` · ${ind.nomeCurso(m.cursoId)}` : ""}</td>
                    <td>{nomeModalidade(m.modalidade)}</td>
                    <td className="num">{m.versao || 1}</td>
                    <td className="num">{m.materias?.length || 0}</td>
                    <td className="num">{fmtMin(carga)}</td>
                    <td className="num">{usando(m.id)}</td>
                    <td className="celula-acoes">
                      <button type="button" className="icone-btn" title="Duplicar" aria-label={`Duplicar ${m.nome}`} disabled={ocupado} onClick={() => executar(async () => navigate(await s.planos.duplicarModelo(m.id)))}><Copy /></button>
                      <button type="button" className="icone-btn" title={m.arquivado ? "Restaurar" : "Arquivar"} aria-label={`${m.arquivado ? "Restaurar" : "Arquivar"} ${m.nome}`} disabled={ocupado}
                        onClick={() => executar(() => s.planos.arquivarModelo(m.id, !m.arquivado))}>{m.arquivado ? <ArchiveRestore /> : <Archive />}</button>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

function Metadados({ modelo, aoSalvar, ocupado, erro }) {
  const { ind } = useApp();
  const [f, setF] = useState(() => ({
    nome: modelo.nome || "", descricao: modelo.descricao || "", vestibularId: modelo.vestibularId || "", cursoId: modelo.cursoId || "",
    modalidade: modelo.modalidade || "extensivo", periodo: modelo.periodo || "", versao: modelo.versao || 1, dataAlvo: modelo.dataAlvo || "", ritmo: modelo.ritmo || 1,
  }));
  const erros = errosDeCampo(erro);
  const mudou = JSON.stringify(f) !== JSON.stringify({ nome: modelo.nome || "", descricao: modelo.descricao || "", vestibularId: modelo.vestibularId || "", cursoId: modelo.cursoId || "", modalidade: modelo.modalidade || "extensivo", periodo: modelo.periodo || "", versao: modelo.versao || 1, dataAlvo: modelo.dataAlvo || "", ritmo: modelo.ritmo || 1 });
  return (
    <section className="cartao form">
      <div className="form-linha">
        <Campo rotulo="Nome" erro={erros.nome}><input className="entrada" value={f.nome} placeholder="Ex.: FUVEST Medicina · Extensivo 2027" onChange={(e) => setF({ ...f, nome: e.target.value })} /></Campo>
        <Campo rotulo="Período" ajuda="Ex.: 2027, 1º semestre"><input className="entrada" value={f.periodo} onChange={(e) => setF({ ...f, periodo: e.target.value })} /></Campo>
      </div>
      <div className="form-linha form-linha--3">
        <Campo rotulo="Vestibular" erro={erros.vestibularId}>
          <select className="entrada" value={f.vestibularId} onChange={(e) => setF({ ...f, vestibularId: e.target.value })}>
            <option value="">Selecione…</option>{ind.vestibulares.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Curso (opcional)" erro={erros.cursoId}>
          <select className="entrada" value={f.cursoId} onChange={(e) => setF({ ...f, cursoId: e.target.value })}>
            <option value="">Qualquer curso</option>{ind.cursos.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Modalidade">
          <select className="entrada" value={f.modalidade} onChange={(e) => setF({ ...f, modalidade: e.target.value })}>
            {MODALIDADES.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </Campo>
      </div>
      <div className="form-linha form-linha--3">
        <Campo rotulo="Versão"><input className="entrada num" type="number" min="1" value={f.versao} onChange={(e) => setF({ ...f, versao: Number(e.target.value) || 1 })} /></Campo>
        <Campo rotulo="Data-alvo (opcional)" erro={erros.dataAlvo}><input className="entrada" type="date" value={f.dataAlvo} onChange={(e) => setF({ ...f, dataAlvo: e.target.value })} /></Campo>
        <Campo rotulo="Velocidade padrão">
          <select className="entrada" value={f.ritmo} onChange={(e) => setF({ ...f, ritmo: Number(e.target.value) })}>
            {RITMOS.map((r) => <option key={r.id} value={r.multiplicador}>{r.nome}</option>)}
          </select>
        </Campo>
      </div>
      <Campo rotulo="Descrição (opcional)"><textarea className="entrada" rows={2} value={f.descricao} onChange={(e) => setF({ ...f, descricao: e.target.value })} /></Campo>
      {!Object.keys(erros).length && <MensagemErro erro={erro} />}
      <Botao variante="solido" disabled={!mudou || ocupado} onClick={() => aoSalvar({ ...f, dataAlvo: f.dataAlvo || null })}>{modelo.id ? "Salvar dados" : "Criar plano geral"}</Botao>
    </section>
  );
}

export function Modelo() {
  const { id } = useParams();
  const { s, ind } = useApp();
  const modelos = useModelos();
  const navigate = useNavigate();
  const [aba, setAba] = useState("materias");
  const { executar, ocupado, erro } = useAcao();
  const modelo = id === "novo" ? { ...modeloVazio() } : modelos?.find((m) => m.id === id);
  const resumo = useMemo(() => {
    if (!modelo?.id || !ind) return null;
    const carga = itensDoPlano(modelo, ind).reduce((x, it) => x + it.duracao, 0);
    const semanal = (modelo.materias || []).reduce((x, m) => x + (m.minutosSemanais || 0), 0);
    return { carga, semanal, semanas: semanal ? Math.ceil(carga / semanal) : null };
  }, [modelo, ind]);

  if (!modelos || !ind) return <Carregando />;
  if (!modelo) return <Navigate to=".." relative="path" replace />;
  const salvar = (campos) => executar(async () => {
    const novoId = await s.planos.salvarModelo({ ...(modelo.id ? { id: modelo.id } : {}), ...campos });
    if (!modelo.id) navigate(`../${novoId}`, { relative: "path", replace: true });
  });
  const operar = (op) => executar(() => s.planos.alterarModelo(modelo.id, op));

  return (
    <>
      <Link to=".." relative="path" className="voltar"><ArrowLeft aria-hidden="true" />Planos gerais</Link>
      <TituloPagina eyebrow={modelo.id ? `Versão ${modelo.versao || 1}` : "Novo plano geral"} frase={modelo.nome || "Novo plano geral"} />
      <p className="aviso" role="note"><Info aria-hidden="true" />Mudar este plano não altera os planos já aplicados: cada aluno tem a sua cópia. Para levar a mudança a um aluno, aplique de novo no painel dele.</p>
      <Metadados key={modelo.id || "novo"} modelo={modelo} aoSalvar={salvar} ocupado={ocupado} erro={erro} />
      {modelo.id && (
        <>
          {resumo && (
            <div className="stats-grid">
              <Tile valor={fmtMin(resumo.carga)} rotulo="de conteúdo" />
              <Tile valor={fmtMin(resumo.semanal)} rotulo="por semana (somando as matérias)" />
              <Tile valor={resumo.semanas ?? "–"} rotulo="semanas, no ritmo padrão" />
            </div>
          )}
          <Abas rotulo="Seções do plano geral" ativa={aba} aoMudar={setAba} itens={[{ k: "materias", label: "Matérias e sequência" }, { k: "regras", label: "Revisões e permissões" }]} />
          {aba === "materias" && <ArvoreMaterias plano={modelo} pode={{ estrutura: true, reordenar: true, parametros: true, carga: true }} aoOperar={operar} ocupado={ocupado} />}
          {aba === "regras" && <Organizacao modelo plano={modelo} pode={{ ritmo: true, prazo: true, revisao: true, permissoes: true }} aoOperar={operar} ocupado={ocupado} />}
        </>
      )}
    </>
  );
}
