import { useEffect, useId, useRef } from "react";
import { X } from "lucide-react";
import { MATERIAS_FLAT, topicosDaMateria } from "../core/nucleo.js";
import { linhasDe, partesDe } from "../textos.js";

export const APP_NOME = "aprova";

export function Marca({ className = "", ...resto }) {
  return (
    <span className={`marca ${className}`} {...resto}>
      <svg viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
        <g transform="rotate(-30 12 12)">
          <circle cx="7.3" cy="3.2" r="1.45" />
          <rect x="5.5" y="4.7" width="3.6" height="14.6" rx="1.8" />
          <rect x="14.9" y="4.7" width="3.6" height="14.6" rx="1.8" />
          <circle cx="16.7" cy="20.8" r="1.45" />
        </g>
      </svg>
      <span>{APP_NOME}<b>+</b></span>
    </span>
  );
}

export function Estrela({ className = "estrela" }) {
  return (
    <svg className={className} viewBox="0 0 24 24" fill="#ffffff" aria-hidden="true">
      <path d="M12 2.6C12.55 2.6 12.88 3.15 13.08 4.7c.62 4.7 1.52 5.6 6.22 6.22 1.55.2 2.1.53 2.1 1.08s-.55.88-2.1 1.08c-4.7.62-5.6 1.52-6.22 6.22-.2 1.55-.53 2.1-1.08 2.1s-.88-.55-1.08-2.1c-.62-4.7-1.52-5.6-6.22-6.22C3.15 12.88 2.6 12.55 2.6 12s.55-.88 2.1-1.08c4.7-.62 5.6-1.52 6.22-6.22C11.12 3.15 11.45 2.6 12 2.6Z" />
    </svg>
  );
}

export function Grao() {
  return (
    <div className="grao" aria-hidden="true">
      <svg xmlns="http://www.w3.org/2000/svg" preserveAspectRatio="none">
        <filter id="grao-ruido">
          <feTurbulence type="fractalNoise" baseFrequency="0.85" numOctaves="3" stitchTiles="stitch" />
          <feColorMatrix type="saturate" values="0" />
        </filter>
        <rect width="100%" height="100%" filter="url(#grao-ruido)" />
      </svg>
    </div>
  );
}

export function Botao({ variante = "solido", tamanho, bloco, icone: Icone, className = "", children, type = "button", ...resto }) {
  const classes = ["btn", `btn--${variante}`, tamanho && `btn--${tamanho}`, bloco && "btn--bloco", className].filter(Boolean).join(" ");
  return (
    <button type={type} className={classes} {...resto}>
      {Icone && <Icone aria-hidden="true" />}
      {children}
    </button>
  );
}

export function Barra({ valor = 0, cor, altura }) {
  const v = Math.max(0, Math.min(100, valor || 0));
  return (
    <div className="barra" style={altura ? { "--h": `${altura}px` } : undefined} role="presentation">
      <span style={{ width: `${v}%`, ...(cor ? { "--cor": cor } : {}) }} />
    </div>
  );
}

export function Vazio({ icone: Icone, titulo, texto }) {
  return (
    <div className="vazio">
      {Icone && <Icone aria-hidden="true" />}
      <strong>{titulo}</strong>
      {texto && <p>{texto}</p>}
    </div>
  );
}

/* Frase com marcação: *destaque* em serifa, Enter vira quebra de linha. */
export function Frase({ texto }) {
  return linhasDe(texto).map((linha, i) => (
    <span key={i}>
      {i > 0 && <br />}
      {partesDe(linha).map((p, j) => (p.destaque ? <em key={j} className="serif">{p.texto}</em> : p.texto))}
    </span>
  ));
}

export function TituloPagina({ eyebrow, frase, texto, direita }) {
  return (
    <header className="titulo-pagina">
      <div>
        {eyebrow && <span className="eyebrow">{eyebrow}</span>}
        <h1><Frase texto={frase} /></h1>
        {texto && <p>{texto}</p>}
      </div>
      {direita}
    </header>
  );
}

/* Diálogo sobre <dialog> nativo: foco preso, Esc fecha, fundo desfocado. */
export function Dialogo({ aberto, aoFechar, titulo, largura = 480, children, className = "dialogo", ...resto }) {
  const ref = useRef(null);
  const id = useId();

  useEffect(() => {
    const d = ref.current;
    if (!d) return;
    if (aberto && !d.open) d.showModal();
    if (!aberto && d.open) d.close();
  }, [aberto]);

  return (
    <dialog
      ref={ref}
      className={className}
      style={{ "--largura": `${largura}px` }}
      aria-labelledby={titulo ? id : undefined}
      onClose={aoFechar}
      onClick={(e) => { if (e.target === ref.current) aoFechar(); }}
      {...resto}
    >
      {aberto && (
        <>
          <div className={className === "folha" ? "folha-topo" : "dialogo-topo"}>
            <h2 id={id}>{titulo}</h2>
            <button type="button" className="icone-btn" onClick={aoFechar} aria-label="Fechar"><X /></button>
          </div>
          <div className={className === "folha" ? "folha-corpo" : "dialogo-corpo"}>{children}</div>
        </>
      )}
    </dialog>
  );
}

export function Campo({ rotulo, ajuda, children }) {
  return (
    <label className="campo">
      <span>{rotulo}</span>
      {children}
      {ajuda && <small>{ajuda}</small>}
    </label>
  );
}

/* Matéria → tópico em cascata, por id. Mostra os subtópicos como guia. */
export function MateriaTopico({ valor, aoMudar, rotuloTopico = "Tópico", topicoObrigatorio = false }) {
  const topicos = topicosDaMateria(valor.materiaId);
  const sel = topicos.find((t) => t.id === valor.topicoId);
  return (
    <>
      <Campo rotulo="Matéria">
        <select className="entrada" value={valor.materiaId} onChange={(e) => aoMudar({ materiaId: e.target.value, topicoId: "" })}>
          <option value="">Selecione…</option>
          {MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </select>
      </Campo>
      <Campo rotulo={rotuloTopico}>
        <select className="entrada" value={valor.topicoId} disabled={!valor.materiaId}
          onChange={(e) => aoMudar({ ...valor, topicoId: e.target.value })}>
          <option value="">{valor.materiaId ? (topicoObrigatorio ? "Selecione o tópico…" : "Tópico (opcional)") : "Escolha a matéria primeiro"}</option>
          {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </select>
      </Campo>
      {sel && (
        <div className="guia">
          <span className="eyebrow">Subtópicos</span>
          <div>{sel.subs.map((s) => <span key={s}>{s}</span>)}</div>
        </div>
      )}
    </>
  );
}
