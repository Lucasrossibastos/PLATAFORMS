import { describe, expect, it } from "vitest";
import { reabrirTopico, tirarDoFimDaFila } from "./ciclos.js";
import { somarDias } from "./datas.js";
import {
  conteudoPlanejado, metasDasRevisoesAntigas, partesDaConclusao, planejarHorizonte, planejarRevisoes, reconciliar,
} from "./motorMetas.js";
import { ativarRevisao, desativarRevisao, editarRevisao } from "./revisaoRecorrente.js";

const HOJE = "2026-09-28"; // segunda
const TODO_DIA = { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 120, dom: 120 };
const topicos = (materiaId, n, duracao = 120) => Array.from({ length: n }, (_, i) => ({
  materiaId, topicoId: `${materiaId}${i + 1}`, itemId: `t:${materiaId}${i + 1}`, duracao,
}));
const planoCom = (materias, disponibilidade = TODO_DIA) => ({ inicio: "2026-08-03", disponibilidade, materias });
const eng = planoCom([
  { materiaId: "mat", peso: 10, maxSessao: 60, prioridade: 1 },
  { materiaId: "fis", peso: 5, maxSessao: 60, prioridade: 1 },
  { materiaId: "filo", peso: 1, maxSessao: 30, prioridade: 3 },
]);
const itensEng = [...topicos("mat", 20), ...topicos("fis", 20), ...topicos("filo", 20)];
const soma = (lista, f) => lista.reduce((s, x) => s + f(x), 0);
const porMateria = (slots) => slots.reduce((r, s) => ({ ...r, [s.materiaId]: (r[s.materiaId] || 0) + s.minutos }), {});

// aplica o resultado da reconciliação (como o serviço faz) para rodar de novo
let seq = 0;
function aplicar(metas, r, hojeIso = HOJE) {
  const fora = new Set([...r.apagar, ...r.dispensar]);
  const mudou = new Map(r.atualizar.map((a) => [a.id, a.patch]));
  return [
    ...metas.filter((m) => !fora.has(m.id)).map((m) => (mudou.has(m.id) ? { ...m, ...mudou.get(m.id) } : m)),
    ...metas.filter((m) => r.dispensar.includes(m.id)).map((m) => ({ ...m, status: "dispensada" })),
    ...r.criar.map((c) => ({ id: `n${++seq}`, categoria: "progressao", status: "pendente", datasAnteriores: [], geradaEm: hojeIso, ...c })),
  ];
}
function gerar({ plano = eng, itens = itensEng, progresso = {}, metas = [], hojeIso = HOJE, estrategia } = {}) {
  const h = planejarHorizonte({ hojeIso, plano, itens, progresso, metas, estrategia });
  const r = reconciliar({ metas, slots: h.slots, hojeIso, estrategia });
  return { h, r, metas: aplicar(metas, r, hojeIso) };
}

describe("peso define a frequência", () => {
  it("engenharia: matemática (peso 10) aparece muito mais que filosofia (peso 1)", () => {
    const h = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens: itensEng });
    const min = porMateria(h.slots);
    const total = soma(h.slots, (s) => s.minutos);
    expect(total).toBeLessThanOrEqual(14 * 120); // o horário é teto
    expect(total).toBeGreaterThanOrEqual(14 * 120 * 0.9);
    expect(min.mat / total).toBeGreaterThan(0.55);
    expect(min.mat).toBeGreaterThan(min.fis * 1.4);
    expect(min.fis).toBeGreaterThan(min.filo * 3);
    expect(min.filo).toBeGreaterThan(0);
    // matemática aparece em quase todos os dias; nenhum dia passa do horário
    const dias = new Set(h.slots.filter((s) => s.materiaId === "mat").map((s) => s.data));
    expect(dias.size).toBeGreaterThanOrEqual(12);
    h.datas.forEach((d) => expect(soma(h.slots.filter((s) => s.data === d), (s) => s.minutos)).toBeLessThanOrEqual(120));
  });

  it("dia sem horário não recebe meta; matéria sem conteúdo pendente também não", () => {
    const plano = planoCom(eng.materias, { ...TODO_DIA, dom: 0 });
    const itens = [...topicos("mat", 20), ...topicos("fis", 20)];
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens });
    expect(slots.some((s) => s.data === "2026-10-04")).toBe(false);
    expect(slots.some((s) => s.materiaId === "filo")).toBe(false);
  });

  it("o que acabou é o que ainda falta: sessões nunca passam do conteúdo da matéria", () => {
    const itens = [...topicos("mat", 1, 70), ...topicos("fis", 20)];
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens });
    expect(porMateria(slots).mat).toBe(70);
  });
});

