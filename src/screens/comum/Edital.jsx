/* Edital: o plano de estudos em blocos. Matéria → tópicos (a unidade de
   estudo, que vira meta) → subtópicos (orientação dentro do tópico).
   Serve ao aluno (Edital), ao moderador (aba Edital de cada aluno) e às
   jornadas (plano geral de um vestibular). O que cada um pode mexer vem de
   `pode`; as permissões do aluno vêm do plano. */

import { useEffect, useMemo, useRef, useState } from "react";
import {
  AlertTriangle, ArrowDown, ArrowUp, CalendarClock, Check, Clock4, History, Minus, Plus, RefreshCw, Settings2, Trash2, Undo2, X,
} from "lucide-react";
import { DIAS, fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta, fmtDataLonga } from "../../core/datas.js";
import {
  CARGA_PADRAO, MINUTOS_MAX, MINUTOS_MIN, PERMISSOES_ALUNO, PRIORIDADES, RITMOS, capacidadeSemanal, duracaoDaMeta, idItem, itensDoPlano, nomeRitmo, topicosEmOrdem,
} from "../../core/plano.js";
import { PESO_MAX, PESO_MIN, jornadaEfetiva, pesosDoPlano } from "../../core/jornada.js";
import { horariosDoPlano } from "../../core/horario.js";
import { ESTRATEGIAS_ATRASO } from "../../core/motorMetas.js";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useLogs, useModelos, useVistos } from "../../state/hooks.js";
import { Barra, Botao, Campo, Carregando, Confirmar, Dialogo, MensagemErro, Vazio } from "../../ui/ui.jsx";
import { quando } from "../aluno/Avisos.jsx";
import { FilaTopicos } from "./FilaTopicos.jsx";
import { DialogoRevisao } from "./Revisoes.jsx";

const pctTxt = (v) => `${String(v).replace(".", ",")}%`;
const plural = (n, um, varios) => `${n} ${n === 1 ? um : varios}`;

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
              Essa alteração modificará <b>{pedido.previa.conteudosRemarcados}</b> {pedido.previa.conteudosRemarcados === 1 ? "tópico futuro" : "tópicos futuros"} do cronograma
              {pedido.previa.conteudosRetirados > 0 && <>, retira <b>{pedido.previa.conteudosRetirados}</b> {pedido.previa.conteudosRetirados === 1 ? "tópico pendente" : "tópicos pendentes"}</>}
              {pedido.previa.conteudosIncluidos > 0 && <>, inclui <b>{pedido.previa.conteudosIncluidos}</b> {pedido.previa.conteudosIncluidos === 1 ? "tópico novo" : "tópicos novos"}</>}.
              {" "}O que já foi estudado fica preservado{pedido.previa.concluidosPreservados ? ` (${plural(pedido.previa.concluidosPreservados, "tópico visto", "tópicos vistos")})` : ""}.
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
    if (DIAS.every((d) => d.k in v)) return DIAS.map((d) => `${d.nome.slice(0, 3).toLowerCase()} ${fmtMin(v[d.k] || 0)}`).join(", ");
    if ("intervalos" in v) return `a cada ${v.intervalos.join("/")} dias, ${v.duracaoMin} min`;
    return Object.entries(v).map(([k, x]) => `${k}: ${typeof x === "object" ? JSON.stringify(x) : x}`).join(", ");
  }
  if (/^\d{4}-\d{2}-\d{2}$/.test(String(v))) return fmtDataLonga(v);
  return String(v);
}

/* ---------- Resumo em uma linha ---------- */

export function ResumoEdital({ v, acoes }) {
  const { ind } = useApp();
  const p = v.progressoPlano;
  const a = v.atrasos;
  const plano = v.plano;
  return (
    <section className="cartao resumo-edital" aria-label="Resumo do edital">
      <div className="resumo-edital-linha">
        <strong className="resumo-edital-pct num">{pctTxt(p.pct)}</strong>
        <div className="resumo-edital-barra">
          <Barra valor={p.pct} altura={8} />
          <small>
            {p.vistos} de {plural(p.total, "tópico visto", "tópicos vistos")}
            {" · "}{plano.fimPrevisto ? <>término previsto em <b>{fmtDataLonga(plano.fimPrevisto)}</b></> : "sem previsão de término"}
            {plano.dataAlvo && plano.fimPrevisto > plano.dataAlvo ? <span className="txt-erro"> · depois da data-alvo</span> : null}
          </small>
        </div>
        {acoes && <div className="linha-acoes">{acoes}</div>}
      </div>
      {a.quantidade > 0 && (
        <p className="aviso aviso--erro" role="note">
          <AlertTriangle aria-hidden="true" />
          {plural(a.quantidade, "tópico passou", "tópicos passaram")} da data prevista ({a.materias.map((m) => ind?.nomeMateria(m)).join(", ")}).
          Recalcular redistribui o que falta a partir de hoje, sem apagar o que já foi feito.
        </p>
      )}
    </section>
  );
}

/* ---------- Blocos de matérias ---------- */

/* Cada matéria: tópicos, % vista e o tempo de conteúdo (as horas-base dos
   tópicos): no aluno, quanto falta; na jornada, o total e o peso. */
