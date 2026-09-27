import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, PenLine, Plus, Save, Send, Trash2 } from "lucide-react";
import { CANAIS_ENVIO, COMPETENCIAS_ENEM, notaDevolutiva, rubricaPadrao } from "../../core/nucleo.js";
import { fmtDataLonga } from "../../core/datas.js";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useAlunos, useConfigRedacao, useDevolutivas } from "../../state/hooks.js";
import { comprimirImagem } from "../../state/arquivos.js";
import { NOTAS_COMPETENCIA, TIPOS_MARCACAO, competencia, statusDevolutiva } from "../../redacao.js";
import { FolhaCorrigida, ItemMarcacao } from "../../ui/Correcao.jsx";
import { Botao, Campo, Carregando, MensagemErro, TituloPagina, Vazio } from "../../ui/ui.jsx";

function InstrucoesEnvio() {
  const { s } = useApp();
  const config = useConfigRedacao();
  const [texto, setTexto] = useState(null);
  const [salvo, setSalvo] = useState(false);
  const { executar, ocupado, erro } = useAcao();
  if (config === undefined) return null;
  const atual = texto ?? config.instrucoes ?? "";
  const mudou = atual !== (config.instrucoes ?? "");
  return (
    <section className="cartao form" aria-labelledby="t-instrucoes">
      <h2 id="t-instrucoes" className="subtitulo">Instruções de envio <small>o aluno vê isto na tela de redação</small></h2>
      <textarea className="entrada" rows={2} value={atual} onChange={(e) => { setTexto(e.target.value); setSalvo(false); }} aria-labelledby="t-instrucoes" />
      <MensagemErro erro={erro} />
      <div className="linha-acoes">
        {salvo && <span className="retorno-curto" role="status">Instruções salvas.</span>}
        <Botao variante="vidro" tamanho="sm" icone={Save} disabled={!mudou || !atual.trim() || ocupado}
          onClick={() => executar(async () => { await s.redacao.salvarInstrucoes(atual); setTexto(null); setSalvo(true); })}>Salvar instruções</Botao>
      </div>
    </section>
  );
}

