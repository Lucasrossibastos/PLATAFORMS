import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { Marca } from "./ui.jsx";
import { COR_DESTAQUE_PADRAO, linhasDe, partesDe } from "../textos.js";

// Vídeo do herói (endereço passado pelo cliente). 🔥 Ideal: hospedar o arquivo
// junto do site; se este link expirar, o fundo fica preto. VITE_VIDEO_FUNDO
// troca o endereço no build (usado nos testes).
export const VIDEO_FUNDO = import.meta.env.VITE_VIDEO_FUNDO
  || "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

/* O vídeo é a identidade visual: toca sempre, em loop, inclusive com
   "reduzir movimento" ligado no sistema (decisão do cliente). Só pausa com a
   aba escondida, para poupar bateria, e retoma ao voltar. */
function VideoFundo() {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    // o atributo muted do React nem sempre chega ao DOM, e sem ele o autoplay falha
    v.muted = true;
    v.defaultMuted = true;
    v.playsInline = true;

    const gestos = ["pointerdown", "keydown", "touchstart", "scroll"];
    const aoGesto = () => { gestos.forEach((g) => window.removeEventListener(g, aoGesto)); tocar(); };
    // autoplay bloqueado pelo navegador: tenta de novo na primeira interação
    const esperarGesto = () => gestos.forEach((g) => window.addEventListener(g, aoGesto, { passive: true }));
    function tocar() {
      if (document.hidden || !v.paused) return;
      v.play()?.catch(esperarGesto);
    }
    const aoMudarAba = () => (document.hidden ? v.pause() : tocar());
    // algo pausou com a aba visível (economia de energia, etc.): retoma
    const aoPausar = () => { if (!document.hidden) setTimeout(tocar, 250); };

    v.addEventListener("loadeddata", tocar);
    v.addEventListener("canplay", tocar);
    v.addEventListener("pause", aoPausar);
    document.addEventListener("visibilitychange", aoMudarAba);
    tocar();
    return () => {
      v.removeEventListener("loadeddata", tocar);
      v.removeEventListener("canplay", tocar);
      v.removeEventListener("pause", aoPausar);
      document.removeEventListener("visibilitychange", aoMudarAba);
      gestos.forEach((g) => window.removeEventListener(g, aoGesto));
    };
  }, []);
  return (
    <video ref={ref} autoPlay muted loop playsInline preload="auto" disablePictureInPicture disableRemotePlayback tabIndex={-1}>
      <source src={VIDEO_FUNDO} />
    </video>
  );
}

/* Arte "galho que floresce": duas fotos do mesmo enquadramento; a segunda
   (o galho florido) aparece sobre a primeira de dois jeitos, ao mesmo tempo:
   · ciclo: em movimento harmônico, sem pausas, a floração sobe do chão em
     onda (sete tufos, da esquerda para a direita), cobre a cena, cai de volta
     e reflore. É o que garante a experiência no celular, sem mouse;
   · toque: um círculo de luz segue o mouse ou o dedo (suavizado) e faz florir
     onde passa. Enquanto alguém mexe, o ciclo recolhe para a floração sob o
     ponteiro aparecer; parado por um instante, o ciclo volta.
   Tudo são máscaras em CSS (degradês) reescritas por um laço só, sem gerar
   imagem a cada quadro. Toca sempre, como o vídeo: é a identidade visual. */
const RAIO_LUZ = 260; // px no computador; no celular acompanha o tamanho da tela
const TUFOS = 7;
const PERIODO = 11000; // ms de uma floração mais uma queda
const ONDA = 0.03; // atraso de um tufo para o seguinte, em fração do período
const ALTURA_TUFO = 190; // % da altura: com o degradê, o tufo sólido passa do topo
const OCIOSO = 1600; // ms sem mexer até o ciclo voltar
const X_TUFOS = Array.from({ length: TUFOS }, (_, i) => (((i + 0.5) / TUFOS) * 100).toFixed(2));
const NADA = "linear-gradient(transparent, transparent)";

const degradeTufo = (altura, i) => `radial-gradient(ellipse 22% ${Math.max(0.1, altura).toFixed(2)}% at ${X_TUFOS[i]}% 100%, `
  + "#fff 0%, #fff 55%, rgba(255, 255, 255, 0.6) 72%, rgba(255, 255, 255, 0.2) 86%, transparent 100%)";
