/* Desempenho de um aluno como "diagnóstico e ação" (a mesma tela para o
   aluno e para o moderador): o pulso, o diagnóstico e o plano de ação.
   Este arquivo só monta o layout; os números vêm de useDiagnostico e os
   gráficos ficam em graficos/. */

import "./desempenho.css";
import { useState } from "react";
import { Carregando } from "../../ui/ui.jsx";
import { PERIODOS, rotuloDoPeriodo, useDiagnostico } from "./useDiagnostico.js";
import { Segmentado } from "./ui.jsx";
import Pulso from "./Pulso.jsx";
import Diagnostico from "./Diagnostico.jsx";
import FocosAtencao from "./FocosAtencao.jsx";
import PorConteudo from "./PorConteudo.jsx";
import SimuladosResumo from "./SimuladosResumo.jsx";

function Secao({ id, titulo, children }) {
  return (
    <section aria-labelledby={id} className="space-y-3">
      <h2 id={id} className="text-xs font-semibold uppercase tracking-[0.08em] text-slate-400 dark:text-slate-500">{titulo}</h2>
      {children}
    </section>
  );
}

export function PainelDesempenho({ v }) {
  const [periodo, setPeriodo] = useState("30d");
  const d = useDiagnostico(v, periodo);
  if (!d) return <Carregando />;
  return (
    <div className="dg space-y-8 pb-12 text-slate-900 dark:text-white">
      <div className="flex flex-wrap items-center justify-between gap-3">
        <p className="text-sm text-slate-500 dark:text-slate-400">
          Período: <span className="font-medium text-slate-700 dark:text-slate-200">{rotuloDoPeriodo(d.filtro)}</span>
        </p>
        <Segmentado rotulo="Período" opcoes={PERIODOS} valor={periodo} aoMudar={setPeriodo} />
      </div>

      <Secao id="t-pulso" titulo="O pulso">
        <Pulso v={v} d={d} />
      </Secao>

      <Secao id="t-diagnostico" titulo="Diagnóstico">
        <Diagnostico d={d} />
      </Secao>

      <Secao id="t-acao" titulo="Plano de ação">
        <FocosAtencao v={v} focos={d.focos} />
        <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
          <PorConteudo registros={d.registros} />
          <SimuladosResumo simulados={d.simulados} />
        </div>
      </Secao>
    </div>
  );
}
