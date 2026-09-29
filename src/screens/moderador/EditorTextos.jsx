/* Textos e aparência, do jeito que o aluno vê: uma réplica da tela de login
   e do painel do aluno em que o moderador clica num texto para reescrevê-lo
   (e escolhe as cores de destaque). Camadas, da mais geral à mais
   específica: todos → jornada → aluno; o mais específico vale. A tela de
   login é pública, então só a camada "todos" vale nela. Nada vai para o
   aluno até salvar. */

import { createContext, useContext, useEffect, useMemo, useState } from "react";
import { useSearchParams } from "react-router-dom";
import { Bell, CalendarCheck, CheckCircle2, ChevronDown, Flame, Moon, NotebookPen, RotateCcw, Sun, Target } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useAlunos, useBoasVindas, useConfigTextos, useModelos, useTextosDeTodos, useTodosPlanos } from "../../state/hooks.js";
import { MENU_ALUNO } from "../../navegacao.js";
import { BOAS_VINDAS_PADRAO } from "../../data/semente.js";
import {
  COR_DESTAQUE_PADRAO, CORES_SUGERIDAS, GRUPOS, TELAS, TEXTOS, VARIAVEIS, ehCor, grupoDaJornada, origemDe, preencher, primeiroNome, saudacao, textoDe,
} from "../../textos.js";
import { Botao, Campo, Carregando, Frase, Marca } from "../../ui/ui.jsx";
import { FotoProfessor } from "../Login.jsx";

const Ctx = createContext(null);
const NOME_ORIGEM = { jornada: "da jornada", curso: "do grupo do curso", vestibular: "do grupo do vestibular", geral: "de “Todos os alunos”", padrão: "do padrão da plataforma" };

/* Um texto da réplica: mostra como o aluno vê; clicar abre a edição no lugar. */
function Editavel({ chave }) {
  const c = useContext(Ctx);
  const def = TEXTOS[chave];
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const proprio = c.proprio(chave);
  const bloqueado = c.bloqueado(chave);
  const texto = preencher(c.efetivo(chave), c.vars);
  const abrir = () => { if (!bloqueado) { setValor(c.bruto(chave)); setEditando(true); } };
  const confirmar = () => { c.mudar(chave, valor); setEditando(false); };

  if (editando) {
    const Tag = def.tipo === "linha" ? "input" : "textarea";
    return (
      <span className="editavel-caixa">
        <Tag
          autoFocus className="editavel-campo" aria-label={def.rotulo} value={valor}
          {...(Tag === "textarea" ? { rows: def.tipo === "titulo" ? 2 : 3 } : {})}
          onChange={(e) => setValor(e.target.value)} onBlur={confirmar}
          onKeyDown={(e) => {
            if (e.key === "Escape") { e.preventDefault(); setEditando(false); }
            if (e.key === "Enter" && (def.tipo !== "titulo" || e.ctrlKey || e.metaKey)) { e.preventDefault(); confirmar(); }
          }}
        />
        <span className="editavel-dica">
          <b>{def.rotulo}</b>
          <span>{def.tipo === "titulo" ? "*palavra* destaca · Enter quebra a linha · Ctrl+Enter confirma" : "Enter confirma"} · Esc cancela</span>
          {proprio && <button type="button" onMouseDown={(e) => { e.preventDefault(); c.limpar(chave); setEditando(false); }}>Voltar ao herdado</button>}
        </span>
      </span>
    );
  }
  return (
    <span
      role="button" tabIndex={bloqueado ? -1 : 0} aria-disabled={bloqueado || undefined}
      className={`editavel${proprio ? " editavel--proprio" : ""}${bloqueado ? " editavel--bloqueado" : ""}`}
      title={bloqueado ? "A tela de login é a mesma para todos: edite em “Todos os alunos”." : `${def.rotulo}: clique para editar${proprio ? " (personalizado aqui)" : ` (herdado ${NOME_ORIGEM[c.origem(chave)]})`}`}
      onClick={abrir} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); abrir(); } }}
    >
      {def.tipo === "titulo" ? <Frase texto={texto} /> : texto || <em className="editavel-vazio">(vazio)</em>}
    </span>
  );
}