describe("duração das metas livre (minutos exatos)", () => {
  it("a duração definida é teto: nunca é passada; tópico maior que a meta vira partes iguais", () => {
    const plano = { ...eng, duracaoMeta: { mat: 47 }, materias: eng.materias.map((m) => (m.materiaId === "fis" ? { ...m, maxSessao: 38 } : m)) };
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens: itensEng });
    const durs = (id) => slots.filter((x) => x.materiaId === id).map((x) => x.minutos);
    expect(Math.max(...durs("mat"))).toBeLessThanOrEqual(47);
    expect(Math.max(...durs("fis"))).toBeLessThanOrEqual(38);
    expect(durs("mat")).toContain(40); // 120 min em 3 × 40, não 47 + 47 + 26
    expect(durs("fis")).toContain(30); // 120 min em 4 × 30
  });

  it("a meta fecha o tópico quando ele cabe; pedacinho que sobrou segue no próximo tópico", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 60 }], { ...TODO_DIA, seg: 60 });
    const itens = [{ materiaId: "mat", topicoId: "a", itemId: "t:a", duracao: 40 }, ...topicos("mat", 3)];
    const fecha = planejarHorizonte({ hojeIso: HOJE, plano, itens }).slots.filter((x) => x.data === HOJE);
    expect(fecha.map((x) => x.minutos)).toEqual([40]); // fecha o tópico de 40 e o dia fica com folga de 20
    const sobra = planejarHorizonte({ hojeIso: HOJE, plano, itens, progresso: { "t:a": { minutos: 30 } } }).slots.filter((x) => x.data === HOJE);
    expect(sobra.map((x) => x.minutos)).toEqual([60]); // 10 que faltavam + 50 do próximo
    const c = conteudoPlanejado([{ id: "m", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: HOJE, duracaoPlanejada: 60 }], itens, { "t:a": { minutos: 30 } });
    expect(c.m.partes.map((p) => [p.topicoId, p.minutos])).toEqual([["a", 10], ["mat1", 50]]);
  });

  it("quando o dia só comporta parte de um tópico, a parte não deixa resto pequeno nele", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 60 }], { ...TODO_DIA, seg: 50 });
    const itens = [{ materiaId: "mat", topicoId: "a", itemId: "t:a", duracao: 60 }, ...topicos("mat", 2)];
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens });
    expect(slots.filter((x) => x.data === HOJE).map((x) => x.minutos)).toEqual([30]); // 30 + 30, não 50 + 10
    expect(slots.find((x) => x.data === "2026-09-29").minutos).toBe(30);
  });

  it("sobra do dia menor que meia meta não vira meta picada (o dia pode ficar com folga)", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 60 }], { ...TODO_DIA, seg: 80 });
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) }).slots.filter((x) => x.data === HOJE);
    expect(hoje.map((x) => x.minutos)).toEqual([60]);
  });

  it("metas curtas (10 min) não são barradas pelo mínimo padrão", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 10 }], { ...TODO_DIA, seg: 30 });
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) });
    expect(slots.filter((x) => x.data === HOJE).map((x) => x.minutos)).toEqual([10, 10, 10]);
  });
});