export function BlocosMaterias({ plano, progresso, selecionada, aoSelecionar, mostrarOcultas = false }) {
  const { ind } = useApp();
  const materias = (plano.materias || []).filter((m) => ind.materia(m.materiaId) && (mostrarOcultas || m.ativa !== false));
  const conteudo = useMemo(() => {
    const r = {};
    itensDoPlano({ ...plano, materias: (plano.materias || []).map((m) => ({ ...m, ativa: true })) }, ind).forEach((it) => { r[it.materiaId] = (r[it.materiaId] || 0) + it.duracao; });
    return r;
  }, [plano, ind]);
  const pesos = pesosDoPlano(plano);
  if (!materias.length) return <div className="cartao"><Vazio icone={Settings2} titulo="Nenhuma matéria no edital" /></div>;
  return (
    <div className="blocos-materias">
      {materias.map((m) => {
        const pm = progresso?.porMateria.find((x) => x.materiaId === m.materiaId);
        const topicos = (m.topicos || []).filter((t) => ind.topico(t.topicoId)).length;
        const oculta = m.ativa === false;
        const falta = pm ? Math.max(0, Math.round(pm.total - pm.feito)) : null;
        return (
          <button key={m.materiaId} type="button" className={`bloco-materia${oculta ? " bloco-materia--oculta" : ""}`}
            style={{ "--cor": ind.corDaMateria(m.materiaId) }} aria-pressed={selecionada === m.materiaId}
            onClick={() => aoSelecionar(selecionada === m.materiaId ? null : m.materiaId)}>
            <span className="bloco-materia-nome">{ind.nomeMateria(m.materiaId)}</span>
            <span className="bloco-materia-info">
              {plural(topicos, "tópico", "tópicos")}{pm?.vistos ? ` · ${pm.vistos} ${pm.vistos === 1 ? "visto" : "vistos"}` : ""}
              {pm?.atrasados ? <b className="txt-erro"> · {pm.atrasados} em atraso</b> : null}
            </span>
            {pm && <span className="bloco-materia-barra"><Barra valor={pm.pct} cor="var(--cor)" /><small className="num">{pctTxt(pm.pct)}</small></span>}
            <span className="bloco-materia-rodape">
              {oculta ? <span className="etiqueta">Oculta para o aluno</span>
                : pm ? <span className="num">{falta ? `faltam ${fmtMin(falta)} de estudo` : "tudo visto"}</span>
                  : <span className="num">{fmtMin(conteudo[m.materiaId] || 0)} de conteúdo · peso {pesos[m.materiaId]}</span>}
            </span>
          </button>
        );
      })}
    </div>
  );
}

/* ---------- Tópicos de uma matéria ---------- */

/* Tempo em minutos, livre (tocar para mudar; vazio volta ao padrão). */
function CargaEditor({ valor, padrao, aoSalvar, rotulo, titulo = "Mudar o tempo de estudo" }) {
  const [editando, setEditando] = useState(false);
  const [x, setX] = useState(valor ?? "");
  const salvar = () => {
    const n = x === "" ? null : Number(x);
    if (n != null && !minutosOk(n)) return;
    setEditando(false);
    if (n !== (valor ?? null)) aoSalvar(n);
  };
  if (!editando) return <button type="button" className="carga" onClick={() => { setX(valor ?? ""); setEditando(true); }} title={titulo}>{fmtMin(valor ?? padrao)}{valor != null && <i aria-label="(personalizado)">*</i>}</button>;
  return (
    <span className="carga-edicao">
      <input className={`entrada num${x !== "" && !minutosOk(Number(x)) ? " entrada--erro" : ""}`} type="number" min={MINUTOS_MIN} max={MINUTOS_MAX} step="1" aria-label={rotulo} value={x} placeholder={String(padrao)} autoFocus
        onChange={(e) => setX(e.target.value)} onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setEditando(false); }} />
      <small>min</small>
      <button type="button" className="icone-btn" aria-label="Salvar" onClick={salvar}><Check /></button>
      <button type="button" className="icone-btn" aria-label="Cancelar" onClick={() => setEditando(false)}><Undo2 /></button>
    </span>
  );
}

function AdicionarSelect({ rotulo, opcoes, aoEscolher }) {
  return (
    <select className="entrada entrada--sm adicionar-select" value="" aria-label={rotulo} onChange={(e) => e.target.value && aoEscolher(e.target.value)}>
      <option value="">+ {rotulo}…</option>
      {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome}</option>)}
    </select>
  );
}

// "+ Novo tópico": abre um campo; Enter salva, Esc cancela
function NovoNome({ rotulo, aoCriar, ocupado }) {
  const [aberto, setAberto] = useState(false);
  const [nome, setNome] = useState("");
  const [erro, setErro] = useState(null);
  const salvar = async () => {
    if (!nome.trim()) return;
    setErro(null);
    try { await aoCriar(nome.trim()); setNome(""); setAberto(false); } catch (e) { setErro(e); }
  };
  if (!aberto) return <Botao variante="texto" tamanho="sm" icone={Plus} onClick={() => setAberto(true)}>{rotulo}</Botao>;
  return (
    <div className="novo-nome">
      <input className="entrada entrada--sm" value={nome} autoFocus aria-label={rotulo} placeholder="Nome"
        onChange={(e) => setNome(e.target.value)}
        onKeyDown={(e) => { if (e.key === "Enter") salvar(); if (e.key === "Escape") setAberto(false); }} />
      <Botao variante="solido" tamanho="sm" disabled={!nome.trim() || ocupado} onClick={salvar}>Criar</Botao>
      <Botao variante="texto" tamanho="sm" onClick={() => { setAberto(false); setNome(""); }}>Cancelar</Botao>
      <MensagemErro erro={erro} />
    </div>
  );
}