function Cores({ valor, aoEscolher, extra }) {
  return (
    <div className="cores">
      {CORES_SUGERIDAS.map((c) => (
        <button key={c.cor} type="button" className="cor-amostra" style={{ background: c.cor }} aria-label={c.nome} title={c.nome}
          aria-pressed={String(valor).toLowerCase() === c.cor.toLowerCase()} onClick={() => aoEscolher(c.cor)} />
      ))}
      <input type="color" className="entrada cor-livre" value={ehCor(valor) ? valor : "#4f5cf6"} onChange={(e) => aoEscolher(e.target.value)} aria-label="Outra cor" />
      {extra}
    </div>
  );
}

/* ---------- réplica da tela de login ---------- */

function PreviaLogin({ cor, hero }) {
  return (
    <div className="previa-moldura" data-theme="light">
      <div className="login fundo-cores" style={{ "--destaque": cor }}>
        <div className="login-cartao">
          <section className="login-acesso">
            <Marca className="login-logo" />
            <h1 className="login-titulo"><Editavel chave="inicial.entrar" /></h1>
            <p className="login-sub"><Editavel chave="inicial.selo" /></p>
            <div className="login-form" aria-hidden="true">
              <span className="campo"><span>E-mail</span><span className="entrada previa-entrada">seu@email.com</span></span>
              <span className="campo"><span>Senha</span><span className="entrada previa-entrada">Sua senha</span></span>
            </div>
            <div className="login-botao previa-botao"><Editavel chave="inicial.botao" /></div>
          </section>
          <aside className="login-marca">
            <h2><Editavel chave="inicial.titulo" /></h2>
            <p><Editavel chave="inicial.lede" /></p>
            <FotoProfessor hero={hero} />
          </aside>
        </div>
      </div>
    </div>
  );
}

/* ---------- réplica do painel do aluno ---------- */

function Cabecalho({ tela }) {
  const tem = (k) => !!TEXTOS[`painel.${tela}.${k}`];
  return (
    <header className="titulo-pagina">
      <div>
        {tem("eyebrow") && <span className="eyebrow"><Editavel chave={`painel.${tela}.eyebrow`} /></span>}
        <h1><Editavel chave={`painel.${tela}.titulo`} /></h1>
        {tem("texto") && <p><Editavel chave={`painel.${tela}.texto`} /></p>}
      </div>
    </header>
  );
}

function Esqueleto({ legenda = "O conteúdo da tela (listas, gráficos e registros do aluno) fica aqui." }) {
  return (
    <div className="cartao previa-esqueleto" aria-hidden="true">
      <span /><span /><span />
      <small>{legenda}</small>
    </div>
  );
}

