import { useEffect, useState } from "react";
import { ArrowDown, ArrowUp, ImagePlus, Plus, Trash2 } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useArquivoUrl, useBoasVindas, useConfigRedacao } from "../../state/hooks.js";
import { comprimirImagem } from "../../state/arquivos.js";
import { BOAS_VINDAS_PADRAO } from "../../data/semente.js";
import { Abas, Botao, Campo, Carregando, MensagemErro, TituloPagina } from "../../ui/ui.jsx";
import { Bloco } from "../Paginas.jsx";
import EditorTextos from "./EditorTextos.jsx";

function FotoHero({ refFoto }) {
  const { url } = useArquivoUrl(refFoto);
  return url ? <img src={url} alt="" className="miniatura-hero" /> : null;
}

const NOVO_BLOCO = {
  titulo: () => ({ tipo: "titulo", texto: "" }),
  texto: () => ({ tipo: "texto", texto: "" }),
  destaque: () => ({ tipo: "destaque", itens: [{ valor: "", label: "" }] }),
  foto: () => ({ tipo: "foto", url: null, legenda: "" }),
  divisor: () => ({ tipo: "divisor" }),
};

/* Página de boas-vindas: professor (hero) e blocos. */
function BoasVindasEditor() {
  const { s } = useApp();
  const salvo = useBoasVindas();
  const [c, setC] = useState(null);
  const [aviso, setAviso] = useState("");
  const { executar, ocupado, erro } = useAcao();
  useEffect(() => { if (salvo !== undefined) setC(structuredClone(salvo || BOAS_VINDAS_PADRAO)); }, [salvo]);
  if (!c) return <Carregando />;
  const mudar = (fn) => { setAviso(""); setC((x) => { const n = structuredClone(x); fn(n); return n; }); };
  const enviarFoto = (aplicar) => async (e) => {
    const arq = e.target.files?.[0];
    if (!arq) return;
    await executar(async () => { const ref = await s.textos.enviarImagem(await comprimirImagem(arq, 1400, 0.85)); mudar((n) => aplicar(n, ref)); });
    e.target.value = "";
  };
  const alterado = JSON.stringify(c) !== JSON.stringify(salvo || BOAS_VINDAS_PADRAO);

  return (
    <>
      <section className="cartao form">
        <h2 className="subtitulo">Professor ou curso</h2>
        <div className="form-linha">
          <Campo rotulo="Nome"><input className="entrada" value={c.hero.nome || ""} onChange={(e) => mudar((n) => { n.hero.nome = e.target.value; })} /></Campo>
          <Campo rotulo="Cor"><input className="entrada cor-livre" type="color" value={c.hero.cor || "#C9793A"} onChange={(e) => mudar((n) => { n.hero.cor = e.target.value; })} /></Campo>
        </div>
        <Campo rotulo="Apresentação"><textarea className="entrada" rows={2} value={c.hero.subtitulo || ""} onChange={(e) => mudar((n) => { n.hero.subtitulo = e.target.value; })} /></Campo>
        <div className="linha-acoes">
          <FotoHero refFoto={c.hero.foto} />
          <label className="btn btn--vidro btn--sm"><ImagePlus aria-hidden="true" />{c.hero.foto ? "Trocar foto" : "Enviar foto"}<input type="file" accept="image/*" className="sr-only" onChange={enviarFoto((n, ref) => { n.hero.foto = ref; })} /></label>
          {c.hero.foto && <Botao variante="texto" tamanho="sm" onClick={() => mudar((n) => { n.hero.foto = null; })}>Tirar foto</Botao>}
        </div>
      </section>

      <h2 className="subtitulo">Blocos da página</h2>
      <p className="previa-linha">Esta página aparece em “Sobre o curso” e, na tela de login, em “Método” e “Professores”, para qualquer visitante: use só números reais.</p>
      {c.blocos.map((b, i) => (
        <section key={b.id || i} className="cartao form bloco-editor">
          <div className="linha-titulo-secao">
            <span className="eyebrow">{({ titulo: "Título", texto: "Texto", destaque: "Números", foto: "Foto", divisor: "Divisor" })[b.tipo]}</span>
            <span className="arvore-acoes">
              <button type="button" className="icone-btn" aria-label="Subir bloco" disabled={i === 0} onClick={() => mudar((n) => { [n.blocos[i - 1], n.blocos[i]] = [n.blocos[i], n.blocos[i - 1]]; })}><ArrowUp /></button>
              <button type="button" className="icone-btn" aria-label="Descer bloco" disabled={i === c.blocos.length - 1} onClick={() => mudar((n) => { [n.blocos[i + 1], n.blocos[i]] = [n.blocos[i], n.blocos[i + 1]]; })}><ArrowDown /></button>
              <button type="button" className="icone-btn" aria-label="Remover bloco" onClick={() => mudar((n) => { n.blocos.splice(i, 1); })}><Trash2 /></button>
            </span>
          </div>
          {b.tipo === "titulo" && <input className="entrada" aria-label="Título" value={b.texto} onChange={(e) => mudar((n) => { n.blocos[i].texto = e.target.value; })} />}
          {b.tipo === "texto" && <textarea className="entrada" rows={4} aria-label="Texto" value={b.texto} onChange={(e) => mudar((n) => { n.blocos[i].texto = e.target.value; })} />}
          {b.tipo === "destaque" && (
            <>
              {b.itens.map((it, j) => (
                <div key={j} className="linha-numero">
                  <input className="entrada" aria-label={`Número ${j + 1}`} value={it.valor} placeholder="+15" onChange={(e) => mudar((n) => { n.blocos[i].itens[j].valor = e.target.value; })} />
                  <input className="entrada" aria-label={`Texto do número ${j + 1}`} value={it.label} placeholder="anos de experiência" onChange={(e) => mudar((n) => { n.blocos[i].itens[j].label = e.target.value; })} />
                  <button type="button" className="icone-btn" aria-label={`Remover número ${j + 1}`} onClick={() => mudar((n) => { n.blocos[i].itens.splice(j, 1); })}><Trash2 /></button>
                </div>
              ))}
              {b.itens.length < 4 && <Botao variante="texto" tamanho="sm" icone={Plus} onClick={() => mudar((n) => { n.blocos[i].itens.push({ valor: "", label: "" }); })}>Adicionar número</Botao>}
            </>
          )}
          {b.tipo === "foto" && (
            <div className="linha-acoes">
              <FotoHero refFoto={b.url} />
              <label className="btn btn--vidro btn--sm"><ImagePlus aria-hidden="true" />{b.url ? "Trocar imagem" : "Enviar imagem"}<input type="file" accept="image/*" className="sr-only" onChange={enviarFoto((n, ref) => { n.blocos[i].url = ref; })} /></label>
              <input className="entrada" aria-label="Legenda" placeholder="Legenda (opcional)" value={b.legenda || ""} onChange={(e) => mudar((n) => { n.blocos[i].legenda = e.target.value; })} />
            </div>
          )}
          {b.tipo !== "divisor" && <div className="previa-bloco"><Bloco bloco={b} /></div>}
        </section>
      ))}
      <div className="linha-acoes">
        {Object.keys(NOVO_BLOCO).map((tipo) => (
          <Botao key={tipo} variante="vidro" tamanho="sm" icone={Plus} onClick={() => mudar((n) => { n.blocos.push({ id: `b${Date.now()}`, ...NOVO_BLOCO[tipo]() }); })}>
            {({ titulo: "Título", texto: "Texto", destaque: "Números", foto: "Foto", divisor: "Divisor" })[tipo]}
          </Botao>
        ))}
      </div>
      <MensagemErro erro={erro} />
      {(alterado || aviso) && (
        <div className="barra-mover barra-salvar" role="status">
          <span>{alterado ? "Alterações não salvas." : aviso}</span>
          {alterado && (
            <>
              <Botao variante="vidro" tamanho="sm" onClick={() => setC(structuredClone(salvo || BOAS_VINDAS_PADRAO))}>Descartar</Botao>
              <Botao variante="solido" tamanho="sm" disabled={ocupado} onClick={() => executar(async () => {
                await s.textos.salvarBoasVindas({ hero: c.hero, blocos: c.blocos.map((b) => (b.tipo === "destaque" ? { ...b, itens: b.itens.filter((x) => x.valor.trim() || x.label.trim()) } : b)) });
                setAviso("Página salva.");
              })}>Salvar</Botao>
            </>
          )}
        </div>
      )}
    </>
  );
}

