/* Gráficos leves em SVG, sempre sobre dados calculados dos registros
   (a tela Desempenho usa os de screens/desempenho/graficos). */

import { useEffect, useRef, useState } from "react";
import { fmtPct } from "../core/desempenho.js";
import { fmtDataCurta } from "../core/datas.js";

function useLargura(min = 240) {
  const ref = useRef(null);
  const [largura, setLargura] = useState(min);
  useEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const ro = new ResizeObserver(([e]) => setLargura(Math.max(min, Math.floor(e.contentRect.width))));
    ro.observe(el);
    return () => ro.disconnect();
  }, [min]);
  return [ref, largura];
}

/* ---------- Linha: % ao longo do tempo (uma série, eixo 0–100) ---------- */

const rotuloPeriodo = (p, agrupamento) => (agrupamento === "mes" ? `${p.slice(5, 7)}/${p.slice(2, 4)}` : fmtDataCurta(p));

export function LinhaPercentual({ pontos, agrupamento = "semana", altura = 200, rotuloPonto, compacto = false }) {
  const [ref, largura] = useLargura(compacto ? 160 : 260);
  const [hover, setHover] = useState(null);
  if (!pontos.length) return <div ref={ref} className="grafico-vazio">Sem dados no período.</div>;
  const m = compacto ? { t: 10, r: 10, b: 20, l: 30 } : { t: 14, r: 16, b: 28, l: 38 };
  const w = largura - m.l - m.r, h = altura - m.t - m.b;
  const x = (i) => m.l + (pontos.length === 1 ? w / 2 : (i / (pontos.length - 1)) * w);
  const y = (v) => m.t + h - (v / 100) * h;
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"} ${x(i)} ${y(p.pct)}`).join(" ");
  const passo = Math.max(1, Math.ceil(pontos.length / Math.max(2, Math.floor(w / 70))));
  const mover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const px = e.clientX - r.left;
    let melhor = 0;
    pontos.forEach((_, i) => { if (Math.abs(x(i) - px) < Math.abs(x(melhor) - px)) melhor = i; });
    setHover(melhor);
  };
  const p = hover != null ? pontos[hover] : null;

  return (
    <div ref={ref} className="grafico-linha">
      <svg width={largura} height={altura} role="img" aria-label={`Evolução: ${pontos.map((q) => `${rotuloPeriodo(q.periodo, agrupamento)} ${fmtPct(q.pct)}`).join(", ")}`}
        onMouseMove={mover} onMouseLeave={() => setHover(null)}>
        {[0, 50, 100].concat(compacto ? [] : [25, 75]).map((v) => (
          <g key={v}>
            <line x1={m.l} x2={m.l + w} y1={y(v)} y2={y(v)} className="grade" />
            <text x={m.l - 6} y={y(v) + 4} textAnchor="end" className="eixo">{v}%</text>
          </g>
        ))}
        {pontos.map((q, i) => (i % passo === 0 || i === pontos.length - 1) && (
          <text key={q.periodo} x={x(i)} y={altura - 6} textAnchor="middle" className="eixo">{rotuloPeriodo(q.periodo, agrupamento)}</text>
        ))}
        {hover != null && <line x1={x(hover)} x2={x(hover)} y1={m.t} y2={m.t + h} className="mira" />}
        <path d={caminho} className="linha" />
        {pontos.map((q, i) => (
          <circle key={q.periodo} cx={x(i)} cy={y(q.pct)} r={hover === i ? 5.5 : 4} className="marcador-ponto" />
        ))}
      </svg>
      {p && (
        <div className="dica" style={{ left: Math.min(Math.max(x(hover), 70), largura - 70), top: y(p.pct) }}>
          <strong>{rotuloPonto ? rotuloPonto(p) : rotuloPeriodo(p.periodo, agrupamento)}</strong>
          <span className="num">{fmtPct(p.pct)}{p.total != null ? ` · ${p.acertos}/${p.total}` : ""}</span>
        </div>
      )}
    </div>
  );
}

/* ---------- Consistência: um quadrado por dia ---------- */

export function CalendarioDias({ dias, hojeIso }) {
  return (
    <div className="calendario-dias">
      <ol aria-label="Dias estudados">
        {dias.map((d) => (
          <li key={d.data} className={`${d.estudou ? "estudou" : ""}${d.data === hojeIso ? " hoje" : ""}`}
            title={`${fmtDataCurta(d.data)}: ${d.estudou ? "estudou" : "sem estudo registrado"}`}>
            <span className="sr-only">{fmtDataCurta(d.data)}: {d.estudou ? "estudou" : "em branco"}</span>
          </li>
        ))}
      </ol>
      <ul className="legenda legenda--linha" aria-hidden="true">
        <li><i className="q estudou" />Estudou</li>
        <li><i className="q" />Em branco</li>
      </ul>
    </div>
  );
}
