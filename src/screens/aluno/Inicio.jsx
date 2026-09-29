import { useState } from "react";
import { Link, useSearchParams } from "react-router-dom";
import { AlertTriangle, BellRing, BookOpen, CalendarCheck, CheckCircle2, FileQuestion, Flame, ListChecks, PenLine, Target, Zap } from "lucide-react";
import { fmtMin } from "../../core/nucleo.js";
import { useApp } from "../../state/AppContext.jsx";
import { errosDeCampo, useAcao, useDevolutivas, useEu, useFrases, useNotificacoes } from "../../state/hooks.js";
import { useVisaoAluno } from "../../state/aluno.js";
import { SeletorConteudo } from "../../ui/Conteudo.jsx";
import { Barra, Botao, Campo, Carregando, Dialogo, Frase, MensagemErro, Vazio } from "../../ui/ui.jsx";
import { Agenda, MetaLinha, ResumoSemana } from "./Metas.jsx";
import { FormQuestoes } from "../comum/Registros.jsx";
import { AvisoLinha, LerAviso } from "./Avisos.jsx";

export { MetaLinha };

const ABAS_ESTUDO = [
  { k: "fora", label: "Estudei por fora", icone: BookOpen },
  { k: "concluido", label: "Já domino um tópico", icone: Zap },
];

function RegistrarEstudo({ aberto, fechar, v }) {
  const { s, ind, hoje } = useApp();
  const [aba, setAba] = useState("fora");
  const [sel, setSel] = useState({ materiaId: "", topicoId: "", subtopicoId: "" });
  const [minutos, setMinutos] = useState(30);
  const [data, setData] = useState(hoje);
  const [itemId, setItemId] = useState("");
  const [retorno, setRetorno] = useState("");
  const { executar, ocupado, erro, limparErro } = useAcao();
  const erros = errosDeCampo(erro);
  const plano = v.plano;
  const podeConcluir = plano?.permissoesAluno?.concluirItens;
  const pendentes = (v.itens || []).filter((it) => !v.estado(it).concluido);
  const materiasDoPlano = (plano?.materias || []).map((m) => m.materiaId);
  const sair = () => { setRetorno(""); setSel({ materiaId: "", topicoId: "", subtopicoId: "" }); setItemId(""); limparErro(); fechar(); };

  const salvar = () => executar(async () => {
    if (aba === "fora") {
      const r = await s.estudo.registrarEstudoFora(v.aluno.id, { ...sel, minutos, data });
      setRetorno(`Registrado: ${fmtMin(minutos)} de estudo.${r.concluidos.length ? " Um tópico foi concluído; as próximas metas seguem para o seguinte." : ""}`);
    } else {
      await s.planos.concluirItem(v.aluno.id, itemId);
      setRetorno("Tópico marcado como visto. As próximas metas da matéria seguem para o tópico seguinte.");
    }
  });

  return (
    <Dialogo aberto={aberto} aoFechar={sair} titulo="Registrar estudo" largura={520}>
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
          {podeConcluir && (
            <div className="abas" role="tablist">
              {ABAS_ESTUDO.map((t) => (
                <button key={t.k} type="button" role="tab" aria-selected={aba === t.k} onClick={() => { setAba(t.k); limparErro(); }}>
                  <t.icone aria-hidden="true" />{t.label}
                </button>
              ))}
            </div>
          )}
          <p className="texto-dialogo">
            {aba === "fora" ? "Estudo feito fora das metas. Soma no tópico escolhido (ou no atual da matéria) e entra no histórico." : "Já domina um tópico? Marque como visto: ele conta 100% e as metas seguem para o próximo."}
          </p>
          {aba === "concluido" ? (
            <Campo rotulo="Tópico" erro={erros.itemId}>
              <select className="entrada" value={itemId} onChange={(e) => setItemId(e.target.value)}>
                <option value="">Selecione…</option>
                {materiasDoPlano.map((mid) => {
                  const lista = pendentes.filter((it) => it.materiaId === mid);
                  if (!lista.length) return null;
                  return (
                    <optgroup key={mid} label={ind?.nomeMateria(mid)}>
                      {lista.map((it) => <option key={it.itemId} value={it.itemId}>{ind?.nomeTopico(it.topicoId)}</option>)}
                    </optgroup>
                  );
                })}
              </select>
            </Campo>
          ) : (
            <>
              <SeletorConteudo valor={sel} aoMudar={setSel} erros={erros} obrigatorio={{ materia: true }} />
              <div className="form-linha">
                <Campo rotulo="Tempo estudado (min)" erro={erros.minutos}>
                  <input className="entrada num" type="number" min="5" step="5" value={minutos} onChange={(e) => setMinutos(+e.target.value)} />
                </Campo>
                <Campo rotulo="Quando" erro={erros.data}><input className="entrada" type="date" max={hoje} value={data} onChange={(e) => setData(e.target.value)} /></Campo>
              </div>
            </>
          )}
          {!Object.keys(erros).length && <MensagemErro erro={erro} />}
          <Botao variante="solido" bloco disabled={ocupado || (aba === "concluido" ? !itemId : !sel.materiaId)} onClick={salvar}>{ocupado ? "Salvando…" : "Salvar"}</Botao>
        </div>
      )}
    </Dialogo>
  );
}