// o aluno vê na tela de Redação
function InstrucoesRedacao() {
  const { s } = useApp();
  const config = useConfigRedacao();
  const [texto, setTexto] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const { executar, ocupado, erro } = useAcao();
  if (config === undefined) return <Carregando />;
  const atual = texto ?? config.instrucoes ?? "";
  const mudou = atual !== (config.instrucoes ?? "");
  return (
    <section className="cartao form" aria-labelledby="t-instrucoes">
      <h2 id="t-instrucoes" className="subtitulo">Como enviar a redação <small>o aluno vê isto na tela de Redação</small></h2>
      <textarea className="entrada" rows={3} value={atual} onChange={(e) => { setTexto(e.target.value); setSalvo(false); }} aria-labelledby="t-instrucoes" />
      <MensagemErro erro={erro} />
      <div className="linha-acoes">
        {salvo && <span className="retorno-curto" role="status">Instruções salvas.</span>}
        <Botao variante="solido" tamanho="sm" disabled={!mudou || !atual.trim() || ocupado}
          onClick={() => executar(async () => { await s.redacao.salvarInstrucoes(atual); setTexto(null); setSalvo(true); })}>Salvar instruções</Botao>
      </div>
    </section>
  );
}

export default function Textos() {
  const [aba, setAba] = useState("frases");
  return (
    <>
      <TituloPagina eyebrow="Conteúdo" frase="Textos e *boas-vindas*"
        texto="Veja a tela de login e o painel do aluno como ele vê e clique num texto para reescrever. Personalize para todos, para uma jornada ou para um aluno. Coloque uma palavra entre *asteriscos* para destacá-la." />
      <Abas rotulo="Seções" ativa={aba} aoMudar={setAba} itens={[{ k: "frases", label: "Textos e aparência" }, { k: "pagina", label: "Página de boas-vindas" }, { k: "redacao", label: "Instruções de redação" }]} />
      {aba === "frases" && <EditorTextos />}
      {aba === "pagina" && <BoasVindasEditor />}
      {aba === "redacao" && <InstrucoesRedacao />}
    </>
  );
}
