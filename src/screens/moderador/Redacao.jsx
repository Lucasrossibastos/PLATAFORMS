import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, Camera, PenLine, Plus, Save, Send, Trash2 } from "lucide-react";
import {
  CANAIS_ENVIO, COMPETENCIAS_ENEM, VESTIBULARES, fmtData, hojeISO, modeloInfo, notaDevolutiva, rubricaPadrao,
} from "../../core/nucleo.js";
import { useApp } from "../../state/AppContext.jsx";
import { apagarArquivo, comprimirImagem, salvarArquivo } from "../../state/arquivos.js";
import { NOTAS_COMPETENCIA, TIPOS_MARCACAO, competencia, statusDevolutiva } from "../../redacao.js";
import { FolhaCorrigida, ItemMarcacao } from "../../ui/Correcao.jsx";
import { Botao, Campo, TituloPagina, Vazio } from "../../ui/ui.jsx";

function InstrucoesEnvio() {
  const { db, mudar } = useApp();
  const [texto, setTexto] = useState(db.instrucoesRedacao);
  const [salvo, setSalvo] = useState(false);
  const mudou = texto !== db.instrucoesRedacao;
  return (
    <section className="cartao form" aria-labelledby="t-instrucoes">
      <h2 id="t-instrucoes" className="subtitulo">Instruções de envio <small>o aluno vê isto na tela de redação</small></h2>
      <textarea className="entrada" rows={2} value={texto} onChange={(e) => { setTexto(e.target.value); setSalvo(false); }} aria-labelledby="t-instrucoes" />
      <div className="linha-acoes">
        {salvo && <span className="retorno-curto" role="status">Instruções salvas.</span>}
        <Botao variante="vidro" tamanho="sm" icone={Save} disabled={!mudou || !texto.trim()}
          onClick={() => { mudar((d) => { d.instrucoesRedacao = texto.trim(); }); setSalvo(true); }}>Salvar instruções</Botao>
      </div>
    </section>
  );
}

export function RedacoesModerador() {
  const { db } = useApp();
  const navigate = useNavigate();
  const [aluno, setAluno] = useState("todos");
  const [status, setStatus] = useState("todas");
  const nomeAluno = (id) => db.alunos.find((a) => a.id === id)?.nome || "Aluno removido";
  const lista = db.devolutivas
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
          {db.alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
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
                <span className="etiqueta"><i style={{ "--cor": modeloInfo(d.vestibular).cor }} />{modeloInfo(d.vestibular).nome}</span>
                <span className="linha-devolutiva-nota num">{notaDevolutiva(d).texto}</span>
                <span className={`etiqueta${d.status === "rascunho" ? "" : d.lida ? " etiqueta--ok" : " etiqueta--rev"}`}>{statusDevolutiva(d)}</span>
                <span className="linha-devolutiva-data num">{fmtData(d.enviadaEm || d.recebidaEm)}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </>
  );
}

function novaDevolutiva(alunos) {
  const aluno = alunos[0];
  const vest = aluno?.vestibular || "enem";
  return {
    id: `dv-${Date.now()}`, alunoId: aluno?.id || "", tema: "", vestibular: vest, rubrica: rubricaPadrao(vest),
    notas: {}, notaLivre: "", escalaLivre: 10, recebidaEm: hojeISO(), canal: "whatsapp",
    comentario: "", pontosFortes: "", aMelhorar: "", foto: null, marcacoes: [], proposta: "",
    status: "rascunho", enviadaEm: null, lida: false,
  };
}

// Uma instância por devolutiva: trocar de id nunca reaproveita o rascunho anterior.
export function RedacaoModerador() {
  const { id } = useParams();
  return <EditorDevolutiva key={id} id={id} />;
}

