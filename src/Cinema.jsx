import React, { useEffect, useRef, useState } from "react";
import { ChevronDown, Menu, X } from "lucide-react";

/* ============================================================================
   LAYOUT CINEMATOGRÁFICO — vídeo em tela cheia, navegação e cartões de vidro
   ----------------------------------------------------------------------------
   Estética de referência: hero escuro com fundo em movimento, pílulas de vidro
   (bg-white/10 + backdrop-blur), botão com degradê vertical escuro, Geist em
   tudo e Silkscreen só nos números de destaque.
============================================================================ */

// Vídeo de fundo: galeria de arcos em preto e branco, renderizada em 3D para a
// plataforma (cena/galeria.py) e servida junto com o site (public/video/).
// Caminho relativo de propósito: funciona no servidor local, no site publicado e no
// ambiente de teste. VITE_VIDEO_FUNDO troca por outro vídeo sem mexer no código.
export const VIDEO_FUNDO = import.meta.env.VITE_VIDEO_FUNDO || "video/galeria.mp4";
export const POSTER_FUNDO = import.meta.env.VITE_POSTER_FUNDO || "video/galeria.jpg";
// true só para vídeos claros na parte de baixo: aí o texto fica escuro no celular (como na referência)
export const VIDEO_CLARO = import.meta.env.VITE_VIDEO_CLARO === "true";

export const GRADIENTE = { background: "linear-gradient(to bottom, #2B2B2B, #101010)" };
export const PIXEL = "'Silkscreen', cursive";

/* Marca: um arco (as Arcadas) — desenho próprio da plataforma */
export function Logo({ className = "" }) {
  return (
    <svg width="24" height="24" viewBox="0 0 256 256" aria-hidden="true" className={className}>
      <path fill="currentColor" d="M0 256V120C0 53.7 57.3 0 128 0s128 53.7 128 120v136h-72V124c0-30.9-25.1-56-56-56s-56 25.1-56 56v132H0Z" />
    </svg>
  );
}

export function Marca({ claroNoMobile = false, className = "" }) {
  const cor = claroNoMobile ? "text-[#010101] lg:text-white" : "text-white";
  return (
    <div className={`flex items-center gap-2 ${cor} ${className}`}>
      <Logo />
      <span className="text-lg font-semibold tracking-tight">aprova+</span>
    </div>
  );
}

/* Fundo em movimento: o vídeo em tela cheia, em loop e sem som.
   Se o vídeo não carregar, fica a imagem de capa (um quadro da mesma cena). */
export function FundoCinema({ videoUrl = VIDEO_FUNDO, onModo }) {
  const [modo, setModo] = useState(videoUrl ? "video" : "escuro");
  const ref = useRef(null);
  useEffect(() => { if (onModo) onModo(modo); }, [modo]);
  useEffect(() => {
    if (modo !== "video") return undefined;
    // sem dados para tocar em 6 s (rede bloqueada, link expirado): desiste do vídeo
    const t = setTimeout(() => { const v = ref.current; if (!v || v.readyState < 2) setModo("escuro"); }, 6000);
    return () => clearTimeout(t);
  }, [modo]);
  if (modo !== "video") {
    return (
      <div className="absolute inset-0 bg-[#0B0B0D]">
        <img src={POSTER_FUNDO} alt="" onError={(e) => { e.currentTarget.style.display = "none"; }} className="h-full w-full object-cover" />
      </div>
    );
  }
  return (
    <video
      ref={ref} src={videoUrl} poster={POSTER_FUNDO} autoPlay loop muted playsInline preload="auto"
      onError={() => setModo("escuro")}
      className="absolute inset-0 h-full w-full object-cover"
    />
  );
}

/* Botão com o degradê escuro da referência */
export function PilulaCTA({ children, onClick, className = "", type = "button" }) {
  return (
    <button type={type} onClick={onClick} style={GRADIENTE}
      className={`inline-flex items-center justify-center gap-2 rounded-full text-sm font-medium text-white transition-opacity hover:opacity-90 ${className}`}>
      {children}
    </button>
  );
}

export function CartaoVidro({ children, className = "" }) {
  return <div className={`rounded-2xl bg-white/10 p-5 backdrop-blur-lg sm:p-6 ${className}`}>{children}</div>;
}

