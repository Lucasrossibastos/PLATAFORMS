import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { ChevronDown, X } from "lucide-react";
import { Marca } from "./ui.jsx";

// Vídeo do herói (endereço passado pelo cliente). 🔥 Ideal: hospedar o arquivo
// junto do site; se este link expirar, o fundo fica preto.
export const VIDEO_FUNDO = "https://d8j0ntlcm91z4.cloudfront.net/user_38xzZboKViGWJOttwIXH07lWA1P/hf_20260818_072341_50851634-bbc3-4c33-9acc-7647d4db44aa.mp4";

function VideoFundo() {
  const ref = useRef(null);
  useEffect(() => {
    const v = ref.current;
    if (!v) return undefined;
    v.muted = true; // o atributo muted do React nem sempre chega ao DOM (autoplay no iOS)
    const reduzir = window.matchMedia?.("(prefers-reduced-motion: reduce)").matches;
    const tocar = () => { if (!document.hidden && !reduzir) v.play().catch(() => {}); else v.pause(); };
    tocar();
    document.addEventListener("visibilitychange", tocar);
    return () => document.removeEventListener("visibilitychange", tocar);
  }, []);
  return (
    <div className="cine-video" aria-hidden="true">
      <video ref={ref} autoPlay muted loop playsInline preload="auto" disablePictureInPicture disableRemotePlayback tabIndex={-1}>
        <source src={VIDEO_FUNDO} type="video/mp4" />
      </video>
    </div>
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
    const largo = window.matchMedia("(min-width: 901px)");
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

/* Moldura de cinema: a landing original, agora com conteúdo variável. */
export function Cinema({ nav = [], acoes, selo, linha1, linha2, lede, children, stats = [], rodapeMenu }) {
  const [menu, setMenu] = useState(false);
  const itensMenu = nav.flatMap((i) => i.submenu || [i]);

  return (
    <div className="cine" data-theme="dark">
      <VideoFundo />
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
            <h1>
              <span className="linha-titulo"><span className="aparece aparece--mascara" style={{ "--d": "0.42s" }}>{linha1}</span></span>
              <span className="linha-titulo"><span className="aparece aparece--mascara" style={{ "--d": "0.62s" }}>{linha2}</span></span>
            </h1>
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
