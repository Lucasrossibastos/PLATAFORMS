/* Peças visuais da tela Desempenho (Tailwind): cartão, cabeçalho de seção,
   controle segmentado, selo de variação, caixa de dica dos gráficos e a
   troca gráfico/tabela. */

import { ArrowDownRight, ArrowUpRight, Minus, Table2, ChartSpline } from "lucide-react";

export const fmtNum = (v, casas = 1) => {
  const r = Math.round(v * 10 ** casas) / 10 ** casas;
  return String(r).replace(".", ",");
};
export const fmtPctCurto = (v) => (v == null ? "–" : `${fmtNum(v)}%`);

export function Cartao({ as: Tag = "section", className = "", children, ...resto }) {
  return (
    <Tag
      className={`rounded-2xl bg-white p-5 shadow-sm ring-1 ring-slate-900/5 sm:p-6 dark:bg-white/[0.04] dark:shadow-none dark:ring-white/10 ${className}`}
      {...resto}
    >
      {children}
    </Tag>
  );
}

export function Cabecalho({ id, titulo, subtitulo, direita }) {
  return (
    <div className="flex flex-wrap items-start justify-between gap-x-4 gap-y-3">
      <div className="min-w-0 flex-1 basis-56">
        <h2 id={id} className="text-[15px] font-semibold tracking-tight text-slate-900 dark:text-white">{titulo}</h2>
        {subtitulo && <p className="mt-1 max-w-prose text-sm leading-relaxed text-slate-500 dark:text-slate-400">{subtitulo}</p>}
      </div>
      {direita && <div className="flex shrink-0 items-center gap-2">{direita}</div>}
    </div>
  );
}

/* Botões de alternância num trilho (um ativo por vez). */
export function Segmentado({ rotulo, opcoes, valor, aoMudar }) {
  return (
    <div role="group" aria-label={rotulo} className="inline-flex rounded-lg bg-slate-100 p-0.5 dark:bg-white/[0.06]">
      {opcoes.map((o) => {
        const ativo = o.id === valor;
        return (
          <button
            key={o.id}
            type="button"
            aria-pressed={ativo}
            onClick={() => aoMudar(o.id)}
            className={`whitespace-nowrap rounded-md px-2.5 py-1 text-[13px] font-medium transition-colors focus-visible:outline-2 focus-visible:outline-offset-1 focus-visible:outline-blue-600 sm:px-3 ${
              ativo
                ? "bg-white text-slate-900 shadow-sm dark:bg-white/15 dark:text-white"
                : "text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
            }`}
          >
            {o.nome}
          </button>
        );
      })}
    </div>
  );
}

/* Selo de variação: seta + sinal + número (a cor nunca vai sozinha). */
export function Variacao({ valor, sufixo = " p.p.", descricao }) {
  if (valor == null) return null;
  const igual = Math.abs(valor) < 0.05;
  const sobe = !igual && valor > 0;
  const Icone = igual ? Minus : sobe ? ArrowUpRight : ArrowDownRight;
  const cor = igual
    ? "bg-slate-100 text-slate-600 dark:bg-white/10 dark:text-slate-300"
    : sobe
      ? "bg-emerald-50 text-emerald-700 dark:bg-emerald-400/10 dark:text-emerald-300"
      : "bg-rose-50 text-rose-700 dark:bg-rose-400/10 dark:text-rose-300";
  return (
    <span title={descricao} className={`inline-flex items-center gap-0.5 rounded-full px-2 py-0.5 text-xs font-medium tabular-nums ${cor}`}>
      <Icone className="size-3.5" aria-hidden="true" />
      {igual ? "0" : `${sobe ? "+" : "−"}${fmtNum(Math.abs(valor))}`}{sufixo}
      {descricao && <span className="sr-only">. {descricao}</span>}
    </span>
  );
}

/* Caixa das dicas (tooltip) dos gráficos. linhas: [rótulo, valor, cor?] */
export function CaixaDica({ titulo, linhas = [], nota }) {
  return (
    <div className="max-w-64 min-w-44 rounded-xl bg-white/95 px-3 py-2.5 text-xs shadow-lg ring-1 ring-slate-900/10 backdrop-blur-sm dark:bg-neutral-900/95 dark:ring-white/10">
      <p className="font-semibold text-slate-900 dark:text-white">{titulo}</p>
      <dl className="mt-1.5 space-y-1">
        {linhas.filter(Boolean).map(([k, v, cor]) => (
          <div key={k} className="flex items-center justify-between gap-4">
            <dt className="flex items-center gap-1.5 text-slate-500 dark:text-slate-400">
              {cor && <i className="inline-block size-2 rounded-full" style={{ background: cor }} aria-hidden="true" />}
              {k}
            </dt>
            <dd className="font-medium tabular-nums text-slate-900 dark:text-white">{v}</dd>
          </div>
        ))}
      </dl>
      {nota && <p className="mt-2 border-t border-slate-100 pt-2 leading-snug text-slate-600 dark:border-white/10 dark:text-slate-300">{nota}</p>}
    </div>
  );
}

/* Troca entre o gráfico e a tabela com os mesmos números. */
export function BotaoTabela({ tabela, aoTrocar, rotulo }) {
  const Icone = tabela ? ChartSpline : Table2;
  return (
    <button
      type="button"
      aria-pressed={tabela}
      onClick={aoTrocar}
      title={tabela ? "Ver o gráfico" : "Ver os números em tabela"}
      className="inline-flex size-8 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
    >
      <Icone className="size-4" aria-hidden="true" />
      <span className="sr-only">{tabela ? `Ver o gráfico de ${rotulo}` : `Ver a tabela de ${rotulo}`}</span>
    </button>
  );
}

export function Tabela({ colunas, linhas, legenda }) {
  return (
    <div className="-mx-1 overflow-x-auto">
      <table className="w-full min-w-[20rem] border-collapse text-sm">
        {legenda && <caption className="sr-only">{legenda}</caption>}
        <thead>
          <tr className="border-b border-slate-100 dark:border-white/10">
            {colunas.map((c, i) => (
              <th key={c} scope="col" className={`px-1 py-2 text-xs font-medium text-slate-500 dark:text-slate-400 ${i ? "text-right" : "text-left"}`}>{c}</th>
            ))}
          </tr>
        </thead>
        <tbody>
          {linhas.map((l) => (
            <tr key={l[0]} className="border-b border-slate-50 last:border-0 dark:border-white/5">
              {l.map((v, i) => (
                <td key={i} className={`px-1 py-2 ${i ? "text-right tabular-nums text-slate-700 dark:text-slate-300" : "font-medium text-slate-900 dark:text-white"}`}>{v}</td>
              ))}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export function VazioGrafico({ icone: Icone, titulo, texto, altura = "h-64" }) {
  return (
    <div className={`flex ${altura} flex-col items-center justify-center gap-2 rounded-xl bg-slate-50 px-6 text-center dark:bg-white/[0.03]`}>
      {Icone && <Icone className="size-5 text-slate-400" aria-hidden="true" />}
      <p className="text-sm font-medium text-slate-700 dark:text-slate-200">{titulo}</p>
      {texto && <p className="max-w-xs text-sm text-slate-500 dark:text-slate-400">{texto}</p>}
    </div>
  );
}
