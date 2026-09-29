import { useState } from "react";
import { ArrowRight, Check, Hand, Pin, RotateCcw, TriangleAlert } from "lucide-react";
import { fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta, inicioDaSemana, somarDias } from "../../core/datas.js";
import { ehProgressao, HORIZONTE_DIAS } from "../../core/motorMetas.js";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao } from "../../state/hooks.js";
import { Barra, Botao, MensagemErro } from "../../ui/ui.jsx";

const DIA_CURTO = ["Dom", "Seg", "Ter", "Qua", "Qui", "Sex", "Sáb"];
const diaDaSemana = (iso) => DIA_CURTO[new Date(`${iso}T12:00:00`).getDay()];
const pct = (x) => `${Math.round((x || 0) * 100)}%`;
const ehRevisao = (m) => !ehProgressao(m);

// só a revisão tem etiqueta; estudar de novo um tópico é progressão comum
function Categoria({ meta }) {
  return ehRevisao(meta) ? <span className="etiqueta etiqueta--rev">Revisão</span> : null;
}

/* O que a meta estuda: tópico(s) com a % de agora; concluída, antes → depois. */
function Conteudo({ meta }) {
  const { ind } = useApp();
  const partes = meta.partes || [];
  if (!partes.length) {
    return <div className="meta-topico">{meta.semConteudo ? "Conteúdo da matéria concluído: revise ou adiante outra" : "—"}</div>;
  }
  const feita = meta.status === "concluida";
  return (
    <div className="meta-topico meta-partes">
      {partes.map((p, i) => (
        <span key={`${p.itemId}${i}`} className="meta-parte">
          {i > 0 && <ArrowRight aria-hidden="true" />}
          <span>{ind?.nomeTopico(p.topicoId)}</span>
          {feita && p.pctAntes != null && !ehRevisao(meta)
            ? <span className="meta-pct num">{pct(p.pctAntes)} → <b>{pct(p.pctDepois)}</b>{p.concluiu && <Check aria-label="tópico concluído" />}</span>
            : p.pct != null && !feita && <span className="meta-pct num">{pct(p.pct)}</span>}
        </span>
      ))}
    </div>
  );
}

/* Uma meta: tocar no círculo conclui com o tempo planejado; tocar no tempo
   deixa informar outro. Concluída: tocar de novo desfaz (24 h). */
export function MetaLinha({ meta, atrasada, aoConcluir, aoDesfazer, ocupado, somenteLeitura }) {
  const { ind } = useApp();
  const [editando, setEditando] = useState(false);
  const [minutos, setMinutos] = useState(meta.duracaoPlanejada);
  const feita = meta.status === "concluida";
  const nome = ind?.nomeMateria(meta.materiaId);
  const tempo = feita ? meta.duracaoReal || meta.duracaoPlanejada : meta.duracaoPlanejada;
  const alternar = () => (feita ? aoDesfazer?.(meta) : aoConcluir?.(meta));
  return (
    <div className={`meta${atrasada ? " meta--atrasada" : ""}${feita ? " meta--feita" : ""}`}>
      <button type="button" className="check" aria-pressed={feita} disabled={ocupado || somenteLeitura} onClick={alternar}
        aria-label={`${feita ? "Desmarcar" : "Concluir"} ${nome}, ${fmtMin(tempo)}`}>
        {feita && <Check aria-hidden="true" />}
      </button>
      <div style={{ minWidth: 0 }}>
        <div className="meta-materia">
          <i style={{ "--cor": ehRevisao(meta) ? "var(--rev)" : ind?.corDaMateria(meta.materiaId) }} aria-hidden="true" />
          <span>{nome}</span>
          <Categoria meta={meta} />
          {atrasada && !feita && <span className="etiqueta etiqueta--perigo">Atrasada · {fmtDataCurta(meta.dataPlanejada)}</span>}
          {meta.fixada && !feita && <Pin className="meta-fixada" aria-label="Você pôs neste dia" />}
        </div>
        <Conteudo meta={meta} />
      </div>
      {editando && !feita ? (
        <form className="meta-tempo" onSubmit={(e) => { e.preventDefault(); setEditando(false); aoConcluir?.(meta, Number(minutos)); }}>
          <input className="entrada num" type="number" min="1" max="720" value={minutos} onChange={(e) => setMinutos(e.target.value)} aria-label="Minutos estudados" autoFocus />
          <Botao type="submit" tamanho="sm" icone={Check} disabled={ocupado} aria-label="Concluir com este tempo" />
        </form>
      ) : (
        <button type="button" className="meta-min" disabled={feita || somenteLeitura} onClick={() => setEditando(true)} title={feita ? undefined : "Estudou outro tempo? Toque para informar"}>
          {fmtMin(tempo)}
        </button>
      )}
    </div>
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
                    const cor = ehRevisao(m) ? "var(--rev)" : ind?.corDaMateria(m.materiaId);
                    const nome = ind?.nomeMateria(m.materiaId);
                    const topico = m.partes?.[0]?.topicoId;
                    const texto = (
                      <>
                        <strong>{nome}{m.fixada && m.status === "pendente" && <Pin aria-label="fixada" />}</strong>
                        {topico && <span className="chip-topico">{ind?.nomeTopico(topico)}</span>}
                        {ehRevisao(m) && <small>REVISÃO · </small>}
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
