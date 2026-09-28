/* Editor de notas: básico, cloze e oclusão de imagem, com texto formatado,
   imagens e pré-visualização ao vivo de como o cartão aparece na revisão.
   Adicionar mantém o tipo, o tópico e as tags para o próximo (como no
   Anki); Ctrl+Enter salva. Também abre como diálogo (editar no estudo). */

import { useEffect, useMemo, useRef, useState } from "react";
import { useNavigate, useParams, useSearchParams } from "react-router-dom";
import { Eye, Image as IconeImagem, Layers, Pencil, Plus, Square, Type, X } from "lucide-react";
import { useBase, useLoja, usePreferencia } from "../estado/hooks.js";
import { ordinaisDaNota, lacunasDoTexto, normalizarNota } from "../dados/modelo.js";
import { salvarNota, apagarNotas } from "../servicos/notas.js";
import { criarTopico } from "../servicos/arvore.js";
import { Botao, Carregando, Dialogo, Erro, PedirTexto, Vazio, avisar } from "./comum.jsx";
import { Cartao } from "./Cartao.jsx";
import { CampoRico } from "./CampoRico.jsx";
import { EditorOclusao } from "./EditorOclusao.jsx";
import { semEnderecos } from "./html.js";

const TIPOS = [
  { valor: "basico", rotulo: "Básico", icone: Type, dica: "Pergunta na frente, resposta no verso." },
  { valor: "cloze", rotulo: "Lacunas (cloze)", icone: Square, dica: "Um texto com partes escondidas; cada lacuna vira um cartão." },
  { valor: "oclusao", rotulo: "Oclusão de imagem", icone: IconeImagem, dica: "Esconda partes de uma imagem; cada forma vira um cartão." },
];

const vazios = (tipo) => (tipo === "basico" ? { frente: "", verso: "" } : tipo === "cloze" ? { texto: "", extra: "" } : { imagem: null, formas: [], extra: "" });

// ao trocar de tipo, o texto já escrito vai junto quando dá
function camposAoTrocar(de, para, c) {
  if (de === "basico" && para === "cloze") return { texto: c.frente || "", extra: c.verso || "" };
  if (de === "cloze" && para === "basico") return { frente: (c.texto || "").replace(/\{\{c\d+::([\s\S]*?)(?:::[\s\S]*?)?\}\}/g, "$1"), verso: c.extra || "" };
  return { ...vazios(para), extra: c.extra || c.verso || "" };
}

// o banco guarda a referência da imagem, não o endereço (que muda)
function paraSalvar(campos) {
  return Object.fromEntries(Object.entries(campos).map(([k, v]) => [k, typeof v === "string" ? semEnderecos(v) : v]));
}

function CampoTags({ tags, aoMudar, conhecidas }) {
  const [texto, setTexto] = useState("");
  const adicionar = (t) => {
    const limpo = t.replace(/\s+/g, " ").trim().replace(/,$/, "");
    if (limpo && !tags.some((x) => x.toLocaleLowerCase("pt-BR") === limpo.toLocaleLowerCase("pt-BR"))) aoMudar([...tags, limpo]);
    setTexto("");
  };
  return (
    <div className="fc-campo">
      <span>Tags</span>
      <div className="fc-tags-entrada">
        {tags.map((t) => (
          <span key={t} className="fc-tag">{t}<button type="button" aria-label={`Tirar a tag ${t}`} onClick={() => aoMudar(tags.filter((x) => x !== t))}><X aria-hidden="true" /></button></span>
        ))}
        <input className="fc-tags-texto" value={texto} list="fc-tags-conhecidas" placeholder={tags.length ? "" : "revisar, banca FUVEST…"}
          onChange={(e) => { if (e.target.value.endsWith(",")) adicionar(e.target.value); else setTexto(e.target.value); }}
          onKeyDown={(e) => {
            if (e.key === "Enter" && texto.trim()) { e.preventDefault(); adicionar(texto); }
            if (e.key === "Backspace" && !texto && tags.length) aoMudar(tags.slice(0, -1));
          }}
          onBlur={() => texto.trim() && adicionar(texto)} aria-label="Nova tag" />
        <datalist id="fc-tags-conhecidas">{conhecidas.filter((t) => !tags.includes(t)).map((t) => <option key={t} value={t} />)}</datalist>
      </div>
      <small>Livres, para estudar e filtrar por fora das matérias. Enter ou vírgula para adicionar.</small>
    </div>
  );
}

