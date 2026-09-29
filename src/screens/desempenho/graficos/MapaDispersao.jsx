/* Mapa tempo × acerto: uma bolha por matéria (tamanho = questões
   cronometradas). As linhas tracejadas são a média do próprio aluno e
   dividem o mapa em quatro leituras, escritas nos cantos. Uma cor só:
   o nome da matéria vai junto da bolha quando cabe; a dica mostra tudo. */

import { useEffect, useRef, useState } from "react";
import { CartesianGrid, LabelList, ReferenceLine, ResponsiveContainer, Scatter, ScatterChart, Tooltip, XAxis, YAxis, ZAxis } from "recharts";
import { QUADRANTES } from "../../../core/diagnostico.js";
import { CaixaDica, fmtNum, fmtPctCurto } from "../ui.jsx";

const tetoX = (x) => {
  const alvo = x * 1.25;
  const passo = alvo <= 2 ? 0.5 : alvo <= 6 ? 1 : alvo <= 15 ? 2.5 : 5;
  return Math.max(passo * 2, Math.ceil(alvo / passo) * passo);
};

const MARGEM = { top: 24, right: 16, bottom: 22, left: 0 };
const EIXO_Y = 48, EIXO_X = 30;
const PRIORIDADE = { base: 3, apressado: 2, lento: 1, forte: 0 };

/* Rótulos seletivos: escreve o nome só onde não encosta em outro já escrito
   (primeiro as matérias que pedem ação, depois as com mais questões). As
   outras continuam com a dica ao passar o mouse. */
function comRotulos(pontos, maxX, largura, altura) {
  const w = Math.max(120, largura - EIXO_Y - MARGEM.left - MARGEM.right);
  const h = Math.max(80, altura - MARGEM.top - MARGEM.bottom - EIXO_X);
  const escritos = [];
  const pos = (p) => ({ x: (p.minPorQuestao / maxX) * w, y: (1 - p.acerto / 100) * h });
  const ordem = [...pontos].sort((a, b) => (PRIORIDADE[b.quadrante] ?? 0) - (PRIORIDADE[a.quadrante] ?? 0) || b.total - a.total);
  const com = new Set();
  ordem.forEach((p) => {
    const { x, y } = pos(p);
    const larg = p.nome.length * 6.4;
    // o rótulo fica acima da bolha (de y − 26 a y − 12): não pode encostar em outro rótulo nem em outra bolha
    const livre = escritos.every((e) => Math.abs(e.x - x) > (e.larg + larg) / 2 + 6 || Math.abs(e.y - y) > 19)
      && pontos.every((o) => o === p || (() => { const b = pos(o); return Math.abs(b.x - x) > larg / 2 + 7 || b.y < y - 33 || b.y > y - 5; })());
    if (livre) { escritos.push({ x, y, larg }); com.add(p.materiaId); }
  });
  return pontos.map((p) => ({ ...p, rotulo: com.has(p.materiaId) ? p.nome : "" }));
}

function useLargura() {
  const ref = useRef(null);
  const [largura, setLargura] = useState(480);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setLargura(Math.round(e.contentRect.width)));
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largura];
}

function Dica({ active, payload }) {
  const p = active && payload?.[0]?.payload;
  if (!p) return null;
  const q = QUADRANTES[p.quadrante];
  return (
    <CaixaDica
      titulo={p.nome}
      linhas={[
        ["Tempo por questão", `${fmtNum(p.minPorQuestao)} min`],
        ["Acerto", fmtPctCurto(p.acerto)],
        ["Questões cronometradas", p.total],
      ]}
      nota={q ? `${q.nome}. ${q.acao}` : null}
    />
  );
}

// as quatro leituras, nos cantos da área do gráfico (os de baixo, logo acima do eixo)
const CANTOS = [
  ["forte", "left-[52px] top-1"],
  ["lento", "right-3 top-1 text-right"],
  ["apressado", "bottom-[56px] left-[52px]"],
  ["base", "bottom-[56px] right-3 text-right"],
];

export default function MapaDispersao({ pontos, media, altura = 300 }) {
  const [ref, largura] = useLargura();
  const maxX = tetoX(Math.max(...pontos.map((p) => p.minPorQuestao), media.minPorQuestao));
  const dados = comRotulos(pontos, maxX, largura, altura);
  return (
    <div ref={ref} className="relative" style={{ height: altura }}>
      {CANTOS.map(([k, pos]) => (
        <span key={k} className={`pointer-events-none absolute z-[1] rounded bg-white/85 px-1 text-[11px] font-medium text-slate-400 dark:bg-black/60 dark:text-slate-500 ${pos}`} aria-hidden="true">
          {QUADRANTES[k].nome}
        </span>
      ))}
      <ResponsiveContainer width="100%" height="100%">
        <ScatterChart margin={MARGEM}>
          <CartesianGrid stroke="var(--dg-grade)" />
          <XAxis
            type="number" dataKey="minPorQuestao" name="Minutos por questão" domain={[0, maxX]} tickCount={6}
            tickFormatter={(v) => fmtNum(v)} tick={{ fill: "var(--dg-eixo)", fontSize: 12 }} axisLine={false} tickLine={false} height={EIXO_X}
            label={{ value: "Minutos por questão", position: "insideBottom", offset: -14, fill: "var(--dg-eixo)", fontSize: 12 }}
          />
          <YAxis
            type="number" dataKey="acerto" name="Acerto" domain={[0, 100]} ticks={[0, 25, 50, 75, 100]} width={EIXO_Y}
            tickFormatter={(v) => `${v}%`} tick={{ fill: "var(--dg-eixo)", fontSize: 12 }} axisLine={false} tickLine={false}
          />
          <ZAxis type="number" dataKey="total" range={[90, 520]} />
          <ReferenceLine x={media.minPorQuestao} stroke="var(--dg-plano)" strokeDasharray="5 4" ifOverflow="extendDomain" />
          <ReferenceLine y={media.acerto} stroke="var(--dg-plano)" strokeDasharray="5 4" ifOverflow="extendDomain" />
          <Tooltip content={<Dica />} cursor={false} wrapperStyle={{ zIndex: 20 }} />
          <Scatter data={dados} fill="var(--dg-azul)" fillOpacity={0.85} stroke="var(--dg-superficie)" strokeWidth={2} isAnimationActive={false}>
            <LabelList dataKey="rotulo" position="top" offset={9} fill="var(--dg-texto)" fontSize={11} fontWeight={500} />
          </Scatter>
        </ScatterChart>
      </ResponsiveContainer>
    </div>
  );
}
