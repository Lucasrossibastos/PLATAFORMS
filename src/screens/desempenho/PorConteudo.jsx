/* Acerto por conteúdo, descendo de matéria para tópico e subtópico. Cada
   linha traz o número escrito; a barra só dá a proporção (uma cor). */

import { useState } from "react";
import { ChevronRight } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { desempenhoPorMateria, desempenhoPorSubtopico, desempenhoPorTopico } from "../../core/desempenho.js";
import { Cabecalho, Cartao, VazioGrafico, fmtPctCurto } from "./ui.jsx";

export default function PorConteudo({ registros }) {
  const { ind } = useApp();
  const [caminho, setCaminho] = useState({}); // { materiaId, topicoId }
  const nivel = caminho.topicoId ? "subtopico" : caminho.materiaId ? "topico" : "materia";
  const linhas = (nivel === "materia" ? desempenhoPorMateria(registros, ind)
    : nivel === "topico" ? desempenhoPorTopico(registros, caminho.materiaId, ind)
      : desempenhoPorSubtopico(registros, caminho.topicoId, ind)).sort((a, b) => b.total - a.total);
  const abrir = nivel === "materia" ? (l) => setCaminho({ materiaId: l.id })
    : nivel === "topico" ? (l) => setCaminho({ materiaId: caminho.materiaId, topicoId: l.id }) : null;
  const semSub = nivel === "subtopico" ? registros.filter((r) => r.topicoId === caminho.topicoId && !r.subtopicoId).length : 0;
  const nomeNivel = { materia: "matéria", topico: "tópico", subtopico: "subtópico" }[nivel];

  const migalha = "rounded-md px-1.5 py-0.5 font-medium text-blue-600 hover:bg-blue-50 dark:text-blue-400 dark:hover:bg-white/10";
  return (
    <Cartao aria-labelledby="t-conteudo">
      <Cabecalho id="t-conteudo" titulo="Acerto por conteúdo" subtitulo={`Por ${nomeNivel}, do que tem mais questões para o que tem menos.${abrir ? " Toque para abrir." : ""}`} />
      {nivel !== "materia" && (
        <nav aria-label="Nível" className="mt-3 flex flex-wrap items-center gap-1 text-sm text-slate-500 dark:text-slate-400">
          <button type="button" className={migalha} onClick={() => setCaminho({})}>Matérias</button>
          <ChevronRight className="size-3.5" aria-hidden="true" />
          {nivel === "subtopico" ? (
            <>
              <button type="button" className={migalha} onClick={() => setCaminho({ materiaId: caminho.materiaId })}>{ind.nomeMateria(caminho.materiaId)}</button>
              <ChevronRight className="size-3.5" aria-hidden="true" />
              <span className="px-1.5 text-slate-700 dark:text-slate-200">{ind.nomeTopico(caminho.topicoId)}</span>
            </>
          ) : <span className="px-1.5 text-slate-700 dark:text-slate-200">{ind.nomeMateria(caminho.materiaId)}</span>}
        </nav>
      )}
      {linhas.length ? (
        <ul className="mt-3 list-none space-y-1">
          {linhas.map((l) => {
            const corpo = (
              <>
                <span className="min-w-0 flex-1">
                  <span className="flex items-baseline justify-between gap-3">
                    <span className="truncate text-sm font-medium text-slate-800 dark:text-slate-100">{l.nome}</span>
                    <span className="shrink-0 text-sm tabular-nums text-slate-500 dark:text-slate-400">
                      <b className="font-semibold text-slate-900 dark:text-white">{fmtPctCurto(l.pct)}</b> · {l.total}
                    </span>
                  </span>
                  <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10" aria-hidden="true">
                    <span className="block h-full rounded-full bg-blue-600 dark:bg-blue-500" style={{ width: `${l.pct}%` }} />
                  </span>
                </span>
                {abrir && <ChevronRight className="size-4 shrink-0 text-slate-300 dark:text-slate-600" aria-hidden="true" />}
              </>
            );
            return (
              <li key={l.id}>
                {abrir ? (
                  <button type="button" onClick={() => abrir(l)} aria-label={`${l.nome}: ${fmtPctCurto(l.pct)} de acerto em ${l.total} questões. Abrir`}
                    className="flex w-full items-center gap-3 rounded-xl px-2 py-2 text-left transition-colors hover:bg-slate-50 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/5">
                    {corpo}
                  </button>
                ) : <div className="flex items-center gap-3 px-2 py-2">{corpo}</div>}
              </li>
            );
          })}
        </ul>
      ) : (
        <div className="mt-4"><VazioGrafico altura="h-36" titulo="Sem questões no período" texto="Registre questões para ver o acerto por matéria, tópico e subtópico." /></div>
      )}
      {semSub > 0 && <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">{semSub} {semSub === 1 ? "registro deste tópico não tem" : "registros deste tópico não têm"} subtópico e não entram aqui.</p>}
    </Cartao>
  );
}
