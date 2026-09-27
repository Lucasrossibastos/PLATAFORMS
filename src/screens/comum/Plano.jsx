/* Plano de estudos: resumo, cronograma, árvore de matérias (com edição),
   organização (horas, ritmo, prazos, permissões), revisões e histórico.
   Serve ao aluno ("Meu plano"), ao moderador (painel do aluno) e ao editor de
   planos gerais. Quem pode editar o quê vem das permissões. */

import { useMemo, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarClock, ChevronDown, ChevronRight, Clock4, History, ListTree, Plus,
  RefreshCw, RotateCcw, Settings2, SlidersHorizontal, Trash2, Undo2, Check,
} from "lucide-react";
import { DIAS, fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta, fmtDataLonga } from "../../core/datas.js";
import {
  CARGA_PADRAO, MODALIDADES, PERMISSOES_ALUNO, PRIORIDADES, RITMOS, capacidadeSemanal, idItem, itensDoPlano, nomeRitmo,
} from "../../core/plano.js";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useLogs } from "../../state/hooks.js";
import { EtiquetaStatus, PontoMateria } from "../../ui/Conteudo.jsx";
import { Abas, Barra, Botao, Campo, Carregando, Confirmar, Dialogo, MensagemErro, Tile, Vazio } from "../../ui/ui.jsx";
import { quando } from "../aluno/Avisos.jsx";

const pctTxt = (v) => `${String(v).replace(".", ",")}%`;
const nomePrioridade = (p) => PRIORIDADES.find((x) => x.id === (p ?? 2))?.nome || "Média";

/* ---------- Confirmação de alteração (prévia + motivo) ---------- */

export function useEdicaoPlano(alunoId, { confirmar = true } = {}) {
  const { s, usuario } = useApp();
  const [pedido, setPedido] = useState(null); // { ops, titulo, previa }
  const [motivo, setMotivo] = useState("");
  const { executar, ocupado, erro, limparErro } = useAcao();

  const aplicar = (ops) => executar(async () => {
    await s.planos.alterar(alunoId, ops, { motivo });
    setPedido(null);
    setMotivo("");
  });

  const propor = (ops, titulo = "Alterar o plano") => {
    const lista = Array.isArray(ops) ? ops : [ops];
    if (!confirmar) return aplicar(lista);
    limparErro();
    setPedido({ ops: lista, titulo, previa: null });
    return executar(async () => {
      const previa = await s.planos.previa(alunoId, lista);
      setPedido((p) => (p ? { ...p, previa } : p));
    });
  };

  const dialogo = (
    <Confirmar aberto={!!pedido} titulo={pedido?.titulo} rotulo="Aplicar alteração" ocupado={ocupado || !pedido?.previa} erro={erro}
      aoFechar={() => { setPedido(null); setMotivo(""); limparErro(); }} aoConfirmar={() => aplicar(pedido.ops)}>
      {!pedido?.previa ? <Carregando texto="Calculando o impacto…" /> : (
        <>
          <ul className="lista-alteracoes">
            {pedido.previa.alteracoes.map((a, i) => <li key={i}>{a.descricao}{a.antes != null || a.depois != null ? <small> · {fmtValorLog(a.antes)} → {fmtValorLog(a.depois)}</small> : null}</li>)}
            {!pedido.previa.alteracoes.length && <li>Nada muda com esta alteração.</li>}
          </ul>
          <p className="aviso" role="note">
            <CalendarClock aria-hidden="true" />
            <span>
              Essa alteração modificará <b>{pedido.previa.conteudosRemarcados}</b> {pedido.previa.conteudosRemarcados === 1 ? "sessão futura" : "sessões futuras"} do cronograma.
              O histórico concluído será preservado{pedido.previa.concluidosPreservados ? ` (${pedido.previa.concluidosPreservados} ${pedido.previa.concluidosPreservados === 1 ? "conteúdo concluído" : "conteúdos concluídos"})` : ""}.
              {pedido.previa.fimAntes !== pedido.previa.fimDepois && <> Previsão de término: {fmtDataLonga(pedido.previa.fimAntes) || "sem previsão"} → <b>{fmtDataLonga(pedido.previa.fimDepois) || "sem previsão"}</b>.</>}
              {!pedido.previa.cabeDepois && <> <b>Não cabe até a data-alvo</b> com as horas atuais.</>}
            </span>
          </p>
          {usuario?.role === "moderador" && (
            <Campo rotulo="Motivo (opcional)" ajuda="Fica no histórico de alterações do aluno.">
              <input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} />
            </Campo>
          )}
        </>
      )}
    </Confirmar>
  );
  return { propor, aplicar, dialogo, ocupado, erro };
}

/* ---------- Valores do histórico ---------- */