/* pode: { reordenar, cortar, vistos, estrutura, criar, carga, tempos, revisoes }
   Com `v` e `aoOrdenar` (edital de um aluno), os tópicos aparecem como a
   fila de estudo dele (FilaTopicos); sem isso (jornada), na ordem do plano. */
export function TopicosDaMateria({
  plano, materiaId, pode = {}, v, vistos, aoOperar, aoCortar, aoDescortar, aoMarcarVisto, aoCriarTopico, aoCriarSubtopico,
  aoOrdenar, aoRevisao, ocupado, aoFechar,
}) {
  const { ind } = useApp();
  const ref = useRef(null);
  const itens = useMemo(() => new Map(itensDoPlano({ ...plano, materias: plano.materias.map((m) => ({ ...m, ativa: true })) }, ind).map((it) => [it.itemId, it])), [plano, ind]);
  useEffect(() => { ref.current?.scrollIntoView({ behavior: "smooth", block: "start" }); }, [materiaId]);
  const m = plano.materias.find((x) => x.materiaId === materiaId);
  if (!m) return null;
  const topicos = topicosEmOrdem(plano, m).filter((t) => ind.topico(t.topicoId));
  const fora = ind.topicosDaMateria(materiaId).filter((t) => !m.topicos.some((x) => x.topicoId === t.id));
  const op = (o, titulo) => aoOperar(o, titulo);
  const nomeM = ind.nomeMateria(materiaId);
  const comoFila = !!(v && aoOrdenar);

  // tempo do tópico: na jornada, a hora-base; no aluno, o ajuste dele por cima dela
  const carga = (t) => pode.carga && (comoFila ? (
    <CargaEditor valor={plano.tempoTopico?.[t.topicoId] ?? null} padrao={t.cargaMin ?? ind.topico(t.topicoId)?.cargaMin ?? CARGA_PADRAO} rotulo={`Minutos de estudo de ${ind.nomeTopico(t.topicoId)}`}
      aoSalvar={(c) => op({ tipo: "definirTempoTopico", materiaId, topicoId: t.topicoId, minutos: c }, "Mudar o tempo do tópico")} />
  ) : (
    <CargaEditor valor={t.cargaMin} padrao={ind.topico(t.topicoId)?.cargaMin ?? CARGA_PADRAO} rotulo={`Minutos de estudo de ${ind.nomeTopico(t.topicoId)}`}
      aoSalvar={(c) => op({ tipo: "definirCarga", materiaId, topicoId: t.topicoId, cargaMin: c }, "Mudar o tempo de estudo")} />
  ));
  const subtopicos = (t) => {
    const subs = (t.subtopicos || []).filter((x) => ind.subtopico(x.subtopicoId));
    const subsFora = ind.subtopicosDoTopico(t.topicoId).filter((x) => !t.subtopicos?.some((y) => y.subtopicoId === x.id));
    const nomeT = ind.nomeTopico(t.topicoId);
    if (!(subs.length > 0 || pode.estrutura || pode.criar)) return null;
    return (
      <ul className="lista-subtopicos" aria-label={`Orientação de ${nomeT}`}>
        {subs.map((x) => {
          const nomeS = ind.nomeSubtopico(x.subtopicoId);
          return (
            <li key={x.subtopicoId}>
              {pode.vistos
                ? <label className="sub-visto"><input type="checkbox" checked={!!vistos?.[x.subtopicoId]} disabled={ocupado} onChange={(e) => aoMarcarVisto(x.subtopicoId, e.target.checked)} /><span>{nomeS}</span></label>
                : <span className="sub-nome">{nomeS}</span>}
              {pode.estrutura && <button type="button" className="icone-btn icone-btn--mini" aria-label={`Tirar ${nomeS}`} disabled={ocupado} onClick={() => op({ tipo: "removerSubtopico", materiaId, topicoId: t.topicoId, subtopicoId: x.subtopicoId }, `Tirar ${nomeS}`)}><X /></button>}
            </li>
          );
        })}
        {(pode.estrutura && subsFora.length > 0) || pode.criar ? (
          <li className="lista-subtopicos-acoes">
            {pode.estrutura && subsFora.length > 0 && <AdicionarSelect rotulo="Subtópico existente" opcoes={subsFora} aoEscolher={(id) => op({ tipo: "adicionarSubtopico", materiaId, topicoId: t.topicoId, subtopicoId: id }, "Incluir subtópico")} />}
            {pode.criar && <NovoNome rotulo="Novo subtópico" ocupado={ocupado} aoCriar={(nome) => aoCriarSubtopico(t.topicoId, nome)} />}
          </li>
        ) : null}
      </ul>
    );
  };

  return (
    <section ref={ref} className="cartao painel-topicos" style={{ "--cor": ind.corDaMateria(materiaId) }} aria-label={`Tópicos de ${nomeM}`}>
      <header className="painel-topicos-cabeca">
        <div>
          <h2 className="subtitulo">{nomeM}</h2>
          <p className="previa-linha">
            {comoFila ? `Fila de estudo · ${plural(topicos.length, "tópico", "tópicos")}${pode.reordenar ? " · arraste para mudar a ordem" : ""}` : `${plural(topicos.length, "tópico", "tópicos")} na ordem de estudo`}
            {m.ativa === false ? " · oculta para o aluno (não gera metas)" : ""}
          </p>
          {comoFila && (
            <p className="previa-linha duracao-meta">
              Cada meta:{" "}
              {pode.tempos ? (
                <CargaEditor valor={plano.duracaoMeta?.[materiaId] ?? null} padrao={m.maxSessao ?? 60} rotulo={`Minutos de cada meta de ${nomeM}`} titulo="Mudar a duração das metas desta matéria"
                  aoSalvar={(c) => op({ tipo: "definirDuracaoMeta", materiaId, minutos: c }, "Mudar a duração das metas")} />
              ) : <b className="num">{fmtMin(duracaoDaMeta(plano, m))}</b>}
            </p>
          )}
        </div>
        {aoFechar && <button type="button" className="icone-btn" aria-label="Fechar" onClick={aoFechar}><X /></button>}
      </header>

      {topicos.length === 0 && <p className="previa-linha">Nenhum tópico nesta matéria ainda.</p>}
      {comoFila ? (
        <FilaTopicos materiaId={materiaId} topicos={topicos} itens={itens} v={v} pode={pode} ocupado={ocupado}
          aoOrdenar={(ordem) => aoOrdenar(materiaId, ordem)} aoCortar={aoCortar} aoReverDoZero={aoDescortar} aoRevisao={aoRevisao}
          aoOperar={op} renderSubtopicos={subtopicos} carga={pode.carga ? carga : null} />
      ) : (
        <ol className="lista-topicos">
          {topicos.map((t, i) => {
            const nomeT = ind.nomeTopico(t.topicoId);
            return (
              <li key={t.topicoId} className="topico">
                <div className="topico-cabeca">
                  <span className="topico-num num" aria-hidden="true">{i + 1}</span>
                  <div className="topico-texto">
                    <strong>{nomeT}</strong>
                    <small>{fmtMin(itens.get(idItem(t.topicoId))?.duracao || 0)} de estudo</small>
                  </div>
                  <span className="topico-acoes">
                    {carga(t)}
                    {pode.reordenar && <>
                      <button type="button" className="icone-btn" aria-label={`Subir ${nomeT}`} disabled={i === 0 || ocupado} onClick={() => op({ tipo: "moverTopico", materiaId, topicoId: t.topicoId, passo: -1 }, "Mudar a ordem")}><ArrowUp /></button>
                      <button type="button" className="icone-btn" aria-label={`Descer ${nomeT}`} disabled={i === topicos.length - 1 || ocupado} onClick={() => op({ tipo: "moverTopico", materiaId, topicoId: t.topicoId, passo: 1 }, "Mudar a ordem")}><ArrowDown /></button>
                    </>}
                    {pode.estrutura && <button type="button" className="icone-btn" aria-label={`Tirar ${nomeT} do edital`} title="Tirar do edital" disabled={ocupado} onClick={() => op({ tipo: "removerTopico", materiaId, topicoId: t.topicoId }, `Tirar ${nomeT} do edital`)}><Trash2 /></button>}
                  </span>
                </div>
                {subtopicos(t)}
              </li>
            );
          })}
        </ol>
      )}
      {(pode.criar || (pode.estrutura && fora.length > 0)) && (
        <div className="painel-topicos-rodape">
          {pode.criar && <NovoNome rotulo="Novo tópico" ocupado={ocupado} aoCriar={aoCriarTopico} />}
          {pode.estrutura && fora.length > 0 && <AdicionarSelect rotulo="Tópico existente" opcoes={fora} aoEscolher={(id) => op({ tipo: "adicionarTopico", materiaId, topicoId: id }, "Incluir tópico")} />}
        </div>
      )}
    </section>
  );
}