function EditorDevolutiva({ id }) {
  const { db, mudar } = useApp();
  const navigate = useNavigate();
  const salva = db.devolutivas.find((d) => d.id === id);
  const [original] = useState(() => (id === "nova" ? novaDevolutiva(db.alunos) : salva ? structuredClone(salva) : null));
  const [f, setF] = useState(original);
  const [ativa, setAtiva] = useState(null);
  const [enviandoFoto, setEnviandoFoto] = useState(false);
  const [erro, setErro] = useState("");
  const [excluir, setExcluir] = useState(false);

  if (!f) return <Navigate to=".." relative="path" replace />;
  const muda = (campos) => { setErro(""); setF((x) => ({ ...x, ...campos })); };
  const nota = notaDevolutiva(f);

  const escolherFoto = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviandoFoto(true);
    try {
      const ref = await salvarArquivo(await comprimirImagem(arquivo));
      if (f.foto && f.foto !== original.foto) apagarArquivo(f.foto);
      muda({ foto: ref });
    } catch {
      setErro("Não foi possível ler essa imagem. Envie uma foto em JPG ou PNG.");
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
      ...(enviar ? { status: "enviada", enviadaEm: f.enviadaEm || hojeISO() } : {}),
    };
    if (original.foto && original.foto !== final.foto) apagarArquivo(original.foto);
    mudar((d) => {
      const i = d.devolutivas.findIndex((x) => x.id === final.id);
      if (i >= 0) d.devolutivas[i] = final; else d.devolutivas.push(final);
    });
    navigate("..", { relative: "path" });
  };

  const descartar = () => {
    if (f.foto && f.foto !== original.foto) apagarArquivo(f.foto);
    navigate("..", { relative: "path" });
  };

  const apagar = () => {
    apagarArquivo(f.foto);
    if (original.foto !== f.foto) apagarArquivo(original.foto);
    mudar((d) => { d.devolutivas = d.devolutivas.filter((x) => x.id !== f.id); });
    navigate("..", { relative: "path" });
  };

  const trocarVestibular = (vestibular) => muda({ vestibular, rubrica: f.rubrica && salva ? f.rubrica : rubricaPadrao(vestibular) });

  return (
    <>
      <Link to=".." relative="path" className="voltar"><ArrowLeft aria-hidden="true" />Todas as devolutivas</Link>
      <header className="cabeca-redacao">
        <span className="eyebrow">{id === "nova" ? "Nova devolutiva" : statusDevolutiva(f)}{f.lidaEm ? ` em ${fmtData(f.lidaEm.slice(0, 10))}` : ""}</span>
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
                <select className="entrada" value={f.alunoId} onChange={(e) => muda({ alunoId: e.target.value })}>
                  <option value="">Selecione…</option>
                  {db.alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </select>
              </Campo>
              <Campo rotulo="Vestibular">
                <select className="entrada" value={f.vestibular} onChange={(e) => trocarVestibular(e.target.value)}>
                  {VESTIBULARES.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
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
        <span>{erro || (f.status === "enviada" ? "Já enviada: salvar atualiza o que o aluno vê." : "Rascunho: o aluno ainda não vê.")}</span>
        {id !== "nova" && (excluir
          ? <><Botao variante="perigo" tamanho="sm" onClick={apagar}>Excluir de vez</Botao><Botao variante="texto" tamanho="sm" onClick={() => setExcluir(false)}>Cancelar</Botao></>
          : <Botao variante="texto" tamanho="sm" icone={Trash2} onClick={() => setExcluir(true)}>Excluir</Botao>)}
        <Botao variante="vidro" tamanho="sm" onClick={descartar}>Descartar</Botao>
        {f.status !== "enviada" && <Botao variante="vidro" tamanho="sm" icone={Save} onClick={() => gravar(false)}>Salvar rascunho</Botao>}
        <Botao variante="solido" tamanho="sm" icone={Send} onClick={() => gravar(true)}>{f.status === "enviada" ? "Salvar alterações" : "Enviar para o aluno"}</Botao>
      </div>
    </>
  );
}
