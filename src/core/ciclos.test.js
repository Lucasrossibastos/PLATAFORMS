import { describe, expect, it } from "vitest";
import { ciclosDoItem, efeitoDosMinutos, estadoDoTopico, filaDaMateria, marcarTopicoVisto, progressoVisto, reabrirTopico, tirarDoFimDaFila } from "./ciclos.js";

const it60 = (id, extra = {}) => ({ materiaId: "bio", topicoId: id, itemId: `t:${id}`, duracao: 60, ...extra });
const cito = it60("cito");
const gene = it60("gene");
const evol = it60("evol");

describe("ciclos deduzidos dos dados antigos (nada é gravado)", () => {
  it("nunca estudado, em andamento, concluído pelo tempo e marcado", () => {
    expect(ciclosDoItem(cito, undefined)).toEqual([{ n: 1, base: 0, origem: "progressao" }]);
    expect(estadoDoTopico(cito, { minutos: 15 })).toMatchObject({ ciclo: 1, concluido: false, pctCiclo: 0.25, restante: 45 });
    expect(ciclosDoItem(cito, { minutos: 60, concluidoEm: "2026-09-01" })[0]).toMatchObject({ concluido: true, concluidoEm: "2026-09-01", concluidoPor: "tempo" });
    expect(ciclosDoItem(cito, { minutos: 10, concluido: true, concluidoEm: "2026-09-02" })[0]).toMatchObject({ concluido: true, concluidoPor: "marcado" });
  });

  it("o 'Ver de novo' antigo vira ciclo 1 concluído (data perdida marcada) e ciclo 2 com o tempo inteiro", () => {
    const antigo = { minutos: 60, concluido: false };
    const ciclos = ciclosDoItem(cito, antigo);
    expect(ciclos).toHaveLength(2);
    expect(ciclos[0]).toMatchObject({ concluido: true, concluidoEm: null, dataPerdida: true });
    // antes: restante 0 e a matéria presa; agora o ciclo 2 tem os 60 min de novo
    expect(estadoDoTopico(cito, antigo)).toMatchObject({ ciclo: 2, concluido: false, restante: 60, pctCiclo: 0, pctVisto: 1 });
  });
});

describe("rever do zero", () => {
  it("abre um ciclo novo sem apagar a conclusão original; volta para o fim da fila", () => {
    const p = { minutos: 60, ciclos: [{ n: 1, base: 0, origem: "progressao", concluido: true, concluidoEm: "2026-09-10", concluidoPor: "tempo" }] };
    const r = reabrirTopico(cito, p, { hojeIso: "2026-09-28", por: "ana" });
    expect(r.ok).toBe(true);
    expect(r.ciclos[0]).toEqual(p.ciclos[0]); // intacto
    expect(r.ciclos[1]).toMatchObject({ n: 2, base: 60, origem: "rever_do_zero", reabertoEm: "2026-09-28", reabertoPor: "ana", naFila: true });
    const e = estadoDoTopico(cito, { ...p, ciclos: r.ciclos });
    expect(e).toMatchObject({ ciclo: 2, concluido: false, restante: 60, vezesConcluido: 1, naFila: true });
  });

  it("só em tópico concluído; em andamento dá erro", () => {
    expect(reabrirTopico(cito, { minutos: 20 }, { hojeIso: "2026-09-28", por: "ana" }).ok).toBe(false);
  });

  it("não inventa data: concluído pelo tempo sem data registrada fica marcado como data desconhecida", () => {
    const p = { minutos: 60, ciclos: [{ n: 1, base: 0, origem: "progressao" }] };
    const r = reabrirTopico(cito, p, { hojeIso: "2026-09-28", por: "ana" });
    expect(r.ciclos[0]).toMatchObject({ concluido: true, concluidoEm: null, dataPerdida: true });
  });

  it("concluir o ciclo novo registra a segunda conclusão; o histórico mostra as duas", () => {
    const p1 = { minutos: 60, ciclos: [{ n: 1, base: 0, origem: "progressao", concluido: true, concluidoEm: "2026-09-10" }] };
    const { ciclos } = reabrirTopico(cito, p1, { hojeIso: "2026-09-20", por: "ana" });
    const ef = efeitoDosMinutos(cito, { ...p1, ciclos }, 60, { hojeIso: "2026-09-28" });
    expect(ef).toMatchObject({ ciclo: 2, pctAntes: 0, pctDepois: 1, concluiu: true });
    expect(ef.ciclos.map((c) => [c.n, c.concluidoEm])).toEqual([[1, "2026-09-10"], [2, "2026-09-28"]]);
  });
});

