/* HTML dos cartões: limpeza (só o que o editor produz; nada de scripts,
   estilos ou eventos) e a montagem de frente e verso de cada tipo. */

import DOMPurify from "dompurify";
import { RE_LACUNA } from "../dados/modelo.js";

const TAGS = ["p", "br", "strong", "b", "em", "i", "u", "s", "sub", "sup", "ul", "ol", "li", "img", "span", "div", "blockquote", "code", "pre", "h1", "h2", "h3", "mark", "hr"];
const ATRIBUTOS = ["src", "alt", "data-fc-img", "class"];

export const limparHtml = (html) => DOMPurify.sanitize(String(html || ""), { ALLOWED_TAGS: TAGS, ALLOWED_ATTR: ATRIBUTOS });

// imagens embutidas: o banco guarda só a referência (data-fc-img); o endereço é resolvido na hora
export const semEnderecos = (html) => String(html || "").replace(/(<img\b[^>]*?)\s+src="[^"]*"([^>]*data-fc-img=)/gi, "$1$2").replace(/(<img\b[^>]*data-fc-img="[^"]*"[^>]*?)\s+src="[^"]*"/gi, "$1");

const escapar = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" }[c]));

/* Cloze: a lacuna da vez (n) vira […] (ou [dica]) na frente e aparece
   destacada no verso; as outras lacunas aparecem como texto normal. */
export function htmlCloze(texto, n, lado) {
  return String(texto || "").replace(new RegExp(RE_LACUNA.source, "g"), (_, num, resposta, dica) => {
    if (Number(num) !== n) return resposta;
    if (lado === "frente") return `<span class="fc-lacuna">[${dica ? escapar(dica) : "…"}]</span>`;
    return `<span class="fc-lacuna fc-lacuna--revelada">${resposta}</span>`;
  });
}

export const numeroDaLacuna = (ordinal) => Number(String(ordinal).replace(/^c/, ""));
export const idDaForma = (ordinal) => String(ordinal).replace(/^f_/, "");
