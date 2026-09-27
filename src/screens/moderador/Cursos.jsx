import { useState } from "react";
import { Link, Navigate, useNavigate, useParams } from "react-router-dom";
import {
  ArrowDown, ArrowLeft, ArrowUp, Eye, EyeOff, ImagePlus, Link2, Paperclip, Pencil, Plus, Settings2, Trash2, UploadCloud, Video,
} from "lucide-react";
import { CATEGORIAS_PLAYLIST, CORES_PLAYLIST, VESTIBULARES, vestInfo } from "../../core/nucleo.js";
import { useApp } from "../../state/AppContext.jsx";
import { apagarArquivo, comprimirImagem, lerDuracaoVideo, salvarArquivo } from "../../state/arquivos.js";
import { RELEVANCIAS, analisarLink, fmtDuracao } from "../../midia.js";
import { CapaPlaylist, MiniaturaVideo, PlayerVideo, nomeCategoria } from "../../ui/Midia.jsx";
import { Botao, Campo, Dialogo, TituloPagina, Vazio } from "../../ui/ui.jsx";

const PLAYLIST_VAZIA = { titulo: "", descricao: "", categoria: "introducao", cor: CORES_PLAYLIST[0], para: "todos", capa: null };
const publico = (pl) => (pl.para === "todos" ? "todos os alunos" : `só ${vestInfo(pl.para).nome}`);

function CamposPlaylist({ form, setForm }) {
  const [enviando, setEnviando] = useState(false);
  const escolherCapa = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true);
    try {
      const ref = await salvarArquivo(await comprimirImagem(arquivo, 1280, 0.82));
      setForm((f) => ({ ...f, capa: ref }));
    } finally { setEnviando(false); }
  };
  return (
    <div className="form">
      <Campo rotulo="Título">
        <input className="entrada" value={form.titulo} placeholder="Ex.: Atualidades · Novembro/2026" onChange={(e) => setForm((f) => ({ ...f, titulo: e.target.value }))} />
      </Campo>
      <Campo rotulo="Descrição">
        <textarea className="entrada" rows={2} value={form.descricao} placeholder="O que o aluno vai aprender nesta playlist" onChange={(e) => setForm((f) => ({ ...f, descricao: e.target.value }))} />
      </Campo>
      <div className="form-linha">
        <Campo rotulo="Categoria">
          <select className="entrada" value={form.categoria} onChange={(e) => setForm((f) => ({ ...f, categoria: e.target.value }))}>
            {CATEGORIAS_PLAYLIST.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Visível para">
          <select className="entrada" value={form.para} onChange={(e) => setForm((f) => ({ ...f, para: e.target.value }))}>
            <option value="todos">Todos os alunos</option>
            {VESTIBULARES.map((v) => <option key={v.id} value={v.id}>Só {v.nome}</option>)}
          </select>
        </Campo>
      </div>
      <div className="campo">
        <span>Cor</span>
        <div className="cores">
          {CORES_PLAYLIST.map((c) => (
            <button key={c} type="button" className="cor-amostra" style={{ background: c }} aria-label={`Cor ${c}`} aria-pressed={form.cor === c}
              onClick={() => setForm((f) => ({ ...f, cor: c }))} />
          ))}
        </div>
      </div>
      <div className="campo">
        <span>Capa</span>
        <div className="capa-escolha">
          <CapaPlaylist playlist={form} />
          <div className="capa-escolha-acoes">
            <label className="btn btn--vidro btn--sm">
              <ImagePlus aria-hidden="true" />{enviando ? "Enviando…" : form.capa ? "Trocar imagem" : "Enviar imagem"}
              <input type="file" accept="image/*" className="sr-only" onChange={escolherCapa} />
            </label>
            {form.capa && <Botao variante="texto" tamanho="sm" onClick={() => setForm((f) => ({ ...f, capa: null }))}>Usar a capa na cor</Botao>}
            <small>Sem imagem, a capa usa a cor e o título.</small>
          </div>
        </div>
      </div>
    </div>
  );
}