export function fmtValorLog(v) {
  if (v == null || v === "") return "—";
  if (typeof v === "boolean") return v ? "sim" : "não";
  if (Array.isArray(v)) return v.join(", ");
  if (typeof v === "object") {
    if (DIAS.every((d) => d.k in v)) return DIAS.map((d) => `${d.nome.slice(0, 3).toLowerCase()} ${fmtMin(v[d.k] || 0) || "0"}`).join(", ");
    if ("intervalos" in v) return `a cada ${v.intervalos.join("/")} dias, ${v.duracaoMin} min`;
    return Object.entries(v).map(([k, x]) => `${k}: ${typeof x === "object" ? JSON.stringify(x) : x}`).join(", ");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return fmtDataLonga(v);
  return String(v);
}

/* ---------- Resumo ---------- */

export function ResumoPlano({ v, acoes }) {
  const { ind } = useApp();
  const p = v.progressoPlano;
  const a = v.atrasos;
  const plano = v.plano;
  return (
    <section className="cartao resumo-plano" aria-label="Resumo do plano">
      <div className="resumo-plano-topo">
        <div>
          <span className="eyebrow">{[ind?.nomeVestibular(plano.vestibularId), ind?.nomeCurso(plano.cursoId), MODALIDADES.find((m) => m.id === plano.modalidade)?.nome].filter(Boolean).join(" · ")}</span>
          <h2 className="subtitulo">{plano.nome}</h2>
          <p className="previa-linha">
            Ritmo {nomeRitmo(plano.ritmo).toLowerCase()} · {fmtMin(capacidadeSemanal(plano.disponibilidade))} livres por semana
            {plano.dataAlvo ? ` · data-alvo ${fmtDataLonga(plano.dataAlvo)}` : ""}
          </p>
        </div>
        {acoes}
      </div>
      <div className="progresso-plano">
        <Barra valor={p.pct} altura={8} />
        <span className="num"><b>{pctTxt(p.pct)}</b> concluído · {fmtMin(p.minutosFeitos) || "0min"} de {fmtMin(p.minutosTotais)}</span>
      </div>
      <div className="stats-grid stats-grid--4">
        <Tile valor={p.concluidos} rotulo="concluídos" />
        <Tile valor={p.emAndamento} rotulo="em andamento" />
        <Tile valor={p.naoIniciados} rotulo="não iniciados" />
        <Tile valor={p.atrasados} rotulo="atrasados" tom={p.atrasados ? "perigo" : undefined}
          detalhe={a.quantidade ? `até ${a.maxDias} ${a.maxDias === 1 ? "dia" : "dias"} · ${fmtMin(a.cargaMin)} a repor` : null} />
      </div>
      <p className="previa-linha">
        {plano.fimPrevisto
          ? <>Previsão de término: <b>{fmtDataLonga(plano.fimPrevisto)}</b>{plano.dataAlvo && plano.fimPrevisto > plano.dataAlvo ? <span className="txt-erro"> · depois da data-alvo</span> : null}</>
          : "Sem previsão de término: as horas livres não cobrem o plano."}
        {plano.recalculadoEm ? ` · recalculado em ${fmtDataLonga(plano.recalculadoEm)}` : ""}
      </p>
      {a.quantidade > 0 && (
        <p className="aviso aviso--erro" role="note">
          <AlertTriangle aria-hidden="true" />
          {a.quantidade} {a.quantidade === 1 ? "conteúdo passou" : "conteúdos passaram"} da data prevista ({a.materias.map((m) => ind?.nomeMateria(m)).join(", ")}).
          Recalcular o plano redistribui o que falta a partir de hoje, sem apagar o que já foi feito.
        </p>
      )}
    </section>
  );
}

/* ---------- Cronograma (dia, conteúdo, duração, status, progresso, atraso, revisão) ---------- */

function proximaRevisao(revisoes, itemId, hojeIso) {
  const futuras = (revisoes || []).filter((r) => r.itemId === itemId).flatMap((r) => r.sessoes.filter((x) => x.status === "agendada").map((x) => x.dia)).sort();
  return futuras.find((d) => d >= hojeIso) || futuras[0] || null;
}

export function Cronograma({ v, podeConcluir, aoConcluir, aoReabrir, ocupado }) {
  const { ind } = useApp();
  const [status, setStatus] = useState("");
  const [materia, setMateria] = useState("");
  const linhas = useMemo(() => {
    const crono = v.plano.cronograma || {};
    return v.itens
      .map((it) => ({ it, st: v.status(it), e: v.estado(it), datas: crono[it.itemId] || {} }))
      .filter((l) => (!status || l.st === status) && (!materia || l.it.materiaId === materia))
      .sort((a, b) => (a.datas.inicio || "9999").localeCompare(b.datas.inicio || "9999") || a.it.posMateria - b.it.posMateria);
  }, [v, status, materia]);

  return (
    <>
      <div className="barra-filtros">
        <label className="filtro-campo"><span>Status</span>
          <select className="entrada" value={status} onChange={(e) => setStatus(e.target.value)}>
            <option value="">Todos</option>
            <option value="atrasado">Atrasados</option>
            <option value="em_andamento">Em andamento</option>
            <option value="nao_iniciado">Não iniciados</option>
            <option value="concluido">Concluídos</option>
          </select>
        </label>
        <label className="filtro-campo"><span>Matéria</span>
          <select className="entrada" value={materia} onChange={(e) => setMateria(e.target.value)}>
            <option value="">Todas</option>
            {v.plano.materias.map((m) => <option key={m.materiaId} value={m.materiaId}>{ind.nomeMateria(m.materiaId)}</option>)}
          </select>
        </label>
        <span className="filtro-contagem num">{linhas.length} {linhas.length === 1 ? "conteúdo" : "conteúdos"}</span>
      </div>
      {linhas.length === 0 ? <div className="cartao"><Vazio icone={ListTree} titulo="Nada com esses filtros" /></div> : (
        <div className="tabela-rolagem">
          <table className="tabela tabela-cronograma tabela--cartoes">
            <thead>
              <tr><th>Quando</th><th>Conteúdo</th><th className="num">Duração</th><th>Status</th><th>Progresso</th><th>Revisão</th>{podeConcluir && <th><span className="sr-only">Ações</span></th>}</tr>
            </thead>
            <tbody>
              {linhas.map(({ it, st, e, datas }) => {
                const dias = st === "atrasado" && datas.fim ? Math.round((new Date(v.hoje) - new Date(datas.fim)) / 86400000) : 0;
                const rev = e.concluido ? proximaRevisao(v.revisoes, it.itemId, v.hoje) : null;
                return (
                  <tr key={it.itemId} className={st === "atrasado" ? "linha-atrasada" : ""}>
                    <td className="num" data-rotulo="Quando">{datas.inicio ? (datas.inicio === datas.fim ? fmtDataCurta(datas.inicio) : `${fmtDataCurta(datas.inicio)}–${fmtDataCurta(datas.fim)}`) : e.concluido ? fmtDataCurta(e.concluidoEm) : "—"}</td>
                    <td className="celula-principal">
                      <span className="celula-conteudo">
                        <PontoMateria materiaId={it.materiaId} />
                        <span><small>{ind.nomeMateria(it.materiaId)}</small>{ind.nomeTopico(it.topicoId)}{it.subtopicoId && <> · <em>{ind.nomeSubtopico(it.subtopicoId)}</em></>}</span>
                      </span>
                    </td>
                    <td className="num" data-rotulo="Duração">{fmtMin(it.duracao)}</td>
                    <td><EtiquetaStatus status={st} extra={dias ? `${dias} ${dias === 1 ? "dia" : "dias"}` : null} /></td>
                    <td className="celula-progresso"><Barra valor={e.concluido ? 100 : (e.minutos / it.duracao) * 100} /><small className="num">{fmtMin(Math.min(e.minutos, it.duracao)) || "0min"}</small></td>
                    <td className="num" data-rotulo="Revisão">{rev ? fmtDataCurta(rev) : "—"}</td>
                    {podeConcluir && (
                      <td>
                        {e.concluido
                          ? <button type="button" className="icone-btn" disabled={ocupado} title="Reabrir" aria-label={`Reabrir ${ind.nomeTopico(it.topicoId)}`} onClick={() => aoReabrir(it)}><Undo2 /></button>
                          : <button type="button" className="icone-btn" disabled={ocupado} title="Marcar como concluído" aria-label={`Concluir ${ind.nomeTopico(it.topicoId)}`} onClick={() => aoConcluir(it)}><Check /></button>}
                      </td>
                    )}
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

/* ---------- Árvore de matérias (com edição) ---------- */

function ParametrosMateria({ materia, aoSalvar, aoFechar }) {
  const { ind } = useApp();
  const [f, setF] = useState({ minutosSemanais: materia.minutosSemanais ?? 120, maxSessao: materia.maxSessao ?? 60, prioridade: materia.prioridade ?? 2, ritmo: materia.ritmo ?? 1 });
  return (
    <Dialogo aberto aoFechar={aoFechar} titulo={`Parâmetros de ${ind.nomeMateria(materia.materiaId)}`} largura={460}>
      <div className="form">
        <div className="form-linha">
          <Campo rotulo="Minutos por semana" ajuda="Com data-alvo, o recálculo pode subir este valor."><input className="entrada num" type="number" min="0" step="15" value={f.minutosSemanais} onChange={(e) => setF({ ...f, minutosSemanais: Number(e.target.value) })} /></Campo>
          <Campo rotulo="Sessão máxima (min)"><input className="entrada num" type="number" min="15" step="5" value={f.maxSessao} onChange={(e) => setF({ ...f, maxSessao: Number(e.target.value) })} /></Campo>
        </div>
        <div className="form-linha">
          <Campo rotulo="Prioridade" ajuda="Sem horas para tudo, a alta é atendida primeiro.">
            <select className="entrada" value={f.prioridade} onChange={(e) => setF({ ...f, prioridade: Number(e.target.value) })}>
              {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
            </select>
          </Campo>
          <Campo rotulo="Velocidade da matéria">
            <select className="entrada" value={f.ritmo} onChange={(e) => setF({ ...f, ritmo: Number(e.target.value) })}>
              {RITMOS.map((r) => <option key={r.id} value={r.multiplicador}>{r.nome} ({String(r.multiplicador).replace(".", ",")}×)</option>)}
            </select>
          </Campo>
        </div>
        <div className="dialogo-acoes">
          <Botao variante="vidro" onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="solido" onClick={() => aoSalvar(f)}>Continuar</Botao>
        </div>
      </div>
    </Dialogo>
  );
}

function CargaEditor({ valor, padrao, aoSalvar, rotulo }) {
  const [editando, setEditando] = useState(false);
  const [x, setX] = useState(valor ?? "");
  if (!editando) return <button type="button" className="carga" onClick={() => { setX(valor ?? ""); setEditando(true); }} title="Mudar a carga">{fmtMin(valor ?? padrao)}{valor != null && <i aria-label="(personalizada)">*</i>}</button>;
  return (
    <span className="carga-edicao">
      <input className="entrada num" type="number" min="5" step="5" aria-label={rotulo} value={x} placeholder={String(padrao)} autoFocus onChange={(e) => setX(e.target.value)} />
      <button type="button" className="icone-btn" aria-label="Salvar carga" onClick={() => { setEditando(false); aoSalvar(x === "" ? null : Number(x)); }}><Check /></button>
      <button type="button" className="icone-btn" aria-label="Cancelar" onClick={() => setEditando(false)}><Undo2 /></button>
    </span>
  );
}

/* pode: { estrutura, reordenar, parametros, carga } */
export function ArvoreMaterias({ plano, pode = {}, aoOperar, status, progresso, ocupado }) {
  const { ind } = useApp();
  const [abertas, setAbertas] = useState(() => new Set());
  const [parametros, setParametros] = useState(null);
  const [nova, setNova] = useState("");
  const itens = useMemo(() => itensDoPlano(plano, ind), [plano, ind]);
  const porItem = useMemo(() => new Map(itens.map((it) => [it.itemId, it])), [itens]);
  const alternar = (id) => setAbertas((s) => { const n = new Set(s); if (n.has(id)) n.delete(id); else n.add(id); return n; });
  const fora = ind.materias.filter((m) => !plano.materias.some((x) => x.materiaId === m.id));
  const op = (o, titulo) => aoOperar(o, titulo);

  const pctMateria = (materiaId) => progresso?.porMateria.find((m) => m.materiaId === materiaId);

  return (
    <div className="arvore">
      {plano.materias.length === 0 && <div className="cartao"><Vazio icone={ListTree} titulo="Nenhuma matéria no plano" texto={pode.estrutura ? "Adicione a primeira matéria abaixo." : null} /></div>}
      {plano.materias.map((m, i) => {
        const aberta = abertas.has(m.materiaId);
        const pm = pctMateria(m.materiaId);
        const topicosFora = ind.topicosDaMateria(m.materiaId).filter((t) => !m.topicos.some((x) => x.topicoId === t.id));
        return (
          <section key={m.materiaId} className="cartao arvore-materia">
            <header className="arvore-cabeca">
              <button type="button" className="arvore-abrir" aria-expanded={aberta} onClick={() => alternar(m.materiaId)}>
                {aberta ? <ChevronDown aria-hidden="true" /> : <ChevronRight aria-hidden="true" />}
                <PontoMateria materiaId={m.materiaId} />
                <strong>{ind.nomeMateria(m.materiaId)}</strong>
              </button>
              <span className="arvore-info">
                <span className={`etiqueta${(m.prioridade ?? 2) === 1 ? " etiqueta--rev" : ""}`}>Prioridade {nomePrioridade(m.prioridade).toLowerCase()}</span>
                <span className="num">{fmtMin(plano.alocacaoSemanal?.[m.materiaId] ?? m.minutosSemanais ?? 0)}/sem</span>
                {(m.ritmo ?? 1) !== 1 && <span className="etiqueta">{nomeRitmo(m.ritmo)}</span>}
                {pm && <span className="num arvore-pct"><Barra valor={pm.pct} />{pctTxt(pm.pct)}{pm.atrasados ? <b className="txt-erro"> · {pm.atrasados} atrasado{pm.atrasados > 1 ? "s" : ""}</b> : null}</span>}
              </span>
              <span className="arvore-acoes">
                {pode.reordenar && <>
                  <button type="button" className="icone-btn" aria-label="Antecipar matéria" disabled={i === 0 || ocupado} onClick={() => op({ tipo: "moverMateria", materiaId: m.materiaId, passo: -1 }, "Mudar a ordem das matérias")}><ArrowUp /></button>
                  <button type="button" className="icone-btn" aria-label="Adiar matéria" disabled={i === plano.materias.length - 1 || ocupado} onClick={() => op({ tipo: "moverMateria", materiaId: m.materiaId, passo: 1 }, "Mudar a ordem das matérias")}><ArrowDown /></button>
                </>}
                {pode.parametros && <button type="button" className="icone-btn" aria-label={`Parâmetros de ${ind.nomeMateria(m.materiaId)}`} title="Parâmetros" onClick={() => setParametros(m)}><SlidersHorizontal /></button>}
                {pode.estrutura && <button type="button" className="icone-btn" aria-label={`Remover ${ind.nomeMateria(m.materiaId)}`} title="Remover do plano" onClick={() => op({ tipo: "removerMateria", materiaId: m.materiaId }, `Remover ${ind.nomeMateria(m.materiaId)} do plano`)}><Trash2 /></button>}
              </span>
            </header>
            {aberta && (
              <ol className="arvore-topicos">
                {m.topicos.map((t, ti) => {
                  const topico = ind.topico(t.topicoId);
                  const semSubs = !t.subtopicos?.filter((x) => ind.subtopico(x.subtopicoId)).length;
                  const itemT = semSubs ? porItem.get(idItem(t.topicoId)) : null;
                  const subsFora = ind.subtopicosDoTopico(t.topicoId).filter((x) => !t.subtopicos.some((y) => y.subtopicoId === x.id));
                  return (
                    <li key={t.topicoId} className="arvore-topico">
                      <div className="arvore-linha">
                        <span className="arvore-nome">{ind.nomeTopico(t.topicoId)}</span>
                        {itemT && status && <EtiquetaStatus status={status(itemT)} />}
                        {pode.carga && semSubs ? <CargaEditor valor={t.cargaMin} padrao={topico?.cargaMin ?? CARGA_PADRAO} rotulo="Carga do tópico (min)"
                          aoSalvar={(c) => op({ tipo: "definirCarga", materiaId: m.materiaId, topicoId: t.topicoId, cargaMin: c }, "Mudar a carga")} />
                          : semSubs && <span className="num carga">{fmtMin(t.cargaMin ?? topico?.cargaMin ?? CARGA_PADRAO)}</span>}
                        <span className="arvore-acoes">
                          {pode.reordenar && <>
                            <button type="button" className="icone-btn" aria-label="Subir tópico" disabled={ti === 0 || ocupado} onClick={() => op({ tipo: "moverTopico", materiaId: m.materiaId, topicoId: t.topicoId, passo: -1 }, "Mudar a ordem dos tópicos")}><ArrowUp /></button>
                            <button type="button" className="icone-btn" aria-label="Descer tópico" disabled={ti === m.topicos.length - 1 || ocupado} onClick={() => op({ tipo: "moverTopico", materiaId: m.materiaId, topicoId: t.topicoId, passo: 1 }, "Mudar a ordem dos tópicos")}><ArrowDown /></button>
                          </>}
                          {pode.estrutura && <button type="button" className="icone-btn" aria-label={`Remover ${ind.nomeTopico(t.topicoId)}`} onClick={() => op({ tipo: "removerTopico", materiaId: m.materiaId, topicoId: t.topicoId }, `Remover ${ind.nomeTopico(t.topicoId)}`)}><Trash2 /></button>}
                        </span>
                      </div>
                      {!semSubs && (
                        <ol className="arvore-subtopicos">
                          {t.subtopicos.filter((x) => ind.subtopico(x.subtopicoId)).map((sub, si, lista) => {
                            const it = porItem.get(idItem(t.topicoId, sub.subtopicoId));
                            return (
                              <li key={sub.subtopicoId} className="arvore-linha">
                                <span className="arvore-nome">{ind.nomeSubtopico(sub.subtopicoId)}</span>
                                {it && status && <EtiquetaStatus status={status(it)} />}
                                {pode.carga ? <CargaEditor valor={sub.cargaMin} padrao={ind.subtopico(sub.subtopicoId)?.cargaMin ?? CARGA_PADRAO} rotulo="Carga do subtópico (min)"
                                  aoSalvar={(c) => op({ tipo: "definirCarga", materiaId: m.materiaId, topicoId: t.topicoId, subtopicoId: sub.subtopicoId, cargaMin: c }, "Mudar a carga")} />
                                  : <span className="num carga">{fmtMin(it?.carga ?? sub.cargaMin ?? 0)}</span>}
                                <span className="arvore-acoes">
                                  {pode.reordenar && <>
                                    <button type="button" className="icone-btn" aria-label="Subir subtópico" disabled={si === 0 || ocupado} onClick={() => op({ tipo: "moverSubtopico", materiaId: m.materiaId, topicoId: t.topicoId, subtopicoId: sub.subtopicoId, passo: -1 }, "Mudar a ordem dos subtópicos")}><ArrowUp /></button>
                                    <button type="button" className="icone-btn" aria-label="Descer subtópico" disabled={si === lista.length - 1 || ocupado} onClick={() => op({ tipo: "moverSubtopico", materiaId: m.materiaId, topicoId: t.topicoId, subtopicoId: sub.subtopicoId, passo: 1 }, "Mudar a ordem dos subtópicos")}><ArrowDown /></button>
                                  </>}
                                  {pode.estrutura && <button type="button" className="icone-btn" aria-label={`Remover ${ind.nomeSubtopico(sub.subtopicoId)}`} onClick={() => op({ tipo: "removerSubtopico", materiaId: m.materiaId, topicoId: t.topicoId, subtopicoId: sub.subtopicoId }, `Remover ${ind.nomeSubtopico(sub.subtopicoId)}`)}><Trash2 /></button>}
                                </span>
                              </li>
                            );
                          })}
                        </ol>
                      )}
                      {pode.estrutura && subsFora.length > 0 && (
                        <AdicionarSelect rotulo="Adicionar subtópico" opcoes={subsFora}
                          aoEscolher={(id) => op({ tipo: "adicionarSubtopico", materiaId: m.materiaId, topicoId: t.topicoId, subtopicoId: id }, "Adicionar subtópico")} />
                      )}
                    </li>
                  );
                })}
                {pode.estrutura && topicosFora.length > 0 && (
                  <li><AdicionarSelect rotulo="Adicionar tópico" opcoes={topicosFora}
                    aoEscolher={(id) => op({ tipo: "adicionarTopico", materiaId: m.materiaId, topicoId: id }, "Adicionar tópico")} /></li>
                )}
              </ol>
            )}
          </section>
        );
      })}
      {pode.estrutura && fora.length > 0 && (
        <div className="cartao arvore-nova">
          <select className="entrada" value={nova} onChange={(e) => setNova(e.target.value)} aria-label="Matéria para adicionar">
            <option value="">Adicionar matéria ao plano…</option>
            {fora.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
          <Botao variante="solido" tamanho="sm" icone={Plus} disabled={!nova || ocupado} onClick={() => { op({ tipo: "adicionarMateria", materiaId: nova }, `Adicionar ${ind.nomeMateria(nova)}`); setNova(""); }}>Adicionar</Botao>
        </div>
      )}
      {parametros && (
        <ParametrosMateria materia={parametros} aoFechar={() => setParametros(null)}
          aoSalvar={(campos) => { setParametros(null); op({ tipo: "definirMateria", materiaId: parametros.materiaId, campos }, `Parâmetros de ${ind.nomeMateria(parametros.materiaId)}`); }} />
      )}
    </div>
  );
}

function AdicionarSelect({ rotulo, opcoes, aoEscolher }) {
  return (
    <select className="entrada entrada--sm arvore-adicionar" value="" aria-label={rotulo} onChange={(e) => e.target.value && aoEscolher(e.target.value)}>
      <option value="">+ {rotulo}…</option>
      {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
    </select>
  );
}

/* ---------- Organização: horas livres, ritmo, prazos, revisões, permissões ---------- */

export function Organizacao({ plano, pode = {}, aoOperar, ocupado, modelo = false }) {
  const [disp, setDisp] = useState(() => ({ ...(plano.disponibilidade || {}) }));
  const [dataAlvo, setDataAlvo] = useState(plano.dataAlvo || "");
  const [rev, setRev] = useState(() => ({ intervalos: (plano.revisao?.intervalos || [7, 15, 30]).join(", "), duracaoMin: plano.revisao?.duracaoMin || 20 }));
  const [perm, setPerm] = useState(() => ({ ...(plano.permissoesAluno || {}) }));
  const total = DIAS.reduce((s, d) => s + (Number(disp[d.k]) || 0), 0);
  const mudouDisp = DIAS.some((d) => (Number(disp[d.k]) || 0) !== (Number(plano.disponibilidade?.[d.k]) || 0));
  const intervalos = rev.intervalos.split(/[,\s]+/).map(Number).filter((n) => Number.isInteger(n) && n > 0);

  return (
    <div className="grade-organizacao">
      {!modelo && (
        <section className="cartao form" aria-labelledby="t-horas">
          <h3 id="t-horas" className="subtitulo"><Clock4 aria-hidden="true" /> Horas livres por dia</h3>
          <p className="previa-linha">É o limite diário que as metas respeitam.</p>
          <div className="grade-dias">
            {DIAS.map((d) => (
              <label key={d.k} className="campo campo--dia">
                <span>{d.nome.slice(0, 3)}</span>
                <input className="entrada num" type="number" min="0" max="960" step="15" disabled={!pode.disponibilidade} value={disp[d.k] ?? 0}
                  onChange={(e) => setDisp({ ...disp, [d.k]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`Minutos livres ${d.nome}`} />
                <small className="num">{fmtMin(Number(disp[d.k]) || 0) || "livre"}</small>
              </label>
            ))}
          </div>
          <p className="num">Total: <b>{fmtMin(total) || "0min"}</b> por semana</p>
          {pode.disponibilidade && <Botao variante="solido" tamanho="sm" disabled={!mudouDisp || ocupado} onClick={() => aoOperar({ tipo: "definirPlano", campos: { disponibilidade: Object.fromEntries(DIAS.map((d) => [d.k, Number(disp[d.k]) || 0])) } }, "Mudar as horas livres")}>Salvar horas</Botao>}
        </section>
      )}

      <section className="cartao form" aria-labelledby="t-ritmo">
        <h3 id="t-ritmo" className="subtitulo"><RefreshCw aria-hidden="true" /> Ritmo e prazo</h3>
        <Campo rotulo="Velocidade do plano" ajuda="Mais rápido encurta a duração de cada conteúdo (menos tempo por tópico).">
          <select className="entrada" value={plano.ritmo || 1} disabled={!pode.ritmo || ocupado} onChange={(e) => aoOperar({ tipo: "definirPlano", campos: { ritmo: Number(e.target.value) } }, "Mudar o ritmo")}>
            {RITMOS.map((r) => <option key={r.id} value={r.multiplicador}>{r.nome} ({String(r.multiplicador).replace(".", ",")}×)</option>)}
          </select>
        </Campo>
        <Campo rotulo="Data-alvo" ajuda={pode.prazo ? "Com data-alvo, o recálculo aumenta o tempo semanal do que for preciso para terminar a tempo." : "Definida pelo professor."}>
          <span className="linha-entrada">
            <input className="entrada" type="date" value={dataAlvo} disabled={!pode.prazo} onChange={(e) => setDataAlvo(e.target.value)} />
            {pode.prazo && <Botao variante="vidro" tamanho="sm" disabled={(dataAlvo || null) === (plano.dataAlvo || null) || ocupado} onClick={() => aoOperar({ tipo: "definirPlano", campos: { dataAlvo: dataAlvo || null } }, "Mudar a data-alvo")}>Salvar</Botao>}
          </span>
        </Campo>
      </section>

      <section className="cartao form" aria-labelledby="t-rev">
        <h3 id="t-rev" className="subtitulo"><RotateCcw aria-hidden="true" /> Revisões espaçadas</h3>
        <div className="form-linha">
          <Campo rotulo="Dias depois de concluir" ajuda="Separados por vírgula."><input className="entrada num" value={rev.intervalos} disabled={!pode.revisao} onChange={(e) => setRev({ ...rev, intervalos: e.target.value })} /></Campo>
          <Campo rotulo="Duração (min)"><input className="entrada num" type="number" min="5" max="120" value={rev.duracaoMin} disabled={!pode.revisao} onChange={(e) => setRev({ ...rev, duracaoMin: Number(e.target.value) })} /></Campo>
        </div>
        {pode.revisao && <Botao variante="vidro" tamanho="sm" disabled={!intervalos.length || ocupado} onClick={() => aoOperar({ tipo: "definirPlano", campos: { revisao: { intervalos, duracaoMin: Number(rev.duracaoMin) || 20 } } }, "Mudar as revisões")}>Salvar revisões</Botao>}
        <p className="previa-linha">Vale para os conteúdos concluídos daqui em diante.</p>
      </section>

      {pode.permissoes && (
        <section className="cartao form" aria-labelledby="t-perm">
          <h3 id="t-perm" className="subtitulo"><Settings2 aria-hidden="true" /> O que o aluno pode mudar</h3>
          {PERMISSOES_ALUNO.map((p) => (
            <label key={p.id} className="checagem">
              <input type="checkbox" checked={!!perm[p.id]} onChange={(e) => setPerm({ ...perm, [p.id]: e.target.checked })} />
              {p.nome}
            </label>
          ))}
          <Botao variante="vidro" tamanho="sm" disabled={JSON.stringify(perm) === JSON.stringify(plano.permissoesAluno || {}) || ocupado}
            onClick={() => aoOperar({ tipo: "definirPlano", campos: { permissoesAluno: perm } }, "Mudar as permissões do aluno")}>Salvar permissões</Botao>
        </section>
      )}
    </div>
  );
}

/* ---------- Revisões ---------- */

export function ListaRevisoes({ v, podeIgnorar }) {
  const { s, ind } = useApp();
  const { executar, ocupado, erro } = useAcao();
  const linhas = (v.revisoes || []).flatMap((r) => r.sessoes.map((x) => ({
    r, dia: x.dia, status: x.status === "agendada" && x.dia < v.hoje ? "atrasada" : x.status, quando: x.realizadaEm || x.ignoradaEm,
  }))).sort((a, b) => a.dia.localeCompare(b.dia));
  const grupos = [
    { k: "atrasada", nome: "Atrasadas", tom: "perigo" },
    { k: "agendada", nome: "Agendadas" },
    { k: "realizada", nome: "Realizadas" },
    { k: "ignorada", nome: "Ignoradas" },
  ];
  if (!linhas.length) return <div className="cartao"><Vazio icone={RotateCcw} titulo="Nenhuma revisão ainda" texto="Ao concluir um conteúdo, as revisões são agendadas automaticamente." /></div>;
  return (
    <>
      <MensagemErro erro={erro} />
      {grupos.map((g) => {
        const lista = linhas.filter((l) => l.status === g.k);
        if (!lista.length) return null;
        const mostrar = g.k === "realizada" || g.k === "ignorada" ? lista.slice(-30).reverse() : lista;
        return (
          <section key={g.k} className="secao">
            <span className={`eyebrow${g.tom ? " perigo" : ""}`}>{g.nome} · {lista.length}</span>
            <ul className="lista-simples">
              {mostrar.map((l) => (
                <li key={`${l.r.id}|${l.dia}`} className="cartao linha-revisao">
                  <span className="num">{fmtDataCurta(l.dia)}</span>
                  <span className="celula-conteudo"><PontoMateria materiaId={l.r.materiaId} /><span><small>{ind.nomeMateria(l.r.materiaId)}</small>{ind.nomeTopico(l.r.topicoId)}{l.r.subtopicoId ? ` · ${ind.nomeSubtopico(l.r.subtopicoId)}` : ""}</span></span>
                  <span className="num">{fmtMin(l.r.duracaoMin)}</span>
                  {(g.k === "agendada" || g.k === "atrasada") && podeIgnorar
                    ? <Botao variante="texto" tamanho="sm" disabled={ocupado} onClick={() => executar(() => s.estudo.marcarRevisao(v.aluno.id, l.r.id, l.dia, "ignorada"))}>Ignorar</Botao>
                    : g.k === "ignorada" && podeIgnorar
                      ? <Botao variante="texto" tamanho="sm" disabled={ocupado} onClick={() => executar(() => s.estudo.marcarRevisao(v.aluno.id, l.r.id, l.dia, "agendada"))}>Reativar</Botao>
                      : <span className="previa-linha">{l.quando ? fmtDataCurta(l.quando) : ""}</span>}
                </li>
              ))}
            </ul>
          </section>
        );
      })}
    </>
  );
}

/* ---------- Histórico de alterações ---------- */

const ENTIDADES = { plano: "Plano", semana: "Semana", estudo: "Estudo", questoes: "Questões", simulado: "Simulado", aluno: "Cadastro", redacao: "Redação" };

export function Historico({ alunoId, entidades }) {
  const logs = useLogs(alunoId);
  const [filtro, setFiltro] = useState("");
  if (!logs) return <Carregando />;
  const lista = logs.filter((l) => (!entidades || entidades.includes(l.entidade)) && (!filtro || l.entidade === filtro));
  const usadas = [...new Set(logs.map((l) => l.entidade))].filter((e) => !entidades || entidades.includes(e));
  return (
    <>
      {usadas.length > 1 && (
        <div className="filtros" role="tablist" aria-label="Filtrar histórico">
          {[["", "Tudo"], ...usadas.map((e) => [e, ENTIDADES[e] || e])].map(([k, nome]) => (
            <button key={k || "tudo"} type="button" role="tab" className="filtro" aria-selected={filtro === k} onClick={() => setFiltro(k)}>{nome}</button>
          ))}
        </div>
      )}
      {lista.length === 0 ? <div className="cartao"><Vazio icone={History} titulo="Nenhuma alteração registrada" /></div> : (
        <div className="tabela-rolagem">
          <table className="tabela">
            <thead><tr><th>Quando</th><th>Quem</th><th>O que mudou</th><th>Antes</th><th>Depois</th><th>Motivo</th></tr></thead>
            <tbody>
              {lista.map((l) => (
                <tr key={l.id}>
                  <td className="num">{quando(l.em)}</td>
                  <td>{l.autorNome}<small className="bloco-pequeno">{l.papel === "moderador" ? "moderador" : "aluno"}</small></td>
                  <td>{l.descricao}</td>
                  <td className="celula-valor">{fmtValorLog(l.antes)}</td>
                  <td className="celula-valor">{fmtValorLog(l.depois)}</td>
                  <td>{l.motivo || "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </>
  );
}

/* ---------- Tela completa do plano de um aluno ---------- */

export function PainelPlano({ v, modo }) {
  const { s } = useApp();
  const moderador = modo === "moderador";
  const perm = v.plano?.permissoesAluno || {};
  const [aba, setAba] = useState("cronograma");
  const edicao = useEdicaoPlano(v.aluno?.id);
  const reordenar = useEdicaoPlano(v.aluno?.id, { confirmar: moderador });
  const acao = useAcao();
  const [recalc, setRecalc] = useState(false);

  const pode = moderador
    ? { estrutura: true, reordenar: true, parametros: true, carga: true, disponibilidade: true, ritmo: true, prazo: true, revisao: true, permissoes: true, concluir: true, recalcular: true }
    : { reordenar: !!perm.reordenar, disponibilidade: !!perm.disponibilidade, ritmo: !!perm.ritmo, concluir: !!perm.concluirItens, recalcular: !!perm.recalcular };

  const operar = (op, titulo) => {
    const soOrdem = ["moverMateria", "moverTopico", "moverSubtopico"].includes(op.tipo);
    return (soOrdem ? reordenar : edicao).propor(op, titulo);
  };

  const abas = [
    { k: "cronograma", label: "Cronograma", icone: CalendarClock },
    { k: "materias", label: "Matérias e conteúdos", icone: ListTree },
    { k: "organizacao", label: "Organização", icone: Clock4 },
    { k: "revisoes", label: "Revisões", icone: RotateCcw },
    { k: "historico", label: "Histórico", icone: History },
  ];

  return (
    <>
      <ResumoPlano v={v} acoes={pode.recalcular && (
        <Botao variante={v.atrasos.quantidade ? "solido" : "vidro"} icone={RefreshCw} disabled={acao.ocupado} onClick={() => setRecalc(true)}>Recalcular plano</Botao>
      )} />
      <MensagemErro erro={acao.erro || reordenar.erro} />
      <Abas rotulo="Seções do plano" itens={abas} ativa={aba} aoMudar={setAba} />
      {aba === "cronograma" && (
        <Cronograma v={v} podeConcluir={pode.concluir} ocupado={acao.ocupado}
          aoConcluir={(it) => acao.executar(() => s.planos.concluirItem(v.aluno.id, it.itemId))}
          aoReabrir={(it) => acao.executar(() => s.planos.reabrirItem(v.aluno.id, it.itemId))} />
      )}
      {aba === "materias" && <ArvoreMaterias plano={v.plano} pode={pode} aoOperar={operar} status={v.status} progresso={v.progressoPlano} ocupado={edicao.ocupado || reordenar.ocupado} />}
      {aba === "organizacao" && <Organizacao plano={v.plano} pode={pode} aoOperar={operar} ocupado={edicao.ocupado} />}
      {aba === "revisoes" && <ListaRevisoes v={v} podeIgnorar={moderador || !!perm.concluirItens} />}
      {aba === "historico" && <Historico alunoId={v.aluno.id} entidades={["plano", "semana", "estudo"]} />}
      {edicao.dialogo}
      {reordenar.dialogo}
      <Confirmar aberto={recalc} titulo="Recalcular o plano" rotulo="Recalcular" ocupado={acao.ocupado} erro={acao.erro}
        aoFechar={() => setRecalc(false)} aoConfirmar={() => acao.executar(async () => { await s.planos.recalcular(v.aluno.id); setRecalc(false); })}>
        <p className="texto-dialogo">
          O que falta é redistribuído a partir de hoje, considerando as horas livres, a velocidade, a prioridade de cada matéria{v.plano.dataAlvo ? " e a data-alvo" : ""}.
          O que já foi concluído e o histórico de estudo continuam iguais. A semana atual é refeita de hoje em diante.
        </p>
      </Confirmar>
    </>
  );
}
