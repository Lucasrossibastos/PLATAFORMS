import { describe, expect, it } from "vitest";
import { reabrirTopico, tirarDoFimDaFila } from "./ciclos.js";
import { somarDias } from "./datas.js";
import {
  conteudoPlanejado, faixaDaMeta, metasDasRevisoesAntigas, partesDaConclusao, planejarHorizonte, planejarRevisoes, reconciliar,
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

  it("tópico que cabe na faixa fecha numa meta só; o fim da matéria não passa do conteúdo (em blocos de 30)", () => {
    const itens = [...topicos("mat", 1, 70), ...topicos("fis", 20)];
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens });
    expect(slots.filter((s) => s.materiaId === "mat").map((s) => s.minutos)).toEqual([90]); // média 60, faixa 30–90
  });
});

describe("metas de 30 em 30 minutos, perto da média da matéria", () => {
  const blocos = (slots) => slots.every((x) => x.minutos >= 30 && x.minutos % 30 === 0);
  const tres = planoCom([
    { materiaId: "mat", peso: 10, maxSessao: 60 }, { materiaId: "fis", peso: 5, maxSessao: 60 }, { materiaId: "qui", peso: 5, maxSessao: 60 },
  ]);
  const itensTres = [...topicos("mat", 5), ...topicos("fis", 5), ...topicos("qui", 5)];

  it("a faixa é a média ± 30 (nunca menos de 30); média antiga fora de 30 vale a mais próxima: 47 → 60, 80 → 90", () => {
    expect(faixaDaMeta(60)).toEqual({ media: 60, min: 30, max: 90 });
    expect(faixaDaMeta(120)).toEqual({ media: 120, min: 90, max: 150 });
    expect(faixaDaMeta(30)).toEqual({ media: 30, min: 30, max: 60 });
    expect([faixaDaMeta(47).media, faixaDaMeta(80).media, faixaDaMeta(10).media]).toEqual([60, 90, 30]);
    const plano = { ...eng, duracaoMeta: { mat: 47 }, materias: eng.materias.map((m) => (m.materiaId === "fis" ? { ...m, maxSessao: 80 } : m)) };
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens: itensEng });
    expect(blocos(slots)).toBe(true);
    const durs = (id) => slots.filter((x) => x.materiaId === id).map((x) => x.minutos);
    expect(durs("mat").every((x) => x >= 30 && x <= 90)).toBe(true);
    expect(durs("fis").every((x) => x >= 60 && x <= 120)).toBe(true);
  });

  it("média curta dá mais matérias no dia; média longa, blocos maiores", () => {
    const com = (media) => planoCom(tres.materias.map((m) => ({ ...m, maxSessao: media })), { ...TODO_DIA, seg: 180 });
    const curto = planejarHorizonte({ hojeIso: HOJE, plano: com(30), itens: itensTres }).slots.filter((x) => x.data === HOJE);
    const longo = planejarHorizonte({ hojeIso: HOJE, plano: com(120), itens: itensTres }).slots.filter((x) => x.data === HOJE);
    expect(curto.length).toBeGreaterThan(longo.length);
    expect(curto.every((x) => x.minutos <= 60)).toBe(true);
    expect(longo.every((x) => x.minutos >= 90 && x.minutos <= 150)).toBe(true);
    expect(soma(curto, (x) => x.minutos)).toBe(180);
    expect(soma(longo, (x) => x.minutos)).toBe(180);
  });

  it("média longa num dia que não divide certo: encolhe dentro da faixa para caber mais uma (200 = 90 + 110)", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 120 }], { ...TODO_DIA, seg: 200 });
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5, 300) }).slots.filter((x) => x.data === HOJE);
    expect(hoje.map((x) => x.minutos)).toEqual([90, 110]);
  });

  it("dia curto demais para a faixa: uma meta do tamanho do dia (melhor estudar menos que nada)", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 120 }], { ...TODO_DIA, seg: 60 });
    expect(planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) }).slots.filter((x) => x.data === HOJE).map((x) => x.minutos)).toEqual([60]);
  });

  it("dia com tempo quebrado: só a última meta completa o dia (170 = 60 + 60 + 50)", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 60 }], { ...TODO_DIA, seg: 170 });
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) }).slots.filter((x) => x.data === HOJE);
    expect(hoje.map((x) => x.minutos)).toEqual([60, 60, 50]);
  });

  it("a sobra do dia estica a última meta dentro da faixa (140 = 60 + 80, com média 60)", () => {
    const plano = { ...tres, disponibilidade: { ...TODO_DIA, seg: 140 } };
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: itensTres }).slots.filter((x) => x.data === HOJE);
    expect(hoje.map((x) => x.minutos)).toEqual([60, 80]);
  });

  it("sem meta que estique dentro da faixa: 30 saem de uma e a última vira 30 + sobra", () => {
    const plano = planoCom(tres.materias.map((m) => ({ ...m, maxSessao: 30 })), { ...TODO_DIA, seg: 200 }); // faixas 30–60
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: itensTres }).slots.filter((x) => x.data === HOJE);
    expect(soma(hoje, (x) => x.minutos)).toBe(200);
    expect(hoje.filter((x) => x.minutos % 30)).toHaveLength(1);
    expect(hoje.at(-1).minutos % 30).not.toBe(0);
    expect(hoje.every((x) => x.minutos >= 30 && x.minutos <= 60)).toBe(true);
  });

  it("a meta que completa pode ser a maior do dia quando o teto deixa (teto 90: 150 − 90 = 60, e 20 esticam para 80)", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 90 }], { ...TODO_DIA, seg: 170 });
    const hoje = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) }).slots.filter((x) => x.data === HOJE);
    expect(hoje.map((x) => x.minutos)).toEqual([90, 80]);
  });

  it("nunca menos de 30: dia com 20 livres fica sem meta; teto antigo de 10 vira 30", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 10 }], { ...TODO_DIA, seg: 20, ter: 30 });
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano, itens: topicos("mat", 5) });
    expect(slots.filter((x) => x.data === HOJE)).toEqual([]);
    expect(slots.filter((x) => x.data === "2026-09-29").map((x) => x.minutos)).toEqual([30]);
  });

  it("dia em múltiplo de 30 não tem meta quebrada; média 30 completa o dia dentro da faixa", () => {
    const { slots } = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens: itensEng });
    expect(blocos(slots)).toBe(true);
    const so30 = planoCom([{ materiaId: "filo", peso: 5, maxSessao: 30 }], { ...TODO_DIA, seg: 50 });
    expect(planejarHorizonte({ hojeIso: HOJE, plano: so30, itens: topicos("filo", 5) }).slots.filter((x) => x.data === HOJE).map((x) => x.minutos)).toEqual([50]); // faixa 30–60
  });

  it("qualquer horário: toda meta ≥ 30, no máximo uma quebrada por dia (a última) e o dia nunca estoura", () => {
    const horarios = [
      { seg: 100, ter: 140, qua: 170, qui: 50, sex: 20, sab: 215, dom: 95 },
      { seg: 45, ter: 75, qua: 130, qui: 185, sex: 250, sab: 35, dom: 65 },
    ];
    horarios.forEach((disp) => {
      const plano = { ...planoCom(eng.materias, disp), materias: [...eng.materias, { materiaId: "qui", peso: 5, maxSessao: 90 }] };
      const itens = [...itensEng, ...topicos("qui", 20)];
      const { slots, datas, capacidade } = planejarHorizonte({ hojeIso: HOJE, plano, itens });
      datas.forEach((d) => {
        const dia = slots.filter((x) => x.data === d);
        const quebradas = dia.filter((x) => x.minutos % 30);
        expect(dia.every((x) => x.minutos >= 30)).toBe(true);
        dia.forEach((x) => {
          const f = faixaDaMeta(plano.materias.find((m) => m.materiaId === x.materiaId).maxSessao);
          expect(x.minutos).toBeLessThanOrEqual(f.max);
          if (dia.length > 1 || capacidade[d] >= f.min) expect(x.minutos).toBeGreaterThanOrEqual(f.min); // só o dia curto fica abaixo
        });
        expect(quebradas.length).toBeLessThanOrEqual(1);
        if (quebradas.length) expect(dia.at(-1).minutos % 30).not.toBe(0);
        expect(soma(dia, (x) => x.minutos)).toBeLessThanOrEqual(capacidade[d]);
        if (capacidade[d] >= 30) expect(capacidade[d] - soma(dia, (x) => x.minutos)).toBeLessThan(30); // o dia fica completo (ou quase)
      });
    });
  });

  it("a meta não precisa casar com o tópico: segue do fim de um para o começo do próximo", () => {
    const plano = planoCom([{ materiaId: "mat", peso: 5, maxSessao: 60 }], { ...TODO_DIA, seg: 60 });
    const itens = [{ materiaId: "mat", topicoId: "a", itemId: "t:a", duracao: 40 }, ...topicos("mat", 3)];
    expect(planejarHorizonte({ hojeIso: HOJE, plano, itens }).slots.filter((x) => x.data === HOJE).map((x) => x.minutos)).toEqual([60]);
    const c = conteudoPlanejado([{ id: "m", categoria: "progressao", status: "pendente", materiaId: "mat", dataPlanejada: HOJE, duracaoPlanejada: 60 }], itens);
    expect(c.m.partes.map((p) => [p.topicoId, p.minutos])).toEqual([["a", 40], ["mat1", 20]]);
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
  const alvo = { alunoId: "ana", materiaId: "bio", topicoId: "cito", itemId: "t:cito", intervaloDias: 7, duracaoMin: 30, dataBase: "2026-09-21" };
  const rev = (extra = {}) => ({ id: "rv1", ...ativarRevisao({ ...alvo, ...extra }, { topicoConcluido: true, hojeIso: "2026-09-21", por: "mod" }).revisao });
  const criadas = (r) => r.criar.map((c) => c.dataPlanejada);
  const comoMetas = (r) => r.criar.map((c) => ({ ...c, status: "pendente", datasAnteriores: [] }));

  it("gera as ocorrências no intervalo certo, a partir da data-base", () => {
    const r = planejarRevisoes({ revisoes: [rev()], metas: [], hojeIso: HOJE });
    expect(criadas(r)).toEqual(["2026-09-28", "2026-10-05"]);
    expect(r.criar[0]).toMatchObject({ id: "rr_rv1_2026-09-28", categoria: "revisao_recorrente", itemId: "t:cito", duracaoPlanejada: 30, ocorrenciaEm: "2026-09-28" });
    // de novo, com as metas já criadas: nada muda (sem duplicar)
    expect(planejarRevisoes({ revisoes: [rev()], metas: comoMetas(r), hojeIso: HOJE })).toEqual({ criar: [], atualizar: [], apagar: [], dispensar: [] });
  });

  it("ciclo fixo: a atrasada fica pendente e a próxima cai na data do ciclo, sem deslocar", () => {
    const atrasada = { id: "rr_rv1_2026-09-21", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "pendente", dataPlanejada: "2026-09-21", duracaoPlanejada: 30, datasAnteriores: [] };
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
    const passada = { id: "rr_rv1_2026-09-21", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "concluida", concluidaEm: "2026-09-21", dataPlanejada: "2026-09-21", duracaoPlanejada: 30 };
    const antes = planejarRevisoes({ revisoes: [rev()], metas: [passada], hojeIso: HOJE });
    const metas = [passada, ...comoMetas(antes)];
    const editada = { id: "rv1", ...editarRevisao(rev(), { intervaloDias: 14, duracaoMin: 60 }, { hojeIso: HOJE, por: "mod" }).revisao };
    const r = planejarRevisoes({ revisoes: [editada], metas, hojeIso: HOJE });
    // 21/09 + 14 = 05/10: a de 28/09 sai, a de 05/10 fica com a duração nova
    expect(r.apagar).toEqual(["rr_rv1_2026-09-28"]);
    expect(r.atualizar).toEqual([{ id: "rr_rv1_2026-10-05", patch: { duracaoPlanejada: 60 } }]);
    expect(r.criar).toEqual([]);
    expect([...r.apagar, ...r.dispensar, ...r.atualizar.map((a) => a.id)]).not.toContain(passada.id);
  });

  it("desativar: as futuras saem, a atrasada por fazer é dispensada e as feitas ficam", () => {
    const atrasada = { id: "a", categoria: "revisao_recorrente", revisaoRecorrenteId: "rv1", ocorrenciaEm: "2026-09-21", status: "pendente", dataPlanejada: "2026-09-21", duracaoPlanejada: 30, datasAnteriores: [] };
    const futura = { ...atrasada, id: "f", ocorrenciaEm: "2026-10-05", dataPlanejada: "2026-10-05" };
    const off = { id: "rv1", ...desativarRevisao(rev(), { hojeIso: HOJE, por: "mod" }).revisao };
    expect(planejarRevisoes({ revisoes: [off], metas: [atrasada, futura], hojeIso: HOJE })).toEqual({ criar: [], atualizar: [], apagar: ["f"], dispensar: ["a"] });
  });

  it("várias revisões disputando o dia com a progressão: revisões primeiro, progressão com o que sobra, conflito à vista", () => {
    const revs = ["a", "b", "c"].map((x, i) => ({ id: `rv${x}`, ...ativarRevisao({ ...alvo, itemId: `t:${x}`, topicoId: x, dataBase: HOJE, intervaloDias: 2 + i, duracaoMin: 60 }, { topicoConcluido: true, hojeIso: HOJE, por: "mod" }).revisao }));
    const metas = comoMetas(planejarRevisoes({ revisoes: revs, metas: [], hojeIso: HOJE }));
    const h = planejarHorizonte({ hojeIso: HOJE, plano: eng, itens: itensEng, metas });
    // hoje: as 3 caem juntas (180 min > 120) → conflito, nada de progressão, nenhuma revisão cortada
    expect(metas.filter((m) => m.dataPlanejada === HOJE)).toHaveLength(3);
    expect(h.conflitos[0]).toEqual({ data: HOJE, minutosRevisoes: 180, minutosDia: 120 });
    expect(h.slots.filter((s) => s.data === HOJE)).toEqual([]);
    // dia com uma revisão só: a progressão fica com o resto
    h.datas.forEach((d) => {
      const rev = metas.filter((m) => m.dataPlanejada === d).reduce((x, m) => x + m.duracaoPlanejada, 0);
      const prog = h.slots.filter((s) => s.data === d).reduce((x, s) => x + s.minutos, 0);
      if (rev <= 120) expect(prog).toBeLessThanOrEqual(120 - rev);
      if (rev === 60) expect(prog).toBe(60);
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