/* Cartão de número (Silkscreen) */
export function CartaoNumero({ numero, texto, claroNoMobile }) {
  const n = claroNoMobile ? "text-[#010101] lg:text-white" : "text-white";
  const t = claroNoMobile ? "text-[#010101]/70 lg:text-white/70" : "text-white/70";
  return (
    <CartaoVidro className="flex flex-col justify-between sm:w-64">
      <div className={`text-3xl font-normal tracking-tight sm:text-4xl ${n}`} style={{ fontFamily: PIXEL }}>{numero}</div>
      <p className={`mt-3 text-sm leading-relaxed sm:mt-4 ${t}`}>{texto}</p>
    </CartaoVidro>
  );
}

/* Cartão de depoimento / recado */
export function CartaoRecado({ selo, titulo, texto, fotoUrl, nome, papel, claroNoMobile }) {
  const forte = claroNoMobile ? "text-[#010101] lg:text-white" : "text-white";
  const corpo = claroNoMobile ? "text-[#010101]/80 lg:text-white/80" : "text-white/80";
  const fraco = claroNoMobile ? "text-[#010101]/60 lg:text-white/60" : "text-white/60";
  const [falhou, setFalhou] = useState(false);
  return (
    <CartaoVidro className="sm:w-64">
      <div className="mb-3 flex items-center gap-2 sm:mb-4">
        <div className="flex h-6 w-6 items-center justify-center rounded-md bg-black text-xs font-bold text-white">{selo}</div>
        <span className={`text-sm font-semibold ${forte}`}>{titulo}</span>
      </div>
      <p className={`text-sm leading-relaxed ${corpo}`}>{texto}</p>
      <div className="mt-4 flex items-center gap-3 sm:mt-5">
        <div className="h-9 w-9 shrink-0 overflow-hidden rounded-full bg-white/20">
          {fotoUrl && !falhou
            ? <img src={fotoUrl} alt={nome} onError={() => setFalhou(true)} className="h-full w-full object-cover" />
            : <span className="flex h-full w-full items-center justify-center text-sm font-semibold text-white">{(nome || "?").charAt(0)}</span>}
        </div>
        <div>
          <div className={`text-sm font-semibold ${forte}`}>{nome}</div>
          <div className={`text-xs ${fraco}`}>{papel}</div>
        </div>
      </div>
    </CartaoVidro>
  );
}

/* Trava a rolagem da página enquanto um menu está aberto */
function useTravaRolagem(ativo) {
  useEffect(() => {
    if (!ativo) return undefined;
    const antes = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = antes; };
  }, [ativo]);
}

/* Botão ☰ ↔ X com morph */
export function BotaoMenu({ aberto, onClick, claroNoMobile }) {
  const cor = claroNoMobile ? "text-[#010101] lg:text-white" : "text-white";
  return (
    <button type="button" onClick={onClick} aria-label={aberto ? "Fechar menu" : "Abrir menu"} aria-expanded={aberto}
      className={`relative z-50 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 backdrop-blur-lg md:hidden ${aberto ? "text-white" : cor}`}>
      <Menu className={`absolute h-5 w-5 transition-all duration-300 ${aberto ? "rotate-90 scale-0 opacity-0" : "rotate-0 scale-100 opacity-100"}`} />
      <X className={`absolute h-5 w-5 transition-all duration-300 ${aberto ? "rotate-0 scale-100 opacity-100" : "-rotate-90 scale-0 opacity-0"}`} />
    </button>
  );
}

