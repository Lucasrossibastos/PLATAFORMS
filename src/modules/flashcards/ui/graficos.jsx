/* Gráficos do módulo em SVG próprio (sem biblioteca): colunas empilhadas,
   linha, barras horizontais empilhadas e calendário.
   Regras: marcas finas; 2px de fundo entre segmentos e entre colunas; ponta
   arredondada de 4px, base reta; grade em linha fina; texto sempre nas cores
   de texto (a cor fica só na marca); legenda quando há mais de uma série;
   dica ao passar o mouse ou com as setas do teclado; tabela como alternativa. */

import { useLayoutEffect, useRef, useState } from "react";

/* ---------- utilidades ---------- */

export function useLargura() {
  const ref = useRef(null);
  const [largura, setLargura] = useState(0);
  useLayoutEffect(() => {
    const el = ref.current;
    if (!el) return undefined;
    const medir = () => setLargura(el.clientWidth);
    medir();
    const ro = new ResizeObserver(medir);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  return [ref, largura];
}

// divisões redondas do eixo de contagem (0, 5, 10… / 0, 20, 40…)
export function divisoes(max, alvo = 4) {
  if (!(max > 0)) return [0, 1];
  const bruto = max / alvo;
  const mag = 10 ** Math.floor(Math.log10(bruto));
  const passo = Math.max(1, [1, 2, 5, 10].map((m) => m * mag).find((p) => p >= bruto));
  const topo = Math.ceil(max / passo) * passo;
  const r = [];
  for (let v = 0; v <= topo; v += passo) r.push(v);
  return r;
}

export const numero = (n) => Number(n || 0).toLocaleString("pt-BR");
export const pct = (x, casas = 0) => `${(x * 100).toLocaleString("pt-BR", { maximumFractionDigits: casas, minimumFractionDigits: casas })}%`;

// coluna com a ponta de cima arredondada e a base reta
function caminhoColuna(x, y, w, h, r = 4) {
  const rr = Math.max(0, Math.min(r, w / 2, h));
  return `M${x},${y + h}V${y + rr}A${rr},${rr} 0 0 1 ${x + rr},${y}H${x + w - rr}A${rr},${rr} 0 0 1 ${x + w},${y + rr}V${y + h}Z`;
}

/* ---------- dica (tooltip) ---------- */

// linhas: [{ cor, rotulo, valor }]; o valor vem em destaque, o rótulo depois
export function Dica({ x, y, largura, titulo, linhas = [], rodape }) {
  const meia = 96;
  const esquerda = Math.min(Math.max(x, meia), Math.max(meia, largura - meia));
  return (
    <div className="fc-balao" style={{ left: esquerda, top: y }} role="status" aria-live="polite">
      {titulo && <span className="fc-balao-titulo">{titulo}</span>}
      {linhas.map((l) => (
        <span key={l.rotulo} className="fc-balao-linha">
          {l.cor && <i style={{ background: l.cor }} aria-hidden="true" />}
          <strong>{l.valor}</strong><span>{l.rotulo}</span>
        </span>
      ))}
      {rodape && <span className="fc-balao-rodape">{rodape}</span>}
    </div>
  );
}

/* ---------- legenda ---------- */

export function Legenda({ series, forma = "barra" }) {
  return (
    <ul className="fc-legenda">
      {series.map((s) => (
        <li key={s.id}><i className={`fc-legenda-${forma}`} style={{ background: s.cor }} aria-hidden="true" />{s.rotulo}</li>
      ))}
    </ul>
  );
}

// no toque, o dedo "sai" logo depois de tocar: a dica fica até tocar fora (o gráfico perde o foco)
const soltar = (setAtivo) => (e) => { if (e.pointerType !== "touch") setAtivo(null); };

// navegação pelo teclado dentro de um gráfico (setas, Home, End)
function teclasDeIndice(e, atual, total, setAtivo, passo = 1) {
  const mapa = { ArrowLeft: -passo, ArrowRight: passo, ArrowUp: -1, ArrowDown: 1 };
  let prox = null;
  if (e.key in mapa) prox = (atual ?? total - 1) + mapa[e.key];
  else if (e.key === "Home") prox = 0;
  else if (e.key === "End") prox = total - 1;
  else if (e.key === "Escape") { setAtivo(null); return; }
  if (prox === null) return;
  e.preventDefault();
  setAtivo(Math.max(0, Math.min(total - 1, prox)));
}

/* ---------- colunas empilhadas ---------- */

/* pontos: [{ chave, ...valores }]; series: [{ id, rotulo, cor }] (de baixo
   para cima); rotuloX(ponto): texto curto do eixo; dica(ponto): { titulo,
   linhas, rodape }. Os rótulos do eixo partem do fim (hoje) ou, com
   rotulosDoInicio, do começo. */
export function Colunas({ pontos, series, rotuloX, dica, altura = 220, rotulo, rotulosDoInicio = false }) {
  const [ref, largura] = useLargura();
  const [ativo, setAtivo] = useState(null);
  const m = { e: 40, d: 14, t: 12, b: 26 };
  const w = Math.max(0, largura - m.e - m.d);
  const h = altura - m.t - m.b;
  const n = pontos.length;
  const totais = pontos.map((p) => series.reduce((s, sr) => s + (p[sr.id] || 0), 0));
  const ticks = divisoes(Math.max(0, ...totais));
  const topo = ticks.at(-1);
  const escala = (v) => (v / topo) * h;
  const banda = n ? w / n : 0;
  const larguraBarra = Math.max(1, Math.min(24, banda * 0.72, banda - 2));
  const passoRotulo = Math.max(1, Math.ceil(60 / Math.max(banda, 1)));

  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const i = Math.floor((e.clientX - r.left - m.e) / banda);
    setAtivo(i >= 0 && i < n ? i : null);
  };

  const p = ativo !== null ? pontos[ativo] : null;
  const info = p ? dica(p) : null;
  return (
    <div ref={ref} className="fc-grafico">
      {largura > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={rotulo} tabIndex={0}
          onPointerMove={aoMover} onPointerDown={aoMover} onPointerLeave={soltar(setAtivo)}
          onFocus={() => setAtivo((a) => a ?? n - 1)} onBlur={() => setAtivo(null)}
          onKeyDown={(e) => teclasDeIndice(e, ativo, n, setAtivo)}>
          {ticks.map((t) => (
            <g key={t}>
              <line className="fc-grade" x1={m.e} x2={m.e + w} y1={m.t + h - escala(t)} y2={m.t + h - escala(t)} />
              <text className="fc-eixo" x={m.e - 8} y={m.t + h - escala(t)} textAnchor="end" dominantBaseline="central">{numero(t)}</text>
            </g>
          ))}
          {ativo !== null && <rect className="fc-banda-ativa" x={m.e + ativo * banda} y={m.t} width={banda} height={h} />}
          {pontos.map((pt, i) => {
            const x = m.e + i * banda + (banda - larguraBarra) / 2;
            let base = m.t + h;
            const visiveis = series.filter((s) => pt[s.id] > 0);
            return (
              <g key={pt.chave}>
                {visiveis.map((s, j) => {
                  const alt = Math.max(1, escala(pt[s.id]) - (j > 0 ? 2 : 0));
                  const y = base - alt;
                  base = y - 2;
                  return <path key={s.id} d={j === visiveis.length - 1 ? caminhoColuna(x, y, larguraBarra, alt) : `M${x},${y}h${larguraBarra}v${alt}h${-larguraBarra}Z`} style={{ fill: s.cor }} />;
                })}
              </g>
            );
          })}
          <line className="fc-eixo-base" x1={m.e} x2={m.e + w} y1={m.t + h + 0.5} y2={m.t + h + 0.5} />
          {pontos.map((pt, i) => ((rotulosDoInicio ? i : n - 1 - i) % passoRotulo === 0 ? (
            <text key={pt.chave} className="fc-eixo" x={m.e + i * banda + banda / 2} y={altura - 8} textAnchor="middle">{rotuloX(pt, i)}</text>
          ) : null))}
        </svg>
      )}
      {info && <Dica x={m.e + ativo * banda + banda / 2} y={m.t + h - escala(totais[ativo]) - 8} largura={largura} {...info} />}
    </div>
  );
}

