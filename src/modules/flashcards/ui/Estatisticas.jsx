/* Estatísticas, como as do Anki, calculadas só dos dados do aluno:
   hoje, sequência, retenção real e estimada; revisões por dia; previsão dos
   próximos 30 dias; curva de retenção estimada (FSRS); cartões por estado em
   cada matéria; calendário dos últimos 12 meses.
   O filtro de matéria vale para tudo; o período, para as revisões. */

import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { BarChart3, Table2 } from "lucide-react";
import { useBase, useLoja, usePreferencia } from "../estado/hooks.js";
import { chaveDia, somarDias } from "../dados/datas.js";
import {
  curvaRetencao, distribuicao, niveisCalendario, nivelDo, previsao, resumirDias, sequencia, serieRevisoes, somarPeriodo,
} from "../estado/estatisticas.js";
import { BarrasEmpilhadas, Calendario, Colunas, Legenda, LegendaCalendario, Linha, numero, pct } from "./graficos.jsx";
import { Botao, Carregando, Erro, Vazio } from "./comum.jsx";

const COR = {
  novos: "var(--fc-g-novo)", novo: "var(--fc-g-novo)",
  aprendendo: "var(--fc-g-aprendendo)",
  revisao: "var(--fc-g-revisao)",
  suspenso: "var(--fc-g-suspenso)",
  linha: "var(--fc-g-linha)",
};
const SERIES_RESPOSTAS = [
  { id: "novos", rotulo: "Novos", cor: COR.novos },
  { id: "aprendendo", rotulo: "Aprendendo", cor: COR.aprendendo },
  { id: "revisao", rotulo: "Revisão", cor: COR.revisao },
];
const SERIES_ESTADOS = [
  { id: "novo", rotulo: "Novos", cor: COR.novo },
  { id: "aprendendo", rotulo: "Aprendendo", cor: COR.aprendendo },
  { id: "revisao", rotulo: "Em revisão", cor: COR.revisao },
  { id: "suspenso", rotulo: "Suspensos", cor: COR.suspenso },
];
const PERIODOS = [
  { dias: 30, rotulo: "30 dias" },
  { dias: 90, rotulo: "3 meses" },
  { dias: 365, rotulo: "12 meses" },
];
const JANELA = 371; // dias carregados: 53 semanas (calendário e sequência)

const dataDaChave = (chave) => { const [a, m, d] = chave.split("-").map(Number); return new Date(a, m - 1, d); };
const curta = (chave) => dataDaChave(chave).toLocaleDateString("pt-BR", { day: "numeric", month: "short" }).replace(".", "");
const longa = (chave) => dataDaChave(chave).toLocaleDateString("pt-BR", { weekday: "short", day: "numeric", month: "short", year: "numeric" }).replace(/\./g, "");
const minutos = (ms) => {
  const m = Math.round(ms / 60000);
  if (m < 60) return `${m} min`;
  const h = Math.floor(m / 60);
  return `${h} h${m % 60 ? ` ${m % 60} min` : ""}`;
};
const plural = (n, um, varios) => `${numero(n)} ${n === 1 ? um : varios}`;

/* ---------- peças ---------- */

function Numero({ rotulo, valor, detalhe }) {
  return (
    <div className="fc-numero">
      <span className="fc-numero-rotulo">{rotulo}</span>
      <strong className="fc-numero-valor">{valor}</strong>
      {detalhe && <span className="fc-numero-detalhe">{detalhe}</span>}
    </div>
  );
}

// cartão de gráfico com a alternativa em tabela (os mesmos números, sem depender de cor ou do mouse)
function Painel({ titulo, subtitulo, legenda, tabela, children, className = "" }) {
  const [emTabela, setEmTabela] = useState(false);
  return (
    <section className={`fc-graf ${className}`}>
      <header className="fc-graf-topo">
        <div>
          <h2>{titulo}</h2>
          {subtitulo && <p>{subtitulo}</p>}
        </div>
        {tabela && (
          <Botao tamanho="sm" variante="fantasma" icone={emTabela ? BarChart3 : Table2} aria-pressed={emTabela} onClick={() => setEmTabela((v) => !v)}>
            {emTabela ? "Gráfico" : "Tabela"}
          </Botao>
        )}
      </header>
      {!emTabela && legenda}
      {emTabela ? <div className="fc-graf-tabela">{tabela}</div> : children}
    </section>
  );
}

