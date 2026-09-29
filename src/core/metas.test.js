import { describe, expect, it } from "vitest";
import { concluirMeta, ehAtrasada, moverMeta, novaMeta, resumoDaSemana, tempoPorCategoria, validarMeta } from "./metas.js";

const base = { alunoId: "ana", categoria: "progressao", materiaId: "bio", dataPlanejada: "2026-09-28", duracaoPlanejada: 50 };
const criar = (extra = {}) => novaMeta({ ...base, ...extra }, { geradaEm: "2026-09-28", geracao: 1 }).meta;

describe("registro da meta", () => {
  it("valida categoria, data, duração e o tópico das categorias que o exigem", () => {
    expect(validarMeta(base).ok).toBe(true);
    expect(validarMeta({ ...base, categoria: "outra" }).erros.categoria).toBeTruthy();
    expect(validarMeta({ ...base, duracaoPlanejada: 3 }).erros.duracaoPlanejada).toBeTruthy();
    expect(validarMeta({ ...base, categoria: "rever_do_zero" }).erros.itemId).toBeTruthy();
    expect(validarMeta({ ...base, categoria: "revisao_recorrente", itemId: "t:x" }).erros.revisaoRecorrenteId).toBeTruthy();
  });

  it("nasce pendente, sem dias perdidos; a recorrente guarda a ocorrência", () => {
    expect(criar()).toMatchObject({ status: "pendente", datasAnteriores: [], geradaPor: "motor", geracao: 1, itemId: null });
    expect(criar({ categoria: "revisao_recorrente", itemId: "t:x", revisaoRecorrenteId: "r1" })).toMatchObject({ revisaoRecorrenteId: "r1", ocorrenciaEm: "2026-09-28" });
  });
});

describe("mudar de dia", () => {
  it("entre dias futuros não deixa rastro; a que passou do dia guarda o dia perdido", () => {
    const m = criar({ dataPlanejada: "2026-09-30" });
    expect(moverMeta(m, "2026-10-02", "2026-09-28").meta.datasAnteriores).toEqual([]);
    const atrasada = criar({ dataPlanejada: "2026-09-25" });
    expect(ehAtrasada(atrasada, "2026-09-28")).toBe(true);
    const r = moverMeta(atrasada, "2026-09-29", "2026-09-28");
    expect(r.meta).toMatchObject({ dataPlanejada: "2026-09-29", datasAnteriores: ["2026-09-25"] });
  });

  it("não leva para o passado nem mexe em meta concluída", () => {
    expect(moverMeta(criar(), "2026-09-27", "2026-09-28").ok).toBe(false);
    const feita = concluirMeta(criar(), { hojeIso: "2026-09-28", duracaoReal: 50 }).meta;
    expect(moverMeta(feita, "2026-09-30", "2026-09-28").ok).toBe(false);
  });
});

describe("concluir", () => {
  it("registra tempo real e a porcentagem vista de cada tópico; a progressão grava o tópico estudado", () => {
    const partes = [
      { itemId: "t:cito", topicoId: "cito", minutos: 20, ciclo: 1, pctAntes: 0.667, pctDepois: 1, concluiu: true },
      { itemId: "t:gene", topicoId: "gene", minutos: 30, ciclo: 1, pctAntes: 0, pctDepois: 0.5, concluiu: false },
    ];
    const r = concluirMeta(criar(), { hojeIso: "2026-09-28", duracaoReal: 50, sessaoId: "s1", partes });
    expect(r.meta).toMatchObject({ status: "concluida", concluidaEm: "2026-09-28", duracaoReal: 50, sessaoId: "s1", itemId: "t:cito" });
    expect(r.meta.partes).toEqual(partes);
    expect(concluirMeta(r.meta, { hojeIso: "2026-09-28" }).ok).toBe(false); // imutável
  });
});

describe("resumo da semana e tempo por categoria (dos registros)", () => {
  it("conta planejadas, cumpridas e não cumpridas, também por categoria", () => {
    const seg = "2026-09-28";
    const dom = "2026-10-04";
    const feita = concluirMeta(criar({ dataPlanejada: "2026-09-29" }), { hojeIso: "2026-09-29", duracaoReal: 45 }).meta;
    const perdidaEAdiada = { ...criar({ dataPlanejada: "2026-10-06" }), datasAnteriores: ["2026-10-01"] };
    const revisao = concluirMeta(criar({ categoria: "revisao_recorrente", itemId: "t:x", revisaoRecorrenteId: "r1", duracaoPlanejada: 15, dataPlanejada: "2026-09-30" }), { hojeIso: "2026-09-30", duracaoReal: 15 }).meta;
    const outraSemana = criar({ dataPlanejada: "2026-10-12" });
    const r = resumoDaSemana([feita, perdidaEAdiada, revisao, outraSemana], seg, dom);
    expect(r).toMatchObject({ metas: 3, cumpridas: 2, naoCumpridas: 1, minutosPlanejados: 115, minutosFeitos: 60 });
    expect(r.porCategoria.revisao_recorrente).toEqual({ metas: 1, cumpridas: 1, minutosPlanejados: 15, minutosFeitos: 15 });
    expect(tempoPorCategoria([feita, revisao, outraSemana])).toMatchObject({ progressao: 45, revisao_recorrente: 15, rever_do_zero: 0 });
  });
});