export function RedacoesModerador() {
  const { ind } = useApp();
  const navigate = useNavigate();
  const devolutivas = useDevolutivas();
  const alunos = useAlunos();
  const [aluno, setAluno] = useState("todos");
  const [status, setStatus] = useState("todas");
  if (!devolutivas || !alunos) return <Carregando />;
  const nomeAluno = (id) => alunos.find((a) => a.id === id)?.nome || "Aluno removido";
  const lista = devolutivas
    .filter((d) => (aluno === "todos" || d.alunoId === aluno) && (status === "todas" || (status === "rascunho" ? d.status === "rascunho" : d.status === "enviada")))
    .sort((a, b) => (b.enviadaEm || b.recebidaEm || "").localeCompare(a.enviadaEm || a.recebidaEm || ""));

  return (
    <>
      <TituloPagina eyebrow="Correções" frase="Devolutivas de *redação*"
        texto="Registre a nota, anexe a foto do texto e marque os trechos. O aluno só vê depois que você enviar."
        direita={<Botao variante="solido" icone={Plus} onClick={() => navigate("nova")}>Nova devolutiva</Botao>} />

      <InstrucoesEnvio />

      <div className="filtros-linha">
        <select className="entrada" value={aluno} onChange={(e) => setAluno(e.target.value)} aria-label="Filtrar por aluno">
          <option value="todos">Todos os alunos</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </select>
        <div className="filtros" role="tablist" aria-label="Situação">
          {[["todas", "Todas"], ["rascunho", "Rascunhos"], ["enviadas", "Enviadas"]].map(([k, nome]) => (
            <button key={k} type="button" role="tab" className="filtro" aria-selected={status === k} onClick={() => setStatus(k)}>{nome}</button>
          ))}
        </div>
      </div>

      {lista.length === 0 ? (
        <div className="cartao"><Vazio icone={PenLine} titulo="Nenhuma devolutiva aqui" texto="Use “Nova devolutiva” para registrar uma correção." /></div>
      ) : (
        <ul className="lista-devolutivas">
          {lista.map((d) => (
            <li key={d.id}>
              <Link to={d.id} className="cartao linha-devolutiva">
                <span className="linha-devolutiva-aluno">{nomeAluno(d.alunoId)}</span>
                <span className="linha-devolutiva-tema">{d.tema || "Sem tema"}</span>
                <span className="etiqueta"><i style={{ "--cor": ind?.vestibular(d.vestibularId)?.cor }} />{ind?.nomeVestibular(d.vestibularId) || "—"}</span>
                <span className="linha-devolutiva-nota num">{notaDevolutiva(d).texto}</span>
                <span className={`etiqueta${d.status === "rascunho" ? "" : d.lida ? " etiqueta--ok" : " etiqueta--rev"}`}>{statusDevolutiva(d)}</span>
                <span className="linha-devolutiva-data num">{fmtDataLonga(d.enviadaEm || d.recebidaEm)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function novaDevolutiva(alunos, hoje) {
  const aluno = alunos[0];
  const vest = aluno?.vestibularId || "enem";
  return {
    alunoId: aluno?.id || "", tema: "", vestibularId: vest, rubrica: rubricaPadrao(vest),
    notas: {}, notaLivre: "", escalaLivre: 10, recebidaEm: hoje, canal: "whatsapp",
    comentario: "", pontosFortes: "", aMelhorar: "", foto: null, marcacoes: [], proposta: "",
    status: "rascunho", enviadaEm: null, lida: false,
  };
}

export function RedacaoModerador() {
  const { id } = useParams();
  const devolutivas = useDevolutivas();
  const alunos = useAlunos();
  if (!devolutivas || !alunos) return <Carregando />;
  return <EditorDevolutiva key={id} id={id} devolutivas={devolutivas} alunos={alunos} />;
}

function EditorDevolutiva({ id, devolutivas, alunos }) {
  const { s, ind, hoje } = useApp();
  const navigate = useNavigate();
  const salva = devolutivas.find((d) => d.id === id);
  const [original] = useState(() => (id === "nova" ? novaDevolutiva(alunos, hoje) : salva ? structuredClone(salva) : null));
  const [f, setF] = useState(original);
  const [ativa, setAtiva] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [excluir, setExcluir] = useState(false);
  const { executar, ocupado, erro: erroGravar } = useAcao();

  if (!f) return <Navigate to=".." relative="path" replace />;
  const muda = (campos) => { setErro(""); setF((x) => ({ ...x, ...campos })); };
  const nota = notaDevolutiva(f);
  const apagarArquivo = (ref) => s.redacao.removerArquivo(ref);

  const escolherFoto = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      if (!f.alunoId) { setErro("Escolha o aluno antes de anexar a foto."); return; }
      const ref = await s.redacao.enviarFoto(f.alunoId, await comprimirImagem(arquivo));
      if (f.foto && f.foto !== original.foto) apagarArquivo(f.foto);
      muda({ foto: ref });
    } catch (err) {
      setErro(err?.codigo === "permissao" ? err.message : "Não foi possível enviar essa imagem. Envie uma foto em JPG ou PNG.");
    } finally { setEnviandoFoto(false); e.target.value = ""; }
  };

  const adicionarMarcacao = ({ x, y }) => {
    const m = { id: `m-${Date.now()}`, x, y, tipo: "problema", competencia: "c1", texto: "" };
    muda({ marcacoes: [...f.marcacoes, m] });
    setAtiva(m.id);
  };
  const mudarMarcacao = (mid, campos) => muda({ marcacoes: f.marcacoes.map((m) => (m.id === mid ? { ...m, ...campos } : m)) });

  const faltando = () => {
    if (!f.alunoId) return "Escolha o aluno.";
    if (!f.tema.trim()) return "Escreva o tema da redação.";
    if (f.rubrica === "enem" && COMPETENCIAS_ENEM.some((c) => f.notas?.[c.id] === undefined || f.notas[c.id] === "")) return "Dê a nota das cinco competências.";
    if (f.rubrica === "livre" && (f.notaLivre === "" || !(Number(f.escalaLivre) > 0))) return "Preencha a nota e a escala.";
    if (f.marcacoes.some((m) => !m.texto.trim())) return "Há marcação sem comentário. Escreva o comentário ou remova a marcação.";
    return "";
  };

  const gravar = (enviar) => {
    const problema = enviar ? faltando() : (!f.alunoId ? "Escolha o aluno." : "");
    if (problema) { setErro(problema); return; }
    const final = {
      ...f, tema: f.tema.trim(),
      ...(enviar ? { status: "enviada", enviadaEm: f.enviadaEm || hoje } : {}),
    };
    executar(async () => {
      await s.redacao.salvar({ ...final, ...(id !== "nova" ? { id } : {}) });
      if (original.foto && original.foto !== final.foto) apagarArquivo(original.foto);
      navigate("..", { relative: "path" });
    });
  };

  const descartar = () => {
    if (f.foto && f.foto !== original.foto) apagarArquivo(f.foto);
    navigate("..", { relative: "path" });
  };

  const apagar = () => executar(async () => {
    if (original.foto !== f.foto) apagarArquivo(f.foto);
    await s.redacao.remover(id);
    navigate("..", { relative: "path" });
  });

  const trocarVestibular = (vestibularId) => muda({ vestibularId, rubrica: f.rubrica && salva ? f.rubrica : rubricaPadrao(vestibularId) });

  return (
    <>
      <Link to=".." relative="path" className="voltar"><ArrowLeft aria-hidden="true" />Todas as devolutivas</Link>
      <header className="cabeca-redacao">
        <span className="eyebrow">{id === "nova" ? "Nova devolutiva" : statusDevolutiva(f)}{f.lidaEm ? ` em ${fmtDataLonga(f.lidaEm.slice(0, 10))}` : ""}</span>
        <h1>{f.tema.trim() || "Sem tema"}</h1>
      </header>

      <div className="correcao">
        <div className="correcao-folha">
          {f.foto ? (
            <>
              <FolhaCorrigida foto={f.foto} marcacoes={f.marcacoes} ativa={ativa} aoSelecionar={setAtiva} editavel aoAdicionar={adicionarMarcacao} />
              <div className="linha-acoes">
                <label className="btn btn--vidro btn--sm"><Camera aria-hidden="true" />{enviandoFoto ? "Enviando…" : "Trocar foto"}
                  <input type="file" accept="image/*" className="sr-only" onChange={escolherFoto} /></label>
                <Botao variante="texto" tamanho="sm" icone={Trash2} onClick={() => { if (f.foto !== original.foto) apagarArquivo(f.foto); muda({ foto: null, marcacoes: [] }); }}>Remover foto e marcações</Botao>
              </div>
            </>
          ) : (
            <label className="soltar soltar--foto">
              <Camera aria-hidden="true" />
              <strong>{enviandoFoto ? "Preparando a foto…" : "Anexar a foto da redação"}</strong>
              <small>Foto nítida da folha, em pé. Depois é só clicar no texto para marcar os trechos.</small>
              <input type="file" accept="image/*" className="sr-only" onChange={escolherFoto} />
            </label>
          )}
        </div>

        <aside className="correcao-painel form">
          <section className="cartao form">
            <div className="form-linha">
              <Campo rotulo="Aluno">
                <select className="entrada" value={f.alunoId} disabled={!!f.foto} title={f.foto ? "A foto fica na pasta do aluno: tire a foto para trocar o aluno" : undefined} onChange={(e) => muda({ alunoId: e.target.value })}>
                  <option value="">Selecione…</option>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Vestibular">
                <select className="entrada" value={f.vestibularId || ""} onChange={(e) => trocarVestibular(e.target.value)}>
                  {ind?.vestibulares.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </select>
              </Campo>
            </div>
            <Campo rotulo="Tema">
              <input className="entrada" value={f.tema} placeholder="Ex.: Os impactos da inteligência artificial no mercado de trabalho" onChange={(e) => muda({ tema: e.target.value })} />
            </Campo>
            <div className="form-linha">
              <Campo rotulo="Recebida em"><input type="date" className="entrada" value={f.recebidaEm || ""} onChange={(e) => muda({ recebidaEm: e.target.value })} /></Campo>
              <Campo rotulo="Recebida por">
                <select className="entrada" value={f.canal} onChange={(e) => muda({ canal: e.target.value })}>
                  {CANAIS_ENVIO.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </select>
              </Campo>
            </div>
          </section>

          <section className="cartao form" aria-labelledby="t-nota">
            <div className="linha-titulo-secao">
              <h2 id="t-nota" className="subtitulo">Nota</h2>
              <span className="nota-total num">{nota.texto}</span>
            </div>
            <div className="abas" role="tablist">
              {[["enem", "Competências ENEM"], ["livre", "Nota livre"]].map(([k, nome]) => (
                <button key={k} type="button" role="tab" aria-selected={f.rubrica === k} onClick={() => muda({ rubrica: k })}>{nome}</button>
              ))}
            </div>
            {f.rubrica === "enem" ? (
              <div className="grade-competencias">
                {COMPETENCIAS_ENEM.map((c) => {
                  const comp = competencia(c.id);
                  return (
                    <Campo key={c.id} rotulo={<><i className="ponto" style={{ background: `var(--${c.id})` }} /> {comp.sigla} · {comp.nome}</>}>
                      <select className="entrada num" value={f.notas?.[c.id] ?? ""} onChange={(e) => muda({ notas: { ...f.notas, [c.id]: e.target.value === "" ? "" : Number(e.target.value) } })}>
                        <option value="">—</option>
                        {NOTAS_COMPETENCIA.map((n) => <option key={n} value={n}>{n}</option>)}
                      </select>
                    </Campo>
                  );
                })}
              </div>
            ) : (
              <div className="form-linha">
                <Campo rotulo="Nota"><input className="entrada num" type="number" min="0" step="0.5" value={f.notaLivre} onChange={(e) => muda({ notaLivre: e.target.value === "" ? "" : Number(e.target.value) })} /></Campo>
                <Campo rotulo="De (escala)"><input className="entrada num" type="number" min="1" value={f.escalaLivre} onChange={(e) => muda({ escalaLivre: Number(e.target.value) })} /></Campo>
              </div>
            )}
          </section>

          <section className="cartao form" aria-labelledby="t-marcacoes">
            <h2 id="t-marcacoes" className="subtitulo">Marcações no texto <small>{f.foto ? "clique na foto para marcar" : "anexe a foto para marcar"}</small></h2>
            {f.marcacoes.length === 0 && <p className="previa-linha">Nenhuma marcação ainda.</p>}
            {f.marcacoes.map((m, i) => (
              <ItemMarcacao key={m.id} m={m} numero={i + 1} ativa={ativa === m.id} aoSelecionar={setAtiva}>
                <div className="form-linha">
                  <select className="entrada" aria-label="Tipo" value={m.tipo} onChange={(e) => mudarMarcacao(m.id, { tipo: e.target.value })}>
                    {TIPOS_MARCACAO.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
                  </select>
                  <select className="entrada" aria-label="Competência" value={m.competencia} onChange={(e) => mudarMarcacao(m.id, { competencia: e.target.value })}>
                    {COMPETENCIAS_ENEM.map((c) => <option key={c.id} value={c.id}>{competencia(c.id).sigla} · {competencia(c.id).nome}</option>)}
                  </select>
                </div>
                <textarea className="entrada" rows={2} aria-label={`Comentário da marcação ${i + 1}`} value={m.texto} placeholder="O que o aluno precisa saber sobre este trecho"
                  onFocus={() => setAtiva(m.id)} onChange={(e) => mudarMarcacao(m.id, { texto: e.target.value })} />
                <Botao variante="texto" tamanho="sm" icone={Trash2} onClick={() => muda({ marcacoes: f.marcacoes.filter((x) => x.id !== m.id) })}>Remover marcação</Botao>
              </ItemMarcacao>
            ))}
          </section>

          <section className="cartao form">
            <Campo rotulo="Comentário geral"><textarea className="entrada" rows={3} value={f.comentario} onChange={(e) => muda({ comentario: e.target.value })} /></Campo>
            <Campo rotulo="Pontos fortes"><textarea className="entrada" rows={2} value={f.pontosFortes} onChange={(e) => muda({ pontosFortes: e.target.value })} /></Campo>
            <Campo rotulo="O que melhorar"><textarea className="entrada" rows={2} value={f.aMelhorar} onChange={(e) => muda({ aMelhorar: e.target.value })} /></Campo>
            <Campo rotulo="Link da proposta (opcional)"><input className="entrada" value={f.proposta || ""} placeholder="https://…" onChange={(e) => muda({ proposta: e.target.value })} /></Campo>
          </section>
        </aside>
      </div>

      <div className="barra-mover barra-salvar" role="status">
        <span>{erro || erroGravar?.message || (f.status === "enviada" ? "Já enviada: salvar atualiza o que o aluno vê." : "Rascunho: o aluno ainda não vê.")}</span>
        {id !== "nova" && (excluir
          ? <><Botao variante="perigo" tamanho="sm" onClick={apagar}>Excluir de vez</Botao><Botao variante="texto" tamanho="sm" onClick={() => setExcluir(false)}>Cancelar</Botao></>
          : <Botao variante="texto" tamanho="sm" icone={Trash2} onClick={() => setExcluir(true)}>Excluir</Botao>)}
        <Botao variante="vidro" tamanho="sm" onClick={descartar}>Descartar</Botao>
        {f.status !== "enviada" && <Botao variante="vidro" tamanho="sm" icone={Save} disabled={ocupado} onClick={() => gravar(false)}>Salvar rascunho</Botao>}
        <Botao variante="solido" tamanho="sm" icone={Send} disabled={ocupado} onClick={() => gravar(true)}>{f.status === "enviada" ? "Salvar alterações" : "Enviar para o aluno"}</Botao>
      </div>
    </>
  );
}