const degradeLuz = (x, y, r) => `radial-gradient(circle ${r.toFixed(1)}px at ${x.toFixed(1)}px ${y.toFixed(1)}px, `
  + "#fff 0%, #fff 40%, rgba(255, 255, 255, 0.75) 60%, rgba(255, 255, 255, 0.4) 75%, rgba(255, 255, 255, 0.12) 88%, transparent 100%)";
const mascarar = (el, valor) => {
  if (el.dataset.mascara === valor) return;
  el.dataset.mascara = valor;
  el.style.setProperty("-webkit-mask-image", valor);
  el.style.setProperty("mask-image", valor);
};
const entre0e1 = (v) => Math.min(1, Math.max(0, v));
// florescer de 0 a 1 ao longo do período: cosseno (harmônico), com um respiro curto em cima e embaixo
function floracao(fase) {
  if (fase < 0) return 0;
  const s = (1 - Math.cos(2 * Math.PI * fase)) / 2;
  const g = entre0e1((s - 0.06) / 0.88);
  return g * g * (3 - 2 * g);
}

const ARTE_GALHO = {
  base: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_195923_b0ba8ace-1d1d-4f2c-9a28-1ab84b330680.png&w=1280&q=85",
  revelada: "https://images.higgs.ai/?default=1&output=webp&url=https%3A%2F%2Fd8j0ntlcm91z4.cloudfront.net%2Fuser_38xzZboKViGWJOttwIXH07lWA1P%2Fhf_20260609_201152_bba90a12-bf12-459f-91f0-51f237dbaf3b.png&w=1280&q=85",
};

function FundoRevelar({ base, revelada }) {
  const raiz = useRef(null);
  const ciclo = useRef(null);
  const toque = useRef(null);
  useEffect(() => {
    const el = raiz.current;
    const camadaCiclo = ciclo.current;
    const camadaToque = toque.current;
    if (!el || !camadaCiclo || !camadaToque) return undefined;
    const alvo = { x: 0, y: 0 };
    const luz = { x: 0, y: 0 };
    let tocou = false;
    let ultimoToque = -Infinity;
    let calma = 1; // 1: o ciclo floresce sozinho; 0: quem faz florir é o ponteiro
    const inicio = performance.now() + 700;
    let anterior = performance.now();
    let quadro = 0;

    const passo = (agora) => {
      quadro = requestAnimationFrame(passo);
      const mexendo = agora - ultimoToque < OCIOSO;
      const dt = agora - anterior;
      if (!mexendo && dt < 32) return; // só o ciclo, que é lento: 30 quadros por segundo bastam
      anterior = agora;
      const k = (fator) => 1 - fator ** (Math.min(dt, 100) / 16.7); // suavização que independe da taxa de quadros
      calma += ((mexendo ? 0 : 1) - calma) * k(0.95);
      const t = (agora - inicio) / PERIODO;
      mascarar(camadaCiclo, X_TUFOS.map((_, i) => degradeTufo(ALTURA_TUFO * calma * floracao(t - i * ONDA), i)).join(", "));
      if (tocou) {
        luz.x += (alvo.x - luz.x) * k(0.9);
        luz.y += (alvo.y - luz.y) * k(0.9);
        const r = Math.min(RAIO_LUZ, Math.min(window.innerWidth, window.innerHeight) * 0.42);
        mascarar(camadaToque, degradeLuz(luz.x, luz.y, r));
      }
    };
    const mover = (x, y) => {
      const r = el.getBoundingClientRect();
      alvo.x = x - r.left;
      alvo.y = y - r.top;
      if (!tocou) { // a luz nasce no ponteiro, em vez de atravessar a tela vindo do canto
        tocou = true;
        luz.x = alvo.x;
        luz.y = alvo.y;
      }
      ultimoToque = performance.now();
    };
    const aoPonteiro = (e) => mover(e.clientX, e.clientY);
    // o dedo: toques continuam chegando mesmo quando o navegador rola a página
    const aoDedo = (e) => { const d = e.touches?.[0]; if (d) mover(d.clientX, d.clientY); };
    window.addEventListener("pointermove", aoPonteiro, { passive: true });
    window.addEventListener("pointerdown", aoPonteiro, { passive: true });
    window.addEventListener("touchstart", aoDedo, { passive: true });
    window.addEventListener("touchmove", aoDedo, { passive: true });
    quadro = requestAnimationFrame(passo);
    return () => {
      cancelAnimationFrame(quadro);
      window.removeEventListener("pointermove", aoPonteiro);
      window.removeEventListener("pointerdown", aoPonteiro);
      window.removeEventListener("touchstart", aoDedo);
      window.removeEventListener("touchmove", aoDedo);
    };
  }, []);
  return (
    <div ref={raiz} className="fundo-revelar">
      <div className="fundo-revelar-img fundo-zoom" style={{ backgroundImage: `url("${base}")` }} />
      <div ref={ciclo} className="fundo-revelar-camada" style={{ WebkitMaskImage: NADA, maskImage: NADA }}>
        <div className="fundo-revelar-img fundo-zoom" style={{ backgroundImage: `url("${revelada}")` }} />
      </div>
      <div ref={toque} className="fundo-revelar-camada" style={{ WebkitMaskImage: NADA, maskImage: NADA }}>
        <div className="fundo-revelar-img fundo-zoom" style={{ backgroundImage: `url("${revelada}")` }} />
      </div>
    </div>
  );
}