export function CursosModerador() {
  const { db, mudar } = useApp();
  const navigate = useNavigate();
  const [nova, setNova] = useState(false);
  const [form, setForm] = useState(PLAYLIST_VAZIA);
  const playlists = db.playlists || [];

  const criar = () => {
    const id = `pl-${Date.now()}`;
    mudar((d) => { d.playlists = [...(d.playlists || []), { id, ...form, titulo: form.titulo.trim(), publicada: false, videos: [] }]; });
    setNova(false);
    setForm(PLAYLIST_VAZIA);
    navigate(id);
  };

  return (
    <>
      <TituloPagina eyebrow="Conteúdo" frase="Cursos em *vídeo*"
        texto="Crie playlists e anexe as aulas. Só as playlists publicadas aparecem para os alunos."
        direita={<Botao variante="solido" icone={Plus} onClick={() => setNova(true)}>Nova playlist</Botao>} />

      {CATEGORIAS_PLAYLIST.map((cat) => {
        const lista = playlists.filter((pl) => pl.categoria === cat.id);
        if (!lista.length) return null;
        return (
          <section key={cat.id} className="secao">
            <span className="eyebrow">{cat.nome}</span>
            <div className="grade-cursos">
              {lista.map((pl) => (
                <Link key={pl.id} to={pl.id} className="cartao-curso">
                  <CapaPlaylist playlist={pl} />
                  <div className="cartao-curso-corpo">
                    <strong>{pl.titulo}</strong>
                    <span className={`etiqueta${pl.publicada ? " etiqueta--ok" : ""}`}>{pl.publicada ? "Publicada" : "Rascunho"}</span>
                    <span className="cartao-curso-meta">{pl.videos.length} {pl.videos.length === 1 ? "vídeo" : "vídeos"} · {publico(pl)}</span>
                  </div>
                </Link>
              ))}
            </div>
          </section>
        );
      })}
      {playlists.length === 0 && <div className="cartao"><Vazio icone={Video} titulo="Nenhuma playlist ainda" texto="Crie a primeira e anexe os vídeos." /></div>}

      <Dialogo aberto={nova} aoFechar={() => setNova(false)} titulo="Nova playlist" largura={520}>
        <CamposPlaylist form={form} setForm={setForm} />
        <div className="dialogo-acoes">
          <Botao variante="vidro" onClick={() => setNova(false)}>Cancelar</Botao>
          <Botao variante="solido" icone={Plus} disabled={!form.titulo.trim()} onClick={criar}>Criar e adicionar vídeos</Botao>
        </div>
      </Dialogo>
    </>
  );
}

function FormVideo({ inicial, aoSalvar, aoCancelar }) {
  const [v, setV] = useState(inicial || { id: `v-${Date.now()}`, titulo: "", descricao: "", duracao: "", relevancia: "", fonte: "link", url: "", arquivo: null, arquivoNome: "" });
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const link = v.fonte === "link" ? analisarLink(v.url) : null;
  const valido = v.titulo.trim() && ((v.fonte === "link" && link) || (v.fonte === "arquivo" && v.arquivo) || v.fonte === "exemplo");

  const escolherArquivo = async (e) => {
    const arquivo = e.target.files?.[0];
    if (!arquivo) return;
    setEnviando(true); setErro("");
    try {
      const [ref, dur] = await Promise.all([salvarArquivo(arquivo), lerDuracaoVideo(arquivo)]);
      setV((x) => ({
        ...x, fonte: "arquivo", arquivo: ref, arquivoNome: arquivo.name,
        titulo: x.titulo || arquivo.name.replace(/\.[^.]+$/, ""), duracao: x.duracao || fmtDuracao(dur),
      }));
    } catch {
      setErro("Não foi possível guardar o arquivo neste navegador. Tente um link do YouTube, Vimeo ou Drive.");
    } finally { setEnviando(false); }
  };

  return (
    <div className="form">
      <div className="abas" role="tablist">
        {[{ k: "link", label: "Colar link", icone: Link2 }, { k: "arquivo", label: "Enviar arquivo", icone: UploadCloud }].map((t) => (
          <button key={t.k} type="button" role="tab" aria-selected={v.fonte === t.k || (t.k === "link" && v.fonte === "exemplo")}
            onClick={() => setV((x) => ({ ...x, fonte: t.k }))}><t.icone aria-hidden="true" />{t.label}</button>
        ))}
      </div>

      {v.fonte === "arquivo" ? (
        <label className="soltar">
          <UploadCloud aria-hidden="true" />
          <strong>{enviando ? "Guardando o vídeo…" : v.arquivoNome || "Escolher arquivo de vídeo (.mp4, .webm, .mov)"}</strong>
          <small>Enquanto a plataforma não tem servidor, o arquivo fica só neste navegador. Para os alunos verem em outros aparelhos, use um link.</small>
          <input type="file" accept="video/*" className="sr-only" onChange={escolherArquivo} />
        </label>
      ) : (
        <Campo rotulo="Link do vídeo" ajuda={v.url ? (link ? (link.tipo === "link" ? `${link.provedor}: o aluno abre em outra aba.` : `${link.provedor}: toca dentro da plataforma.`) : "Cole um endereço completo, começando com https://") : "YouTube, Vimeo, Google Drive, Panda Video ou arquivo .mp4 online."}>
          <input className="entrada" value={v.url || ""} placeholder="https://www.youtube.com/watch?v=…" onChange={(e) => setV((x) => ({ ...x, fonte: "link", url: e.target.value }))} />
        </Campo>
      )}
      {erro && <p className="aviso">{erro}</p>}
      {(link?.tipo === "iframe" || link?.tipo === "video" || (v.fonte === "arquivo" && v.arquivo)) && (
        <div className="previa-video"><PlayerVideo video={v} /></div>
      )}

      <Campo rotulo="Título da aula">
        <input className="entrada" value={v.titulo} placeholder="Ex.: Tese e repertório na introdução" onChange={(e) => setV((x) => ({ ...x, titulo: e.target.value }))} />
      </Campo>
      <Campo rotulo="Descrição (opcional)">
        <textarea className="entrada" rows={2} value={v.descricao} onChange={(e) => setV((x) => ({ ...x, descricao: e.target.value }))} />
      </Campo>
      <div className="form-linha">
        <Campo rotulo="Duração (opcional)">
          <input className="entrada num" value={v.duracao} placeholder="12:30" onChange={(e) => setV((x) => ({ ...x, duracao: e.target.value }))} />
        </Campo>
        <Campo rotulo="Relevância para a prova">
          <select className="entrada" value={v.relevancia || ""} onChange={(e) => setV((x) => ({ ...x, relevancia: e.target.value }))}>
            <option value="">Não mostrar</option>
            {RELEVANCIAS.map((r) => <option key={r.id} value={r.id}>{r.nome}</option>)}
          </select>
        </Campo>
      </div>
      <div className="dialogo-acoes">
        <Botao variante="vidro" onClick={aoCancelar}>Cancelar</Botao>
        <Botao variante="solido" disabled={!valido || enviando} onClick={() => aoSalvar(v)}>Salvar vídeo</Botao>
      </div>
    </div>
  );
}