describe("orçamento do dia", () => {
  it("revisões entram primeiro; quando só elas passam do dia, o dia fica em conflito e nada é cortado", () => {
    const rev = (id, data, dur) => ({ id, categoria: "revisao_recorrente", status: "pendente", dataPlanejada: data, duracaoPlanejada: dur, materiaId: "bio", itemId: "t:b", revisaoRecorrenteId: id });
    const metas = [rev("r1", HOJE, 50), rev("r2", HOJE, 50), rev("r3", HOJE, 50), rev("r4", "2026-09-29", 20), rev("r5", "2026-09-29", 25)];
    const { h, r } = gerar({ metas });
    expect(h.conflitos).toEqual([{ data: HOJE, minutosRevisoes: 150, minutosDia: 120 }]);
    expect(h.capacidade[HOJE]).toBe(0);
    expect(h.slots.some((s) => s.data === HOJE)).toBe(false);
    // o dia seguinte divide o que sobra das revisões com a progressão
    expect(h.capacidade["2026-09-29"]).toBe(75);
    expect(soma(h.slots.filter((s) => s.data === "2026-09-29"), (s) => s.minutos)).toBeLessThanOrEqual(75);
    expect(soma(h.slots.filter((s) => s.data === "2026-09-29"), (s) => s.minutos)).toBeGreaterThanOrEqual(60);
    // as revisões não são tocadas pela reconciliação
    const tocadas = [...r.apagar, ...r.dispensar, ...r.atualizar.map((a) => a.id)];
    expect(tocadas.some((id) => id.startsWith("r"))).toBe(false);
  });

  it("meta fixada pelo aluno ocupa o dia dela e o conteúdo dela não é planejado de novo", () => {
    const itens = [...topicos("mat", 1, 90), ...topicos("fis", 20)];
    const fixa = { id: "f1", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: "2026-09-30", duracaoPlanejada: 60, fixada: true };
    const { h, r } = gerar({ itens, metas: [fixa] });
    expect(h.capacidade["2026-09-30"]).toBe(60);
    expect(porMateria(h.slots).mat).toBe(30);
    expect([...r.apagar, ...r.atualizar.map((a) => a.id)]).not.toContain("f1");
  });

  it("o estudado hoje desconta do dia e entra no equilíbrio das matérias", () => {
    const feita = { id: "c1", categoria: "progressao", status: "concluida", materiaId: "mat", dataPlanejada: HOJE, concluidaEm: HOJE, duracaoPlanejada: 60, duracaoReal: 90 };
    const { h } = gerar({ metas: [feita] });
    expect(h.capacidade[HOJE]).toBe(30);
    expect(h.slots.filter((s) => s.data === HOJE).map((s) => s.materiaId)).toEqual(["fis"]);
  });
});

describe("reconciliação mexe o mínimo", () => {
  it("rodar de novo sem mudança nenhuma não altera nada", () => {
    const primeira = gerar();
    expect(primeira.r.criar.length).toBeGreaterThan(20);
    const segunda = gerar({ metas: primeira.metas });
    expect(segunda.r).toEqual({ criar: [], atualizar: [], apagar: [], dispensar: [] });
  });

  it("meta que passou do dia vai para o próximo dia da matéria e guarda o dia perdido", () => {
    const perdida = { id: "p1", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: "2026-09-26", duracaoPlanejada: 60, datasAnteriores: [] };
    const { r } = gerar({ metas: [perdida] });
    const mudanca = r.atualizar.find((a) => a.id === "p1");
    expect(mudanca.patch).toMatchObject({ dataPlanejada: HOJE, datasAnteriores: ["2026-09-26"] });
  });

  it("estratégia 'manter': a atrasada fica no dia dela e o conteúdo dela continua reservado", () => {
    const itens = [...topicos("mat", 1, 90), ...topicos("fis", 20)];
    const perdida = { id: "p1", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: "2026-09-26", duracaoPlanejada: 60, datasAnteriores: [] };
    const { h, r } = gerar({ itens, metas: [perdida], estrategia: "manter" });
    expect([...r.apagar, ...r.dispensar, ...r.atualizar.map((a) => a.id)]).not.toContain("p1");
    expect(porMateria(h.slots).mat).toBe(30);
  });

  it("sobrou meta: futura sem histórico é apagada; a que tem dia perdido é dispensada, nunca apagada", () => {
    const itens = topicos("fis", 20); // matemática não tem mais conteúdo
    const futura = { id: "a1", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: "2026-10-01", duracaoPlanejada: 60, datasAnteriores: [] };
    const perdida = { id: "a2", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: "2026-09-25", duracaoPlanejada: 60, datasAnteriores: [] };
    const { r } = gerar({ itens, metas: [futura, perdida] });
    expect(r.apagar).toEqual(["a1"]);
    expect(r.dispensar).toEqual(["a2"]);
  });
});

