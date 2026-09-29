import { useEffect, useState } from "react";
import { ArrowRight, CalendarDays, Check, Clock4, Hand, Lightbulb, Pin, RotateCcw, TriangleAlert } from "lucide-react";
import { fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta, inicioDaSemana, somarDias } from "../../core/datas.js";
import { ehProgressao, HORIZONTE_DIAS } from "../../core/motorMetas.js";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao } from "../../state/hooks.js";
import { Barra, Botao, MensagemErro } from "../../ui/ui.jsx";
import { IconeArea, useVisualMateria } from "../../ui/Areas.jsx";

const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const diaDaSemana = (iso) => DIA_CURTO[new Date(`${iso}T12:00:00`).getDay()];
const pct = (x) => `${Math.round((x || 0) * 100)}%`;
const ehRevisao = (m) => !ehProgressao(m);

/* Roteiro de um tópico: os subtópicos (orientação dentro dele), que o aluno
   marca conforme estuda, e a dica que o professor deixou no tópico. */
function Roteiro({ parte, item, vistos, aoMarcarVisto, somenteLeitura, titulo }) {
  const { ind } = useApp();
  const [marcados, setMarcados] = useState({}); // responde na hora; o gravado confirma
  useEffect(() => setMarcados({}), [vistos]);
  const visto = (id) => marcados[id] ?? !!vistos?.[id];
  const marcar = (id, x) => { setMarcados((m) => ({ ...m, [id]: x })); aoMarcarVisto(id, x); };
  const subs = (item?.subtopicos || []).filter((id) => ind?.subtopico(id));
  const dica = ind?.topico(parte.topicoId)?.descricao;
  if (!subs.length && !dica) return null;
  return (
    <div className="meta-roteiro">
      {titulo && <strong className="meta-roteiro-titulo">{titulo}</strong>}
      {subs.length > 0 && (
        <ul>
          {subs.map((id) => (
            <li key={id}>
              {aoMarcarVisto && !somenteLeitura ? (
                <label><input type="checkbox" checked={visto(id)} onChange={(e) => marcar(id, e.target.checked)} /><span>{ind.nomeSubtopico(id)}</span></label>
              ) : <span className={visto(id) ? "meta-sub-visto" : undefined}>{ind.nomeSubtopico(id)}</span>}
            </li>
          ))}
        </ul>
      )}
      {dica && <p className="meta-dica"><Lightbulb aria-hidden="true" />{dica}</p>}
    </div>
  );
}

/* Uma meta. O tópico é o título (é ele que se estuda); a matéria fica no
   selo com a cor de Materiais; os subtópicos guiam o estudo. Tocar no
   círculo conclui com o tempo planejado; tocar no tempo deixa informar
   outro; tocar de novo desfaz (24 h). v: a visão do aluno (itens, questões,
   subtópicos vistos). */
