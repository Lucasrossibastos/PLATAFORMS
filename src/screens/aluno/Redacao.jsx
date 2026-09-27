import { useEffect, useState } from "react";
import { Link, Navigate, useParams } from "react-router-dom";
import { ArrowLeft, ExternalLink, PenLine, PlayCircle, Send } from "lucide-react";
import { fmtData, modeloInfo, notaDevolutiva } from "../../core/nucleo.js";
import { useApp, useFrasesDoAluno } from "../../state/AppContext.jsx";
import { useArquivoUrl } from "../../state/arquivos.js";
import { devolutivasDoAluno, evolucao, mediaDoTema } from "../../redacao.js";
import { EvolucaoNotas, FolhaCorrigida, ItemMarcacao, NotasCompetencias } from "../../ui/Correcao.jsx";
import { TituloPagina, Vazio } from "../../ui/ui.jsx";

function CapaRedacao({ d }) {
  const { url } = useArquivoUrl(d.foto);
  const v = modeloInfo(d.vestibular);
  if (url) return <div className="capa capa--foto"><img src={url} alt="" loading="lazy" /></div>;
  return (
    <div className="capa capa--gerada" style={{ "--cor": v.cor }} aria-hidden="true">
      <span className="capa-categoria">{v.nome}</span>
      <strong>Redação</strong>
      <PenLine className="capa-icone" />
    </div>
  );
}

export function RedacoesAluno() {
  const { db, usuario } = useApp();
  const t = useFrasesDoAluno();
  const minhas = devolutivasDoAluno(db.devolutivas, usuario.uid);
  const pontos = evolucao(minhas);
  const temAulas = (db.playlists || []).some((pl) => pl.publicada && pl.categoria === "redacao");

  return (
    <>
      <TituloPagina eyebrow="Devolutivas do professor" frase={t("painel.redacao.titulo")} />

      <div className="cartao como-enviar">
        <Send aria-hidden="true" />
        <div>
          <span className="eyebrow">Como enviar sua redação</span>
          <p>{db.instrucoesRedacao}</p>
        </div>
        {temAulas && <Link className="btn btn--vidro btn--sm" to="/aluno/cursos?categoria=redacao"><PlayCircle />Aulas de redação</Link>}
      </div>

      {pontos.length >= 2 && (
        <section className="cartao bloco-evolucao" aria-labelledby="titulo-evolucao">
          <h2 id="titulo-evolucao" className="subtitulo">Evolução da nota <small>% da nota máxima</small></h2>
          <EvolucaoNotas pontos={pontos} />
        </section>
      )}

      {minhas.length === 0 ? (
        <div className="cartao"><Vazio icone={PenLine} titulo="Nenhuma devolutiva ainda" texto="Quando o professor corrigir sua redação, ela aparece aqui com a nota e os comentários." /></div>
      ) : (
        <div className="grade-redacoes">
          {minhas.map((d) => {
            const nota = notaDevolutiva(d);
            return (
              <Link key={d.id} to={d.id} className="cartao-redacao">
                <CapaRedacao d={d} />
                {!d.lida && <span className="selo-nova">Nova</span>}
                <div className="cartao-redacao-corpo">
                  <strong>{d.tema}</strong>
                  <div className="cartao-redacao-rodape">
                    <span>
                      Corrigida em <b>{fmtData(d.enviadaEm)}</b><br />
                      Vestibular <b>{modeloInfo(d.vestibular).nome}</b>
                    </span>
                    <span className="nota-cartao"><small>Nota</small><b>{nota.texto}</b></span>
                  </div>
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </>
  );
}

export function RedacaoAluno() {
  const { id } = useParams();
  const { db, usuario, mudar } = useApp();
  const d = devolutivasDoAluno(db.devolutivas, usuario.uid).find((x) => x.id === id);
  const [ativa, setAtiva] = useState(null);

  useEffect(() => {
    if (d && !d.lida) {
      mudar((rascunho) => {
        const alvo = rascunho.devolutivas.find((x) => x.id === d.id);
        alvo.lida = true;
        alvo.lidaEm = new Date().toISOString();
      });
    }
  }, [d, mudar]);

  if (!d) return <Navigate to=".." relative="path" replace />;
  const nota = notaDevolutiva(d);
  const media = mediaDoTema(db.devolutivas, d);
  const marcacoes = d.marcacoes || [];
  const aulasRedacao = (db.playlists || []).find((pl) => pl.publicada && pl.categoria === "redacao");

  return (
    <>
      <Link to=".." relative="path" className="voltar"><ArrowLeft aria-hidden="true" />Todas as redações</Link>
      <header className="cabeca-redacao">
        <span className="eyebrow">{modeloInfo(d.vestibular).nome} · corrigida em {fmtData(d.enviadaEm)}</span>
        <h1>{d.tema}</h1>
      </header>

      <div className="correcao">
        <div className="correcao-folha">
          <FolhaCorrigida foto={d.foto} marcacoes={marcacoes} ativa={ativa} aoSelecionar={setAtiva} />
        </div>

        <aside className="correcao-painel" aria-label="Correção">
          <section className="cartao">
            <span className="eyebrow">Sua nota</span>
            <div className="nota-grande">{nota.texto}</div>
            {media && <p className="nota-media">Média do tema: <b className="num">{media.total}</b> pontos</p>}
            {d.rubrica === "enem" && <NotasCompetencias notas={d.notas} media={media} />}
          </section>

          {(d.proposta || aulasRedacao) && (
            <section className="cartao material">
              <span className="eyebrow">Material de apoio</span>
              {d.proposta && <a className="btn btn--vidro btn--sm" href={d.proposta} target="_blank" rel="noreferrer"><ExternalLink />Proposta de redação</a>}
              {aulasRedacao && <Link className="btn btn--vidro btn--sm" to={`/aluno/cursos/${aulasRedacao.id}`}><PlayCircle />{aulasRedacao.titulo}</Link>}
            </section>
          )}

          {marcacoes.length > 0 && (
            <section className="lista-marcacoes" aria-label="Marcações no texto">
              <span className="eyebrow">Marcações no texto</span>
              {marcacoes.map((m, i) => (
                <ItemMarcacao key={m.id} m={m} numero={i + 1} ativa={ativa === m.id} aoSelecionar={(mid) => setAtiva(ativa === mid ? null : mid)} />
              ))}
            </section>
          )}

          {(d.comentario || d.pontosFortes || d.aMelhorar) && (
            <section className="cartao comentarios">
              {d.comentario && <><span className="eyebrow">Comentário geral</span><p>{d.comentario}</p></>}
              {d.pontosFortes && <><span className="eyebrow">Pontos fortes</span><p>{d.pontosFortes}</p></>}
              {d.aMelhorar && <><span className="eyebrow">O que melhorar</span><p>{d.aMelhorar}</p></>}
            </section>
          )}
        </aside>
      </div>
    </>
  );
}