/* Gaveta lateral do celular: fundo de vidro + painel deslizante + links em cascata */
export function GavetaMobile({ aberto, onFechar, itens, cta, rodape }) {
  useTravaRolagem(aberto);
  return (
    <div className="cine md:hidden">
      <div onClick={onFechar}
        className={`fixed inset-0 z-40 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${aberto ? "opacity-100" : "pointer-events-none opacity-0"}`} />
      <aside aria-hidden={!aberto}
        className={`fixed right-0 top-0 z-40 flex h-full w-72 flex-col bg-black/90 backdrop-blur-xl transition-transform duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] ${aberto ? "translate-x-0" : "translate-x-full"}`}>
        <nav className="flex flex-col gap-2 overflow-y-auto px-6 pt-24">
          {itens.map((it, i) => (
            <button key={it.k || it.label} type="button" onClick={() => { it.onClick && it.onClick(); onFechar(); }}
              className={`flex items-center justify-between rounded-xl px-4 py-3.5 text-left text-base font-medium transition-colors hover:bg-white/10 hover:text-white ${it.ativo ? "bg-white/10 text-white" : "text-white/80"}`}
              style={{ opacity: aberto ? 1 : 0, transform: aberto ? "translateX(0)" : "translateX(24px)", transition: `opacity 400ms ease ${(i + 1) * 60}ms, transform 400ms cubic-bezier(0.16,1,0.3,1) ${(i + 1) * 60}ms, background-color 150ms` }}>
              <span className="flex items-center gap-3">{it.icone && <it.icone className="h-4 w-4 opacity-70" />}{it.label}</span>
              {it.chevron && <ChevronDown className="h-4 w-4" />}
            </button>
          ))}
        </nav>
        <div className="mt-auto px-6 pb-10 pt-6"
          style={{ opacity: aberto ? 1 : 0, transform: aberto ? "translateY(0)" : "translateY(16px)", transition: "opacity 400ms ease 300ms, transform 400ms cubic-bezier(0.16,1,0.3,1) 300ms" }}>
          {rodape}
          {cta && <PilulaCTA onClick={() => { cta.onClick(); onFechar(); }} className="w-full py-3">{cta.label}</PilulaCTA>}
        </div>
      </aside>
    </div>
  );
}

/* Barra de navegação do hero (desktop: pílula de vidro + CTA separado) */
export function NavHero({ links, cta, extra, claroNoMobile, menuAberto, setMenuAberto }) {
  const [sub, setSub] = useState(null);
  return (
    <nav className="relative z-50 flex items-center justify-between px-5 py-5 sm:px-8 sm:py-6 lg:px-12">
      <Marca claroNoMobile={claroNoMobile && !menuAberto} />
      <div className="hidden items-stretch gap-3 md:flex">
        {extra}
        <div className="flex items-center gap-1 rounded-full bg-white/10 px-1.5 py-1.5 backdrop-blur-lg">
          {links.map((l) => (
            <div key={l.label} className="relative">
              <button type="button"
                onClick={() => (l.submenu ? setSub(sub === l.label ? null : l.label) : l.onClick && l.onClick())}
                className="flex items-center gap-1 rounded-full px-4 py-1.5 text-sm font-medium text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                {l.label}{l.submenu && <ChevronDown className={`h-3.5 w-3.5 transition-transform ${sub === l.label ? "rotate-180" : ""}`} />}
              </button>
              {l.submenu && sub === l.label && (
                <div className="absolute left-0 top-full z-50 mt-3 min-w-56 rounded-2xl bg-black/80 p-1.5 backdrop-blur-xl" style={{ animation: "cineSobe 350ms cubic-bezier(0.16,1,0.3,1) both" }}>
                  {l.submenu.map((s) => (
                    <button key={s.label} type="button" onClick={() => { setSub(null); s.onClick && s.onClick(); }}
                      className="block w-full rounded-xl px-4 py-2.5 text-left text-sm text-white/80 transition-colors hover:bg-white/10 hover:text-white">
                      {s.label}
                    </button>
                  ))}
                </div>
              )}
            </div>
          ))}
        </div>
        {cta && <PilulaCTA onClick={cta.onClick} className="self-stretch px-5">{cta.label}</PilulaCTA>}
      </div>
      <BotaoMenu aberto={menuAberto} onClick={() => setMenuAberto(!menuAberto)} claroNoMobile={claroNoMobile} />
    </nav>
  );
}

