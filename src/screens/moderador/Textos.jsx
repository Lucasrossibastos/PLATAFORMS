import { useMemo, useState } from "react";
import { Plus, RotateCcw, Trash2 } from "lucide-react";
import { useApp, varsDoAluno } from "../../state/AppContext.jsx";
import { CORES_SUGERIDAS, GRUPOS, TEXTOS, VARIAVEIS, preencher, textoDe } from "../../textos.js";
import { TituloCinema } from "../../ui/Cinema.jsx";
import { Botao, Campo, Frase, TituloPagina } from "../../ui/ui.jsx";

const MAX_NUMEROS = 4;

function estadoInicial(db) {
  const bloco = db.welcome.blocos.find((b) => b.tipo === "destaque");
  return { textos: structuredClone(db.textos), numeros: structuredClone(bloco?.itens || []) };
}

// Antes de salvar, tira o que não muda nada: campo vazio ou igual ao nível
// de cima (padrão para o geral; geral para o de cada aluno).
function limpar(textos) {
  const util = (obj, fallback) => Object.fromEntries(Object.entries(obj || {}).filter(([k, v]) => v?.trim() && v !== fallback(k)));
  const geral = util(textos.geral, (k) => TEXTOS[k]?.padrao);
  const porAluno = Object.fromEntries(
    Object.entries(textos.porAluno || {})
      .map(([uid, t]) => [uid, util(t, (k) => textoDe({ geral }, k))])
      .filter(([, t]) => Object.keys(t).length),
  );
  return { ...textos, geral, porAluno };
}

function Previa({ tipo, texto, cor }) {
  if (tipo === "cinema") {
    return (
      <div className="cine previa-cine" data-theme="dark" style={{ "--destaque": cor }} aria-label="Prévia">
        <TituloCinema texto={texto} animar={false} />
      </div>
    );
  }
  if (tipo === "titulo") return <div className="previa-app" aria-label="Prévia"><h2><Frase texto={texto} /></h2></div>;
  return null;
}

function CampoTexto({ chave, camada, fallback, emCamada, aoMudar, aoLimpar, rotuloLimpar, vars, cor }) {
  const def = TEXTOS[chave];
  const valor = emCamada ? camada[chave] : fallback;
  const efetivo = valor || fallback;
  const longo = def.tipo !== "linha";
  const temVariavel = /\{\w+\}/.test(efetivo);
  return (
    <div className="campo-texto">
      <div className="campo-texto-topo">
        <label htmlFor={`t-${chave}`}>{def.rotulo}</label>
        {emCamada && camada[chave] && (
          <Botao variante="texto" tamanho="sm" icone={RotateCcw} onClick={aoLimpar}>{rotuloLimpar}</Botao>
        )}
      </div>
      {longo ? (
        <textarea id={`t-${chave}`} className="entrada" rows={def.tipo === "paragrafo" ? 3 : 2} value={valor}
          onChange={(e) => aoMudar(e.target.value)} onBlur={(e) => { if (!e.target.value.trim()) aoLimpar(); }} />
      ) : (
        <input id={`t-${chave}`} className="entrada" value={valor}
          onChange={(e) => aoMudar(e.target.value)} onBlur={(e) => { if (!e.target.value.trim()) aoLimpar(); }} />
      )}
      <Previa tipo={def.tipo} texto={preencher(efetivo, vars)} cor={cor} />
      {(def.tipo === "linha" || def.tipo === "paragrafo") && temVariavel && (
        <p className="previa-linha">Fica assim: {preencher(efetivo, vars)}</p>
      )}
    </div>
  );
}

/* Moderador edita as frases da página inicial, das boas-vindas e do painel
   do aluno: para todos ou só para um aluno. */
