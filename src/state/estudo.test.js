import { describe, expect, it } from "vitest";
import { DIAS } from "../core/nucleo.js";
import { dadosIniciais } from "./dados.js";
import {
  alternarMeta, aplicarReplanejamento, datasDaSemana, estudoInicial, listasDoDia,
  previaReplanejamento, resumoAluno, sequencia, virarSemana,
} from "./estudo.js";

const QUINTA = new Date(2026, 8, 24, 10); // quinta-feira, semana de 21/09
const DOMINGO = new Date(2026, 8, 27, 10);
const SEGUNDA_SEGUINTE = new Date(2026, 8, 28, 10);

function base(agora) {
  const db = dadosIniciais(agora);
  db.estudo.alu1 = estudoInicial(db, "alu1", agora);
  return db;
}

describe("primeiro acesso", () => {
  it("dias antes de hoje vêm cumpridos e hoje fica aberto", () => {
    const db = base(QUINTA);
    const est = db.estudo.alu1;
    ["seg", "ter", "qua"].forEach((k) => expect(est.semana[k].every((m) => m.done)).toBe(true));
    expect(est.semana.qui.every((m) => !m.done)).toBe(true);
    const { atrasadas, metasHoje } = listasDoDia(est, QUINTA);
    expect(atrasadas.map((m) => m.id)).toEqual(["atr-exemplo"]);
    expect(metasHoje.length).toBeGreaterThan(0);
  });

  it("sequência conta a semana cumprida mais o histórico, sem quebrar em hoje aberto", () => {
    const est = base(QUINTA).estudo.alu1;
    // seg, ter, qua cumpridos + 3 dias do histórico semeado (o 4º foi perdido)
    expect(sequencia(est, QUINTA)).toBe(6);
  });
});

describe("metas atrasadas da própria semana", () => {
  it("meta aberta de ontem aparece como atrasada e sai da lista ao concluir em outro dia", () => {
    const db = base(QUINTA);
    const est = db.estudo.alu1;
    const ontem = est.semana.qua[0];
    ontem.done = false;
    delete ontem.feitoEm;
    let { atrasadas } = listasDoDia(est, QUINTA);
    expect(atrasadas.some((m) => m.id === ontem.id && m.origem === "quarta")).toBe(true);

    alternarMeta(est, ontem.id, QUINTA);
    ({ atrasadas } = listasDoDia(est, QUINTA));
    expect(atrasadas.find((m) => m.id === ontem.id).done).toBe(true); // continua visível no dia em que foi feita
    ({ atrasadas } = listasDoDia(est, new Date(2026, 8, 25, 10)));
    expect(atrasadas.some((m) => m.id === ontem.id)).toBe(false);
  });

  it("quarta não cumprida quebra a sequência", () => {
    const est = base(QUINTA).estudo.alu1;
    est.semana.qua[0].done = false;
    expect(sequencia(est, QUINTA)).toBe(0);
  });
});

describe("replanejamento", () => {
  it("move pendências para hoje em diante; só o que não coube segue atrasado", () => {
    const db = base(QUINTA);
    const est = db.estudo.alu1;
    const previa = previaReplanejamento(db, "alu1", est, QUINTA);
    ["seg", "ter", "qua"].forEach((k) => expect(previa.semana[k].every((m) => m.done)).toBe(true));
    expect(previa.resumo.totalRealocado).toBeGreaterThan(0);

    aplicarReplanejamento(db, "alu1", previa, QUINTA);
    const { atrasadas } = listasDoDia(db.estudo.alu1, QUINTA);
    expect(atrasadas.every((m) => m.origem === "sem espaço na semana")).toBe(true);
    expect(atrasadas.reduce((s, m) => s + m.minutos, 0)).toBe(previa.resumo.minutosSemEspaco);
    expect(db.historicoReplan[0].alunoId).toBe("alu1");
    expect(db.historicoReplan[0].naoCouberam).toBeUndefined();
  });

  it("no domingo, só pendências disputam o dia e o excedente é guardado", () => {
    const db = base(DOMINGO);
    const est = db.estudo.alu1;
    const pendentes = new Set(["quimica", ...est.semana.dom.map((m) => m.materiaId)]);
    const previa = previaReplanejamento(db, "alu1", est, DOMINGO);
    const novas = previa.semana.dom.filter((m) => m.replanejada);
    expect(novas.some((m) => m.materiaId === "quimica")).toBe(true);
    expect(novas.every((m) => pendentes.has(m.materiaId))).toBe(true);
    const pendenteTotal = 60 + est.semana.dom.reduce((s, m) => s + m.minutos, 0);
    expect(previa.resumo.totalRealocado + previa.resumo.minutosSemEspaco).toBe(pendenteTotal);
  });
});

describe("virada de semana", () => {
  it("fecha a semana no histórico e leva o que ficou aberto", () => {
    const db = base(DOMINGO);
    const est = db.estudo.alu1;
    const abertasDomingo = est.semana.dom.filter((m) => !m.done).length;
    const nova = virarSemana(est, db, "alu1", SEGUNDA_SEGUINTE);
    const datas = datasDaSemana(est.chave);

    expect(nova.chave).toBe("2026-09-28");
    expect(nova.historico[datas.sab]).toBe(true);
    expect(nova.historico[datas.dom]).toBe(false);
    // pendência antiga + metas abertas de domingo
    expect(nova.atrasadasAnteriores.length).toBe(1 + abertasDomingo);
    expect(DIAS.flatMap((d) => nova.semana[d.k]).every((m) => !m.done)).toBe(true);
  });
});

describe("resumo do aluno", () => {
  it("usa o progresso real dos tópicos, ponderado pela carga", () => {
    const db = base(QUINTA);
    const r = resumoAluno(db, "alu1", db.estudo.alu1, QUINTA);
    expect(r.progresso).toBe(50);
    expect(r.proximaMeta).not.toBeNull();
    expect(r.metaQuestoes).toBeGreaterThan(0);
  });
});