export function MetaLinha({ meta, atrasada, aoConcluir, aoDesfazer, aoMarcarVisto, ocupado, somenteLeitura, v }) {
  const { ind } = useApp();
  const visual = useVisualMateria();
  const [editando, setEditando] = useState(false);
  const [minutos, setMinutos] = useState(meta.duracaoPlanejada);
  const feita = meta.status === "concluida";
  const { cor, icone } = visual(meta.materiaId);
  const nomeMateria = ind?.nomeMateria(meta.materiaId);
  const partes = meta.partes || [];
  const principal = partes[0] || (meta.topicoId ? { topicoId: meta.topicoId, itemId: meta.itemId } : null);
  const titulo = principal ? ind?.nomeTopico(principal.topicoId) : nomeMateria;
  const tempo = feita ? meta.duracaoReal || meta.duracaoPlanejada : meta.duracaoPlanejada;
  const itemDe = (p) => v?.itens?.find((it) => it.itemId === p.itemId);
  const questoes = principal ? (v?.questoes || []).filter((q) => q.topicoId === principal.topicoId) : [];
  const totalQ = questoes.reduce((x, q) => x + (q.total || 0), 0);
  const acertos = totalQ ? (questoes.reduce((x, q) => x + (q.acertos || 0), 0) / totalQ) * 100 : null;
  const alternar = () => (feita ? aoDesfazer?.(meta) : aoConcluir?.(meta));
  const progresso = principal && !ehRevisao(meta) && (feita
    ? principal.pctAntes != null && <>{pct(principal.pctAntes)} → <b>{pct(principal.pctDepois)}</b> visto{principal.concluiu ? " · tópico concluído" : ""}</>
    : principal.pct != null && <>{pct(principal.pct)} visto</>);

  return (
    <article className={`meta${atrasada ? " meta--atrasada" : ""}${feita ? " meta--feita" : ""}`} style={{ "--cor": cor }}>
      <div className="meta-corpo">
        <div className="meta-selos">
          <span className="selo selo--materia"><IconeArea icone={icone} />{nomeMateria}</span>
          {atrasada && !feita
            ? <span className="selo selo--perigo"><CalendarDays aria-hidden="true" />atrasada · {fmtDataCurta(meta.dataPlanejada)}</span>
            : <span className="selo selo--dia"><CalendarDays aria-hidden="true" />meta do dia <b>{fmtDataCurta(feita ? meta.concluidaEm : meta.dataPlanejada)}</b></span>}
          {editando && !feita ? (
            <form className="meta-tempo" onSubmit={(e) => { e.preventDefault(); setEditando(false); aoConcluir?.(meta, Number(minutos)); }}>
              <input className="entrada num" type="number" min="1" max="720" value={minutos} onChange={(e) => setMinutos(e.target.value)} aria-label="Minutos estudados" autoFocus />
              <Botao type="submit" tamanho="sm" icone={Check} disabled={ocupado} aria-label="Concluir com este tempo" />
            </form>
          ) : (
            <button type="button" className="selo selo--tempo meta-min" disabled={feita || somenteLeitura} onClick={() => setEditando(true)} title={feita ? undefined : "Estudou outro tempo? Toque para informar"}>
              <Clock4 aria-hidden="true" />{fmtMin(tempo)} de {ehRevisao(meta) ? "revisão" : "estudo"}
            </button>
          )}
          {acertos != null && <span className="selo"><b>{String(Math.round(acertos * 10) / 10).replace(".", ",")}%</b> de acertos</span>}
          {meta.fixada && !feita && <span className="selo" title="Você pôs neste dia"><Pin aria-hidden="true" />fixada</span>}
        </div>

        <h3 className="meta-titulo">{titulo}</h3>
        <p className="meta-linha">
          {ehRevisao(meta) ? "Revisão" : nomeMateria}
          {progresso && <> · <span className="meta-progresso num">{progresso}</span></>}
          {!principal && meta.semConteudo && " · conteúdo da matéria concluído: revise ou adiante outra"}
        </p>
        {partes.length > 1 && (
          <p className="meta-segue">
            <ArrowRight aria-hidden="true" />
            {partes.slice(1).map((p, i) => <span key={`${p.itemId}${i}`}>{i > 0 && ", "}segue em <b>{ind?.nomeTopico(p.topicoId)}</b> ({fmtMin(p.minutos)})</span>)}
          </p>
        )}
        {!feita && principal && (
          <>
            <Roteiro parte={principal} item={itemDe(principal)} vistos={v?.subtopicosVistos} aoMarcarVisto={aoMarcarVisto} somenteLeitura={somenteLeitura} />
            {partes.slice(1).map((p, i) => (
              <Roteiro key={`${p.itemId}${i}`} parte={p} item={itemDe(p)} vistos={v?.subtopicosVistos} aoMarcarVisto={aoMarcarVisto} somenteLeitura={somenteLeitura} titulo={`Depois: ${ind?.nomeTopico(p.topicoId)}`} />
            ))}
          </>
        )}
      </div>

      <div className="meta-concluir">
        <span>{feita ? "Meta concluída" : "Concluir"}</span>
        <button type="button" className="check check--grande" aria-pressed={feita} disabled={ocupado || somenteLeitura} onClick={alternar}
          aria-label={`${feita ? "Desmarcar" : "Concluir"} ${titulo}, ${fmtMin(tempo)}`}>
          {feita && <Check aria-hidden="true" />}
        </button>
      </div>
    </article>
  );
}