/* ---------- linha (uma série) ---------- */

/* pontos: [{ x, y }] com x crescente; dominioY [min, max]; alvo: valor de
   referência (linha fina com rótulo); formatarY, dica(ponto). */
export function Linha({ pontos, dominioY, alvo, rotuloAlvo, formatarY, rotuloX, dica, cor, altura = 220, rotulo, divisoesY }) {
  const [ref, largura] = useLargura();
  const [ativo, setAtivo] = useState(null);
  const m = { e: 44, d: 52, t: 14, b: 26 };
  const w = Math.max(0, largura - m.e - m.d);
  const h = altura - m.t - m.b;
  const n = pontos.length;
  const [y0, y1] = dominioY;
  const x0 = pontos[0]?.x ?? 0;
  const x1 = pontos.at(-1)?.x ?? 1;
  const ex = (v) => m.e + ((v - x0) / (x1 - x0 || 1)) * w;
  const ey = (v) => m.t + h - ((v - y0) / (y1 - y0 || 1)) * h;
  const caminho = pontos.map((p, i) => `${i ? "L" : "M"}${ex(p.x).toFixed(1)},${ey(p.y).toFixed(1)}`).join("");
  const area = n ? `${caminho}L${ex(x1)},${m.t + h}L${ex(x0)},${m.t + h}Z` : "";

  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const xr = e.clientX - r.left;
    let melhor = 0;
    for (let i = 1; i < n; i += 1) if (Math.abs(ex(pontos[i].x) - xr) < Math.abs(ex(pontos[melhor].x) - xr)) melhor = i;
    setAtivo(n ? melhor : null);
  };
  const ultimo = pontos.at(-1);
  const p = ativo !== null ? pontos[ativo] : null;
  const info = p ? dica(p) : null;
  // rótulos do eixo X em passos redondos que cabem (≥ 64px entre eles)
  const passoX = [1, 2, 5, 7, 10, 15, 30, 60, 90, 180, 365].find((p) => ((x1 - x0) / p) * 64 <= w) || x1 - x0 || 1;
  return (
    <div ref={ref} className="fc-grafico">
      {largura > 0 && n > 0 && (
        <svg width={largura} height={altura} role="img" aria-label={rotulo} tabIndex={0}
          onPointerMove={aoMover} onPointerDown={aoMover} onPointerLeave={soltar(setAtivo)}
          onFocus={() => setAtivo((a) => a ?? 0)} onBlur={() => setAtivo(null)}
          onKeyDown={(e) => teclasDeIndice(e, ativo, n, setAtivo)}>
          {divisoesY.map((t) => (
            <g key={t}>
              <line className="fc-grade" x1={m.e} x2={m.e + w} y1={ey(t)} y2={ey(t)} />
              <text className="fc-eixo" x={m.e - 8} y={ey(t)} textAnchor="end" dominantBaseline="central">{formatarY(t)}</text>
            </g>
          ))}
          <path d={area} style={{ fill: cor }} opacity="0.1" />
          {alvo != null && alvo >= y0 && alvo <= y1 && (
            <g>
              <line className="fc-referencia" x1={m.e} x2={m.e + w} y1={ey(alvo)} y2={ey(alvo)} />
              <text className="fc-eixo fc-eixo--forte" x={m.e + w + 6} y={ey(alvo)} dominantBaseline="central">{rotuloAlvo}</text>
            </g>
          )}
          <path d={caminho} fill="none" style={{ stroke: cor }} strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" />
          {pontos.map((pt, i) => ((pt.x - x0) % passoX === 0 ? (
            <text key={pt.x} className="fc-eixo" x={ex(pt.x)} y={altura - 8} textAnchor={i === 0 ? "start" : "middle"}>{rotuloX(pt)}</text>
          ) : null))}
          {/* valor no fim da linha */}
          {ultimo && (alvo == null || Math.abs(ey(ultimo.y) - ey(alvo)) > 14) && (
            <text className="fc-eixo fc-eixo--forte" x={m.e + w + 6} y={ey(ultimo.y)} dominantBaseline="central">{formatarY(ultimo.y)}</text>
          )}
          <circle className="fc-marcador" cx={ex(pontos[0].x)} cy={ey(pontos[0].y)} r="4.5" style={{ fill: cor }} />
          {p && (
            <g>
              <line className="fc-mira" x1={ex(p.x)} x2={ex(p.x)} y1={m.t} y2={m.t + h} />
              <circle className="fc-marcador" cx={ex(p.x)} cy={ey(p.y)} r="5" style={{ fill: cor }} />
            </g>
          )}
        </svg>
      )}
      {info && <Dica x={ex(p.x)} y={ey(p.y) - 12} largura={largura} {...info} />}
    </div>
  );
}