describe("conteúdo das metas (contínuo, pela fila)", () => {
  const itens = topicos("mat", 3, 60);
  const meta = (id, data) => ({ id, categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: data, duracaoPlanejada: 50 });

  it("a meta segue do fim de um tópico para o começo do próximo", () => {
    const c = conteudoPlanejado([meta("b", "2026-09-29"), meta("a", HOJE)], itens, { "t:mat1": { minutos: 40 } });
    expect(c.a.partes).toEqual([
      { itemId: "t:mat1", topicoId: "mat1", minutos: 20, ciclo: 1 },
      { itemId: "t:mat2", topicoId: "mat2", minutos: 30, ciclo: 1 },
    ]);
    expect(c.b.partes.map((p) => [p.topicoId, p.minutos])).toEqual([["mat2", 30], ["mat3", 20]]);
    expect(c.a.categoria).toBe("progressao");
  });

  it("revisto do zero espera no fim da fila; puxado para a frente, a meta vira 'rever do zero' com o tempo inteiro", () => {
    const concluido = { minutos: 60, concluido: true, concluidoEm: "2026-09-10" };
    const reaberto = { ...concluido, ciclos: reabrirTopico(itens[0], concluido, { hojeIso: HOJE, por: "ana" }).ciclos };
    let c = conteudoPlanejado([meta("a", HOJE)], itens, { "t:mat1": reaberto });
    expect(c.a.partes[0]).toMatchObject({ topicoId: "mat2", ciclo: 1 });
    const naFrente = { ...reaberto, ciclos: tirarDoFimDaFila(itens[0], reaberto) };
    c = conteudoPlanejado([meta("a", HOJE)], itens, { "t:mat1": naFrente });
    expect(c.a).toMatchObject({ categoria: "rever_do_zero", partes: [{ topicoId: "mat1", minutos: 50, ciclo: 2 }] });
  });
});

describe("concluir uma meta", () => {
  const itens = topicos("mat", 3, 60);

  it("registra a porcentagem vista de cada tópico e fecha o ciclo que terminou", () => {
    const meta = { id: "a", categoria: "progressao", status: "pendente", materiaId: "mat", duracaoPlanejada: 50 };
    const r = partesDaConclusao({ meta, itens, progresso: { "t:mat1": { minutos: 40 } }, minutos: 50, hojeIso: HOJE });
    expect(r.partes).toEqual([
      { itemId: "t:mat1", topicoId: "mat1", minutos: 20, ciclo: 1, pctAntes: 0.667, pctDepois: 1, concluiu: true },
      { itemId: "t:mat2", topicoId: "mat2", minutos: 30, ciclo: 1, pctAntes: 0, pctDepois: 0.5, concluiu: false },
    ]);
    expect(r.concluidos).toEqual(["t:mat1"]);
    expect(r.progresso["t:mat1"]).toMatchObject({ minutos: 20, ciclos: [{ n: 1, concluido: true, concluidoEm: HOJE, concluidoPor: "tempo" }] });
    expect(r.progresso["t:mat2"].minutos).toBe(30);
  });

  it("acabou o conteúdo da matéria: o tempo a mais fica no último tópico estudado", () => {
    const meta = { id: "a", categoria: "progressao", status: "pendente", materiaId: "mat", duracaoPlanejada: 50 };
    const progresso = { "t:mat1": { minutos: 60 }, "t:mat2": { minutos: 60 }, "t:mat3": { minutos: 50 } };
    const r = partesDaConclusao({ meta, itens, progresso, minutos: 30, hojeIso: HOJE });
    expect(r.partes).toHaveLength(1);
    expect(r.partes[0]).toMatchObject({ topicoId: "mat3", minutos: 30, concluiu: true });
  });

  it("revisão registra o tópico sem mexer na porcentagem vista", () => {
    const meta = { id: "r", categoria: "revisao_recorrente", status: "pendente", materiaId: "mat", itemId: "t:mat1", topicoId: "mat1", duracaoPlanejada: 20 };
    const r = partesDaConclusao({ meta, itens, progresso: { "t:mat1": { minutos: 60 } }, minutos: 25, hojeIso: HOJE });
    expect(r.partes).toEqual([{ itemId: "t:mat1", topicoId: "mat1", minutos: 25, ciclo: 1, pctAntes: 1, pctDepois: 1, concluiu: false }]);
    expect(r.progresso).toEqual({});
  });
});