/* Resumo da semana (segunda a domingo), dos registros das metas. */
export function ResumoSemana({ semana, compacto }) {
  const r = semana.resumo;
  const leg = semana.legado; // semana em que o sistema antigo ainda valia
  const metas = r.metas + (leg?.metas || 0);
  const cumpridas = r.cumpridas + (leg?.cumpridas || 0);
  const planejado = r.minutosPlanejados + (leg?.minutosPlanejados || 0);
  const feito = r.minutosFeitos + (leg?.minutosFeitos || 0);
  const naoCumpridas = r.naoCumpridas + (leg?.naoCumpridas || 0);
  // tempo por tipo: estudo (progressão, inclusive tópico visto de novo) e revisão
  const feitoEm = (ks) => ks.reduce((x, k) => x + (r.porCategoria[k]?.minutosFeitos || 0), 0);
  const cats = [["Estudo", feitoEm(["progressao", "rever_do_zero"])], ["Revisão", feitoEm(["revisao_recorrente", "revisao_automatica"])]].filter(([, min]) => min > 0);
  return (
    <div className={`resumo-semana${compacto ? " resumo-semana--compacto" : ""}`}>
      <div className="resumo-semana-topo">
        <span>Semana {fmtDataCurta(semana.inicio)}–{fmtDataCurta(semana.fim)}</span>
        <b className="num">{cumpridas} de {metas} metas · {fmtMin(feito)} de {fmtMin(planejado)}</b>
      </div>
      <Barra valor={metas ? (cumpridas / metas) * 100 : 0} />
      {!compacto && (cats.length > 0 || naoCumpridas > 0) && (
        <p className="resumo-semana-cats">
          {cats.map(([k, min]) => <span key={k}>{k}: <b className="num">{fmtMin(min)}</b></span>)}
          {naoCumpridas > 0 && <span className="perigo">{naoCumpridas} não {naoCumpridas === 1 ? "cumprida" : "cumpridas"}</span>}
        </p>
      )}
    </div>
  );
}

/* As duas semanas de metas. Mover: arrastar (mouse) ou tocar na meta e
   depois no dia (celular e teclado). Meta movida fica fixada no dia; o resto
   se reorganiza em volta dela. */
