/* Links de vídeo: reconhece o provedor e devolve como tocar dentro da
   plataforma (iframe do provedor, <video> para arquivo direto, ou só o link). */

export function analisarLink(url = "") {
  const u = url.trim();
  let m;
  if ((m = u.match(/(?:youtube\.com\/(?:watch\?(?:.*&)?v=|embed\/|shorts\/|live\/)|youtu\.be\/)([\w-]{11})/i))) {
    return { provedor: "YouTube", tipo: "iframe", src: `https://www.youtube-nocookie.com/embed/${m[1]}?rel=0`, capa: `https://i.ytimg.com/vi/${m[1]}/hqdefault.jpg` };
  }
  if ((m = u.match(/vimeo\.com\/(?:video\/)?(\d+)(?:\/([\da-f]+))?/i))) {
    return { provedor: "Vimeo", tipo: "iframe", src: `https://player.vimeo.com/video/${m[1]}${m[2] ? `?h=${m[2]}` : ""}` };
  }
  if ((m = u.match(/drive\.google\.com\/(?:file\/d\/|open\?id=)([\w-]+)/i))) {
    return { provedor: "Google Drive", tipo: "iframe", src: `https://drive.google.com/file/d/${m[1]}/preview` };
  }
  if (/pandavideo/i.test(u) && /^https:\/\//i.test(u)) return { provedor: "Panda Video", tipo: "iframe", src: u };
  if (/^https?:\/\/.+\.(mp4|webm|ogg|mov)(\?|#|$)/i.test(u)) return { provedor: "Arquivo online", tipo: "video", src: u };
  if (/^https?:\/\/\S+\.\S+/i.test(u)) return { provedor: "Link externo", tipo: "link", src: u };
  return null;
}

// 754 → "12:34"; 3725 → "1:02:05"
export function fmtDuracao(segundos) {
  if (!Number.isFinite(segundos) || segundos <= 0) return "";
  const s = Math.round(segundos);
  const h = Math.floor(s / 3600), m = Math.floor((s % 3600) / 60), r = s % 60;
  const dois = (n) => String(n).padStart(2, "0");
  return h ? `${h}:${dois(m)}:${dois(r)}` : `${m}:${dois(r)}`;
}

export const RELEVANCIAS = [
  { id: "baixa", nome: "Baixa", nivel: 1 },
  { id: "media", nome: "Média", nivel: 2 },
  { id: "alta", nome: "Alta", nivel: 3 },
];

// % da playlist já assistida
export function progressoPlaylist(playlist, assistidos = {}) {
  const total = playlist.videos.length;
  const feitos = playlist.videos.filter((v) => assistidos[v.id]).length;
  return { total, feitos, pct: total ? Math.round((feitos / total) * 100) : 0 };
}

// A playlist aparece para o aluno se publicada e se bate com o vestibular, o
// curso e as matérias do plano dele (lista vazia = vale para todos).
export function playlistVisivelPara(pl, aluno, materiasDoPlano = null) {
  if (!pl.publicada) return false;
  const vests = pl.vestibularIds || [];
  const cursos = pl.cursoIds || [];
  if (vests.length && !vests.includes(aluno?.vestibularId)) return false;
  if (cursos.length && !cursos.includes(aluno?.cursoId)) return false;
  if (pl.materiaId && materiasDoPlano && !materiasDoPlano.includes(pl.materiaId)) return false;
  return true;
}