function ConteudoDaTela({ tela, nome, hero }) {
  if (tela === "inicio") {
    return (
      <>
        <section className="cartao saudacao">
          <div className="saudacao-quem">
            <span className="saudacao-avatar" aria-hidden="true">{nome.charAt(0)}</span>
            <div><h1><Editavel chave="painel.dashboard.saudacao" /></h1><p>Hoje · data e vestibular do aluno</p></div>
          </div>
          <ul className="saudacao-numeros" aria-hidden="true">
            <li style={{ "--cor-numero": "#4f5cf6" }}><span className="saudacao-icone"><CalendarCheck /></span><b className="num">–</b><small>dias estudados nos últimos 30</small></li>
            <li style={{ "--cor-numero": "#e2761b" }}><span className="saudacao-icone"><Flame /></span><b className="num">–</b><small>dias seguidos</small></li>
            <li style={{ "--cor-numero": "#1e8f63" }}><span className="saudacao-icone"><Target /></span><b className="num">–</b><small>do edital visto</small></li>
          </ul>
        </section>
        <p className="previa-legenda">Quando o dia não tem metas:</p>
        <div className="cartao">
          <div className="vazio">
            <CheckCircle2 aria-hidden="true" />
            <strong><Editavel chave="painel.dashboard.vazioTitulo" /></strong>
            <p><Editavel chave="painel.dashboard.vazioTexto" /></p>
          </div>
        </div>
        <p className="previa-legenda">Na visão “2 semanas”:</p>
        <p className="previa-linha"><Editavel chave="painel.semana.texto" /></p>
      </>
    );
  }
  if (tela === "boasvindas") {
    return (
      <>
        <header className="titulo-pagina">
          <div>
            <span className="eyebrow" title="O nome vem da aba Página de boas-vindas">{hero.nome || "Professor"}</span>
            <h1><Editavel chave="painel.boasvindas.titulo" /></h1>
          </div>
        </header>
        <Esqueleto legenda="Os blocos da página de boas-vindas (aba “Página de boas-vindas”)." />
      </>
    );
  }
  return (
    <>
      <Cabecalho tela={tela} />
      {tela === "desempenho" ? (
        <section className="cartao previa-focos">
          <h2 className="subtitulo">Focos de atenção</h2>
          <p className="previa-linha">Os conteúdos com menor acerto no período aparecem aqui, com a taxa em vermelho.</p>
          <div className="previa-esqueleto" aria-hidden="true"><span /><span /></div>
          <p className="previa-recado"><NotebookPen aria-hidden="true" /><span><Editavel chave="painel.desempenho.recadoFocos" /></span></p>
        </section>
      ) : <Esqueleto />}
    </>
  );
}

function PreviaPainel({ tela, tema, cor, nome, hero }) {
  const infoTela = TELAS.find((x) => x.id === tela);
  const ativo = infoTela?.menu;
  const extraAberto = MENU_ALUNO.extra.itens.some((i) => i.k === ativo);
  const IconeTema = tema === "light" ? Moon : Sun;
  return (
    <div className="previa-moldura" data-theme={tema}>
      <div className="app" {...(ehCor(cor) ? { "data-acento": "", style: { "--acento-escolhido": cor } } : {})}>
        <header className="app-topo">
          <Marca />
          <nav className="app-nav" aria-label="Menu do aluno (réplica)">
            {MENU_ALUNO.topo.map((i) => (
              <span key={i.k} className="app-nav-item" data-ativo={i.k === ativo}><i.icone aria-hidden="true" /><Editavel chave={`menu.${i.k}`} /></span>
            ))}
            <span style={{ position: "relative" }}>
              <span className="app-nav-item" data-ativo={extraAberto}><Editavel chave="menu.extra" /><ChevronDown aria-hidden="true" className="app-nav-seta" /></span>
              {extraAberto && (
                <span className="painel" style={{ right: "auto", left: 0 }}>
                  {MENU_ALUNO.extra.itens.map((i) => <span key={i.k} className="previa-item-extra" data-ativo={i.k === ativo}><i.icone aria-hidden="true" /><Editavel chave={`menu.${i.k}`} /></span>)}
                </span>
              )}
            </span>
          </nav>
          <div className="app-acoes" aria-hidden="true">
            <span className="icone-btn"><Bell /></span>
            <span className="icone-btn"><IconeTema /></span>
            <span className="btn btn--solido btn--sm"><span className="conta-inicial">{nome.charAt(0)}</span>{nome}</span>
          </div>
        </header>
        <main className="app-main">
          <ConteudoDaTela tela={tela} nome={nome} hero={hero} />
        </main>
      </div>
    </div>
  );
}

/* ---------- editor ---------- */

