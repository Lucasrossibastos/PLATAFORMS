/* Histórico de acerto nos simulados de um vestibular (linha curta). */

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fmtDataLonga } from "../../../core/datas.js";
import { CaixaDica, fmtPctCurto } from "../ui.jsx";

function Dica({ active, payload }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return <CaixaDica titulo={p.nome || "Simulado"} linhas={[["Data", fmtDataLonga(p.data)], ["Acerto", fmtPctCurto(p.pct)], ["Questões", `${p.acertos} de ${p.total}`]]} />;
}

export default function LinhaSimulados({ historico, altura = 72 }) {
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={historico} margin={{ top: 8, right: 8, bottom: 8, left: 8 }}>
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<Dica />} cursor={{ stroke: "var(--dg-grade)", strokeWidth: 1 }} wrapperStyle={{ zIndex: 20 }} allowEscapeViewBox={{ x: false, y: true }} />
          <Line
            type="monotone" dataKey="pct" stroke="var(--dg-azul)" strokeWidth={2}
            dot={{ r: 3, fill: "var(--dg-azul)", stroke: "var(--dg-superficie)", strokeWidth: 1.5 }}
            activeDot={{ r: 5, stroke: "var(--dg-superficie)", strokeWidth: 2 }} isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