/* Fundos das telas de cinema (login e boas-vindas), na ordem do botão de
   trocar. Para incluir outro, é só acrescentar aqui. */
export const FUNDOS = [
  { id: "video", nome: "Vídeo", Fundo: VideoFundo },
  { id: "galho", nome: "Galho que floresce", Fundo: () => <FundoRevelar {...ARTE_GALHO} />, imagens: [ARTE_GALHO.base, ARTE_GALHO.revelada] },
];

// a escolha fica neste navegador (conveniência de quem está vendo)
const CHAVE_FUNDO = "aprova:fundo";
function useFundo() {
  const [id, setId] = useState(() => {
    try { return localStorage.getItem(CHAVE_FUNDO) || FUNDOS[0].id; } catch { return FUNDOS[0].id; }
  });
  const i = Math.max(0, FUNDOS.findIndex((f) => f.id === id));
  const proximo = FUNDOS[(i + 1) % FUNDOS.length];
  // o próximo fundo já baixa as imagens, para a troca ser imediata
  useEffect(() => {
    proximo.imagens?.forEach((src) => { const img = new Image(); img.src = src; });
  }, [proximo]);
  const trocar = () => {
    setId(proximo.id);
    try { localStorage.setItem(CHAVE_FUNDO, proximo.id); } catch { /* sem armazenamento: vale só nesta visita */ }
  };
  return { atual: FUNDOS[i], proximo, trocar };
}

// botão discreto no canto: um traço por fundo, o atual mais longo
function TrocarFundo({ atual, proximo, aoTrocar }) {
  return (
    <button type="button" className="trocar-fundo" onClick={aoTrocar} title={`Fundo: ${atual.nome}`}
      aria-label={`Trocar o fundo. Agora: ${atual.nome}. Próximo: ${proximo.nome}.`}>
      {FUNDOS.map((f) => <i key={f.id} data-ativo={f.id === atual.id} />)}
    </button>
  );
}

function ItemNav({ item, atraso }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);

  useEffect(() => {
    if (!aberto) return undefined;
    const fora = (e) => { if (!ref.current?.contains(e.target)) setAberto(false); };
    const esc = (e) => { if (e.key === "Escape") setAberto(false); };
    document.addEventListener("pointerdown", fora);
    document.addEventListener("keydown", esc);
    return () => { document.removeEventListener("pointerdown", fora); document.removeEventListener("keydown", esc); };
  }, [aberto]);

  const classe = "metal aparece " + (atraso % 2 ? "aparece--suave" : "aparece--escala");
  const estilo = { "--d": `${0.16 + atraso * 0.12}s` };
  if (!item.submenu) {
    return <button type="button" className={classe} style={estilo} onClick={item.onClick}>{item.label}</button>;
  }
  return (
    <div className="submenu" ref={ref}>
      <button type="button" className={classe} style={estilo} aria-expanded={aberto} aria-haspopup="true" onClick={() => setAberto(!aberto)}>
        {item.label}<ChevronDown aria-hidden="true" />
      </button>
      {aberto && (
        <div className="submenu-painel" role="menu">
          {item.submenu.map((s) => (
            <button key={s.label} type="button" role="menuitem" onClick={() => { setAberto(false); s.onClick(); }}>{s.label}</button>
          ))}
        </div>
      )}
    </div>
  );
}

/* Menu em tela cheia do celular. Vai para o <body> num portal para não ficar
   preso ao contexto de empilhamento do cabeçalho. */
