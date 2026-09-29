/* Pizza (rosca) de acertos, erros e questões em branco de um recorte. O
   acerto fica escrito no meio; cada fatia tem a dica com o número e a %. */

import { Cell, Pie, PieChart, ResponsiveContainer, Tooltip } from "recharts";
import { CaixaDica, fmtPctCurto } from "../ui.jsx";

export const COR_FATIA = { acertos: "var(--dg-acerto)", erros: "var(--dg-erro)", emBranco: "var(--dg-branco)" };

function Dica({ active, payload }) {
  const f = active && payload?.[0]?.payload;
  if (!f) return null;
  return <CaixaDica titulo={f.nome} linhas={[["Questões", f.valor, COR_FATIA[f.id]], ["Do total", fmtPctCurto(f.pct)]]} />;
}

export default function PizzaAcertos({ fatias, pct, total, altura = 240 }) {
  const comValor = fatias.filter((f) => f.valor > 0);
  return (
    <div className="relative" style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <PieChart>
          <Pie
            data={comValor} dataKey="valor" nameKey="nome" innerRadius="64%" outerRadius="92%" paddingAngle={comValor.length > 1 ? 2 : 0}
            cornerRadius={4} stroke="var(--dg-superficie)" strokeWidth={2} startAngle={90} endAngle={-270} isAnimationActive={false}
          >
            {comValor.map((f) => <Cell key={f.id} fill={COR_FATIA[f.id]} />)}
          </Pie>
          <Tooltip content={<Dica />} wrapperStyle={{ zIndex: 20 }} />
        </PieChart>
      </ResponsiveContainer>
      <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center" aria-hidden="true">
        <span className="text-3xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white">{fmtPctCurto(pct)}</span>
        <span className="text-xs text-slate-500 dark:text-slate-400">de acerto</span>
        <span className="text-[11px] tabular-nums text-slate-400 dark:text-slate-500">{total} {total === 1 ? "questão" : "questões"}</span>
      </div>
    </div>
  );
}