describe("dia a dia: o motor refeito todo dia não embaralha as metas", () => {
  // conclui as metas de um dia (como o serviço faz) e devolve metas e progresso novos
  function fazerDia(metas, progresso, dia) {
    const prog = structuredClone(progresso);
    const feitas = metas.map((m) => {
      if (m.status !== "pendente" || m.dataPlanejada !== dia || !m.categoria.startsWith("prog")) return m;
      const r = partesDaConclusao({ meta: m, itens: itensEng, progresso: prog, minutos: m.duracaoPlanejada, hojeIso: dia });
      Object.entries(r.progresso).forEach(([id, x]) => {
        prog[id] = { ...(prog[id] || {}), minutos: (prog[id]?.minutos || 0) + x.minutos, ...(x.ciclos ? { ciclos: x.ciclos } : {}) };
      });
      return { ...m, status: "concluida", concluidaEm: dia, duracaoReal: m.duracaoPlanejada, partes: r.partes };
    });
    return { metas: feitas, progresso: prog };
  }

  it("quem fez o dia não vê as metas dos próximos dias mudarem; filosofia não é empurrada para sempre", () => {
    let { metas } = gerar();
    let progresso = {};
    for (let i = 0; i < 20; i++) {
      const dia = somarDias(HOJE, i);
      const amanha = somarDias(dia, 1);
      ({ metas, progresso } = fazerDia(metas, progresso, dia));
      const g = gerar({ metas, progresso, hojeIso: amanha });
      expect(g.r.atualizar).toEqual([]);
      expect(g.r.apagar).toEqual([]);
      expect(g.r.criar.every((c) => c.dataPlanejada === somarDias(amanha, 13))).toBe(true);
      metas = g.metas;
    }
    const feitas = metas.filter((m) => m.status === "concluida");
    const min = feitas.reduce((r, m) => ({ ...r, [m.materiaId]: (r[m.materiaId] || 0) + m.duracaoReal }), {});
    expect(min.filo).toBeGreaterThan(60);
    expect(min.mat).toBeGreaterThan(min.fis);
    expect(min.fis).toBeGreaterThan(min.filo);
  });
});