export function MenuCheio({ aberto, aoFechar, id, children, rodape, escuro, className = "" }) {
  useEffect(() => {
    if (!aberto) return undefined;
    const esc = (e) => { if (e.key === "Escape") aoFechar(); };
    const largo = window.matchMedia("(min-width: 1101px)");
    const mudou = (e) => { if (e.matches) aoFechar(); };
    document.addEventListener("keydown", esc);
    largo.addEventListener("change", mudou);
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", esc);
      largo.removeEventListener("change", mudou);
      document.body.style.overflow = "";
    };
  }, [aberto, aoFechar]);

  if (!aberto) return null;
  return createPortal(
    <div className={`menu-cheio ${className}`} id={id} role="dialog" aria-modal="true" aria-label="Menu" data-theme={escuro ? "dark" : undefined}>
      <div className="menu-cheio-topo">
        <Marca />
        <button type="button" className="icone-btn" onClick={aoFechar} aria-label="Fechar menu" autoFocus><X /></button>
      </div>
      {children}
      {rodape && <div className="menu-cheio-rodape">{rodape}</div>}
    </div>,
    document.body,
  );
}

/* Título grande do cinema: uma linha mascarada por linha do texto, *destaque*
   na cor escolhida pelo moderador. Também serve de prévia no editor. */
export function TituloCinema({ texto, animar = true }) {
  return (
    <h1>
      {linhasDe(texto).map((linha, i) => (
        <span key={i} className="linha-titulo">
          <span className={animar ? "aparece aparece--mascara" : undefined} style={animar ? { "--d": `${0.42 + i * 0.2}s` } : undefined}>
            {partesDe(linha).map((p, j) => (p.destaque ? <em key={j}>{p.texto}</em> : p.texto))}
          </span>
        </span>
      ))}
    </h1>
  );
}

/* Moldura de cinema: a landing original, agora com conteúdo variável.
   `titulo` já vem com as variáveis preenchidas; Enter no texto quebra a linha. */
export function Cinema({ nav = [], acoes, selo, titulo, corDestaque = COR_DESTAQUE_PADRAO, lede, children, stats = [], rodapeMenu }) {
  const [menu, setMenu] = useState(false);
  const itensMenu = nav.flatMap((i) => i.submenu || [i]);
  const fundo = useFundo();
  const Fundo = fundo.atual.Fundo;

  return (
    <div className="cine" data-theme="dark" style={{ "--destaque": corDestaque }}>
      {/* key: trocar o fundo refaz a entrada (fade e zoom) */}
      <div key={fundo.atual.id} className="cine-video" aria-hidden="true"><Fundo /></div>
      {FUNDOS.length > 1 && <TrocarFundo atual={fundo.atual} proximo={fundo.proximo} aoTrocar={fundo.trocar} />}
      <div className="cine-pagina">
        <header className="cine-topo">
          <Marca className="aparece aparece--escala" style={{ "--d": "0.08s" }} />
          <nav className="cine-nav" aria-label="Principal">
            {nav.map((item, i) => <ItemNav key={item.label} item={item} atraso={i} />)}
          </nav>
          <div className="cine-acoes">{acoes}</div>
          <button type="button" className="burger aparece aparece--escala" style={{ "--d": "0.34s" }}
            aria-controls="menu-cinema" aria-expanded={menu} aria-label={menu ? "Fechar menu" : "Abrir menu"}
            onClick={() => setMenu(true)}>
            <span /><span /><span />
          </button>
        </header>

        <main className="cine-hero">
          <div className="cine-copy">
            {selo}
            <TituloCinema texto={titulo} />
            {lede && <div className="cine-lede aparece aparece--suave" style={{ "--d": "0.82s", animationDuration: "1.25s" }}>{lede}</div>}
            <div className="cine-slot aparece aparece--botao" style={{ "--d": "0.96s" }}>{children}</div>
          </div>
        </main>

        {stats.length > 0 && (
          <footer className="cine-stats">
            {stats.map((s, i) => (
              <div key={i} className="cine-stat aparece aparece--stat" style={{ "--d": `${1.12 + i * 0.16}s` }}>
                <span className="ladrilho">{s.icone}</span>
                <span>{s.texto}</span>
              </div>
            ))}
          </footer>
        )}
      </div>

      <MenuCheio aberto={menu} aoFechar={() => setMenu(false)} id="menu-cinema" rodape={rodapeMenu} escuro>
        {itensMenu.map((i) => (
          <button key={i.label} type="button" className="metal" onClick={() => { setMenu(false); i.onClick(); }}>{i.label}</button>
        ))}
      </MenuCheio>
    </div>
  );
}
