import { describe, expect, it } from "vitest";
import { estruturaInicial, indiceEstrutura } from "./estrutura.js";
import {
  acertoPorSemana, acertosDoRecorte, focosDeAtencao, mapaTempoAcerto, metaSemanal, opcoesDoRecorte,
  sugerirMetaQuestoes, taxaDeDominio, tempoFocado,
} from "./diagnostico.js";

const ind = indiceEstrutura(estruturaInicial());
const HOJE = "2026-09-30"; // quarta; a semana vai de 28/09 a 04/10

const Q = [
  { data: "2026-09-29", materiaId: "matematica", topicoId: "a1", total: 20, acertos: 16, erros: 4, minutos: 40 },
  { data: "2026-09-25", materiaId: "fisica", topicoId: "fi1", total: 10, acertos: 4, erros: 6, minutos: 15 },
  { data: "2026-09-20", materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-membrana", total: 10, acertos: 5, erros: 5 },
  { data: "2026-09-18", materiaId: "historia", topicoId: "h1", total: 10, acertos: 9, erros: 1, minutos: 20 },
  { data: "2026-09-10", materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-membrana", total: 4, acertos: 1, erros: 3 },
];
const S = [
  { data: "2026-09-29", minutos: 60, materiaId: "matematica" },
  { data: "2026-09-26", minutos: 45, materiaId: "historia" },
  { data: "2026-09-19", minutos: 30, materiaId: "linguagens" },
];

describe("pulso", () => {
  it("domínio: acerto do período e a variação dos últimos 7 dias contra os 7 anteriores", () => {
    const d = taxaDeDominio(Q, {}, HOJE);
    expect(d).toMatchObject({ total: 54, acertos: 35, pct: 64.8, semana: { total: 30, pct: 66.7 }, semanaAnterior: { total: 20, pct: 70 }, variacao: -3.3 });
    expect(taxaDeDominio(Q, { inicio: "2026-09-24", fim: HOJE }, HOJE).total).toBe(30);
    // sem questão em um dos lados não há variação
    expect(taxaDeDominio(Q.slice(0, 2), {}, HOJE).variacao).toBeNull();
  });

  it("acerto por semana (segunda a domingo), com buraco na semana vazia", () => {
    expect(acertoPorSemana(Q, HOJE, 5).map((s) => [s.semana, s.total, s.pct])).toEqual([
      ["2026-08-31", 0, null], ["2026-09-07", 4, 25], ["2026-09-14", 20, 70], ["2026-09-21", 10, 40], ["2026-09-28", 20, 80],
    ]);
  });

  it("meta semanal: o que foi feito na semana contra a meta; sem meta definida, a sugerida", () => {
    // últimas 4 semanas fechadas: 10 + 20 + 4 + 0 → média 8,5 (+10%) → mínimo de 20
    expect(sugerirMetaQuestoes(Q, HOJE)).toBe(20);
    expect(sugerirMetaQuestoes([], HOJE)).toBe(70);
    const muitas = [0, 1, 2, 3].map((k) => ({ data: `2026-09-${String(22 - 7 * k).padStart(2, "0")}`, total: 100, acertos: 50 }));
    expect(sugerirMetaQuestoes(muitas, HOJE)).toBe(110);
    expect(metaSemanal(Q, HOJE)).toMatchObject({ inicio: "2026-09-28", fim: "2026-10-04", feitas: 20, alvo: 20, definida: false, pct: 100, falta: 0, diasRestantes: 5 });
    expect(metaSemanal(Q, HOJE, 70)).toMatchObject({ alvo: 70, definida: true, pct: 29, falta: 50 });
  });

  it("tempo focado: sessões + tempo informado nas questões; semana e anterior", () => {
    expect(tempoFocado({ sessoes: S, questoes: Q }, {}, HOJE)).toEqual({
      minutos: 210, estudo: 135, questoes: 75, semana: 160, semanaAnterior: 50, mediaPorDia: null,
    });
    expect(tempoFocado({ sessoes: S, questoes: Q }, { inicio: "2026-09-24", fim: HOJE }, HOJE)).toMatchObject({ minutos: 160, mediaPorDia: 23 });
  });
});

describe("acertos e erros de um recorte", () => {
  const R = [
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-membrana", total: 10, acertos: 5, erros: 3 },
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-organelas", total: 10, acertos: 8, erros: 2 },
    { data: HOJE, materiaId: "fisica", topicoId: "fi1", total: 10, acertos: 4, erros: 6 },
  ];

  it("tudo: três fatias (em branco à parte) e a matéria com mais erros", () => {
    const r = acertosDoRecorte(R, {}, ind);
    expect(r).toMatchObject({ total: 30, acertos: 17, erros: 11, emBranco: 2, pct: 56.7, nivelAbaixo: "matéria" });
    expect(r.fatias.map((f) => [f.id, f.valor, f.pct])).toEqual([["acertos", 17, 56.7], ["erros", 11, 36.7], ["emBranco", 2, 6.7]]);
    expect(r.maisErros).toEqual({ id: "fisica", nome: "Física", erros: 6, total: 10 });
  });

  it("uma matéria aponta o tópico; um tópico aponta o subtópico", () => {
    expect(acertosDoRecorte(R, { materiaId: "biologia" }, ind)).toMatchObject({ total: 20, acertos: 13, erros: 5, emBranco: 2, maisErros: { id: "bi1" }, nivelAbaixo: "tópico" });
    expect(acertosDoRecorte(R, { materiaId: "biologia", topicoId: "bi1" }, ind).maisErros).toMatchObject({ nome: "Membrana", erros: 3 });
    expect(acertosDoRecorte(R, { materiaId: "quimica" }, ind)).toMatchObject({ total: 0, maisErros: null });
  });

  it("opções do seletor: só o que tem questões, do maior para o menor", () => {
    const o = opcoesDoRecorte(R, ind, "biologia");
    expect(o.materias.map((m) => [m.id, m.total])).toEqual([["biologia", 20], ["fisica", 10]]);
    expect(o.topicos.map((t) => t.id)).toEqual(["bi1"]);
    expect(opcoesDoRecorte(R, ind).topicos).toEqual([]);
  });
});

describe("mapa tempo × acerto", () => {
  const M = [
    { data: HOJE, materiaId: "matematica", topicoId: "a1", total: 20, acertos: 16, minutos: 30 },
    { data: HOJE, materiaId: "fisica", topicoId: "fi1", total: 10, acertos: 4, minutos: 15 },
    { data: HOJE, materiaId: "historia", topicoId: "h1", total: 10, acertos: 9, minutos: 20 },
    { data: HOJE, materiaId: "quimica", topicoId: "qu1", total: 10, acertos: 3, minutos: 30 },
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", total: 10, acertos: 5 },
  ];

  it("um ponto por matéria cronometrada, no quadrante em relação à média do próprio aluno", () => {
    const r = mapaTempoAcerto(M, {}, ind);
    expect(r.media).toEqual({ minPorQuestao: 1.9, acerto: 64 });
    expect(r.pontos.map((p) => [p.nome, p.minPorQuestao, p.acerto, p.quadrante])).toEqual([
      ["Física", 1.5, 40, "apressado"], ["História", 2, 90, "lento"], ["Matemática", 1.5, 80, "forte"], ["Química", 3, 30, "base"],
    ]);
    expect([r.registrosComTempo, r.registrosSemTempo]).toEqual([4, 1]);
  });

  it("uma matéria só: sem quadrante; nada cronometrado: sem pontos nem média", () => {
    expect(mapaTempoAcerto(M.slice(0, 1), {}, ind).pontos[0].quadrante).toBeNull();
    expect(mapaTempoAcerto(M.slice(4), {}, ind)).toMatchObject({ pontos: [], media: null, registrosSemTempo: 1 });
  });
});

describe("focos de atenção", () => {
  const F = [
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-membrana", total: 10, acertos: 4 },
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-membrana", total: 4, acertos: 1 },
    { data: HOJE, materiaId: "biologia", topicoId: "bi1", subtopicoId: "bi1-organelas", total: 4, acertos: 0 },
    { data: HOJE, materiaId: "quimica", topicoId: "qu1", total: 10, acertos: 6 },
    { data: HOJE, materiaId: "matematica", topicoId: "a1", total: 10, acertos: 9 },
    { data: HOJE, materiaId: "fisica", topicoId: "fi1", total: 5, acertos: 3 },
  ];

  it("menor acerto primeiro (subtópico quando há), com amostra mínima e abaixo de 70%", () => {
    const r = focosDeAtencao(F, {}, ind);
    expect(r.focos.map((f) => [f.chave, f.pct, f.total])).toEqual([["s:bi1-membrana", 35.7, 14], ["t:qu1", 60, 10], ["t:fi1", 60, 5]]);
    expect(r.focos[0]).toMatchObject({ nome: "Membrana", contexto: `Biologia · ${ind.nomeTopico("bi1")}` });
    expect(r.focos[1]).toMatchObject({ contexto: "Química" });
    expect(r.avaliados).toBe(4); // organelas tem só 4 questões
    expect(focosDeAtencao(F, {}, ind, { limite: 1 }).focos).toHaveLength(1);
  });

  it("tudo acima do limite: nenhum foco (bom sinal)", () => {
    expect(focosDeAtencao(F.slice(4, 5), {}, ind)).toEqual({ focos: [], avaliados: 1 });
  });
});
