import { describe, expect, it } from "vitest";
import { analisarLink, fmtDuracao, playlistVisivel, progressoPlaylist } from "./midia.js";
import { DEVOLUTIVAS_INICIAIS } from "./core/nucleo.js";
import { competencia, devolutivasDoAluno, evolucao, mediaDoTema } from "./redacao.js";

describe("links de vídeo", () => {
  it("reconhece os formatos de link do YouTube", () => {
    ["https://www.youtube.com/watch?v=dQw4w9WgXcQ", "https://youtu.be/dQw4w9WgXcQ?t=10", "https://youtube.com/shorts/dQw4w9WgXcQ", "https://www.youtube.com/watch?list=x&v=dQw4w9WgXcQ"]
      .forEach((u) => expect(analisarLink(u)).toMatchObject({ provedor: "YouTube", tipo: "iframe", src: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0" }));
  });

  it("Vimeo (com hash de vídeo não listado), Drive, arquivo direto e link qualquer", () => {
    expect(analisarLink("https://vimeo.com/76979871/abc123").src).toBe("https://player.vimeo.com/video/76979871?h=abc123");
    expect(analisarLink("https://drive.google.com/file/d/1AbC_d/view?usp=sharing").src).toBe("https://drive.google.com/file/d/1AbC_d/preview");
    expect(analisarLink("https://cdn.site.com/aula.mp4")).toMatchObject({ tipo: "video" });
    expect(analisarLink("https://site.com/pagina")).toMatchObject({ tipo: "link" });
    expect(analisarLink("texto solto")).toBeNull();
  });

  it("duração legível", () => {
    expect(fmtDuracao(754)).toBe("12:34");
    expect(fmtDuracao(3725)).toBe("1:02:05");
    expect(fmtDuracao(NaN)).toBe("");
  });

  it("progresso e visibilidade das playlists", () => {
    const pl = { publicada: true, para: "fuvest", videos: [{ id: "a" }, { id: "b" }, { id: "c" }] };
    expect(progressoPlaylist(pl, { a: true })).toEqual({ total: 3, feitos: 1, pct: 33 });
    expect(playlistVisivel(pl, "fuvest")).toBe(true);
    expect(playlistVisivel(pl, "enem")).toBe(false);
    expect(playlistVisivel({ ...pl, publicada: false }, "fuvest")).toBe(false);
  });
});

describe("devolutivas de redação", () => {
  it("o aluno só vê as enviadas, da mais nova para a mais antiga", () => {
    expect(devolutivasDoAluno(DEVOLUTIVAS_INICIAIS, "alu1").map((d) => d.id)).toEqual(["dv2", "dv1"]);
    expect(devolutivasDoAluno(DEVOLUTIVAS_INICIAIS, "alu3")).toEqual([]); // dv3 é rascunho
  });

  it("média do tema só com duas ou mais redações sobre o mesmo tema", () => {
    const base = DEVOLUTIVAS_INICIAIS[1];
    expect(mediaDoTema(DEVOLUTIVAS_INICIAIS, base)).toBeNull();
    const outra = { ...base, id: "x", alunoId: "alu2", tema: " os impactos da inteligência artificial no mercado de trabalho ", notas: { c1: 120, c2: 120, c3: 120, c4: 120, c5: 120 } };
    const m = mediaDoTema([...DEVOLUTIVAS_INICIAIS, outra], base);
    expect(m).toMatchObject({ quantas: 2, total: 720 });
    expect(m.porCompetencia.c5).toBe(160);
  });

  it("evolução em ordem cronológica e em % da nota máxima", () => {
    expect(evolucao(devolutivasDoAluno(DEVOLUTIVAS_INICIAIS, "alu1")).map((p) => p.pct)).toEqual([72, 84]);
  });

  it("nome curto da competência", () => {
    expect(competencia("c3")).toEqual({ id: "c3", sigla: "C3", nome: "Seleção e organização dos argumentos" });
  });
});
