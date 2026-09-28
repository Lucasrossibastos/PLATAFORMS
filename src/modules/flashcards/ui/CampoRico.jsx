/* Campo de texto formatado (TipTap): negrito, itálico, sublinhado, listas,
   sub/sobrescrito (fórmulas), imagens (comprimidas; também coladas) e, no
   cloze, o botão de lacuna com os atalhos do Anki:
     Ctrl+Shift+C      nova lacuna (c1, c2, …)
     Ctrl+Alt+Shift+C  mesma lacuna da anterior */

import { useEffect, useRef } from "react";
import { EditorContent, useEditor, useEditorState } from "@tiptap/react";
import StarterKit from "@tiptap/starter-kit";
import Subscript from "@tiptap/extension-subscript";
import Superscript from "@tiptap/extension-superscript";
import Image from "@tiptap/extension-image";
import { Placeholder } from "@tiptap/extensions";
import { Bold, Brackets, ImagePlus, Italic, List, ListOrdered, RemoveFormatting, Subscript as IconeSub, Superscript as IconeSup, Underline } from "lucide-react";
import { useLoja } from "../estado/hooks.js";
import { lacunasDoTexto } from "../dados/modelo.js";
import { comprimirImagem } from "./imagens.js";
import { guardarEndereco } from "./Cartao.jsx";
import { avisar } from "./comum.jsx";

// imagem com a referência do armazenamento (data-fc-img) além do endereço
const ImagemFc = Image.extend({
  addAttributes() {
    return {
      ...this.parent?.(),
      "data-fc-img": { default: null, parseHTML: (el) => el.getAttribute("data-fc-img"), renderHTML: (a) => (a["data-fc-img"] ? { "data-fc-img": a["data-fc-img"] } : {}) },
    };
  },
});

function BotaoFerramenta({ ativo, icone: Icone, rotulo, onClick, desativado }) {
  return (
    <button type="button" className={`fc-ferramenta${ativo ? " fc-ferramenta--ativa" : ""}`} aria-label={rotulo} title={rotulo} aria-pressed={ativo}
      disabled={desativado} onMouseDown={(e) => e.preventDefault()} onClick={onClick}>
      <Icone aria-hidden="true" />
    </button>
  );
}