describe("revisão recorrente", () => {
  const alvo = { alunoId: "ana", materiaId: "bio", topicoId: "cito", itemId: "t:cito", intervaloDias: 7, duracaoMin: 20, dataBase: "2026-09-21" };
  const rev = (extra = {}) => ({ id: "rv1", ...ativarRevisao({ ...alvo, ...extra }, { topicoConcluido: true, hojeIso: "2026-09-21", por: "mod" }).revisao });
  const criadas = (r) => r.criar.map((c) => c.dataPlanejada);
  const comoMetas = (r) => r.criar.map((c) => ({ ...c, status: "pendente", datasAnteriores: [] }));

  it("gera as ocorrências no intervalo certo, a partir da data-base", () => {
    const r = planejarRevisoes({ revisoes: [rev()], metas: [], hojeIso: HOJE });
    expect(criadas(r)).toEqual(["2026-09-28", "2026-10-05"]);
    expect(r.criar[0]).toMatchObject({ id: "rr_rv1_2026-09-28", categoria: "revisao_recorrente", itemId: "t:cito", duracaoPlanejada: 20, ocorrenciaEm: "2026-09-28" });
    // de novo, com as metas já criadas: nada muda (sem duplicar)
    expect(planejarRevisoes({ revisoes: [rev()], metas: comoMetas(r), hojeIso: HOJE })).toEqual({ criar: [], atualizar: [], apagar: [], dispensar: [] });
  });

  it("ciclo fixo: a atrasada fica pendente e a próxima cai na data do ciclo, sem deslocar", () => {
    const atrasada = { id: "rr_rv1_2026-09-21", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "pendente", dataPlanejada: "2026-09-21", duracaoPlanejada: 20, datasAnteriores: [] };
    const r = planejarRevisoes({ revisoes: [rev()], metas: [atrasada], hojeIso: "2026-09-24" });
    expect(criadas(r)).toEqual(["2026-09-28", "2026-10-05"]);
    expect([...r.apagar, ...r.dispensar]).toEqual([]);
    // "desde a última": enquanto a atrasada não for feita, a próxima espera
    const desde = planejarRevisoes({ revisoes: [rev({ modoAtraso: "desde_ultima" })], metas: [atrasada], hojeIso: "2026-09-24" });
    expect(desde.criar).toEqual([]);
    const feita = { ...atrasada, status: "concluida", concluidaEm: "2026-09-24" };
    expect(criadas(planejarRevisoes({ revisoes: [rev({ modoAtraso: "desde_ultima" })], metas: [feita], hojeIso: "2026-09-24" }))).toEqual(["2026-10-01"]);
  });

  it("editar o intervalo não mexe nas ocorrências já passadas nem nas feitas; só nas futuras", () => {
    const passada = { id: "rr_rv1_2026-09-21", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "concluida", concluidaEm: "2026-09-21", dataPlanejada: "2026-09-21", duracaoPlanejada: 20 };
    const antes = planejarRevisoes({ revisoes: [rev()], metas: [passada], hojeIso: HOJE });
    const metas = [passada, ...comoMetas(antes)];
    const editada = { id: "rv1", ...editarRevisao(rev(), { intervaloDias: 14, duracaoMin: 30 }, { hojeIso: HOJE, por: "mod" }).revisao };
    const r = planejarRevisoes({ revisoes: [editada], metas, hojeIso: HOJE });
    // 21/09 + 14 = 05/10: a de 28/09 sai, a de 05/10 fica com a duração nova
    expect(r.apagar).toEqual(["rr_rv1_2026-09-28"]);
    expect(r.atualizar).toEqual([{ id: "rr_rv1_2026-10-05", patch: { duracaoPlanejada: 30 } }]);
    expect(r.criar).toEqual([]);
    expect([...r.apagar, ...r.dispensar, ...r.atualizar.map((a) => a.id)]).not.toContain(passada.id);
  });

  it("desativar: as futuras saem, a atrasada por fazer é dispensada e as feitas ficam", () => {
    const atrasada = { id: "a", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "pendente", dataPlanejada: "2026-09-21", duracaoPlanejada: 20, datasAnteriores: [] };
    const futura = { ...atrasada, id: "f", ocorrenciaEm: "2026-10-05", dataPlanejada: "2026-10-05" };
    const off = { id: "rv1", ...desativarRevisao(rev(), { hojeIso: HOJE, por: "mod" }).revisao };
    expect(planejarRevisoes({ revisoes: [off], metas: [atrasada, futura], hojeIso: HOJE })).toEqual({ criar: [], atualizar: [], apagar: ["f"], dispensar: ["a"] });
  });

  it("várias revisões disputando o dia com a progressão: revisões primeiro, progressão com o que sobra, conflito à vista", () => {
    const revs = ["a", "b", "c"].map((x, i) => ({ id: `rv${x}`, ...ativarRevisao({ ...alvo, itemId: `t:${x}`, topicoId: x, dataBase: HOJE, intervaloDias: 2 + i, duracaoMin: 45 }, { topicoConcluido: true, hojeIso: HOJE, por: "mod" }).revisao }));
    const metas = comoMetas(planejarRevisoes({ revisoes: revs, metas: [], hojeIso: HOJE }));
    const h = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens: itensEng, metas });
    // hoje: as 3 caem juntas (135 min > 120) → conflito, nada de progressão, nenhuma revisão cortada
    expect(metas.filter((m) => m.dataPlanejada === HOJE)).toHaveLength(3);
    expect(h.conflitos[0]).toEqual({ data: HOJE, minutosRevisoes: 135, minutosDia: 120 });
    expect(h.slots.filter((s) => s.data === HOJE)).toEqual([]);
    // dia com uma revisão só: a progressão fica com o resto
    h.datas.forEach((d) => {
      const rev = metas.filter((m) => m.dataPlanejada === d).reduce((x, m) => x + m.duracaoPlanejada, 0);
      const prog = h.slots.filter((s) => s.data === d).reduce((x, s) => x + s.minutos, 0);
      if (rev <= 120) expect(prog).toBeLessThanOrEqual(120 - rev);
      if (rev === 45) expect(prog).toBeGreaterThanOrEqual(60);
    });
  });
});

describe("revisões automáticas antigas", () => {
  it("as já agendadas viram metas (uma vez só); feitas e ignoradas ficam como estão", () => {
    const antigas = [{ id: "x", materiaId: "bio", itemId: "t:cito", topicoId: "cito", duracaoMin: 20, sessoes: [
      { dia: "2026-09-20", status: "realizada" }, { dia: "2026-09-27", status: "agendada" }, { dia: "2026-10-05", status: "agendada" }, { dia: "2026-11-20", status: "agendada" },
    ] }];
    const criar = metasDasRevisoesAntigas({ revisoes: antigas, metas: [], hojeIso: HOJE });
    expect(criar.map((c) => [c.id, c.dataPlanejada, c.categoria])).toEqual([
      ["ra_x_2026-09-27", "2026-09-27", "revisao_automatica"], ["ra_x_2026-10-05", "2026-10-05", "revisao_automatica"],
    ]);
    expect(metasDasRevisoesAntigas({ revisoes: antigas, metas: criar, hojeIso: HOJE })).toEqual([]);
  });
});