/* Hero de tela cheia: fundo em movimento, navegação, título + cápsula à esquerda, dois cartões à direita */
export function HeroCinema({ links, cta, extra, titulo, capsula, abaixoCapsula, cartoes, gaveta, videoUrl, conteudoTopo }) {
  const [modo, setModo] = useState("video");
  const [menuAberto, setMenuAberto] = useState(false);
  // texto escuro no celular só sobre vídeo claro (a galeria é escura: texto sempre branco)
  const claro = modo === "video" && VIDEO_CLARO;
  const h1 = claro ? "text-[#010101] lg:text-white" : "text-white";
  return (
    <section className="cine relative h-screen w-full overflow-hidden bg-[#0B1116]" style={{ minHeight: 560 }}>
      <FundoCinema videoUrl={videoUrl} onModo={setModo} />
      <div className="relative z-10 flex h-full flex-col">
        <NavHero links={links} cta={cta} extra={extra} claroNoMobile={claro} menuAberto={menuAberto} setMenuAberto={setMenuAberto} />
        <GavetaMobile aberto={menuAberto} onFechar={() => setMenuAberto(false)} itens={gaveta || links} cta={cta} />
        {conteudoTopo}
        <div className="mt-auto flex flex-col gap-6 px-5 pb-8 sm:gap-8 sm:px-8 sm:pb-12 lg:flex-row lg:items-end lg:justify-between lg:px-12 lg:pb-16">
          <div className="max-w-xl" style={{ animation: "cineSobe 900ms cubic-bezier(0.16,1,0.3,1) both" }}>
            <h1 className={`text-3xl font-semibold leading-[1.1] tracking-tight sm:text-4xl lg:text-[3.5rem] ${h1}`}>{titulo}</h1>
            <div className="mt-6 sm:mt-8">{typeof capsula === "function" ? capsula(claro) : capsula}</div>
            {abaixoCapsula && <div className="mt-3">{typeof abaixoCapsula === "function" ? abaixoCapsula(claro) : abaixoCapsula}</div>}
          </div>
          <div className="flex w-full flex-col gap-4 sm:flex-row lg:w-auto lg:gap-5" style={{ animation: "cineSobe 900ms cubic-bezier(0.16,1,0.3,1) 120ms both" }}>
            {typeof cartoes === "function" ? cartoes(claro) : cartoes}
          </div>
        </div>
      </div>
    </section>
  );
}

/* Cápsula branca com campo + botão (no celular empilha) */
export function Capsula({ children, className = "" }) {
  return <div className={`flex flex-col gap-3 sm:inline-flex sm:flex-row sm:items-center sm:gap-0 sm:rounded-full sm:bg-white sm:p-1.5 ${className}`}>{children}</div>;
}

export const CampoCapsula = React.forwardRef(function CampoCapsula(props, ref) {
  return (
    <input ref={ref} {...props}
      className="campo-capsula rounded-full bg-white px-5 py-3 text-sm text-gray-900 placeholder:text-gray-400 outline-none sm:w-64 sm:rounded-none sm:bg-transparent sm:px-4 sm:py-2" />
  );
});

/* Folha de vidro para conteúdo aberto a partir da navegação do hero */
export function FolhaVidro({ aberta, titulo, onFechar, children }) {
  useTravaRolagem(aberta);
  return (
    <div className={`cine fixed inset-0 z-[60] flex items-end justify-center p-3 sm:items-center sm:p-6 ${aberta ? "" : "pointer-events-none"}`}>
      <div onClick={onFechar} className={`absolute inset-0 bg-black/80 backdrop-blur-md transition-opacity duration-300 ${aberta ? "opacity-100" : "opacity-0"}`} />
      <div role="dialog" aria-modal="true" aria-label={titulo}
        className={`relative max-h-[86vh] w-full max-w-2xl overflow-y-auto rounded-3xl bg-black/85 p-6 text-white backdrop-blur-xl transition-all duration-500 ease-[cubic-bezier(0.16,1,0.3,1)] sm:p-8 ${aberta ? "translate-y-0 opacity-100" : "translate-y-6 opacity-0"}`}>
        <div className="mb-5 flex items-start justify-between gap-4">
          <h2 className="text-2xl font-semibold tracking-tight">{titulo}</h2>
          <button type="button" onClick={onFechar} aria-label="Fechar" className="flex h-9 w-9 shrink-0 items-center justify-center rounded-full bg-white/10 text-white/80 transition-colors hover:bg-white/20 hover:text-white"><X className="h-4 w-4" /></button>
        </div>
        {children}
      </div>
    </div>
  );
}