function Tabela({ colunas, linhas }) {
  return (
    <table className="fc-tabela-dados">
      <thead><tr>{colunas.map((c) => <th key={c} scope="col">{c}</th>)}</tr></thead>
      <tbody>{linhas.map((l) => <tr key={l[0]}>{l.map((v, i) => (i === 0 ? <th key={i} scope="row">{v}</th> : <td key={i}>{v}</td>))}</tr>)}</tbody>
    </table>
  );
}

/* ---------- tela ---------- */

export default function Estatisticas() {
  const { estado, repo, agendador } = useLoja();
  const base = useBase();
  const virada = estado.config.viradaDoDia;
  const [materiaId, setMateriaId] = usePreferencia("fc:estatisticas:materia", "");
  const [periodo, setPeriodo] = usePreferencia("fc:estatisticas:periodo", 30);
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState(null);

  useEffect(() => {
    let vivo = true;
    const agora = new Date();
    const hoje = chaveDia(agora, virada);
    const inicio = somarDias(hoje, -(JANELA - 1));
    Promise.all([
      repo.listar("dias", { onde: [["dia", ">=", inicio]] }),
      repo.listar("cartoes", {}),
    ]).then(([dias, cartoes]) => { if (vivo) setDados({ dias, cartoes, agora, hoje, inicio }); })
      .catch((e) => { if (vivo) setErro(e); });
    return () => { vivo = false; };
  }, [repo, virada]);

  const materias = estado.materias || [];
  const materiaValida = materias.some((m) => m.id === materiaId) ? materiaId : "";
  const nomeMateria = materias.find((m) => m.id === materiaValida)?.nome;

  const calc = useMemo(() => {
    if (!dados) return null;
    const { agora, hoje, inicio } = dados;
    // o dia de hoje vem ao vivo da loja (respostas dadas agora aparecem já)
    const dias = [...dados.dias.filter((d) => (d.dia || d.id) !== hoje), ...(estado.dia && estado.chaveDia === hoje ? [{ ...estado.dia, dia: hoje }] : [])];
    const resumo = resumirDias(dias, { materiaId: materiaValida || null });
    const cartoes = materiaValida ? dados.cartoes.filter((c) => c.materiaId === materiaValida) : dados.cartoes;
    const inicioPeriodo = somarDias(hoje, -(periodo - 1));
    const noPeriodo = somarPeriodo(resumo, inicioPeriodo, hoje);
    const deHoje = somarPeriodo(resumo, hoje, hoje);
    const seq = sequencia(resumo, hoje, inicio);
    const serie = serieRevisoes(resumo, hoje, periodo, { porSemana: periodo > 120 });
    const prev = previsao(cartoes, agora, { virada, dias: 30 });
    const curva = curvaRetencao(cartoes, agendador.curva, agora, { horizonte: 90 });
    const dist = distribuicao(cartoes, materiaValida ? materias.filter((m) => m.id === materiaValida) : materias);
    const valoresCal = [];
    for (let k = inicio; k <= hoje; k = somarDias(k, 1)) valoresCal.push({ chave: k, valor: resumo.get(k)?.total || 0 });
    const limites = niveisCalendario(valoresCal.map((v) => v.valor));
    const calendario = valoresCal.map((v) => ({ ...v, data: dataDaChave(v.chave), nivel: nivelDo(v.valor, limites), ms: resumo.get(v.chave)?.ms || 0 }));
    const diasComEstudoAno = valoresCal.filter((v) => v.valor > 0).length;
    return { hoje, resumo, noPeriodo, deHoje, seq, serie, prev, curva, dist, calendario, diasComEstudoAno, totalCartoes: cartoes.length };
  }, [dados, estado.dia, estado.chaveDia, materiaValida, periodo, virada, agendador, materias]);

  if (erro) return <Erro erro={erro} />;
  if (!calc) return <Carregando texto="Calculando suas estatísticas…" />;

  if (!dados.cartoes.length) {
    return (
      <Vazio icone={BarChart3} titulo="Ainda não há o que medir" texto="Crie alguns cartões e estude: as revisões, a retenção e a sequência de dias aparecem aqui.">
        <Link className="fc-btn fc-btn--primario" to={`${base}/novo`}>Criar cartões</Link>
      </Vazio>
    );
  }

  const { noPeriodo, deHoje, seq, serie, prev, curva, dist } = calc;
  const meta = estado.config.retencao;
  const retencaoReal = noPeriodo.revisoesFeitas ? noPeriodo.revisoesCertas / noPeriodo.revisoesFeitas : null;
  const rAgora = curva.pontos[0]?.r ?? null;
  const rotuloPeriodo = PERIODOS.find((p) => p.dias === periodo)?.rotulo || `${periodo} dias`;
  const porSemana = periodo > 120;
  const mediaPrev = prev.pontos.reduce((s, p) => s + p.total, 0) / prev.pontos.length;
  const em = (dias) => curva.pontos.find((p) => p.dia === dias)?.r;
  const menorR = curva.pontos.length ? Math.min(...curva.pontos.map((p) => p.r)) : 1;
  const pisoY = Math.max(0, Math.min(Math.floor(menorR * 10) / 10, Math.floor((meta - 0.05) * 10) / 10));
  const divisoesY = [];
  for (let v = pisoY; v <= 1.0001; v += (1 - pisoY) > 0.4 ? 0.2 : 0.1) divisoesY.push(Math.round(v * 100) / 100);

  const dicaRespostas = (p) => ({
    titulo: porSemana ? `Semana de ${curta(p.inicio)} a ${curta(p.fim)}` : longa(p.chave),
    linhas: p.total ? [
      ...SERIES_RESPOSTAS.map((s) => ({ cor: s.cor, rotulo: s.rotulo, valor: numero(p[s.id]) })),
    ] : [{ rotulo: "sem estudo", valor: "0" }],
    rodape: p.total ? `${plural(p.total, "resposta", "respostas")} · ${minutos(p.ms)}${p.revisoesFeitas ? ` · ${pct(p.revisoesCertas / p.revisoesFeitas)} de acerto nas revisões` : ""}` : null,
  });

  return (
    <div className="fc-estat">
      <header className="fc-pagina-topo"><h1>Estatísticas</h1></header>

      <div className="fc-estat-filtros" role="group" aria-label="Filtros">
        <label className="fc-estat-filtro">
          <span className="fc-sr">Matéria</span>
          <select className="fc-entrada" value={materiaValida} onChange={(e) => setMateriaId(e.target.value)}>
            <option value="">Todas as matérias</option>
            {materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </select>
        </label>
        <div className="fc-escolhas fc-escolhas--compactas" role="radiogroup" aria-label="Período das revisões">
          {PERIODOS.map((p) => (
            <button key={p.dias} type="button" role="radio" aria-checked={periodo === p.dias} className="fc-escolha" onClick={() => setPeriodo(p.dias)}>{p.rotulo}</button>
          ))}
        </div>
      </div>

      <div className="fc-numeros">
        <Numero rotulo="Hoje" valor={plural(deHoje.total, "cartão", "cartões")}
          detalhe={deHoje.total ? `${minutos(deHoje.ms)} · ${pct((deHoje.total - deHoje.erros) / deHoje.total)} de acerto` : "Nenhuma resposta ainda"} />
        <Numero rotulo="Sequência" valor={`${plural(seq.atual, "dia", "dias")}${seq.limitada ? "+" : ""}`}
          detalhe={seq.atual && !seq.estudouHoje ? "Estude hoje para manter" : `Recorde: ${plural(seq.maior, "dia", "dias")}${seq.limitada ? "+" : ""}`} />
        <Numero rotulo={`Retenção real · ${rotuloPeriodo}`} valor={retencaoReal == null ? "—" : pct(retencaoReal, 1)}
          detalhe={retencaoReal == null ? "Sem revisões no período" : `Meta ${pct(meta)} · ${plural(noPeriodo.revisoesFeitas, "revisão", "revisões")}`} />
        <Numero rotulo="Retenção estimada agora" valor={rAgora == null ? "—" : pct(rAgora, 1)}
          detalhe={rAgora == null ? "Nenhum cartão estudado ainda" : `Média de ${plural(curva.cartoes, "cartão estudado", "cartões estudados")}`} />
      </div>

      <Painel titulo="Revisões por dia"
        subtitulo={noPeriodo.total
          ? `${plural(noPeriodo.total, "resposta", "respostas")} em ${rotuloPeriodo} · ${minutos(noPeriodo.ms)} de estudo · média de ${numero(Math.round(noPeriodo.total / Math.max(1, noPeriodo.diasEstudados)))} por dia estudado${porSemana ? " · por semana" : ""}`
          : `Nenhuma resposta em ${rotuloPeriodo}${nomeMateria ? ` de ${nomeMateria}` : ""}.`}
        legenda={<Legenda series={SERIES_RESPOSTAS} />}
        tabela={<Tabela colunas={[porSemana ? "Semana" : "Dia", "Novos", "Aprendendo", "Revisão", "Total", "Tempo", "Acerto"]}
          linhas={[...serie].reverse().filter((p) => p.total).map((p) => [porSemana ? `${curta(p.inicio)}–${curta(p.fim)}` : curta(p.chave), p.novos, p.aprendendo, p.revisao, p.total, minutos(p.ms), p.revisoesFeitas ? pct(p.revisoesCertas / p.revisoesFeitas) : "—"])} />}>
        <Colunas pontos={serie} series={SERIES_RESPOSTAS} rotulo={`Respostas por ${porSemana ? "semana" : "dia"}, ${rotuloPeriodo}`}
          rotuloX={(p) => (p.chave === calc.hoje && !porSemana ? "hoje" : curta(porSemana ? p.inicio : p.chave))} dica={dicaRespostas} />
      </Painel>

      <div className="fc-estat-dupla">
        <Painel titulo="Próximos 30 dias"
          subtitulo={`${plural(Math.round(mediaPrev * 30), "revisão prevista", "revisões previstas")} · média de ${numero(Math.round(mediaPrev))} por dia${prev.atrasados ? ` · ${plural(prev.atrasados, "atrasado", "atrasados")} contam em hoje` : ""}`}
          tabela={<Tabela colunas={["Dia", "Cartões"]} linhas={prev.pontos.filter((p) => p.total).map((p) => [p.chave === calc.hoje ? "Hoje" : curta(p.chave), p.total])} />}>
          <Colunas pontos={prev.pontos} series={[{ id: "total", rotulo: "Cartões", cor: COR.revisao }]} altura={200} rotulosDoInicio rotulo="Cartões que vencem em cada um dos próximos 30 dias"
            rotuloX={(p) => (p.chave === calc.hoje ? "hoje" : curta(p.chave))}
            dica={(p) => ({ titulo: p.chave === calc.hoje ? "Hoje" : longa(p.chave), linhas: [{ rotulo: p.total === 1 ? "cartão vence" : "cartões vencem", valor: numero(p.total) }], rodape: p.chave === calc.hoje && prev.atrasados ? `inclui ${plural(prev.atrasados, "atrasado", "atrasados")}` : null })} />
        </Painel>

        <Painel titulo="Curva de retenção estimada"
          subtitulo={curva.cartoes
            ? `Quanto você lembraria sem revisar nada (média do FSRS de ${plural(curva.cartoes, "cartão", "cartões")}): hoje ${pct(rAgora)}, em 7 dias ${pct(em(7))}, em 30 dias ${pct(em(30))}.`
            : "Aparece quando houver cartões estudados."}
          tabela={curva.cartoes ? <Tabela colunas={["Daqui a", "Retenção estimada"]} linhas={curva.pontos.filter((p) => p.dia % 7 === 0 || p.dia === 1).map((p) => [p.dia ? plural(p.dia, "dia", "dias") : "Hoje", pct(p.r, 1)])} /> : null}>
          {curva.cartoes ? (
            <Linha pontos={curva.pontos.map((p) => ({ x: p.dia, y: p.r }))} dominioY={[divisoesY[0], 1]} divisoesY={divisoesY}
              alvo={meta} rotuloAlvo={`Meta ${pct(meta)}`} formatarY={(v) => pct(v)} cor={COR.linha} altura={200}
              rotulo="Retenção estimada nos próximos 90 dias sem revisões"
              rotuloX={(p) => (p.x === 0 ? "hoje" : `+${p.x} d`)}
              dica={(p) => ({ titulo: p.x === 0 ? "Hoje" : `Daqui a ${plural(p.x, "dia", "dias")}`, linhas: [{ cor: COR.linha, rotulo: "retenção estimada", valor: pct(p.y, 1) }] })} />
          ) : <p className="fc-graf-vazio">Estude alguns cartões para ver a curva.</p>}
        </Painel>
      </div>

      <Painel titulo="Cartões por estado"
        subtitulo={`${plural(dist.total.total, "cartão", "cartões")} · ${plural(dist.total.maduros, "maduro", "maduros")} (intervalo de 21 dias ou mais)`}
        legenda={<Legenda series={SERIES_ESTADOS} />}
        tabela={<Tabela colunas={["Matéria", "Novos", "Aprendendo", "Em revisão", "Suspensos", "Total", "Maduros"]}
          linhas={dist.linhas.map((l) => [l.nome, l.novo, l.aprendendo, l.revisao, l.suspenso, l.total, l.maduros])} />}>
        <BarrasEmpilhadas linhas={dist.linhas} series={SERIES_ESTADOS}
          dica={(l) => ({ titulo: l.nome, linhas: SERIES_ESTADOS.map((s) => ({ cor: s.cor, rotulo: s.rotulo, valor: numero(l[s.id]) })), rodape: `${plural(l.total, "cartão", "cartões")} · ${plural(l.maduros, "maduro", "maduros")}` })} />
      </Painel>

      <Painel titulo="Dias estudados" className="fc-graf--calendario"
        subtitulo={`${plural(calc.diasComEstudoAno, "dia", "dias")} com estudo nos últimos 12 meses · sequência atual ${plural(seq.atual, "dia", "dias")} · recorde ${plural(seq.maior, "dia", "dias")}`}
        legenda={<LegendaCalendario />}
        tabela={<Tabela colunas={["Dia", "Respostas", "Tempo"]} linhas={[...calc.calendario].reverse().filter((d) => d.valor).map((d) => [curta(d.chave), d.valor, minutos(d.ms)])} />}>
        <Calendario dias={calc.calendario} rotulo="Calendário de estudo dos últimos 12 meses"
          dica={(d) => ({ titulo: longa(d.chave), linhas: [{ rotulo: d.valor === 1 ? "resposta" : "respostas", valor: numero(d.valor) }], rodape: d.valor ? minutos(d.ms) : "sem estudo" })} />
      </Painel>

      <p className="fc-dica fc-estat-nota">
        Retenção real: nas revisões, a parcela em que você não apertou “Novamente” (compare com a meta dos Ajustes).
        Retenção estimada: a probabilidade de lembrar calculada pelo FSRS para cada cartão, com os parâmetros padrão do algoritmo.
      </p>
    </div>
  );
}