export function PlaylistModerador() {
  const { id } = useParams();
  const { db, mudar } = useApp();
  const navigate = useNavigate();
  const playlist = (db.playlists || []).find((pl) => pl.id === id);
  const [dados, setDados] = useState(null); // formulário "Dados da playlist"
  const [video, setVideo] = useState(null); // null | "novo" | objeto do vídeo
  const [excluir, setExcluir] = useState(null); // "playlist" | id do vídeo

  if (!playlist) return <Navigate to=".." relative="path" replace />;
  const alterar = (fn) => mudar((d) => { fn(d.playlists.find((pl) => pl.id === id)); });

  const mover = (i, passo) => alterar((pl) => {
    const j = i + passo;
    if (j < 0 || j >= pl.videos.length) return;
    [pl.videos[i], pl.videos[j]] = [pl.videos[j], pl.videos[i]];
  });
  const salvarVideo = (v) => {
    const antigo = playlist.videos.find((x) => x.id === v.id);
    if (antigo?.arquivo && antigo.arquivo !== v.arquivo) apagarArquivo(antigo.arquivo);
    if (v.fonte !== "arquivo" && v.arquivo && v.arquivo !== antigo?.arquivo) apagarArquivo(v.arquivo); // enviou e depois trocou por link
    const limpo = v.fonte === "arquivo" ? { ...v, url: "" } : { ...v, arquivo: null, arquivoNome: "" };
    alterar((pl) => {
      const i = pl.videos.findIndex((x) => x.id === v.id);
      if (i >= 0) pl.videos[i] = limpo; else pl.videos.push(limpo);
    });
    setVideo(null);
  };
  const removerVideo = (v) => {
    apagarArquivo(v.arquivo);
    alterar((pl) => { pl.videos = pl.videos.filter((x) => x.id !== v.id); });
    setExcluir(null);
  };
  const excluirPlaylist = () => {
    playlist.videos.forEach((v) => apagarArquivo(v.arquivo));
    apagarArquivo(playlist.capa);
    mudar((d) => { d.playlists = d.playlists.filter((pl) => pl.id !== id); });
    navigate("..", { relative: "path" });
  };

  return (
    <>
      <Link to=".." relative="path" className="voltar"><ArrowLeft aria-hidden="true" />Todas as playlists</Link>
      <div className="cartao cabeca-editor">
        <div className="cabeca-editor-capa"><CapaPlaylist playlist={playlist} /></div>
        <div className="cabeca-editor-texto">
          <span className="eyebrow">{nomeCategoria(playlist.categoria)} · {publico(playlist)}</span>
          <h1>{playlist.titulo}</h1>
          <span className={`etiqueta${playlist.publicada ? " etiqueta--ok" : ""}`}>{playlist.publicada ? "Publicada: os alunos já veem" : "Rascunho: só você vê"}</span>
        </div>
        <div className="cabeca-editor-acoes">
          <Botao variante={playlist.publicada ? "vidro" : "solido"} icone={playlist.publicada ? EyeOff : Eye}
            onClick={() => alterar((pl) => { pl.publicada = !pl.publicada; })}>
            {playlist.publicada ? "Voltar para rascunho" : "Publicar para os alunos"}
          </Botao>
          <Botao variante="vidro" icone={Settings2} onClick={() => setDados({ ...playlist })}>Dados da playlist</Botao>
          {excluir === "playlist" ? (
            <span className="confirmar">
              Excluir a playlist e os vídeos?
              <Botao variante="perigo" tamanho="sm" onClick={excluirPlaylist}>Excluir</Botao>
              <Botao variante="texto" tamanho="sm" onClick={() => setExcluir(null)}>Cancelar</Botao>
            </span>
          ) : <Botao variante="texto" icone={Trash2} onClick={() => setExcluir("playlist")}>Excluir playlist</Botao>}
        </div>
      </div>

      <div className="linha-titulo-secao">
        <h2 className="subtitulo">Vídeos <span className="num">({playlist.videos.length})</span></h2>
        <Botao variante="solido" tamanho="sm" icone={Plus} onClick={() => setVideo("novo")}>Adicionar vídeo</Botao>
      </div>
      {playlist.videos.length === 0 && <div className="cartao"><Vazio icone={Video} titulo="Nenhum vídeo ainda" texto="Adicione o primeiro vídeo desta playlist." /></div>}
      <ol className="lista-videos">
        {playlist.videos.map((v, i) => (
          <li key={v.id} className="cartao linha-video">
            <div className="ordem">
              <button type="button" className="icone-btn" aria-label="Subir" disabled={i === 0} onClick={() => mover(i, -1)}><ArrowUp /></button>
              <button type="button" className="icone-btn" aria-label="Descer" disabled={i === playlist.videos.length - 1} onClick={() => mover(i, 1)}><ArrowDown /></button>
            </div>
            <div className="linha-video-mini"><MiniaturaVideo video={v} playlist={playlist} numero={i + 1} /></div>
            <div className="linha-video-texto">
              <strong>{i + 1}. {v.titulo}</strong>
              <span>
                {v.fonte === "arquivo" && <><Paperclip aria-hidden="true" />{v.arquivoNome || "arquivo enviado"}</>}
                {v.fonte === "link" && <><Link2 aria-hidden="true" />{analisarLink(v.url)?.provedor || "link"}</>}
                {v.fonte === "exemplo" && "vídeo de exemplo, sem arquivo"}
                {v.duracao && ` · ${v.duracao}`}
              </span>
            </div>
            {excluir === v.id ? (
              <span className="confirmar">
                <Botao variante="perigo" tamanho="sm" onClick={() => removerVideo(v)}>Remover</Botao>
                <Botao variante="texto" tamanho="sm" onClick={() => setExcluir(null)}>Cancelar</Botao>
              </span>
            ) : (
              <span className="linha-video-acoes">
                <Botao variante="vidro" tamanho="sm" icone={Pencil} onClick={() => setVideo(v)}>Editar</Botao>
                <button type="button" className="icone-btn" aria-label={`Remover ${v.titulo}`} onClick={() => setExcluir(v.id)}><Trash2 /></button>
              </span>
            )}
          </li>
        ))}
      </ol>

      <Dialogo aberto={!!dados} aoFechar={() => setDados(null)} titulo="Dados da playlist" largura={520}>
        {dados && (
          <>
            <CamposPlaylist form={dados} setForm={(fn) => setDados((f) => (typeof fn === "function" ? fn(f) : fn))} />
            <div className="dialogo-acoes">
              <Botao variante="vidro" onClick={() => setDados(null)}>Cancelar</Botao>
              <Botao variante="solido" disabled={!dados.titulo.trim()} onClick={() => {
                if (playlist.capa && playlist.capa !== dados.capa) apagarArquivo(playlist.capa);
                alterar((pl) => { Object.assign(pl, { titulo: dados.titulo.trim(), descricao: dados.descricao, categoria: dados.categoria, cor: dados.cor, para: dados.para, capa: dados.capa }); });
                setDados(null);
              }}>Salvar</Botao>
            </div>
          </>
        )}
      </Dialogo>

      <Dialogo aberto={!!video} aoFechar={() => setVideo(null)} titulo={video === "novo" ? "Adicionar vídeo" : "Editar vídeo"} largura={560}>
        {video && <FormVideo inicial={video === "novo" ? null : video} aoSalvar={salvarVideo} aoCancelar={() => setVideo(null)} />}
      </Dialogo>
    </>
  );
}