describe("fila da matéria: no máximo um tópico em andamento", () => {
  const ordem = [cito, gene, evol];

  it("o atual é o primeiro pendente; o resto não visto", () => {
    const { atual, status } = filaDaMateria(ordem, { "t:cito": { minutos: 60, concluidoEm: "2026-09-01" }, "t:gene": { minutos: 20 } });
    expect(atual.itemId).toBe("t:gene");
    expect(status).toEqual({ "t:cito": "concluido", "t:gene": "em_andamento", "t:evol": "nao_visto" });
  });

  it("o tópico revisto do zero espera no fim; arrastado para a frente vira o atual e o anterior fica pausado", () => {
    const { ciclos } = reabrirTopico(cito, { minutos: 60, concluidoEm: "2026-09-01" }, { hojeIso: "2026-09-28", por: "ana" });
    const prog = { "t:cito": { minutos: 60, ciclos }, "t:gene": { minutos: 20 } };
    let r = filaDaMateria(ordem, prog);
    expect(r.fila.map((x) => x.topicoId)).toEqual(["gene", "evol", "cito"]);
    expect(r.status).toMatchObject({ "t:gene": "em_andamento", "t:cito": "a_rever" });

    // o aluno arrasta Citologia para a frente (a ordem nova e o ciclo sai do fim da fila)
    const prog2 = { ...prog, "t:cito": { minutos: 60, ciclos: tirarDoFimDaFila(cito, prog["t:cito"]) } };
    r = filaDaMateria([cito, gene, evol], prog2);
    expect(r.atual.topicoId).toBe("cito");
    expect(r.status).toEqual({ "t:cito": "a_rever", "t:gene": "pausado", "t:evol": "nao_visto" });
    expect(Object.values(r.status).filter((s) => s === "em_andamento").length).toBeLessThanOrEqual(1);
    // Genética guarda os 20 minutos
    expect(r.estados.get("t:gene").minutosCiclo).toBe(20);
  });

  it("reordenar para frente um tópico não visto também pausa o atual", () => {
    const { atual, status } = filaDaMateria([evol, cito, gene], { "t:cito": { minutos: 30 } });
    expect(atual.topicoId).toBe("evol");
    expect(status["t:cito"]).toBe("pausado");
  });
});

describe("porcentagem vista", () => {
  it("meta registra antes/depois; matéria e plano ponderados pela duração", () => {
    const ef = efeitoDosMinutos(gene, { minutos: 15 }, 30);
    expect(ef).toMatchObject({ pctAntes: 0.25, pctDepois: 0.75, concluiu: false });
    const itens = [cito, gene, it60("h1", { materiaId: "his", duracao: 120 })];
    const r = progressoVisto(itens, { "t:cito": { minutos: 60 }, "t:gene": { minutos: 30 }, "t:h1": { minutos: 30 } });
    expect(r.materias).toEqual({ bio: 75, his: 25 });
    expect(r.plano).toBe(50); // (60 + 30 + 30) / 240
  });

  it("rever do zero não derruba o progresso do plano: o tópico já foi visto uma vez", () => {
    const antes = progressoVisto([cito, gene], { "t:cito": { minutos: 60, concluidoEm: "2026-09-01" } });
    const { ciclos } = reabrirTopico(cito, { minutos: 60, concluidoEm: "2026-09-01" }, { hojeIso: "2026-09-28", por: "ana" });
    const depois = progressoVisto([cito, gene], { "t:cito": { minutos: 60, ciclos } });
    expect(depois.plano).toBe(antes.plano);
    expect(depois.topicos["t:cito"]).toMatchObject({ pctVisto: 1, pctCiclo: 0, ciclo: 2, vezesConcluido: 1 });
  });

  it("marcar como visto conclui o ciclo atual; tópico já concluído dá erro", () => {
    const r = marcarTopicoVisto(gene, { minutos: 10 }, { hojeIso: "2026-09-28", por: "ana" });
    expect(r.ciclos[0]).toMatchObject({ concluido: true, concluidoEm: "2026-09-28", concluidoPor: "marcado", marcadoPor: "ana" });
    expect(estadoDoTopico(gene, { minutos: 10, ciclos: r.ciclos }).pctVisto).toBe(1);
    expect(marcarTopicoVisto(gene, { minutos: 60 }, { hojeIso: "2026-09-28", por: "ana" }).ok).toBe(false);
  });
});
