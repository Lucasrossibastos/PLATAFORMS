/* Simulados do período, um bloco por vestibular (cada prova na sua escala,
   sem ranking entre elas): média, último e a linha do histórico. */

import { useApp } from "../../state/AppContext.jsx";
import { desempenhoSimulados } from "../../core/desempenho.js";
import LinhaSimulados from "./graficos/LinhaSimulados.jsx";
import { Cabecalho, Cartao, VazioGrafico, fmtPctCurto } from "./ui.jsx";

export default function SimuladosResumo({ simulados }) {
  const { ind } = useApp();
  const d = desempenhoSimulados(simulados, ind);
  return (
    <Cartao aria-labelledby="t-simulados">
      <Cabecalho id="t-simulados" titulo="Simulados" subtitulo="Cada vestibular na sua escala, sem ranking entre eles." />
      {d.quantidade ? (
        <ul className="mt-4 list-none space-y-3">
          {d.porVestibular.map((g) => (
            <li key={g.vestibularId} className="rounded-xl bg-slate-50 p-4 dark:bg-white/[0.03]">
              <div className="flex flex-wrap items-baseline justify-between gap-x-4 gap-y-1">
                <p className="font-medium text-slate-900 dark:text-white">{g.nome}</p>
                <p className="text-sm tabular-nums text-slate-500 dark:text-slate-400">
                  {g.quantidade} {g.quantidade === 1 ? "simulado" : "simulados"} · média <b className="font-semibold text-slate-900 dark:text-white">{fmtPctCurto(g.mediaPct)}</b> · último {fmtPctCurto(g.ultimoPct)}
                </p>
              </div>
              {g.historico.length > 1 && <div className="mt-2"><LinhaSimulados historico={g.historico} /></div>}
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4"><VazioGrafico altura="h-36" titulo="Nenhum simulado no período" texto="Registre simulados para acompanhar cada vestibular." /></div>
      )}
    </Cartao>
  );
}