/* ---------- Peso e metas por matéria (rascunho + aplicar de uma vez) ---------- */

const minutosOk = (v) => Number.isInteger(v) && v >= MINUTOS_MIN && v <= MINUTOS_MAX;
const ROTULO_CAMPO = { peso: "peso", maxSessao: "duração", prioridade: "prioridade", ritmo: "velocidade", ativa: "aparece" };

/* Cada matéria: se aparece, o PESO (1 a 10: a fatia de cada matéria nas
   metas é o peso dela dividido pela soma dos pesos), de quanto tempo é cada
   meta, prioridade (desempate) e velocidade. Mude o que quiser e aplique
   tudo junto. Com `efetiva` (edital de um aluno), o que foi mudado só para
   ele aparece marcado, com "voltar ao da jornada". */
export function TabelaIncidencia({ plano, aoAplicar, ocupado, capacidade, efetiva, aoVoltar }) {
  const { ind } = useApp();
  const [rascunho, setRascunho] = useState({});
  useEffect(() => setRascunho({}), [plano]); // aplicado (ou mudou por fora): começa de novo
  const doAluno = capacidade != null; // edital de um aluno (senão, a jornada)
  const materias = (plano.materias || []).filter((m) => ind.materia(m.materiaId));
  const pesos = pesosDoPlano(plano);
  const camposDe = (m) => ({ peso: pesos[m.materiaId], maxSessao: duracaoDaMeta(plano, m), prioridade: m.prioridade ?? 2, ritmo: m.ritmo ?? 1, ativa: m.ativa !== false });
  // só vale o que ainda difere do plano (depois de aplicar, o rascunho some sozinho)
  const pendentes = Object.fromEntries(materias.map((m) => {
    const orig = camposDe(m);
    const campos = Object.fromEntries(Object.entries(rascunho[m.materiaId] || {}).filter(([k, x]) => x !== orig[k]));
    return [m.materiaId, campos];
  }).filter(([, c]) => Object.keys(c).length));
  const valor = (m) => ({ ...camposDe(m), ...(pendentes[m.materiaId] || {}) });
  const mudar = (m, campos) => setRascunho((r) => ({ ...r, [m.materiaId]: { ...(pendentes[m.materiaId] || {}), ...campos } }));
  // no aluno, a duração da meta é um ajuste dele (duracaoMeta), por cima da jornada
  const ops = Object.entries(pendentes).flatMap(([materiaId, { maxSessao, ...campos }]) => [
    ...(Object.keys(campos).length ? [{ tipo: "definirMateria", materiaId, campos }] : []),
    ...(maxSessao === undefined ? [] : doAluno ? [{ tipo: "definirDuracaoMeta", materiaId, minutos: maxSessao }] : [{ tipo: "definirMateria", materiaId, campos: { maxSessao } }]),
  ]);
  const invalida = Object.values(pendentes).some((c) => c.maxSessao !== undefined && !minutosOk(c.maxSessao));
  const somaPesos = materias.reduce((acc, m) => { const x = valor(m); return acc + (x.ativa ? x.peso : 0); }, 0);
  const fora = ind.materias.filter((m) => !plano.materias?.some((x) => x.materiaId === m.id));
  const origem = (materiaId, campo) => efetiva?.materias.find((x) => x.materiaId === materiaId)?.campos[campo];
  const marca = (m, campo) => {
    const o = origem(m.materiaId, campo);
    if (!aoVoltar || o?.origem !== "sobrescrito" || o.daJornada == null) return null;
    return (
      <button type="button" className="marca-sobrescrito" disabled={ocupado} title={`Só deste aluno. Na jornada: ${fmtValorLog(o.daJornada)}. Toque para voltar ao da jornada.`}
        aria-label={`${ROTULO_CAMPO[campo]} de ${ind.nomeMateria(m.materiaId)} foi mudado só para este aluno; voltar ao da jornada`}
        onClick={() => aoVoltar(m.materiaId, campo)}><Undo2 /></button>
    );
  };

  return (
    <section className="secao" aria-labelledby="t-incidencia">
      <div className="secao-cabeca">
        <h2 id="t-incidencia" className="subtitulo">Peso de cada matéria nas metas</h2>
        <p className="previa-linha">
          Quanto maior o peso, mais a matéria aparece nas metas (engenharia: Matemática 10, Filosofia 2); a prioridade só desempata.
          Cada meta dura o que você definir, em minutos. {doAluno ? "O horário do aluno é dividido pelos pesos." : "O tempo se encaixa no horário de cada aluno."}
        </p>
      </div>
      <div className="tabela-rolagem">
        <table className="tabela tabela-incidencia tabela--cartoes">
          <thead><tr><th>Matéria</th><th>Aparece</th><th>Peso</th><th>Cada meta</th><th className="num">Fatia</th><th>Prioridade</th><th>Velocidade</th></tr></thead>
          <tbody>
            {materias.map((m) => {
              const x = valor(m);
              const mudou = !!pendentes[m.materiaId];
              const nome = ind.nomeMateria(m.materiaId);
              const fatia = x.ativa && somaPesos ? x.peso / somaPesos : 0;
              const minutos = doAluno ? Math.round(fatia * capacidade) : 0;
              return (
                <tr key={m.materiaId} className={`${mudou ? "linha-mudou" : ""}${x.ativa ? "" : " linha-oculta"}`}>
                  <td className="celula-principal"><span className="celula-conteudo"><i className="ponto-materia" style={{ "--cor": ind.corDaMateria(m.materiaId) }} aria-hidden="true" /><strong>{nome}</strong>{mudou && <small className="etiqueta etiqueta--rev">alterada</small>}</span></td>
                  <td data-rotulo="Aparece">
                    <label className="interruptor"><input type="checkbox" checked={x.ativa} onChange={(e) => mudar(m, { ativa: e.target.checked })} aria-label={`${nome} aparece para o aluno`} /><span>{x.ativa ? "Sim" : "Oculta"}</span></label>
                    {marca(m, "ativa")}
                  </td>
                  <td data-rotulo="Peso">
                    <span className="passo">
                      <button type="button" className="icone-btn" aria-label={`Menos peso para ${nome}`} disabled={x.peso <= PESO_MIN} onClick={() => mudar(m, { peso: x.peso - 1 })}><Minus /></button>
                      <b className="num" aria-live="polite">{x.peso}</b>
                      <button type="button" className="icone-btn" aria-label={`Mais peso para ${nome}`} disabled={x.peso >= PESO_MAX} onClick={() => mudar(m, { peso: x.peso + 1 })}><Plus /></button>
                    </span>
                    {marca(m, "peso")}
                  </td>
                  <td data-rotulo="Cada meta">
                    <span className="minutos">
                      <input className={`entrada entrada--sm num${minutosOk(x.maxSessao) ? "" : " entrada--erro"}`} type="number" min={MINUTOS_MIN} max={MINUTOS_MAX} step="1"
                        value={x.maxSessao} aria-label={`Minutos de cada meta de ${nome}`} onChange={(e) => mudar(m, { maxSessao: e.target.value === "" ? "" : Number(e.target.value) })} />
                      <small>min</small>
                    </span>
                    {marca(m, "maxSessao")}
                  </td>
                  <td className="num" data-rotulo="Fatia">{x.ativa ? <>{Math.round(fatia * 100)}%{doAluno && <small className="bloco-pequeno">≈ {fmtMin(minutos)}/semana</small>}</> : "—"}</td>
                  <td data-rotulo="Prioridade">
                    <select className="entrada entrada--sm" value={x.prioridade} aria-label={`Prioridade de ${nome}`} onChange={(e) => mudar(m, { prioridade: Number(e.target.value) })}>
                      {PRIORIDADES.map((p) => <option key={p.id} value={p.id}>{p.nome}</option>)}
                    </select>
                    {marca(m, "prioridade")}
                  </td>
                  <td data-rotulo="Velocidade">
                    <select className="entrada entrada--sm" value={x.ritmo} aria-label={`Velocidade de ${nome}`} onChange={(e) => mudar(m, { ritmo: Number(e.target.value) })}>
                      {RITMOS.map((r) => <option key={r.id} value={r.multiplicador}>{r.nome}</option>)}
                    </select>
                    {marca(m, "ritmo")}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
      <div className="barra-incidencia">
        <span className="num">
          {invalida ? <span className="txt-erro">Duração: minutos de {MINUTOS_MIN} a {MINUTOS_MAX}</span>
            : doAluno ? <>Horário do aluno: <b>{fmtMin(capacidade)}</b> por semana, dividido pelo peso</> : null}
        </span>
        {fora.length > 0 && <AdicionarSelect rotulo="Incluir matéria" opcoes={fora} aoEscolher={(id) => aoAplicar([{ tipo: "adicionarMateria", materiaId: id }], `Incluir ${ind.nomeMateria(id)}`)} />}
        {ops.length > 0 && <>
          <Botao variante="texto" tamanho="sm" onClick={() => setRascunho({})}>Descartar</Botao>
          <Botao variante="solido" tamanho="sm" disabled={ocupado || invalida} onClick={() => aoAplicar(ops, "Peso e metas por matéria")}>Aplicar {plural(Object.keys(pendentes).length, "alteração", "alterações")}</Botao>
        </>}
      </div>
    </section>
  );
}

/* ---------- Rotina e regras: horas livres, ritmo, prazo, atraso, permissões ---------- */

/* Horas livres por dia, com a data a partir da qual valem: cada mudança é
   uma versão nova (as antigas explicam as metas que já passaram). */
function HorasLivres({ plano, podeEditar, aoSalvar, ocupado }) {
  const { hoje } = useApp();
  const [disp, setDisp] = useState(() => ({ ...(plano.disponibilidade || {}) }));
  const [desde, setDesde] = useState(hoje);
  const total = DIAS.reduce((s, d) => s + (Number(disp[d.k]) || 0), 0);
  const mudou = DIAS.some((d) => (Number(disp[d.k]) || 0) !== (Number(plano.disponibilidade?.[d.k]) || 0)) || desde !== hoje;
  const versoes = horariosDoPlano(plano);
  return (
    <section className="form" aria-labelledby="t-horas">
      <h3 id="t-horas" className="subtitulo subtitulo--sm"><Clock4 aria-hidden="true" /> Horas livres por dia</h3>
      <p className="previa-linha">É o limite diário que as metas respeitam. Revisões entram primeiro; se passarem do dia, aparece um aviso (nada é cortado).</p>
      <div className="grade-dias">
        {DIAS.map((d) => (
          <label key={d.k} className="campo campo--dia">
            <span>{d.nome.slice(0, 3)}</span>
            <input className="entrada num" type="number" min="0" max="960" step="15" disabled={!podeEditar} value={disp[d.k] ?? 0}
              onChange={(e) => setDisp({ ...disp, [d.k]: Math.max(0, Number(e.target.value) || 0) })} aria-label={`Minutos livres ${d.nome}`} />
            <small className="num">{Number(disp[d.k]) ? fmtMin(Number(disp[d.k])) : "livre"}</small>
          </label>
        ))}
      </div>
      <p className="num">Total: <b>{fmtMin(total)}</b> por semana</p>
      {podeEditar && (
        <div className="linha-entrada">
          <Campo rotulo="Vale a partir de"><input className="entrada" type="date" min={hoje} value={desde} onChange={(e) => setDesde(e.target.value || hoje)} /></Campo>
          <Botao variante="solido" tamanho="sm" disabled={!mudou || ocupado} onClick={() => aoSalvar(Object.fromEntries(DIAS.map((d) => [d.k, Number(disp[d.k]) || 0])), desde)}>Salvar horas</Botao>
        </div>
      )}
      {versoes.length > 1 && (
        <details className="versoes-horario">
          <summary>{plural(versoes.length, "versão", "versões")} do horário</summary>
          <ul>{[...versoes].reverse().map((x, i) => <li key={i} className="num">desde {fmtDataCurta(x.desde)}: {fmtMin(DIAS.reduce((s, d) => s + (Number(x.dias?.[d.k]) || 0), 0))} por semana</li>)}</ul>
        </details>
      )}
    </section>
  );
}

function RitmoDoPlano({ plano, podeEditar, aoOperar, ocupado }) {
  return (
    <Campo rotulo="Velocidade do plano" ajuda="Mais rápido encurta o tempo de cada tópico.">
      <select className="entrada" value={plano.ritmo || 1} disabled={!podeEditar || ocupado} onChange={(e) => aoOperar({ tipo: "definirPlano", campos: { ritmo: Number(e.target.value) } }, "Mudar a velocidade")}>
        {RITMOS.map((r) => <option key={r.id} value={r.multiplicador}>{r.nome} ({String(r.multiplicador).replace(".", ",")}×)</option>)}
      </select>
    </Campo>
  );
}

export function Organizacao({ plano, pode = {}, aoOperar, aoSalvarHorario, ocupado, modelo = false }) {
  const [dataAlvo, setDataAlvo] = useState(plano.dataAlvo || "");
  const [perm, setPerm] = useState(() => ({ ...(plano.permissoesAluno || {}) }));

  return (
    <div className="grade-organizacao">
      {!modelo && <section className="cartao"><HorasLivres plano={plano} podeEditar={pode.disponibilidade} aoSalvar={aoSalvarHorario} ocupado={ocupado} /></section>}

      <section className="cartao form" aria-labelledby="t-ritmo">
        <h3 id="t-ritmo" className="subtitulo subtitulo--sm"><RefreshCw aria-hidden="true" /> Ritmo e prazo</h3>
        <RitmoDoPlano plano={plano} podeEditar={pode.ritmo} aoOperar={aoOperar} ocupado={ocupado} />
        <Campo rotulo="Data-alvo" ajuda={pode.prazo ? "Com data-alvo, a previsão de término mostra se o conteúdo cabe até lá." : "Definida pelo professor."}>
          <span className="linha-entrada">
            <input className="entrada" type="date" value={dataAlvo} disabled={!pode.prazo} onChange={(e) => setDataAlvo(e.target.value)} />
            {pode.prazo && <Botao variante="vidro" tamanho="sm" disabled={(dataAlvo || null) === (plano.dataAlvo || null) || ocupado} onClick={() => aoOperar({ tipo: "definirPlano", campos: { dataAlvo: dataAlvo || null } }, "Mudar a data-alvo")}>Salvar</Botao>}
          </span>
        </Campo>
      </section>

      {!modelo && pode.atraso && (
        <section className="cartao form" aria-labelledby="t-atraso">
          <h3 id="t-atraso" className="subtitulo subtitulo--sm"><CalendarClock aria-hidden="true" /> Meta que passou do dia</h3>
          <Campo rotulo="O que fazer" ajuda="Revisões atrasadas nunca andam sozinhas: ficam como pendência até serem feitas.">
            <select className="entrada" value={plano.atraso === "manter" ? "manter" : "redistribuir"} disabled={ocupado}
              onChange={(e) => aoOperar({ tipo: "definirPlano", campos: { atraso: e.target.value } }, "Meta atrasada")}>
              {Object.entries(ESTRATEGIAS_ATRASO).map(([k, nome]) => <option key={k} value={k}>{nome}</option>)}
            </select>
          </Campo>
        </section>
      )}

      {pode.permissoes && (
        <section className="cartao form" aria-labelledby="t-perm">
          <h3 id="t-perm" className="subtitulo subtitulo--sm"><Settings2 aria-hidden="true" /> O que o aluno pode mudar</h3>
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

/* ---------- Histórico de alterações ---------- */

const ENTIDADES = { plano: "Edital", metas: "Metas", revisaoRecorrente: "Revisões", semana: "Semana (antiga)", estudo: "Estudo", questoes: "Questões", simulado: "Simulado", aluno: "Cadastro", redacao: "Redação" };

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

/* ---------- O edital de um aluno (visto pelo aluno ou pelo moderador) ---------- */

const REMOCOES = ["removerTopico", "removerSubtopico", "removerMateria"];

export function EditalDoAluno({ v, modo }) {
  const { s } = useApp();
  const moderador = modo === "moderador";
  const perm = v.plano?.permissoesAluno || {};
  const alunoId = v.aluno.id;
  const [aberta, setAberta] = useState(null);
  const [recalc, setRecalc] = useState(false);
  const [rotina, setRotina] = useState(false);
  const [historico, setHistorico] = useState(false);
  const [revisao, setRevisao] = useState(null);
  const confirmada = useEdicaoPlano(alunoId);
  const direta = useEdicaoPlano(alunoId, { confirmar: false });
  const acao = useAcao();
  const vistos = useVistos(alunoId);
  const modelos = useModelos(moderador);
  const modelo = moderador ? (modelos || []).find((m) => m.id === v.plano.modeloId) : null;
  const efetiva = useMemo(() => (modelo ? jornadaEfetiva(v.plano, modelo) : null), [modelo, v.plano]);

  const pode = moderador
    ? { reordenar: true, cortar: true, vistos: true, estrutura: true, criar: true, carga: true, tempos: true, recalcular: true, revisoes: true,
      disponibilidade: true, ritmo: true, prazo: true, atraso: true, permissoes: true }
    : { reordenar: !!perm.reordenar, cortar: !!perm.concluirItens, vistos: !!perm.concluirItens, recalcular: !!perm.recalcular,
      disponibilidade: !!perm.disponibilidade, ritmo: !!perm.ritmo, carga: perm.tempos !== false, tempos: perm.tempos !== false };

  // tirar conteúdo e mexer no peso passam pela prévia; ordem, inclusão e tempo vão direto (com log)
  const operar = (op, titulo) => (REMOCOES.includes(op.tipo) ? confirmada : direta).propor(op, titulo);
  const ocupado = acao.ocupado || confirmada.ocupado || direta.ocupado;
  const materiaVisivel = aberta && v.plano.materias.find((m) => m.materiaId === aberta && (moderador || m.ativa !== false));
  const mostrarRecalcular = pode.recalcular && (moderador || v.atrasos.quantidade > 0);
  const salvarHorario = (dias, desde) => acao.executar(async () => { await s.planos.definirHorario(alunoId, dias, { desde }); setRotina(false); });

  return (
    <>
      <ResumoEdital v={v} acoes={<>
        {!moderador && (pode.disponibilidade || pode.ritmo) && <Botao variante="vidro" tamanho="sm" icone={Clock4} onClick={() => setRotina(true)}>Minha rotina</Botao>}
        {mostrarRecalcular && <Botao variante={v.atrasos.quantidade ? "solido" : "vidro"} tamanho="sm" icone={RefreshCw} disabled={ocupado} onClick={() => setRecalc(true)}>Recalcular</Botao>}
      </>} />
      <MensagemErro erro={acao.erro || direta.erro} />

      {moderador && (
        <TabelaIncidencia plano={v.plano} capacidade={capacidadeSemanal(v.plano.disponibilidade)} ocupado={ocupado} efetiva={efetiva}
          aoVoltar={(materiaId, campo) => acao.executar(() => s.planos.voltarAoPadrao(alunoId, materiaId, campo))}
          aoAplicar={(ops, titulo) => confirmada.propor(ops, titulo)} />
      )}

      <section className="secao" aria-label="Matérias">
        {moderador && <h2 className="subtitulo secao-titulo">Conteúdo do edital</h2>}
        <BlocosMaterias plano={v.plano} progresso={v.progressoPlano} selecionada={aberta} aoSelecionar={setAberta} mostrarOcultas={moderador} />
      </section>

      {materiaVisivel && (
        <TopicosDaMateria plano={v.plano} materiaId={aberta} pode={pode} v={v} vistos={vistos} ocupado={ocupado}
          aoFechar={() => setAberta(null)} aoOperar={operar}
          aoOrdenar={(materiaId, ordem) => acao.executar(() => s.planos.ordenarTopicos(alunoId, materiaId, ordem))}
          aoCortar={(it) => acao.executar(() => s.planos.concluirItem(alunoId, it.itemId))}
          aoDescortar={(it) => acao.executar(() => s.planos.reverDoZero(alunoId, it.itemId))}
          aoRevisao={(it, rev) => setRevisao({ it, rev })}
          aoMarcarVisto={(subId, visto) => acao.executar(() => s.planos.marcarSubtopico(alunoId, subId, visto))}
          aoCriarTopico={(nome) => s.planos.novoTopico({ materiaId: aberta, nome, alunoId })}
          aoCriarSubtopico={(topicoId, nome) => s.planos.novoSubtopico({ materiaId: aberta, topicoId, nome, alunoId })} />
      )}
      {moderador && efetiva?.materias.some((m) => m.ordem.origem === "sobrescrito") && aberta && efetiva.materias.find((m) => m.materiaId === aberta)?.ordem.origem === "sobrescrito" && (
        <p className="previa-linha">
          A ordem dos tópicos desta matéria é só deste aluno.{" "}
          <Botao variante="texto" tamanho="sm" icone={Undo2} disabled={ocupado} onClick={() => acao.executar(() => s.planos.voltarAoPadrao(alunoId, aberta, "ordem"))}>Voltar à ordem da jornada</Botao>
        </p>
      )}

      {moderador ? (
        <details className="recolhivel">
          <summary>Rotina e regras deste aluno <small>horas livres, velocidade, data-alvo, meta atrasada e permissões</small></summary>
          <Organizacao plano={v.plano} pode={pode} aoOperar={(op, titulo) => confirmada.propor(op, titulo)} aoSalvarHorario={salvarHorario} ocupado={ocupado} />
        </details>
      ) : (
        <p className="rodape-edital"><Botao variante="texto" tamanho="sm" icone={History} onClick={() => setHistorico(true)}>Histórico de alterações</Botao></p>
      )}

      {confirmada.dialogo}
      {direta.dialogo}
      {revisao && <DialogoRevisao key={revisao.it.itemId} alunoId={alunoId} alvo={revisao} aoFechar={() => setRevisao(null)} />}
      {rotina && (
        <Dialogo aberto titulo="Minha rotina" largura={560} aoFechar={() => setRotina(false)}>
          <div className="form">
            {pode.disponibilidade && <HorasLivres plano={v.plano} podeEditar aoSalvar={salvarHorario} ocupado={ocupado} />}
            {pode.ritmo && <RitmoDoPlano plano={v.plano} podeEditar aoOperar={(op, t) => { setRotina(false); confirmada.propor(op, t); }} ocupado={ocupado} />}
            <p className="previa-linha">Ritmo atual: {nomeRitmo(v.plano.ritmo).toLowerCase()}{v.plano.dataAlvo ? ` · data-alvo ${fmtDataLonga(v.plano.dataAlvo)}` : ""}.</p>
            <MensagemErro erro={acao.erro} />
          </div>
        </Dialogo>
      )}
      {historico && (
        <Dialogo aberto titulo="Histórico de alterações" largura={820} aoFechar={() => setHistorico(false)}>
          <Historico alunoId={alunoId} entidades={["plano", "metas", "revisaoRecorrente", "semana", "estudo"]} />
        </Dialogo>
      )}
      <Confirmar aberto={recalc} titulo="Recalcular o edital" rotulo="Recalcular" ocupado={acao.ocupado} erro={acao.erro}
        aoFechar={() => setRecalc(false)} aoConfirmar={() => acao.executar(async () => { await s.planos.recalcular(alunoId); setRecalc(false); })}>
        <p className="texto-dialogo">
          A previsão do que falta é refeita a partir de hoje, com as horas livres, a velocidade e o peso de cada matéria{v.plano.dataAlvo ? " e a data-alvo" : ""}.
          O que já foi visto e o histórico de estudo continuam iguais. As metas das próximas duas semanas são refeitas (as concluídas não mudam).
        </p>
      </Confirmar>
    </>
  );
}