/* ---------- barras horizontais empilhadas (uma linha por grupo) ---------- */

/* linhas: [{ id, nome, total, ...valores }]; escala comum (a maior linha
   ocupa a largura toda), total no fim da barra, dica com todas as séries. */
export function BarrasEmpilhadas({ linhas, series, dica }) {
  const [ativo, setAtivo] = useState(null);
  const [ref, largura] = useLargura();
  const max = Math.max(1, ...linhas.map((l) => l.total));
  const info = ativo !== null ? dica(linhas[ativo]) : null;
  const [pos, setPos] = useState({ x: 0, y: 0 });
  const mostrar = (i, el, clientX) => {
    const caixa = ref.current.getBoundingClientRect();
    const r = el.getBoundingClientRect();
    setPos({ x: (clientX ?? r.left + r.width / 2) - caixa.left, y: r.top - caixa.top - 6 });
    setAtivo(i);
  };
  return (
    <div ref={ref} className="fc-barras">
      {linhas.map((l, i) => (
        <div key={l.id} className={`fc-barras-linha${ativo === i ? " fc-barras-linha--ativa" : ""}`} tabIndex={0}
          aria-label={`${l.nome}: ${series.map((s) => `${l[s.id]} ${s.rotulo.toLowerCase()}`).join(", ")}; ${l.total} no total`}
          onPointerMove={(e) => mostrar(i, e.currentTarget.querySelector(".fc-barras-trilho"), e.clientX)}
          onPointerDown={(e) => mostrar(i, e.currentTarget.querySelector(".fc-barras-trilho"), e.clientX)} onPointerLeave={soltar(setAtivo)}
          onFocus={(e) => mostrar(i, e.currentTarget.querySelector(".fc-barras-trilho"))} onBlur={() => setAtivo(null)}>
          <span className="fc-barras-nome" title={l.nome}>{l.nome}</span>
          <span className="fc-barras-trilho">
            <span className="fc-barras-barra" style={{ width: `${(l.total / max) * 100}%` }}>
              {series.filter((s) => l[s.id] > 0).map((s) => (
                <i key={s.id} style={{ flexGrow: l[s.id], background: s.cor }} />
              ))}
            </span>
            <span className="fc-barras-total">{numero(l.total)}</span>
          </span>
        </div>
      ))}
      {info && <Dica x={pos.x} y={pos.y} largura={largura} {...info} />}
    </div>
  );
}