function Previa({ nota }) {
  const [lado, setLado] = useState("frente");
  const ordinais = useMemo(() => {
    try { return ordinaisDaNota(nota); } catch { return []; }
  }, [nota]);
  const [ordinal, setOrdinal] = useState(null);
  const atual = ordinais.includes(ordinal) ? ordinal : ordinais[0];
  const rotuloOrdinal = (o) => (o.startsWith("c") ? `Lacuna ${o.slice(1)}` : o.startsWith("f_") ? `Forma ${nota.campos.formas.findIndex((f) => `f_${f.id}` === o) + 1}` : "");
  return (
    <aside className="fc-previa" aria-label="Pré-visualização">
      <div className="fc-previa-topo">
        <span className="fc-rico-rotulo"><Eye aria-hidden="true" />Como fica na revisão</span>
        <div className="fc-escolhas fc-escolhas--compactas" role="radiogroup" aria-label="Lado">
          {["frente", "verso"].map((l) => <button key={l} type="button" role="radio" aria-checked={lado === l} className="fc-escolha" onClick={() => setLado(l)}>{l === "frente" ? "Frente" : "Verso"}</button>)}
        </div>
      </div>
      {ordinais.length > 1 && (
        <div className="fc-escolhas fc-escolhas--compactas" role="radiogroup" aria-label="Qual cartão">
          {ordinais.map((o) => <button key={o} type="button" role="radio" aria-checked={atual === o} className="fc-escolha" onClick={() => setOrdinal(o)}>{rotuloOrdinal(o)}</button>)}
        </div>
      )}
      <div className="fc-previa-cartao">
        {atual ? <Cartao nota={nota} ordinal={atual} lado={lado} /> : <p className="fc-dica">A pré-visualização aparece quando o cartão tiver conteúdo.</p>}
      </div>
      <p className="fc-dica">{ordinais.length} {ordinais.length === 1 ? "cartão" : "cartões"} de revisão sai{ordinais.length === 1 ? "" : "em"} desta nota.</p>
    </aside>
  );
}

/* notaId: editar uma nota; sem ele, adicionar (inicial: { topicoId, materiaId }).
   emDialogo: abre por cima (editar durante o estudo). */
