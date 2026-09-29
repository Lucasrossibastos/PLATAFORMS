/* Seção 3, plano de ação: os conteúdos com menor acerto no período e o
   recado do professor para quem errou (editável em Textos, por jornada ou
   por aluno). */

import { CircleCheck, ListChecks, NotebookPen } from "lucide-react";
import { useFrases } from "../../state/hooks.js";
import { AMOSTRA_MINIMA, LIMITE_FOCO } from "../../core/diagnostico.js";
import { useVisualMateria } from "../../ui/Areas.jsx";
import { Cabecalho, Cartao, VazioGrafico, fmtPctCurto } from "./ui.jsx";

export default function FocosAtencao({ v, focos: { focos, avaliados } }) {
  const visual = useVisualMateria();
  const t = useFrases(v.aluno);
  const recado = t("painel.desempenho.recadoFocos").trim();
  return (
    <Cartao aria-labelledby="t-focos">
      <Cabecalho
        id="t-focos" titulo="Focos de atenção"
        subtitulo={`Os conteúdos com menor acerto no período (a partir de ${AMOSTRA_MINIMA} questões e abaixo de ${LIMITE_FOCO}%).`}
      />
      {focos.length ? (
        <>
          <ul className="mt-4 list-none divide-y divide-slate-100 dark:divide-white/10">
            {focos.map((f, i) => (
              <li key={f.chave} className="flex items-center gap-3 py-4 sm:gap-4">
                <span className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500 sm:flex dark:bg-white/10 dark:text-slate-400">{i + 1}</span>
                <div className="min-w-0 flex-1">
                  <p className="truncate font-medium text-slate-900 dark:text-white">{f.nome}</p>
                  <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500 dark:text-slate-400">
                    <i className="inline-block size-2 shrink-0 rounded-full" style={{ background: visual(f.materiaId).cor }} aria-hidden="true" />
                    <span className="truncate">{f.contexto} · {f.acertos} de {f.total}</span>
                  </p>
                </div>
                <span className="shrink-0 rounded-full bg-rose-50 px-2.5 py-1 text-sm font-semibold tabular-nums text-rose-600 dark:bg-rose-400/10 dark:text-rose-400" title={`${f.acertos} acertos em ${f.total} questões`}>
                  {fmtPctCurto(f.pct)}
                </span>
              </li>
            ))}
          </ul>
          {recado && (
            <p className="mt-2 flex items-start gap-3 rounded-xl bg-blue-50/70 px-4 py-3 text-sm leading-relaxed text-slate-700 ring-1 ring-blue-600/10 dark:bg-blue-400/[0.07] dark:text-slate-200 dark:ring-blue-400/15">
              <NotebookPen className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
              <span className="whitespace-pre-line">{recado}</span>
            </p>
          )}
        </>
      ) : (
        <div className="mt-4">
          {avaliados ? (
            <VazioGrafico altura="h-36" icone={CircleCheck} titulo={`Nenhum conteúdo abaixo de ${LIMITE_FOCO}% no período`} texto="Bom sinal. Continue registrando questões para acompanhar." />
          ) : (
            <VazioGrafico altura="h-36" icone={ListChecks} titulo="Ainda sem dados suficientes" texto={`Registre questões com o tópico (${AMOSTRA_MINIMA} ou mais por conteúdo) para ver onde revisar.`} />
          )}
        </div>
      )}
    </Cartao>
  );
}