export default function Textos() {
  const { db, mudar } = useApp();
  const [alvo, setAlvo] = useState("todos");
  const [rascunho, setRascunho] = useState(() => estadoInicial(db));
  const [aviso, setAviso] = useState("");
  const original = useMemo(() => estadoInicial(db), [db]);
  const alterado = JSON.stringify(limpar(rascunho.textos)) !== JSON.stringify(limpar(original.textos))
    || JSON.stringify(rascunho.numeros) !== JSON.stringify(original.numeros);

  const alunoAlvo = db.alunos.find((a) => a.id === alvo);
  const exemplo = alunoAlvo || db.alunos[0];
  const vars = varsDoAluno(db, exemplo?.id);
  const cor = rascunho.textos.corDestaque;

  const mexer = (fn) => { setAviso(""); setRascunho((r) => { const n = structuredClone(r); fn(n); return n; }); };
  const personalizados = (uid) => Object.values(rascunho.textos.porAluno?.[uid] || {}).filter((v) => v && v.trim()).length;

  const salvar = () => {
    mudar((d) => {
      d.textos = limpar(rascunho.textos);
      const bloco = d.welcome.blocos.find((b) => b.tipo === "destaque");
      const numeros = rascunho.numeros.filter((n) => n.valor.trim() || n.label.trim());
      if (bloco) bloco.itens = numeros;
      else if (numeros.length) d.welcome.blocos.unshift({ id: `b-${Date.now()}`, tipo: "destaque", itens: numeros });
    });
    setAviso("Textos salvos. Alunos e visitantes já veem a versão nova.");
  };

  return (
    <>
      <TituloPagina eyebrow="Conteúdo" frase="Textos da *plataforma*"
        texto="Mude as frases que alunos e visitantes veem. Coloque uma palavra entre *asteriscos* para destacá-la; Enter quebra a linha nos títulos." />

      <div className="cartao textos-barra">
        <Campo rotulo="Aplicar a" ajuda="Com um aluno escolhido, a mudança vale só para ele. O resto continua seguindo o texto geral.">
          <select className="entrada" value={alvo} onChange={(e) => setAlvo(e.target.value)}>
            <option value="todos">Todos os alunos (texto geral)</option>
            {db.alunos.map((a) => {
              const n = personalizados(a.id);
              return <option key={a.id} value={a.id}>{a.nome}{n ? ` · ${n} personalizado${n > 1 ? "s" : ""}` : ""}</option>;
            })}
          </select>
        </Campo>
        <p className="vars">
          Variáveis: {VARIAVEIS.map((v) => <code key={v}>{`{${v}}`}</code>)}
          <span>Prévias com {exemplo?.nome}.</span>
        </p>
      </div>

      {GRUPOS.map((g) => {
        const porAluno = g.porAluno && alunoAlvo;
        return (
          <section key={g.id} className="cartao grupo-textos" aria-labelledby={`g-${g.id}`}>
            <header>
              <h2 id={`g-${g.id}`}>{g.titulo}</h2>
              <p>{g.descricao}{porAluno ? ` Editando só para ${alunoAlvo.nome}.` : ""}</p>
            </header>

            {g.id === "inicial" && (
              <div className="campo-texto">
                <span className="campo-texto-topo"><label htmlFor="cor-destaque">Cor do destaque</label></span>
                <div className="cores">
                  {CORES_SUGERIDAS.map((c) => (
                    <button key={c.cor} type="button" className="cor-amostra" style={{ background: c.cor }}
                      aria-label={c.nome} title={c.nome} aria-pressed={cor.toLowerCase() === c.cor.toLowerCase()}
                      onClick={() => mexer((r) => { r.textos.corDestaque = c.cor; })} />
                  ))}
                  <input id="cor-destaque" type="color" className="entrada cor-livre" value={cor}
                    onChange={(e) => mexer((r) => { r.textos.corDestaque = e.target.value; })} aria-label="Outra cor" />
                  <small>Vale para a página inicial e para as boas-vindas.</small>
                </div>
              </div>
            )}

            {Object.entries(TEXTOS).filter(([, def]) => def.grupo === g.id).map(([chave]) => {
              const camadaGeral = rascunho.textos.geral || {};
              const camadaAluno = rascunho.textos.porAluno?.[alvo] || {};
              const camada = porAluno ? camadaAluno : camadaGeral;
              const fallback = porAluno ? textoDe({ geral: camadaGeral }, chave) : TEXTOS[chave].padrao;
              return (
                <CampoTexto key={chave} chave={chave} camada={camada} fallback={fallback}
                  emCamada={chave in camada} vars={vars} cor={cor}
                  rotuloLimpar={porAluno ? "Usar o texto geral" : "Voltar ao padrão"}
                  aoMudar={(v) => mexer((r) => {
                    if (porAluno) { r.textos.porAluno = r.textos.porAluno || {}; (r.textos.porAluno[alvo] ||= {})[chave] = v; }
                    else { (r.textos.geral ||= {})[chave] = v; }
                  })}
                  aoLimpar={() => mexer((r) => {
                    if (porAluno) delete r.textos.porAluno?.[alvo]?.[chave];
                    else delete r.textos.geral?.[chave];
                  })}
                />
              );
            })}

            {g.id === "inicial" && (
              <div className="campo-texto">
                <span className="campo-texto-topo"><span className="rotulo">Números do rodapé</span></span>
                {rascunho.numeros.map((n, i) => (
                  <div key={i} className="linha-numero">
                    <input className="entrada" aria-label={`Número ${i + 1}`} value={n.valor} placeholder="+15"
                      onChange={(e) => mexer((r) => { r.numeros[i].valor = e.target.value; })} />
                    <input className="entrada" aria-label={`Texto do número ${i + 1}`} value={n.label} placeholder="anos de experiência"
                      onChange={(e) => mexer((r) => { r.numeros[i].label = e.target.value; })} />
                    <button type="button" className="icone-btn" aria-label={`Remover número ${i + 1}`}
                      onClick={() => mexer((r) => { r.numeros.splice(i, 1); })}><Trash2 /></button>
                  </div>
                ))}
                {rascunho.numeros.length < MAX_NUMEROS && (
                  <Botao variante="vidro" tamanho="sm" icone={Plus} style={{ justifySelf: "start" }}
                    onClick={() => mexer((r) => { r.numeros.push({ valor: "", label: "" }); })}>Adicionar número</Botao>
                )}
                <small className="previa-linha">Use só números reais: aparecem para qualquer visitante.</small>
              </div>
            )}
          </section>
        );
      })}

      {(alterado || aviso) && (
        <div className="barra-mover barra-salvar" role="status">
          <span>{alterado ? "Alterações não salvas." : aviso}</span>
          {alterado && (
            <>
              <Botao variante="vidro" tamanho="sm" onClick={() => { setRascunho(estadoInicial(db)); setAviso(""); }}>Descartar</Botao>
              <Botao variante="solido" tamanho="sm" onClick={salvar}>Salvar</Botao>
            </>
          )}
        </div>
      )}
    </>
  );
}
