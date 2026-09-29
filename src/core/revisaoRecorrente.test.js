import { describe, expect, it } from "vitest";
import { ativarRevisao, desativarRevisao, editarRevisao, parametrosAtuais, proximaOcorrencia } from "./revisaoRecorrente.js";

const alvo = { alunoId: "ana", materiaId: "bio", topicoId: "cito", itemId: "t:cito", intervaloDias: 7, duracaoMin: 20, dataBase: "2026-09-01" };
const ctx = { topicoConcluido: true, hojeIso: "2026-09-01", por: "mod" };
const ativa = () => ativarRevisao(alvo, ctx).revisao;

describe("ativação", () => {
  it("só para tópico concluído, e nunca duas ativas no mesmo tópico", () => {
    expect(ativarRevisao(alvo, { ...ctx, topicoConcluido: false }).erros.itemId).toMatch(/concluído/);
    expect(ativarRevisao(alvo, { ...ctx, existente: ativa() }).erros.itemId).toMatch(/Edite a existente/);
    expect(ativa()).toMatchObject({ ativo: true, ativadoPor: "mod", ativadoEm: "2026-09-01", parametros: [{ desde: "2026-09-01", intervaloDias: 7, duracaoMin: 20, dataBase: "2026-09-01", modoAtraso: "fixo" }] });
  });

  it("valida intervalo e duração", () => {
    expect(ativarRevisao({ ...alvo, intervaloDias: 0 }, ctx).erros.intervaloDias).toBeTruthy();
    expect(ativarRevisao({ ...alvo, duracaoMin: 400 }, ctx).erros.duracaoMin).toBeTruthy();
  });

  it("reativar usa o mesmo documento e acrescenta ao histórico", () => {
    const desligada = desativarRevisao(ativa(), { hojeIso: "2026-09-10", por: "mod" }).revisao;
    expect(desligada).toMatchObject({ ativo: false, desativadoEm: "2026-09-10" });
    expect(desligada.parametros).toHaveLength(1); // desativar não apaga nada
    const r = ativarRevisao({ ...alvo, intervaloDias: 3 }, { ...ctx, hojeIso: "2026-09-20", existente: desligada });
    expect(r).toMatchObject({ ok: true, reativada: true });
    expect(r.revisao.parametros).toHaveLength(2);
  });
});

describe("edição só para a frente", () => {
  it("acrescenta uma versão; a anterior continua registrada", () => {
    const r = editarRevisao(ativa(), { intervaloDias: 14 }, { hojeIso: "2026-09-15", por: "mod" });
    expect(r.mudou).toBe(true);
    expect(r.revisao.parametros[0]).toMatchObject({ desde: "2026-09-01", intervaloDias: 7 });
    expect(parametrosAtuais(r.revisao)).toMatchObject({ desde: "2026-09-15", intervaloDias: 14, duracaoMin: 20 });
    expect(editarRevisao(r.revisao, { intervaloDias: 14 }, { hojeIso: "2026-09-16", por: "mod" }).mudou).toBe(false);
  });
});

describe("próxima ocorrência", () => {
  it("ciclo fixo: data-base + N × intervalo, feita ou não", () => {
    const r = ativa();
    expect(proximaOcorrencia(r, "2026-08-20")).toBe("2026-09-01");
    expect(proximaOcorrencia(r, "2026-09-01")).toBe("2026-09-01");
    expect(proximaOcorrencia(r, "2026-09-02")).toBe("2026-09-08");
    expect(proximaOcorrencia(r, "2026-09-15")).toBe("2026-09-15");
    // atraso não desloca: mesmo sem ter feito a de 08/09, a próxima é 15/09
    expect(proximaOcorrencia(r, "2026-09-09", { ultimaFeitaEm: "2026-09-01" })).toBe("2026-09-15");
  });

  it("modo 'desde a última': conta a partir da última feita; desativada não tem próxima", () => {
    const r = ativarRevisao({ ...alvo, modoAtraso: "desde_ultima" }, ctx).revisao;
    expect(proximaOcorrencia(r, "2026-09-20", { ultimaFeitaEm: "2026-09-18" })).toBe("2026-09-25");
    expect(proximaOcorrencia(r, "2026-09-30", { ultimaFeitaEm: "2026-09-18" })).toBe("2026-09-30"); // venceu: hoje
    expect(proximaOcorrencia(desativarRevisao(r, { hojeIso: "2026-09-20", por: "mod" }).revisao, "2026-09-20")).toBeNull();
  });
});
