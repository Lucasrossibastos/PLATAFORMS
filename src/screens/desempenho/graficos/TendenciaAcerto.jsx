/* Linha curta do acerto semana a semana (cartão "Taxa de domínio"). */

import { Line, LineChart, ResponsiveContainer, Tooltip, YAxis } from "recharts";
import { fmtDataCurta, somarDias } from "../../../core/datas.js";
import { CaixaDica, fmtPctCurto } from "../ui.jsx";

function Dica({ active, payload }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  return (
    <CaixaDica
      titulo={`Semana de ${fmtDataCurta(p.semana)} a ${fmtDataCurta(somarDias(p.semana, 6))}`}
      linhas={p.total ? [["Acerto", fmtPctCurto(p.pct)], ["Questões", p.total]] : [["Questões", "nenhuma"]]}
    />
  );
}

export default function TendenciaAcerto({ semanas, altura = 44 }) {
  if (semanas.filter((s) => s.pct != null).length < 2) return null; // um ponto não faz tendência
  return (
    <div style={{ height: altura }} aria-hidden="true">
      <ResponsiveContainer width="100%" height="100%">
        <LineChart data={semanas} margin={{ top: 6, right: 6, bottom: 6, left: 6 }}>
          <YAxis hide domain={[0, 100]} />
          <Tooltip content={<Dica />} cursor={{ stroke: "var(--dg-grade)", strokeWidth: 1 }} wrapperStyle={{ zIndex: 20 }} allowEscapeViewBox={{ x: true, y: true }} />
          <Line
            type="monotone" dataKey="pct" stroke="var(--dg-azul)" strokeWidth={2} connectNulls
            dot={{ r: 2.5, fill: "var(--dg-azul)", strokeWidth: 0 }} activeDot={{ r: 4.5, stroke: "var(--dg-superficie)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
        </LineChart>
      </ResponsiveContainer>
    </div>
  );
}