/* ---------- calendário (um quadrado por dia, semanas em colunas) ---------- */

const DIAS_SEMANA = ["seg", "", "qua", "", "sex", "", "dom"];

/* dias: [{ chave, data (Date), nivel 0–4, valor }] em ordem, terminando hoje;
   rotuloDica(dia): { titulo, linhas }. As semanas começam na segunda. */
export function Calendario({ dias, dica, rotulo }) {
  const [ref, largura] = useLargura();
  const [ativo, setAtivo] = useState(null);
  const tam = 11;
  const passo = tam + 3;
  const esq = 28;
  const topo = 18;
  const semanasCabem = Math.max(4, Math.floor((largura - esq) / passo));
  // alinha o primeiro dia na segunda-feira da semana dele
  const deslocamento = dias.length ? (dias[0].data.getDay() + 6) % 7 : 0;
  const semanasTodas = Math.ceil((dias.length + deslocamento) / 7);
  const semanas = Math.min(semanasTodas, semanasCabem);
  const primeiraSemana = semanasTodas - semanas;
  const celulas = dias.map((d, i) => {
    const pos = i + deslocamento;
    return { ...d, i, col: Math.floor(pos / 7) - primeiraSemana, lin: pos % 7 };
  }).filter((c) => c.col >= 0);
  const porPos = new Map(celulas.map((c) => [`${c.col}:${c.lin}`, c]));
  const meses = [];
  for (const c of celulas) {
    if ((c.data.getDate() <= 7 && c.lin === 0) || c === celulas[0]) {
      const nome = c.data.toLocaleDateString("pt-BR", { month: "short" }).replace(".", "");
      if (!meses.length || meses.at(-1).col < c.col - 2) meses.push({ col: c.col, nome });
      else if (meses.length === 1 && meses[0].col === 0) meses[0] = { col: c.col, nome }; // o mês do começo, cortado, cede o lugar
    }
  }
  const altura = topo + passo * 7;
  const larguraSvg = esq + semanas * passo;
  const aoMover = (e) => {
    const r = e.currentTarget.getBoundingClientRect();
    const col = Math.floor((e.clientX - r.left - esq) / passo);
    const lin = Math.floor((e.clientY - r.top - topo) / passo);
    const c = porPos.get(`${col}:${lin}`);
    setAtivo(c ? c.i : null);
  };
  const atual = ativo !== null ? celulas.find((c) => c.i === ativo) : null;
  const info = atual ? dica(atual) : null;
  const primeiroVisivel = celulas[0]?.i ?? 0;
  return (
    <div ref={ref} className="fc-grafico fc-calendario">
      {largura > 0 && (
        <svg width={larguraSvg} height={altura} role="img" aria-label={rotulo} tabIndex={0}
          onPointerMove={aoMover} onPointerDown={aoMover} onPointerLeave={soltar(setAtivo)}
          onFocus={() => setAtivo((a) => a ?? dias.length - 1)} onBlur={() => setAtivo(null)}
          onKeyDown={(e) => {
            const mapa = { ArrowLeft: -7, ArrowRight: 7, ArrowUp: -1, ArrowDown: 1 };
            if (e.key === "Escape") { setAtivo(null); return; }
            if (!(e.key in mapa)) return;
            e.preventDefault();
            setAtivo((a) => Math.max(primeiroVisivel, Math.min(dias.length - 1, (a ?? dias.length - 1) + mapa[e.key])));
          }}>
          {meses.map((mm) => <text key={`${mm.col}${mm.nome}`} className="fc-eixo" x={esq + mm.col * passo} y={10}>{mm.nome}</text>)}
          {DIAS_SEMANA.map((d, i) => (d ? <text key={d} className="fc-eixo" x={0} y={topo + i * passo + tam / 2} dominantBaseline="central">{d}</text> : null))}
          {celulas.map((c) => (
            <rect key={c.chave} x={esq + c.col * passo} y={topo + c.lin * passo} width={tam} height={tam} rx="2.5"
              className={`fc-cal-${c.nivel}${ativo === c.i ? " fc-cal-ativo" : ""}`} />
          ))}
        </svg>
      )}
      {info && atual && <Dica x={esq + atual.col * passo + tam / 2} y={topo + atual.lin * passo - 6} largura={Math.max(largura, larguraSvg)} {...info} />}
    </div>
  );
}

export function LegendaCalendario() {
  return (
    <span className="fc-cal-legenda" aria-hidden="true">
      Menos {[0, 1, 2, 3, 4].map((n) => <i key={n} className={`fc-cal-${n}`} />)} Mais
    </span>
  );
}