export default function EditorTextos() {
  const { s, ind } = useApp();
  const [params] = useSearchParams();
  const config = useConfigTextos();
  const doAluno = useTextosDeTodos();
  const alunos = useAlunos();
  const modelos = useModelos();
  const planos = useTodosPlanos();
  const boasVindas = useBoasVindas();
  const [alvo, setAlvo] = useState(() => (params.get("aluno") ? `aluno:${params.get("aluno")}` : "geral"));
  const [tela, setTela] = useState("inicio");
  const [tema, setTema] = useState("light");
  const [rascunho, setRascunho] = useState(null);
  const [corLogin, setCorLogin] = useState(null);
  const [aviso, setAviso] = useState("");
  const { executar, ocupado, erro } = useAcao();

  const escopo = alvo === "geral" ? { tipo: "geral" } : alvo.startsWith("aluno:") ? { tipo: "aluno", alunoId: alvo.slice(6) } : { tipo: "grupo", grupo: alvo };
  const jornadaDe = (alunoId) => (planos || []).find((p) => p.id === alunoId)?.modeloId || null;
  const alunoAlvo = escopo.tipo === "aluno" ? alunos?.find((a) => a.id === escopo.alunoId) : null;
  const contextoAluno = alunoAlvo && { jornadaId: jornadaDe(alunoAlvo.id), vestibularId: alunoAlvo.vestibularId, cursoId: alunoAlvo.cursoId };
  const camadaSalva = useMemo(() => {
    if (!config || !doAluno) return null;
    if (escopo.tipo === "geral") return config.geral || {};
    if (escopo.tipo === "aluno") return doAluno[escopo.alunoId] || {};
    return config.porGrupo?.[escopo.grupo] || {};
  }, [config, doAluno, alvo]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => { setRascunho(camadaSalva ? { ...camadaSalva } : null); setAviso(""); }, [camadaSalva]);
  useEffect(() => { if (config) setCorLogin(config.corDestaque || COR_DESTAQUE_PADRAO); }, [config]);
  if (!config || !doAluno || !alunos || !modelos || !planos || !rascunho || !ind) return <Carregando />;

  // o que vale abaixo da camada atual (o que o texto "herda")
  const herdado = (k) => {
    if (TEXTOS[k].grupo === "inicial" || escopo.tipo === "geral") return escopo.tipo === "geral" ? TEXTOS[k].padrao : textoDe({ geral: config.geral }, k);
    if (escopo.tipo === "grupo") return textoDe({ geral: config.geral }, k);
    return textoDe(config, k, contextoAluno || {});
  };
  const origem = (k) => (escopo.tipo === "geral" ? "padrão" : escopo.tipo === "grupo" ? origemDe({ geral: config.geral }, k) : origemDe(config, k, contextoAluno || {}));
  const mudar = (k, v) => {
    setAviso("");
    setRascunho((r) => {
      const n = { ...r };
      if (!String(v).trim() || (!r[k] && v === herdado(k))) delete n[k];
      else n[k] = v;
      return n;
    });
  };
  const limpar = (k) => { setAviso(""); setRascunho((r) => { const n = { ...r }; delete n[k]; return n; }); };

  const jornadaAlvo = escopo.tipo === "grupo" && escopo.grupo.startsWith("jornada:") ? escopo.grupo.slice(8) : null;
  const exemplo = alunoAlvo || (jornadaAlvo && alunos.find((a) => jornadaDe(a.id) === jornadaAlvo)) || alunos[0];
  const nome = primeiroNome(exemplo?.nome || "Aluno");
  const vars = { nome, saudacao: saudacao(), vestibular: ind.nomeVestibular(exemplo?.vestibularId) || "ENEM" };
  const ctx = {
    vars, origem, mudar, limpar,
    bruto: (k) => rascunho[k] ?? herdado(k),
    efetivo: (k) => (String(rascunho[k] ?? "").trim() ? rascunho[k] : herdado(k)),
    proprio: (k) => !!String(rascunho[k] ?? "").trim(),
    bloqueado: (k) => TEXTOS[k].grupo === "inicial" && escopo.tipo !== "geral",
  };

  const limpo = (o) => JSON.stringify(Object.fromEntries(Object.entries(o).filter(([, v]) => String(v ?? "").trim()).sort()));
  const alterado = limpo(rascunho) !== limpo(camadaSalva) || (escopo.tipo === "geral" && corLogin !== (config.corDestaque || COR_DESTAQUE_PADRAO));
  const salvar = () => executar(async () => {
    await s.textos.salvar(escopo, rascunho, escopo.tipo === "geral" ? { corDestaque: corLogin } : {});
    setAviso("Salvo. Quem abrir a plataforma já vê a versão nova.");
  });

  const nomeJornada = (id) => modelos.find((m) => m.id === id)?.nome || "Sem jornada";
  const alunosDaJornada = (id) => alunos.filter((a) => jornadaDe(a.id) === id).length;
  const personalizados = (id) => Object.values(doAluno[id] || {}).filter((v) => String(v ?? "").trim()).length;
  const antigos = Object.keys(config.porGrupo || {}).filter((g) => !g.startsWith("jornada:"));
  const nomeAntigo = (g) => (g.startsWith("curso:") ? `Curso ${ind.curso?.(g.slice(6))?.nome || g.slice(6)}` : `Vestibular ${ind.nomeVestibular(g.slice(11)) || g.slice(11)}`);
  const nomeCamada = escopo.tipo === "geral" ? "Todos os alunos" : escopo.tipo === "aluno" ? alunoAlvo?.nome || "este aluno"
    : jornadaAlvo ? `a jornada ${nomeJornada(jornadaAlvo)}` : nomeAntigo(escopo.grupo);
  const proprios = Object.keys(rascunho).filter((k) => TEXTOS[k] && String(rascunho[k] ?? "").trim());
  const corPainel = ctx.efetivo("painel.cor");
  const ondeFica = (k) => {
    const def = TEXTOS[k];
    if (def.grupo === "inicial") return "Tela de login";
    if (def.grupo === "menu") return "Menu";
    return def.tela ? TELAS.find((x) => x.id === def.tela)?.nome : "Painel";
  };

  return (
    <Ctx.Provider value={ctx}>
      <div className="cartao editor-barra">
        <Campo rotulo="Personalizar para" ajuda="O mais específico vale: aluno → jornada → todos → padrão.">
          <select className="entrada" value={alvo} onChange={(e) => setAlvo(e.target.value)}>
            <option value="geral">Todos os alunos</option>
            <optgroup label="Por jornada">
              {modelos.map((m) => { const n = alunosDaJornada(m.id); return <option key={m.id} value={grupoDaJornada(m.id)}>{m.nome}{n ? ` · ${n} ${n === 1 ? "aluno" : "alunos"}` : ""}</option>; })}
            </optgroup>
            <optgroup label="Um aluno">
              {alunos.map((a) => { const n = personalizados(a.id); return <option key={a.id} value={`aluno:${a.id}`}>{a.nome} · {nomeJornada(jornadaDe(a.id))}{n ? ` · ${n} personalizado${n > 1 ? "s" : ""}` : ""}</option>; })}
            </optgroup>
            {antigos.length > 0 && <optgroup label="Grupos antigos">{antigos.map((g) => <option key={g} value={g}>{nomeAntigo(g)}</option>)}</optgroup>}
          </select>
        </Campo>
        <p className="vars">Variáveis: {VARIAVEIS.map((v) => <code key={v}>{`{${v}}`}</code>)}<span>A réplica usa {exemplo?.nome || "um aluno de exemplo"}.</span></p>
      </div>

      <div className="editor-telas" role="tablist" aria-label="Tela da réplica">
        <button type="button" role="tab" className="filtro" aria-selected={tela === "login"} onClick={() => setTela("login")}>Tela de login</button>
        <span className="editor-telas-sep" aria-hidden="true" />
        {TELAS.map((x) => <button key={x.id} type="button" role="tab" className="filtro" aria-selected={tela === x.id} onClick={() => setTela(x.id)}>{x.nome}</button>)}
      </div>

      <div className="editor-ajustes">
        {tela === "login" ? (
          escopo.tipo === "geral" ? (
            <div className="editor-ajuste">
              <span className="rotulo">Cor do destaque da frase</span>
              <Cores valor={corLogin} aoEscolher={(c) => { setAviso(""); setCorLogin(c); }} />
            </div>
          ) : (
            <p className="aviso" role="note">
              {GRUPOS[0].descricao} Para mudar, escolha “Todos os alunos”.{" "}
              <Botao variante="texto" tamanho="sm" onClick={() => setAlvo("geral")}>Editar para todos</Botao>
            </p>
          )
        ) : (
          <>
            <div className="editor-ajuste">
              <span className="rotulo">Cor de destaque do painel{!ctx.proprio("painel.cor") && <small> · herdada {NOME_ORIGEM[origem("painel.cor")]}</small>}</span>
              <Cores
                valor={corPainel} aoEscolher={(c) => mudar("painel.cor", c)}
                extra={ctx.proprio("painel.cor") && <Botao variante="texto" tamanho="sm" icone={RotateCcw} onClick={() => limpar("painel.cor")}>Herdar</Botao>}
              />
            </div>
            <div className="editor-ajuste">
              <span className="rotulo">Ver a réplica no tema</span>
              <div className="filtros filtros--compacto" role="group" aria-label="Tema da réplica">
                <button type="button" className="filtro" aria-pressed={tema === "light"} onClick={() => setTema("light")}>Claro</button>
                <button type="button" className="filtro" aria-pressed={tema === "dark"} onClick={() => setTema("dark")}>Escuro</button>
              </div>
            </div>
          </>
        )}
      </div>

      <p className="previa-legenda">
        Clique em qualquer texto com contorno pontilhado para reescrever.
        <span className="editavel editavel--proprio editavel--amostra">Fundo amarelo</span> = personalizado para {nomeCamada}; o resto é herdado.
      </p>
      {tela === "login"
        ? <PreviaLogin cor={corLogin} hero={(boasVindas || BOAS_VINDAS_PADRAO).hero || {}} />
        : <PreviaPainel tela={tela} tema={tema} cor={corPainel} nome={nome} hero={(boasVindas || BOAS_VINDAS_PADRAO).hero || {}} />}

      <section className="cartao editor-lista" aria-labelledby="t-proprios">
        <h2 id="t-proprios" className="subtitulo">Personalizado para {nomeCamada} <small>{proprios.length || "nada ainda"}</small></h2>
        {proprios.length ? (
          <ul className="lista-simples">
            {proprios.map((k) => (
              <li key={k} className="linha-simples">
                <span><small>{ondeFica(k)} · {TEXTOS[k].rotulo}</small>{TEXTOS[k].tipo === "cor" ? <i className="editor-cor" style={{ background: rascunho[k] }} aria-label={rascunho[k]} /> : preencher(rascunho[k], vars)}</span>
                <Botao variante="texto" tamanho="sm" icone={RotateCcw} onClick={() => limpar(k)}>Herdar</Botao>
              </li>
            ))}
          </ul>
        ) : <p className="previa-linha">Tudo aqui é herdado. Clique num texto da réplica para personalizar.</p>}
      </section>

      {(alterado || aviso || erro) && (
        <div className="barra-mover barra-salvar" role="status">
          <span>{erro ? erro.message : alterado ? "Alterações não salvas." : aviso}</span>
          {alterado && (
            <>
              <Botao variante="vidro" tamanho="sm" onClick={() => { setRascunho({ ...camadaSalva }); setCorLogin(config.corDestaque || COR_DESTAQUE_PADRAO); }}>Descartar</Botao>
              <Botao variante="solido" tamanho="sm" disabled={ocupado} onClick={salvar}>Salvar</Botao>
            </>
          )}
        </div>
      )}
    </Ctx.Provider>
  );
}