const VISOES = [["hoje", "Hoje"], ["agenda", "2 semanas"]];

/* Dashboard: o dia (metas, atrasadas, registro rápido) ou as duas semanas. */
export default function Inicio() {
  const { s } = useApp();
  const eu = useEu();
  const v = useVisaoAluno(eu.id);
  const t = useFrases(v.aluno || eu);
  const avisos = useNotificacoes(eu.id) || [];
  const devolutivas = useDevolutivas(eu.id) || [];
  const [params, setParams] = useSearchParams();
  const visao = ["agenda", "semana"].includes(params.get("ver")) ? "agenda" : "hoje";
  const [estudo, setEstudo] = useState(false);
  const [questoes, setQuestoes] = useState(false);
  const [retornoQuestoes, setRetornoQuestoes] = useState("");
  const [aviso, setAviso] = useState(null);
  const { executar, ocupado, erro } = useAcao();

  if (v.carregando) return <Carregando />;
  const novos = avisos.filter((n) => !n.lidaEm);
  const redacoesNovas = devolutivas.filter((d) => !d.lida).length;
  const dataHoje = new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" });
  const pctDia = v.totalHoje ? Math.round((v.feitasHoje / v.totalHoje) * 100) : 0;
  const vest = v.ind.vestibular(v.aluno?.vestibularId);
  const c30 = v.consistencia30;

  const concluir = (meta, minutos) => executar(() => s.metas.concluir(eu.id, meta.id, minutos ? { minutos } : {}));
  const desfazer = (meta) => executar(() => s.metas.desfazer(eu.id, meta.id));
  const linha = (m, atrasada) => <MetaLinha key={m.id} meta={m} atrasada={atrasada} aoConcluir={concluir} aoDesfazer={desfazer} ocupado={ocupado} />;

  return (
    <>
      <section className="cartao saudacao" aria-label="Seu resumo">
        <div className="saudacao-quem">
          <span className="saudacao-avatar" aria-hidden="true">{(v.aluno?.nome || eu.nome || "?").charAt(0)}</span>
          <div>
            <h1><Frase texto={t("painel.dashboard.saudacao")} /></h1>
            <p>{dataHoje}{vest ? ` · ${vest.nome}` : ""}</p>
          </div>
        </div>
        <ul className="saudacao-numeros">
          <li style={{ "--cor-numero": "#4f5cf6" }}><span className="saudacao-icone"><CalendarCheck aria-hidden="true" /></span><b className="num">{c30.diasEstudados}</b><small>dias estudados nos últimos 30</small></li>
          <li style={{ "--cor-numero": "#e2761b" }}><span className="saudacao-icone"><Flame aria-hidden="true" /></span><b className="num">{c30.sequenciaAtual}</b><small>{c30.sequenciaAtual === 1 ? "dia seguido" : "dias seguidos"}</small></li>
          <li style={{ "--cor-numero": "#1e8f63" }}><span className="saudacao-icone"><Target aria-hidden="true" /></span><b className="num">{v.progressoPlano ? `${String(v.progressoPlano.pct).replace(".", ",")}%` : "–"}</b><small>do edital visto</small></li>
        </ul>
      </section>

      <div className="barra-dia">
        <div className="filtros filtros--compacto" role="tablist" aria-label="Ver">
          {VISOES.map(([k, nome]) => (
            <button key={k} type="button" role="tab" className="filtro" aria-selected={visao === k} onClick={() => setParams(k === "hoje" ? {} : { ver: k }, { replace: true })}>{nome}</button>
          ))}
        </div>
        {visao === "hoje" && v.totalHoje > 0 && (
          <div className="progresso-dia">
            <div className="num">{v.feitasHoje} de {v.totalHoje} metas de hoje</div>
            <Barra valor={pctDia} />
          </div>
        )}
      </div>

      {novos.length > 0 && (
        <section className="secao avisos-novos" aria-label="Avisos novos">
          <span className="eyebrow"><BellRing aria-hidden="true" /> {novos.length === 1 ? "Aviso novo" : `${novos.length} avisos novos`}</span>
          {novos.slice(0, 3).map((n) => <AvisoLinha key={n.id} aviso={n} aoAbrir={() => setAviso(n)} />)}
          {novos.length > 3 && <Link to="/aluno/avisos" className="btn btn--texto btn--sm">Ver todos</Link>}
        </section>
      )}

      {redacoesNovas > 0 && (
        <div className="aviso">
          <PenLine aria-hidden="true" />
          {redacoesNovas === 1 ? "Sua redação foi corrigida." : `${redacoesNovas} redações corrigidas esperando você.`}
          <Link className="btn btn--solido btn--sm" to="/aluno/redacao">Ver a correção</Link>
        </div>
      )}
      <MensagemErro erro={v.erroMetas} />

      {v.plano === null ? (
        <div className="cartao"><Vazio icone={ListChecks} titulo="Seu edital ainda não foi montado" texto="Assim que o professor aplicar a sua jornada, as metas de cada dia aparecem aqui." /></div>
      ) : visao === "agenda" ? <Agenda v={v} texto={t("painel.semana.texto")} /> : (
        <>
          <div className="faixa">
            <span>
              Hoje: <b className="num">{fmtMin(v.minutosHoje)}</b> estudados{v.questoesHoje ? <>, <b className="num">{v.questoesHoje}</b> questões</> : null}
            </span>
            {v.atrasos?.quantidade > 0 && (
              <Link to="/aluno/edital" className="faixa-atraso"><AlertTriangle aria-hidden="true" />{v.atrasos.quantidade} {v.atrasos.quantidade === 1 ? "tópico atrasado" : "tópicos atrasados"}</Link>
            )}
          </div>
          <MensagemErro erro={erro} />

          {v.atrasadas.length > 0 && (
            <section className="secao" aria-label="Metas atrasadas">
              <span className="eyebrow perigo">Atrasadas</span>
              {v.atrasadas.map((m) => linha(m, true))}
            </section>
          )}

          <section className="secao" aria-label="Metas de hoje">
            {v.atrasadas.length > 0 && <span className="eyebrow">Hoje</span>}
            {v.metasHoje.map((m) => linha(m, false))}
            {v.metasHoje.length === 0 && (
              <div className="cartao"><Vazio icone={CheckCircle2} titulo={t("painel.dashboard.vazioTitulo")} texto={t("painel.dashboard.vazioTexto")} /></div>
            )}
          </section>

          <button type="button" className="resumo-link" onClick={() => setParams({ ver: "agenda" }, { replace: true })} aria-label="Ver as duas semanas">
            <ResumoSemana semana={v.semana} compacto />
          </button>

          <div className="acoes-painel">
            <Botao variante="vidro" icone={FileQuestion} onClick={() => setQuestoes(true)}>Registrar questões</Botao>
            <Botao variante="vidro" icone={BookOpen} onClick={() => setEstudo(true)}>Registrar estudo</Botao>
          </div>
        </>
      )}

      {estudo && <RegistrarEstudo aberto={estudo} fechar={() => setEstudo(false)} v={v} />}
      <Dialogo aberto={questoes} aoFechar={() => { setQuestoes(false); setRetornoQuestoes(""); }} titulo="Registrar questões" largura={520}>
        {questoes && (retornoQuestoes ? (
          <div className="form">
            <p className="retorno" role="status">{retornoQuestoes}</p>
            <div className="dialogo-acoes">
              <Botao variante="vidro" onClick={() => setRetornoQuestoes("")}>Registrar outro bloco</Botao>
              <Botao variante="solido" onClick={() => { setQuestoes(false); setRetornoQuestoes(""); }}>Fechar</Botao>
            </div>
          </div>
        ) : <FormQuestoes alunoId={eu.id} aoConcluir={setRetornoQuestoes} aoCancelar={() => setQuestoes(false)} />)}
      </Dialogo>
      <LerAviso aviso={aviso} aoFechar={() => setAviso(null)} />
    </>
  );
}