export function Agenda({ v, somenteLeitura, texto }) {
  const { s, ind } = useApp();
  const visual = useVisualMateria();
  const [arrastando, setArrastando] = useState(null);
  const [sobre, setSobre] = useState(null);
  const [selecao, setSelecao] = useState(null); // { id, nome, de }
  const { executar, ocupado, erro } = useAcao();
  const alunoId = v.aluno.id;
  const hoje = v.hoje;
  const fim = somarDias(hoje, HORIZONTE_DIAS - 1);
  const porData = new Map(v.dias.map((d) => [d.data, d]));
  // dias que já passaram nesta semana: o que foi feito em cada um
  const feitasEm = (data) => v.metas.filter((m) => m.status === "concluida" && m.concluidaEm === data).map(v.detalhar);
  const semanas = [];
  for (let ini = inicioDaSemana(hoje); ini <= fim; ini = somarDias(ini, 7)) {
    semanas.push(Array.from({ length: 7 }, (_, i) => somarDias(ini, i)).filter((d) => d <= fim));
  }
  const origem = selecao || arrastando;
  const mover = (id, para) => {
    setArrastando(null); setSobre(null); setSelecao(null);
    executar(() => s.metas.mover(alunoId, id, para));
  };

  return (
    <>
      <div className="faixa">
        <ResumoSemana semana={v.semana} />
        {v.fixadas > 0 && !somenteLeitura && (
          <Botao variante="vidro" tamanho="sm" icone={RotateCcw} disabled={ocupado} onClick={() => executar(() => s.metas.reorganizar(alunoId))}>Organizar de novo</Botao>
        )}
      </div>
      {texto && !somenteLeitura && <p className="previa-linha agenda-dica">{texto}</p>}
      <MensagemErro erro={erro} />
      {v.atrasadas.length > 0 && (
        <div className="aviso aviso--erro"><TriangleAlert aria-hidden="true" />{v.atrasadas.length} {v.atrasadas.length === 1 ? "meta atrasada" : "metas atrasadas"}: aparecem na lista de hoje.</div>
      )}

      {semanas.map((datas, w) => (
        <section key={datas[0]} className="agenda-semana" aria-label={w === 0 ? "Esta semana" : `Semana de ${fmtDataCurta(datas[0])}`}>
          <h2 className="eyebrow">{w === 0 ? "Esta semana" : w === 1 ? "Próxima semana" : `A partir de ${fmtDataCurta(datas[0])}`}</h2>
          <div className="semana-grade">
            {datas.map((data) => {
              const passado = data < hoje;
              const dia = porData.get(data);
              const metas = passado ? feitasEm(data) : dia?.metas || [];
              const alvo = !somenteLeitura && origem && !passado && origem.de !== data;
              const disponivel = dia?.disponivel ?? 0;
              const planejado = dia?.planejado ?? metas.reduce((x, m) => x + (m.duracaoReal || m.duracaoPlanejada), 0);
              const classes = ["dia", data === hoje && "dia--hoje", passado && "dia--passado", alvo && (sobre === data || selecao) && "dia--alvo", dia?.conflito && "dia--conflito"].filter(Boolean).join(" ");
              return (
                <section key={data} className={classes} aria-label={`${diaDaSemana(data)}, ${fmtDataCurta(data)}`}
                  onDragOver={(e) => { if (alvo) { e.preventDefault(); setSobre(data); } }}
                  onDragLeave={() => setSobre(null)}
                  onDrop={() => arrastando && alvo && mover(arrastando.id, data)}>
                  <div className="dia-topo">
                    <strong>{data === hoje ? "Hoje" : diaDaSemana(data)}</strong>
                    <span>{fmtDataCurta(data)}</span>
                  </div>
                  {!passado && (
                    <div className="dia-topo dia-carga">
                      <span>{metas.filter((m) => m.status === "concluida").length}/{metas.length}</span>
                      <span className={planejado > disponivel ? "txt-erro" : undefined}>{fmtMin(planejado)} de {fmtMin(disponivel)}</span>
                    </div>
                  )}
                  {dia?.conflito && (
                    <p className="dia-conflito"><TriangleAlert aria-hidden="true" />Revisões ({fmtMin(dia.conflito.minutosRevisoes)}) passam do dia</p>
                  )}
                  {metas.map((m) => {
                    const cor = visual(m.materiaId).cor;
                    const materia = ind?.nomeMateria(m.materiaId);
                    const topico = m.partes?.[0]?.topicoId || m.topicoId;
                    const nome = topico ? ind?.nomeTopico(topico) : materia; // o tópico é o que se estuda
                    const texto = (
                      <>
                        <strong>{nome}{m.fixada && m.status === "pendente" && <Pin aria-label="fixada" />}</strong>
                        <span className="chip-materia">{materia}{ehRevisao(m) ? " · revisão" : ""}</span>
                        <span className="num">{fmtMin(m.status === "concluida" ? m.duracaoReal || m.duracaoPlanejada : m.duracaoPlanejada)}</span>
                      </>
                    );
                    if (m.status === "concluida" || somenteLeitura) return <div key={m.id} className={`chip${m.status === "concluida" ? " chip--feita" : ""}`} style={{ "--cor": cor }}>{texto}</div>;
                    const selecionada = selecao?.id === m.id;
                    return (
                      <button key={m.id} type="button" draggable disabled={ocupado}
                        className={`chip${selecionada ? " chip--selecionada" : ""}${arrastando?.id === m.id ? " chip--arrastando" : ""}`}
                        style={{ "--cor": cor }} aria-pressed={selecionada}
                        aria-label={`${nome}, ${fmtMin(m.duracaoPlanejada)}. ${selecionada ? "Selecionada: escolha o dia" : "Levar para outro dia"}`}
                        onDragStart={() => { setSelecao(null); setArrastando({ id: m.id, de: data }); }}
                        onDragEnd={() => { setArrastando(null); setSobre(null); }}
                        onClick={() => setSelecao(selecionada ? null : { id: m.id, de: data, nome })}>
                        {texto}
                      </button>
                    );
                  })}
                  {metas.length === 0 && <p className="dia-vazio">{passado ? "—" : disponivel ? "Livre" : "Sem horário"}</p>}
                  {selecao && alvo && (
                    <Botao variante="solido" tamanho="sm" className="dia-soltar" onClick={() => mover(selecao.id, data)}>Levar para cá</Botao>
                  )}
                </section>
              );
            })}
          </div>
        </section>
      ))}

      {selecao && (
        <div className="barra-mover" role="status">
          <Hand aria-hidden="true" width={18} height={18} />
          <span>Escolha o dia para <strong>{selecao.nome}</strong>. Ela fica fixada lá.</span>
          <Botao variante="vidro" tamanho="sm" onClick={() => setSelecao(null)}>Cancelar</Botao>
        </div>
      )}
    </>
  );
}
