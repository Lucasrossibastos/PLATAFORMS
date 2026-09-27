import { useMemo, useState } from "react";
import { BookOpen, Check, CheckCircle2, Clock4, FileQuestion, RefreshCw, TrendingUp, X, Zap } from "lucide-react";
import { DIAS, fmtMin, vestInfo } from "../../core/nucleo.js";
import { useApp, useEstudo } from "../../state/AppContext.jsx";
import {
  adicionarTempoExtra, alternarMeta, aplicarReplanejamento, contextoMotor, corDaMateria, dominarTopico,
  previaReplanejamento, registrarEstudoFora, registrarQuestoes, resumoAluno, topicoFechouHoje,
} from "../../state/estudo.js";

// "na terça", "no sábado"
const noDia = (nome) => `${/^(Sábado|Domingo)$/.test(nome) ? "no" : "na"} ${nome.toLowerCase()}`;
import { Barra, Botao, Campo, Dialogo, MateriaTopico, TituloPagina, Vazio } from "../../ui/ui.jsx";

function MetaLinha({ meta, atrasada, aoAlternar }) {
  const revisao = meta.tipo === "revisao";
  return (
    <div className={`meta${atrasada ? " meta--atrasada" : ""}${meta.done ? " meta--feita" : ""}`}>
      <button type="button" className="check" aria-pressed={!!meta.done} onClick={() => aoAlternar(meta)}
        aria-label={`${meta.done ? "Desmarcar" : "Concluir"} ${meta.materia}, ${fmtMin(meta.minutos)}`}>
        {meta.done && <Check aria-hidden="true" />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="meta-materia">
          <i style={{ "--cor": corDaMateria(meta.materiaId) }} aria-hidden="true" />
          <span>{meta.materia}</span>
          {revisao && <span className="etiqueta etiqueta--rev">Revisão</span>}
          {atrasada && <span className="etiqueta etiqueta--perigo">Atrasada · {meta.origem}</span>}
          {meta.extra && <span className="etiqueta">Tempo extra</span>}
        </div>
        <div className="meta-topico">{meta.topico}</div>
      </div>
      <span className="meta-min">{fmtMin(meta.minutos)}</span>
    </div>
  );
}

/* Pergunta ao fechar o tempo de um tópico no dia. */
function TopicoConcluido({ popup, fechar, aoDominar, aoPedirTempo }) {
  const [etapa, setEtapa] = useState("pergunta");
  const [minutos, setMinutos] = useState(30);
  const [retorno, setRetorno] = useState("");
  const sair = () => { setEtapa("pergunta"); setRetorno(""); fechar(); };

  return (
    <Dialogo aberto={!!popup} aoFechar={sair} titulo="Tempo planejado concluído" largura={440}>
      {popup && (
        <div className="form">
          <p className="texto-dialogo">Você fechou o tempo de <strong>{popup.topico}</strong> ({popup.materia}) hoje. Como está o conteúdo?</p>
          {etapa === "pergunta" && (
            <>
              <Botao variante="solido" tamanho="lg" icone={Check} onClick={() => { aoDominar(popup); sair(); }}>Estou dominando o conteúdo</Botao>
              <Botao variante="vidro" tamanho="lg" icone={Clock4} onClick={() => setEtapa("tempo")}>Preciso de mais tempo</Botao>
              <Botao variante="texto" onClick={sair}>Seguir o plano normal</Botao>
            </>
          )}
          {etapa === "tempo" && !retorno && (
            <>
              <Campo rotulo="Minutos a mais" ajuda="Entram como uma meta extra no próximo dia com mais folga nesta semana.">
                <input className="entrada num" type="number" min="15" step="5" value={minutos} onChange={(e) => setMinutos(+e.target.value)} />
              </Campo>
              <Botao variante="solido" disabled={!(minutos >= 5)} onClick={() => setRetorno(aoPedirTempo(popup, minutos))}>Adicionar {fmtMin(minutos)}</Botao>
            </>
          )}
          {retorno && (
            <>
              <p className="retorno" role="status">{retorno}</p>
              <Botao variante="vidro" onClick={sair}>Fechar</Botao>
            </>
          )}
        </div>
      )}
    </Dialogo>
  );
}

function Replanejar({ aberto, fechar, previa, disp, aoConfirmar }) {
  const porDia = useMemo(() => {
    if (!previa) return [];
    return DIAS.map((d) => {
      const metas = previa.semana[d.k] || [];
      const novas = metas.filter((m) => m.replanejada);
      return novas.length ? { ...d, novas, total: metas.reduce((s, m) => s + m.minutos, 0), teto: disp[d.k] || 0 } : null;
    }).filter(Boolean);
  }, [previa, disp]);

  return (
    <Dialogo aberto={aberto} aoFechar={fechar} titulo="Replanejar a semana" largura={540}>
      {previa && (
        <>
          <p className="texto-dialogo">
            O resto da semana é <strong>recalculado a partir do seu ciclo</strong>. As pendências entram com prioridade e podem virar
            blocos maiores da mesma matéria, sempre dentro do limite de cada dia. O que você já concluiu fica como está.
          </p>
          <div className="replan-resumo">
            <div><strong className="num">{fmtMin(previa.resumo.totalRealocado)}</strong><span>tempo replanejado</span></div>
            <div><strong className="num">{previa.resumo.materiasFundidas}</strong><span>blocos fundidos</span></div>
          </div>
          {previa.resumo.minutosSemEspaco > 0 && (
            <p className="aviso" role="note">
              {fmtMin(previa.resumo.minutosSemEspaco)} de pendências não cabem no que resta da semana
              ({previa.resumo.naoCouberam.map((x) => x.materia).join(", ")}). Elas continuam como atrasadas.
            </p>
          )}
          <div className="replan-dias">
            {porDia.length === 0 && <p className="texto-dialogo">Nada novo para distribuir: você está em dia.</p>}
            {porDia.map((dia) => (
              <div key={dia.k} className="replan-dia">
                <header>
                  {dia.nome}
                  <span className={dia.total <= dia.teto ? "ok" : "estourou"}>{fmtMin(dia.total)} / {fmtMin(dia.teto)}</span>
                </header>
                {dia.novas.map((m) => (
                  <p key={m.id}><span>{m.materia} · {m.topico}</span><span className="num">{fmtMin(m.minutos)}</span></p>
                ))}
              </div>
            ))}
          </div>
          <div className="dialogo-acoes">
            <Botao variante="vidro" onClick={fechar}>Cancelar</Botao>
            <Botao variante="solido" icone={Check} onClick={aoConfirmar}>Confirmar</Botao>
          </div>
        </>
      )}
    </Dialogo>
  );
}

const ABAS_PROGRESSO = [
  { k: "fora", label: "Estudei por fora", icone: BookOpen },
  { k: "rapido", label: "Concluí mais rápido", icone: Zap },
  { k: "mais", label: "Preciso de mais tempo", icone: Clock4 },
];

function RegistrarProgresso({ aberto, fechar, acoes }) {
  const [aba, setAba] = useState("fora");
  const [sel, setSel] = useState({ materiaId: "", topicoId: "" });
  const [minutos, setMinutos] = useState(30);
  const [retorno, setRetorno] = useState("");
  const sair = () => { setRetorno(""); setSel({ materiaId: "", topicoId: "" }); fechar(); };
  const precisaTopico = aba === "rapido";
  const valido = sel.materiaId && (!precisaTopico || sel.topicoId) && (aba === "rapido" || minutos >= 5);

  const salvar = () => {
    if (aba === "fora") setRetorno(acoes.fora(sel, minutos));
    if (aba === "rapido") setRetorno(acoes.rapido(sel));
    if (aba === "mais") setRetorno(acoes.mais(sel, minutos));
  };

  return (
    <Dialogo aberto={aberto} aoFechar={sair} titulo="Registrar progresso" largura={500}>
      {retorno ? (
        <div className="form">
          <p className="retorno" role="status">{retorno}</p>
          <div className="dialogo-acoes">
            <Botao variante="vidro" onClick={() => setRetorno("")}>Registrar outro</Botao>
            <Botao variante="solido" onClick={sair}>Fechar</Botao>
          </div>
        </div>
      ) : (
        <div className="form">
          <div className="abas" role="tablist">
            {ABAS_PROGRESSO.map((t) => (
              <button key={t.k} type="button" role="tab" aria-selected={aba === t.k} onClick={() => setAba(t.k)}>
                <t.icone aria-hidden="true" />{t.label}
              </button>
            ))}
          </div>
          <p className="texto-dialogo">
            {aba === "fora" && "Estudo feito por conta própria. Entra nas horas estudadas de hoje e no histórico."}
            {aba === "rapido" && "Terminou um tópico antes do previsto? Ele fica marcado como concluído e as próximas metas da matéria passam para o tópico seguinte."}
            {aba === "mais" && "Precisa de mais tempo num conteúdo? Vira uma meta extra no próximo dia com folga nesta semana."}
          </p>
          <MateriaTopico valor={sel} aoMudar={setSel} topicoObrigatorio={precisaTopico}
            rotuloTopico={aba === "rapido" ? "Tópico concluído" : "Tópico"} />
          {aba !== "rapido" && (
            <Campo rotulo={aba === "fora" ? "Tempo estudado (min)" : "Tempo a mais (min)"}>
              <input className="entrada num" type="number" min="5" step="5" value={minutos} onChange={(e) => setMinutos(+e.target.value)} />
            </Campo>
          )}
          <Botao variante="solido" bloco disabled={!valido} onClick={salvar}>Salvar</Botao>
        </div>
      )}
    </Dialogo>
  );
}

function RegistrarQuestoes({ aberto, fechar, aoSalvar }) {
  const vazio = { materiaId: "", topicoId: "", feitas: 10, acertos: 0, obs: "" };
  const [f, setF] = useState(vazio);
  const [retorno, setRetorno] = useState("");
  const sair = () => { setF(vazio); setRetorno(""); fechar(); };
  const valido = f.materiaId && f.feitas > 0 && f.acertos >= 0 && f.acertos <= f.feitas;

  return (
    <Dialogo aberto={aberto} aoFechar={sair} titulo="Registrar questões" largura={480}>
      {retorno ? (
        <div className="form">
          <p className="retorno" role="status">{retorno}</p>
          <div className="dialogo-acoes">
            <Botao variante="vidro" onClick={() => { setF(vazio); setRetorno(""); }}>Registrar outro bloco</Botao>
            <Botao variante="solido" onClick={sair}>Fechar</Botao>
          </div>
        </div>
      ) : (
        <div className="form">
          <MateriaTopico valor={f} aoMudar={(v) => setF({ ...f, ...v })} />
          <div className="form-linha">
            <Campo rotulo="Questões feitas">
              <input className="entrada num" type="number" min="1" value={f.feitas} onChange={(e) => setF({ ...f, feitas: +e.target.value })} />
            </Campo>
            <Campo rotulo="Acertos">
              <input className="entrada num" type="number" min="0" max={f.feitas} value={f.acertos} onChange={(e) => setF({ ...f, acertos: +e.target.value })} />
            </Campo>
          </div>
          {f.acertos > f.feitas && <p className="texto-dialogo" style={{ color: "var(--danger)" }}>Os acertos não podem passar do número de questões feitas.</p>}
          <Campo rotulo="Observação (opcional)">
            <input className="entrada" value={f.obs} placeholder="Ex.: confundi MRU com MRUV" onChange={(e) => setF({ ...f, obs: e.target.value })} />
          </Campo>
          <Botao variante="solido" bloco disabled={!valido} onClick={() => setRetorno(aoSalvar(f))}>Salvar</Botao>
        </div>
      )}
    </Dialogo>
  );
}

export default function Dashboard() {
  const { db, usuario, mudar } = useApp();
  const est = useEstudo();
  const uid = usuario.uid;
  const r = resumoAluno(db, uid, est);
  const vest = vestInfo(db.alunos.find((a) => a.id === uid)?.vestibular);
  const { disp } = contextoMotor(db, uid);

  const [popup, setPopup] = useState(null);
  const [replan, setReplan] = useState(false);
  const [progresso, setProgresso] = useState(false);
  const [questoes, setQuestoes] = useState(false);
  const previa = useMemo(() => (replan ? previaReplanejamento(db, uid, est) : null), [replan, db, uid, est]);

  const alternar = (meta) => {
    const fechou = mudar((d) => {
      const m = alternarMeta(d.estudo[uid], meta.id);
      return !!m?.done && m.tipo !== "revisao" && topicoFechouHoje(d.estudo[uid], m.topicoId);
    });
    if (fechou) setTimeout(() => setPopup({ topicoId: meta.topicoId, topico: meta.topico, materiaId: meta.materiaId, materia: meta.materia }), 350);
  };

  const acoes = {
    dominar: (p) => mudar((d) => dominarTopico(d, uid, p.topicoId)),
    maisTempo: (p, minutos) => {
      const dia = mudar((d) => adicionarTempoExtra(d, uid, { materiaId: p.materiaId, topicoId: p.topicoId, minutos }));
      return `Adicionamos ${fmtMin(minutos)} de ${p.topico || p.materia} ${noDia(dia)}.`;
    },
  };
  const acoesProgresso = {
    fora: (sel, minutos) => {
      mudar((d) => registrarEstudoFora(d.estudo[uid], { ...sel, minutos }));
      return `Registrado: ${fmtMin(minutos)} de estudo por fora. Já conta nas horas de hoje.`;
    },
    rapido: (sel) => {
      mudar((d) => dominarTopico(d, uid, sel.topicoId));
      return "Tópico marcado como concluído. As próximas metas dessa matéria já seguem para o tópico seguinte.";
    },
    mais: (sel, minutos) => {
      const dia = mudar((d) => adicionarTempoExtra(d, uid, { ...sel, minutos }));
      return `Adicionamos ${fmtMin(minutos)} ${noDia(dia)}.`;
    },
  };
  const salvarQuestoes = (f) => {
    mudar((d) => registrarQuestoes(d, uid, f));
    return `${f.feitas} questões registradas, ${Math.round((f.acertos / f.feitas) * 100)}% de acerto.`;
  };
  const confirmarReplan = () => {
    mudar((d) => aplicarReplanejamento(d, uid, previa));
    setReplan(false);
  };

  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const atrasadasAbertas = r.atrasadas.filter((m) => !m.done).length;

  return (
    <>
      <TituloPagina
        eyebrow={dataHoje}
        antes="Metas de"
        destaque="hoje"
        direita={
          <div className="titulo-direita">
            <span className="etiqueta"><i style={{ "--cor": vest.cor }} />{vest.nome}</span>
            <div className="progresso-dia">
              <div className="num">{r.feitas} de {r.total} metas concluídas</div>
              <Barra valor={r.pct} />
            </div>
          </div>
        }
      />

      {r.recado && (
        <div className="recado">
          <div>
            <span className="eyebrow">Recado do instrutor</span>
            <p>{r.recado.texto}</p>
            <small>{db.welcome.hero?.nome}</small>
          </div>
          <button type="button" className="icone-btn" aria-label="Dispensar recado"
            onClick={() => mudar((d) => { d.estudo[uid].recadosVistos.push(r.recado.id); })}><X /></button>
        </div>
      )}

      <div className="faixa">
        <span><b className="num">{r.streak}</b> {r.streak === 1 ? "dia seguido" : "dias seguidos"}</span>
        <div className="faixa-questoes">
          <span>Questões hoje</span>
          <Barra valor={r.metaQuestoes ? (r.questoesHoje / r.metaQuestoes) * 100 : 0} altura={3} />
          <span className="num"><b>{r.questoesHoje}</b>/{r.metaQuestoes}</span>
        </div>
        <Botao variante={atrasadasAbertas ? "solido" : "vidro"} tamanho="sm" icone={RefreshCw} onClick={() => setReplan(true)}>Replanejar</Botao>
      </div>

      {r.atrasadas.length > 0 && (
        <section className="secao" aria-label="Metas atrasadas">
          <span className="eyebrow perigo">Metas atrasadas</span>
          {r.atrasadas.map((m) => <MetaLinha key={m.id} meta={m} atrasada aoAlternar={alternar} />)}
        </section>
      )}

      <section className="secao" aria-label="Metas de hoje">
        {r.atrasadas.length > 0 && <span className="eyebrow">Hoje</span>}
        {r.metasHoje.map((m) => <MetaLinha key={m.id} meta={m} aoAlternar={alternar} />)}
        {r.metasHoje.length === 0 && (
          <div className="cartao"><Vazio icone={CheckCircle2} titulo="Nenhuma meta para hoje" texto="Dia livre no seu plano. Use para revisar ou registrar estudo por fora." /></div>
        )}
      </section>

      <div className="stats-grid">
        <div className="stat-cartao"><strong>{r.questoesHoje}</strong><span>questões resolvidas hoje · meta de {r.metaQuestoes}</span></div>
        <div className="stat-cartao"><strong>{r.minutosEstudados ? fmtMin(r.minutosEstudados) : "0min"}</strong><span>estudados hoje · {fmtMin(r.minutosPlanejados)} planejados</span></div>
        <div className="stat-cartao"><strong>{r.progresso}%</strong><span>do programa concluído</span></div>
      </div>

      <div className="acoes-painel">
        <Botao variante="vidro" tamanho="lg" icone={FileQuestion} onClick={() => setQuestoes(true)}>Registrar questões</Botao>
        <Botao variante="vidro" tamanho="lg" icone={TrendingUp} onClick={() => setProgresso(true)}>Registrar progresso</Botao>
      </div>

      <TopicoConcluido popup={popup} fechar={() => setPopup(null)} aoDominar={acoes.dominar} aoPedirTempo={acoes.maisTempo} />
      <Replanejar aberto={replan} fechar={() => setReplan(false)} previa={previa} disp={disp} aoConfirmar={confirmarReplan} />
      <RegistrarProgresso aberto={progresso} fechar={() => setProgresso(false)} acoes={acoesProgresso} />
      <RegistrarQuestoes aberto={questoes} fechar={() => setQuestoes(false)} aoSalvar={salvarQuestoes} />
    </>
  );
}
