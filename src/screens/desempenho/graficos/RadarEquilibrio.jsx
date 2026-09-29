/* Radar das grandes áreas. Modo "tempo": a fatia do tempo focado do aluno
   (área azul) contra a fatia que o plano pede (contorno tracejado, a meta).
   Modo "acerto": a taxa de acerto em cada área. O valor de cada área fica
   escrito no próprio eixo; a dica mostra os detalhes. */

import { PolarAngleAxis, PolarGrid, PolarRadiusAxis, Radar, RadarChart, ResponsiveContainer, Tooltip } from "recharts";
import { fmtMin } from "../../../core/nucleo.js";
import { CaixaDica, fmtPctCurto } from "../ui.jsx";

const teto = (x) => Math.min(100, Math.max(40, Math.ceil((x + 5) / 10) * 10));

function Dica({ active, payload, modo }) {
  const e = active && payload?.[0]?.payload;
  if (!e) return null;
  const linhas = modo === "tempo"
    ? [["Seu tempo", `${fmtPctCurto(e.tempo)} · ${fmtMin(e.minutos)}`, "var(--dg-azul)"], e.plano != null && ["O plano pede", fmtPctCurto(e.plano), "var(--dg-plano)"]]
    : [["Acerto", e.acerto == null ? "sem questões" : fmtPctCurto(e.acerto), "var(--dg-azul)"], ["Questões", e.questoes]];
  const dif = modo === "tempo" && e.plano != null ? Math.round((e.tempo - e.plano) * 10) / 10 : null;
  const nota = dif == null || Math.abs(dif) < 5 ? null : dif < 0 ? "Abaixo do que o plano pede." : "Acima do que o plano pede.";
  return <CaixaDica titulo={e.nome} linhas={linhas} nota={nota} />;
}

// nome da área + o valor dela, escritos junto do eixo
function RotuloEixo({ x, y, cy, textAnchor, payload, dados, modo }) {
  const e = dados.find((d) => d.nome === payload.value);
  const valor = !e ? "" : modo === "tempo" ? fmtPctCurto(e.tempo) : e.acerto == null ? "–" : fmtPctCurto(e.acerto);
  const acima = y < cy - 4;
  return (
    <text x={x} y={y} textAnchor={textAnchor} fontSize={12}>
      <tspan x={x} dy={acima ? -18 : 4} fill="var(--dg-eixo)">{payload.value}</tspan>
      <tspan x={x} dy={15} fill="var(--dg-texto)" fontWeight={600}>{valor}</tspan>
    </text>
  );
}

export default function RadarEquilibrio({ eixos, modo, altura = 330 }) {
  const dados = eixos.map((e) => ({ ...e, valor: modo === "tempo" ? e.tempo : e.acerto ?? 0 }));
  const comPlano = modo === "tempo" && eixos.some((e) => e.plano != null);
  const max = modo === "tempo" ? teto(Math.max(...eixos.map((e) => Math.max(e.tempo, e.plano ?? 0)))) : 100;
  return (
    <div style={{ height: altura }}>
      <ResponsiveContainer width="100%" height="100%">
        <RadarChart data={dados} outerRadius="78%" margin={{ top: 28, right: 68, bottom: 20, left: 68 }}>
          <PolarGrid stroke="var(--dg-grade)" />
          <PolarAngleAxis dataKey="nome" tick={<RotuloEixo dados={dados} modo={modo} />} tickLine={false} />
          <PolarRadiusAxis domain={[0, max]} tick={false} axisLine={false} tickCount={5} />
          {comPlano && (
            <Radar
              name="O plano pede" dataKey="plano" stroke="var(--dg-plano)" strokeWidth={1.5} strokeDasharray="5 4"
              fill="none" dot={false} activeDot={false} isAnimationActive={false}
            />
          )}
          <Radar
            name={modo === "tempo" ? "Seu tempo" : "Acerto"} dataKey="valor" stroke="var(--dg-azul)" strokeWidth={2}
            fill="var(--dg-azul)" fillOpacity={0.2}
            dot={{ r: 3.5, fill: "var(--dg-azul)", stroke: "var(--dg-superficie)", strokeWidth: 2 }}
            activeDot={{ r: 5.5, fill: "var(--dg-azul)", stroke: "var(--dg-superficie)", strokeWidth: 2 }}
            isAnimationActive={false}
          />
          <Tooltip content={<Dica modo={modo} />} cursor={false} wrapperStyle={{ zIndex: 20 }} />
        </RadarChart>
      </ResponsiveContainer>
    </div>
  );
}