export function CampoRico({ rotulo, valor, aoMudar, cloze = false, placeholder = "", erro, autoFocus = false, id }) {
  const { repo } = useLoja();
  const arquivo = useRef(null);
  const ultimoEmitido = useRef(valor);

  const enviarImagens = async (editor, arquivos) => {
    for (const f of arquivos) {
      try {
        const { blob } = await comprimirImagem(f);
        const ref = await repo.enviarImagem(blob);
        const url = URL.createObjectURL(blob);
        guardarEndereco(ref, url);
        editor.chain().focus().setImage({ src: url, "data-fc-img": ref, alt: "" }).run();
      } catch (e) {
        avisar(e.message || "Não foi possível enviar a imagem.", { tipo: "erro" });
      }
    }
  };

  const editor = useEditor({
    extensions: [
      StarterKit.configure({ heading: false, codeBlock: false, horizontalRule: false, link: false, blockquote: false }),
      Subscript, Superscript, ImagemFc.configure({ inline: false }),
      Placeholder.configure({ placeholder }),
    ],
    content: valor || "",
    autofocus: autoFocus ? "end" : false,
    editorProps: {
      attributes: { class: "fc-rico-area", "aria-label": rotulo, ...(id ? { id } : {}) },
      handlePaste: (view, e) => {
        const imgs = [...(e.clipboardData?.files || [])].filter((f) => f.type.startsWith("image/"));
        if (!imgs.length) return false;
        e.preventDefault();
        enviarImagens(editorRef.current, imgs);
        return true;
      },
      handleDrop: (view, e) => {
        const imgs = [...(e.dataTransfer?.files || [])].filter((f) => f.type.startsWith("image/"));
        if (!imgs.length) return false;
        e.preventDefault();
        enviarImagens(editorRef.current, imgs);
        return true;
      },
    },
    onUpdate: ({ editor: ed }) => {
      const html = ed.isEmpty ? "" : ed.getHTML();
      ultimoEmitido.current = html;
      aoMudar(html);
    },
  });
  const editorRef = useRef(null);
  editorRef.current = editor;

  // valor trocado de fora (ex.: limpar depois de adicionar, abrir outra nota)
  useEffect(() => {
    if (!editor || valor === ultimoEmitido.current) return;
    ultimoEmitido.current = valor;
    editor.commands.setContent(valor || "", { emitUpdate: false });
  }, [editor, valor]);

  const marcas = useEditorState({
    editor,
    selector: ({ editor: ed }) => (ed ? {
      bold: ed.isActive("bold"), italic: ed.isActive("italic"), underline: ed.isActive("underline"),
      bulletList: ed.isActive("bulletList"), orderedList: ed.isActive("orderedList"),
      subscript: ed.isActive("subscript"), superscript: ed.isActive("superscript"),
    } : {}),
  }) || {};

  const lacuna = (mesma) => {
    if (!editor || editor.isDestroyed) return;
    // a seleção do navegador chega ao editor de forma assíncrona: sincroniza antes de ler
    editor.view.domObserver?.flush?.();
    const nums = lacunasDoTexto(editor.getText());
    const n = mesma && nums.length ? Math.max(...nums) : (nums.length ? Math.max(...nums) + 1 : 1);
    const { from, to, empty } = editor.state.selection;
    const texto = empty ? "" : editor.state.doc.textBetween(from, to, " ");
    editor.chain().focus().insertContentAt({ from, to }, `{{c${n}::${texto}}}`).run();
    if (empty) editor.commands.setTextSelection(from + `{{c${n}::`.length);
  };

  useEffect(() => {
    if (!editor || !cloze) return undefined;
    const tecla = (e) => {
      if (!editor.isFocused) return;
      if ((e.ctrlKey || e.metaKey) && e.shiftKey && (e.key === "C" || e.key === "c")) { e.preventDefault(); lacuna(e.altKey); }
    };
    window.addEventListener("keydown", tecla, true);
    return () => window.removeEventListener("keydown", tecla, true);
  }, [editor, cloze]); // eslint-disable-line react-hooks/exhaustive-deps

  const c = () => editor.chain(); // chamar como método (usa o próprio editor)
  return (
    <div className={`fc-rico${erro ? " fc-rico--erro" : ""}`}>
      <div className="fc-rico-topo">
        <span className="fc-rico-rotulo">{rotulo}</span>
        <div className="fc-ferramentas" role="toolbar" aria-label={`Formatação de ${rotulo}`}>
          {cloze && (
            <button type="button" className="fc-ferramenta fc-ferramenta--lacuna" title="Nova lacuna (Ctrl+Shift+C) · mesma lacuna: Ctrl+Alt+Shift+C"
              onMouseDown={(e) => e.preventDefault()} onClick={() => lacuna(false)}>
              <Brackets aria-hidden="true" />Lacuna
            </button>
          )}
          <BotaoFerramenta icone={Bold} rotulo="Negrito (Ctrl+B)" ativo={marcas.bold} onClick={() => c().focus().toggleBold().run()} />
          <BotaoFerramenta icone={Italic} rotulo="Itálico (Ctrl+I)" ativo={marcas.italic} onClick={() => c().focus().toggleItalic().run()} />
          <BotaoFerramenta icone={Underline} rotulo="Sublinhado (Ctrl+U)" ativo={marcas.underline} onClick={() => c().focus().toggleUnderline().run()} />
          <BotaoFerramenta icone={IconeSub} rotulo="Subscrito (H₂O)" ativo={marcas.subscript} onClick={() => c().focus().toggleSubscript().run()} />
          <BotaoFerramenta icone={IconeSup} rotulo="Sobrescrito (10²³)" ativo={marcas.superscript} onClick={() => c().focus().toggleSuperscript().run()} />
          <BotaoFerramenta icone={List} rotulo="Lista" ativo={marcas.bulletList} onClick={() => c().focus().toggleBulletList().run()} />
          <BotaoFerramenta icone={ListOrdered} rotulo="Lista numerada" ativo={marcas.orderedList} onClick={() => c().focus().toggleOrderedList().run()} />
          <BotaoFerramenta icone={ImagePlus} rotulo="Imagem (também dá para colar)" onClick={() => arquivo.current?.click()} />
          <BotaoFerramenta icone={RemoveFormatting} rotulo="Limpar formatação" onClick={() => c().focus().unsetAllMarks().clearNodes().run()} />
          <input ref={arquivo} type="file" accept="image/*" hidden onChange={(e) => { const fs = [...e.target.files]; e.target.value = ""; enviarImagens(editor, fs); }} />
        </div>
      </div>
      <EditorContent editor={editor} />
      {erro && <small className="fc-campo-erro" role="alert">{erro}</small>}
    </div>
  );
}