export function EditorNota({ notaId = null, inicial = {}, emDialogo = false, aoFechar, aoSalvar }) {
  const { estado, repo, loja } = useLoja();
  const [ultimo, setUltimo] = usePreferencia(`fc:ultimo:${estado.uid}`, {});
  const primeiroTopico = () => {
    const t = estado.topicos.find((x) => x.id === (inicial.topicoId || ultimo.topicoId)) || (inicial.materiaId ? estado.topicos.find((x) => x.materiaId === inicial.materiaId) : null) || estado.topicos[0];
    return t ? { materiaId: t.materiaId, topicoId: t.id } : { materiaId: inicial.materiaId || estado.materias[0]?.id || "", topicoId: "" };
  };
  const [nota, setNota] = useState(() => (notaId ? null : { tipo: ultimo.tipo || "basico", ...primeiroTopico(), campos: vazios(ultimo.tipo || "basico"), tags: ultimo.tags || [] }));
  const [original, setOriginal] = useState(null);
  const [erros, setErros] = useState({});
  const [erroGeral, setErroGeral] = useState(null);
  const [salvando, setSalvando] = useState(false);
  const [novoTopico, setNovoTopico] = useState(false);
  const [aba, setAba] = useState("editar"); // no celular: editar | previa
  const [versao, setVersao] = useState(0); // recria os campos depois de adicionar
  const raiz = useRef(null);

  // carrega a nota a editar (com os endereços das imagens para o editor)
  useEffect(() => {
    if (!notaId) return undefined;
    let vivo = true;
    repo.obter("notas", notaId).then(async (n) => {
      if (!vivo) return;
      if (!n) { setErroGeral(new Error("Esta nota não existe mais.")); return; }
      const campos = { ...n.campos };
      for (const [k, v] of Object.entries(campos)) {
        if (typeof v !== "string" || !v.includes("data-fc-img")) continue;
        const t = document.createElement("template");
        t.innerHTML = v;
        await Promise.all([...t.content.querySelectorAll("img[data-fc-img]")].map(async (img) => {
          const url = await repo.urlImagem(img.getAttribute("data-fc-img")).catch(() => null);
          if (url) img.setAttribute("src", url);
        }));
        campos[k] = t.innerHTML;
      }
      if (vivo) { setOriginal(n); setNota({ ...n, campos }); }
    });
    return () => { vivo = false; };
  }, [repo, notaId]);

  const topicosDaMateria = estado.topicos.filter((t) => t.materiaId === nota?.materiaId);
  const mudarCampos = (patch) => setNota((n) => ({ ...n, campos: { ...n.campos, ...patch } }));

  const salvar = async () => {
    if (salvando || !nota) return;
    setSalvando(true);
    setErros({});
    setErroGeral(null);
    try {
      const dados = { ...nota, campos: paraSalvar(nota.campos) };
      normalizarNota(dados); // mostra os erros campo a campo antes de gravar
      const r = await salvarNota(repo, { ...dados, id: notaId || undefined }, { tagsConhecidas: estado.tagsConhecidas });
      loja.recontar();
      if (notaId) {
        avisar(r.criados || r.removidos ? `Salvo: ${r.criados} ${r.criados === 1 ? "cartão novo" : "cartões novos"}, ${r.removidos} ${r.removidos === 1 ? "removido" : "removidos"}.` : "Alterações salvas.");
        aoSalvar?.({ ...dados, id: notaId });
        return;
      }
      setUltimo({ tipo: nota.tipo, topicoId: nota.topicoId, tags: nota.tags });
      avisar(`${r.cartoes === 1 ? "Cartão adicionado" : `${r.cartoes} cartões adicionados`}.`, {
        acao: { rotulo: "Desfazer", fn: async () => { await apagarNotas(repo, [{ id: r.id, imagens: [] }]); loja.recontar(); } },
      });
      setNota((n) => ({ ...n, campos: vazios(n.tipo) }));
      setVersao((v) => v + 1);
      aoSalvar?.({ ...dados, id: r.id });
      setTimeout(() => raiz.current?.querySelector(".fc-rico-area")?.focus(), 60);
    } catch (e) {
      if (e.campos) setErros(e.campos); else setErroGeral(e);
    } finally { setSalvando(false); }
  };

  // Ctrl+Enter salva
  useEffect(() => {
    const tecla = (e) => {
      if ((e.ctrlKey || e.metaKey) && e.key === "Enter" && raiz.current?.contains(document.activeElement)) { e.preventDefault(); salvar(); }
    };
    window.addEventListener("keydown", tecla);
    return () => window.removeEventListener("keydown", tecla);
  });

  if (erroGeral && !nota) return <Vazio titulo="Não foi possível abrir" texto={erroGeral.message} />;
  if (!nota) return <Carregando />;
  if (!estado.materias.length) {
    return <Vazio icone={Layers} titulo="Crie uma matéria primeiro" texto="Os cartões moram dentro de um tópico de uma matéria. Crie na aba Baralhos." />;
  }

  const c = nota.campos;
  const lacunas = nota.tipo === "cloze" ? lacunasDoTexto(c.texto) : [];
  const corpo = (
    <div ref={raiz} className={`fc-editor${emDialogo ? " fc-editor--dialogo" : ""}`} data-aba={aba}>
      <div className="fc-editor-abas-cel" role="tablist" aria-label="Editor">
        <button type="button" role="tab" aria-selected={aba === "editar"} onClick={() => setAba("editar")}><Pencil aria-hidden="true" />Editar</button>
        <button type="button" role="tab" aria-selected={aba === "previa"} onClick={() => setAba("previa")}><Eye aria-hidden="true" />Pré-visualizar</button>
      </div>
      <div className="fc-editor-form">
        {!notaId && (
          <div className="fc-tipos" role="radiogroup" aria-label="Tipo de cartão">
            {TIPOS.map((t) => (
              <button key={t.valor} type="button" role="radio" aria-checked={nota.tipo === t.valor} className="fc-tipo" title={t.dica}
                onClick={() => setNota((n) => (n.tipo === t.valor ? n : { ...n, tipo: t.valor, campos: camposAoTrocar(n.tipo, t.valor, n.campos) }))}>
                <t.icone aria-hidden="true" /><span>{t.rotulo}</span>
              </button>
            ))}
          </div>
        )}
        <div className="fc-editor-lugar">
          <label className="fc-campo"><span>Matéria</span>
            <select className="fc-entrada" value={nota.materiaId} onChange={(e) => {
              const materiaId = e.target.value;
              setNota((n) => ({ ...n, materiaId, topicoId: estado.topicos.find((t) => t.materiaId === materiaId)?.id || "" }));
            }}>
              {estado.materias.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
            </select>
          </label>
          <label className="fc-campo"><span>Tópico</span>
            <select className="fc-entrada" value={nota.topicoId} onChange={(e) => (e.target.value === "__novo" ? setNovoTopico(true) : setNota((n) => ({ ...n, topicoId: e.target.value })))}>
              {!topicosDaMateria.length && <option value="">Crie um tópico…</option>}
              {topicosDaMateria.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
              <option value="__novo">+ Novo tópico</option>
            </select>
            {erros.topicoId && <small className="fc-campo-erro" role="alert">{erros.topicoId}</small>}
          </label>
        </div>

        {nota.tipo === "basico" && (
          <>
            <CampoRico key={`f${versao}-${notaId}`} rotulo="Frente" valor={c.frente} aoMudar={(frente) => mudarCampos({ frente })} placeholder="A pergunta" erro={erros.frente} autoFocus={!emDialogo} />
            <CampoRico key={`v${versao}-${notaId}`} rotulo="Verso" valor={c.verso} aoMudar={(verso) => mudarCampos({ verso })} placeholder="A resposta" erro={erros.verso} />
          </>
        )}
        {nota.tipo === "cloze" && (
          <>
            <CampoRico key={`t${versao}-${notaId}`} cloze rotulo="Texto" valor={c.texto} aoMudar={(texto) => mudarCampos({ texto })} erro={erros.texto} autoFocus={!emDialogo}
              placeholder="Selecione a palavra e toque em Lacuna (ou Ctrl+Shift+C). Ex.: A {{c1::mitocôndria}} faz a respiração." />
            <p className="fc-dica fc-dica--linha">{lacunas.length ? `Lacunas: ${lacunas.map((n) => `c${n}`).join(", ")} → ${lacunas.length} ${lacunas.length === 1 ? "cartão" : "cartões"}. Use o mesmo número para esconder juntas.` : "Nenhuma lacuna ainda."}</p>
            <CampoRico key={`e${versao}-${notaId}`} rotulo="Extra (opcional, aparece no verso)" valor={c.extra} aoMudar={(extra) => mudarCampos({ extra })} placeholder="Explicação, fonte, mnemônico…" />
          </>
        )}
        {nota.tipo === "oclusao" && (
          <>
            <EditorOclusao campos={c} aoMudar={(campos) => setNota((n) => ({ ...n, campos }))} erro={erros.imagem || erros.formas} />
            <CampoRico key={`x${versao}-${notaId}`} rotulo="Extra (opcional, aparece no verso)" valor={c.extra} aoMudar={(extra) => mudarCampos({ extra })} placeholder="Legenda, explicação…" />
          </>
        )}

        <CampoTags tags={nota.tags} aoMudar={(tags) => setNota((n) => ({ ...n, tags }))} conhecidas={estado.tagsConhecidas} />
        <Erro erro={erroGeral} />
        <div className="fc-editor-acoes">
          {aoFechar && <Botao onClick={aoFechar}>{notaId ? "Cancelar" : "Fechar"}</Botao>}
          <Botao variante="primario" icone={notaId ? undefined : Plus} disabled={salvando} onClick={salvar}>
            {salvando ? "Salvando…" : notaId ? "Salvar" : "Adicionar"}<kbd className="fc-kbd-botao">Ctrl+Enter</kbd>
          </Botao>
        </div>
        {notaId && original && <p className="fc-dica">Editar mantém o progresso dos cartões que continuam. Lacunas ou formas removidas apagam os cartões delas.</p>}
      </div>
      <Previa nota={{ ...nota, campos: c }} />
      <PedirTexto aberto={novoTopico} titulo="Novo tópico" rotulo="Nome do tópico" confirmar="Criar" aoFechar={() => setNovoTopico(false)}
        aoSalvar={async (nome) => {
          const id = await criarTopico(repo, { materiaId: nota.materiaId, nome }, topicosDaMateria);
          setNota((n) => ({ ...n, topicoId: id }));
        }} />
    </div>
  );

  if (emDialogo) {
    return <Dialogo aberto aoFechar={aoFechar} titulo="Editar cartão" largura={1080} className="fc-dialogo--editor">{corpo}</Dialogo>;
  }
  return corpo;
}

// páginas: /novo (adicionar) e /nota/:id (editar)
export default function Editor() {
  const { id } = useParams();
  const [params] = useSearchParams();
  const navigate = useNavigate();
  const base = useBase();
  const inicial = { topicoId: params.get("topico") || undefined, materiaId: params.get("materia") || undefined };
  return (
    <div className="fc-pagina-editor">
      <header className="fc-pagina-topo"><h1>{id ? "Editar cartão" : "Adicionar cartões"}</h1></header>
      <EditorNota key={id || "novo"} notaId={id || null} inicial={inicial}
        aoFechar={id ? () => navigate(-1) : undefined}
        aoSalvar={id ? () => navigate(-1) : undefined} />
      {!id && <p className="fc-dica">Dica: depois de adicionar, os campos se esvaziam e o tópico e as tags ficam, para você emendar o próximo. Volte em <a href={`#${base}`}>Baralhos</a> para estudar.</p>}
    </div>
  );
}
