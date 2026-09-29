import { describe, expect, it } from "vitest";
import { estruturaInicial, indiceEstrutura } from "./estrutura.js";
import {
  alterarPlano, calcularAlocacao, calcularAtrasos, calcularProgressoPlano, conteudoDaVez,
  distribuirMinutos, estadoItem, impactoAlteracao, itensDoPlano, planoDoModelo, recalcularPlano,
  statusItem, sugerirModelo,
} from "./plano.js";

// estrutura base + um segundo tópico de Biologia para os testes de sequência
const base = estruturaInicial();
base.topicos.push({ id: "bi2", materiaId: "biologia", nome: "Genética", ordem: 1, cargaMin: 120 });
const ind = indiceEstrutura(base);
const HOJE = "2026-09-28"; // segunda-feira
const DISP = { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 0, dom: 0 };

function modeloBio() {
  return {
    id: "m1", nome: "FUVEST Medicina", vestibularId: "fuvest", cursoId: "medicina", versao: 2, ritmo: 1,
    revisao: { intervalos: [7, 30], duracaoMin: 20 },
    materias: [
      { materiaId: "biologia", minutosSemanais: 300, maxSessao: 60, prioridade: 1, ritmo: 1,
        topicos: [
          { topicoId: "bi1", subtopicos: ind.subtopicosDoTopico("bi1").map((s) => ({ subtopicoId: s.id })) },
          { topicoId: "bi2", subtopicos: [] },
        ] },
      { materiaId: "historia", minutosSemanais: 120, maxSessao: 60, prioridade: 2, ritmo: 1,
        topicos: [{ topicoId: "h2", subtopicos: [] }] },
    ],
  };
}
const aluno = { id: "alu9", vestibularId: "fuvest", cursoId: "medicina" };
const novoPlano = (m = modeloBio()) => planoDoModelo(m, aluno, { hojeIso: HOJE, disponibilidade: DISP });

describe("plano individual a partir do plano geral", () => {
  it("é uma cópia editável: mudar o plano do aluno não muda o modelo", () => {
    const modelo = modeloBio();
    const plano = novoPlano(modelo);
    const { plano: alterado } = alterarPlano(plano, ind, { tipo: "removerTopico", materiaId: "biologia", topicoId: "bi1" });
    expect(alterado.materias[0].topicos).toHaveLength(1);
    expect(modelo.materias[0].topicos).toHaveLength(2);
    expect(plano.modeloId).toBe("m1");
    expect(plano.modeloVersao).toBe(2);
  });

  it("um item por tópico, na ordem do plano; subtópicos vão junto como orientação", () => {
    const itens = itensDoPlano(novoPlano(), ind);
    expect(itens.map((i) => i.itemId)).toEqual(["t:bi1", "t:bi2", "t:h2"]);
    expect(itens[0].subtopicos).toEqual(ind.subtopicosDoTopico("bi1").map((s) => s.id));
    expect(itens[0].carga).toBe(240);
  });

  it("matéria oculta fica no plano, mas sai das metas e do cronograma", () => {
    const { plano: oculto } = alterarPlano(novoPlano(), ind, { tipo: "definirMateria", materiaId: "historia", campos: { ativa: false } });
    expect(oculto.materias.map((m) => m.materiaId)).toEqual(["biologia", "historia"]);
    expect(itensDoPlano(oculto, ind).some((i) => i.materiaId === "historia")).toBe(false);
  });

  it("o ritmo muda a duração efetiva dos conteúdos", () => {
    const normal = itensDoPlano(novoPlano(), ind);
    const acelerado = itensDoPlano({ ...novoPlano(), ritmo: 1.25 }, ind);
    expect(acelerado[0].duracao).toBe(Math.round(normal[0].carga / 1.25));
    expect(acelerado[0].duracao).toBeLessThan(normal[0].duracao);
  });

  it("sugere o plano geral pelo vestibular e curso", () => {
    const m = modeloBio();
    expect(sugerirModelo([{ id: "x", vestibularId: "fuvest" }, m], aluno).id).toBe("m1");
    expect(sugerirModelo([{ id: "x", vestibularId: "fuvest" }], { ...aluno, cursoId: "direito" }).id).toBe("x");
    expect(sugerirModelo([m], { vestibularId: "enem" })).toBeNull();
  });
});

describe("progresso e status dos itens", () => {
  const itens = itensDoPlano(novoPlano(), ind);
  const [a, b] = itens;

  it("tempo cumprido conclui; reabrir mantém aberto mesmo com o tempo", () => {
    expect(estadoItem(a, { [a.itemId]: { minutos: a.duracao } }).concluido).toBe(true);
    expect(estadoItem(a, { [a.itemId]: { minutos: a.duracao, concluido: false } }).concluido).toBe(false);
    expect(estadoItem(a, { [a.itemId]: { minutos: 5, concluido: true } }).concluido).toBe(true);
  });

  it("status: não iniciado, em andamento, atrasado e concluído", () => {
    const crono = { [a.itemId]: { inicio: "2026-09-20", fim: "2026-09-25" }, [b.itemId]: { inicio: "2026-09-29", fim: "2026-10-01" } };
    expect(statusItem(b, {}, crono, HOJE)).toBe("nao_iniciado");
    expect(statusItem(b, { [b.itemId]: { minutos: 10 } }, crono, HOJE)).toBe("em_andamento");
    expect(statusItem(a, {}, crono, HOJE)).toBe("atrasado");
    expect(statusItem(a, { [a.itemId]: { concluido: true } }, crono, HOJE)).toBe("concluido");
  });

  it("minutos de uma sessão preenchem os itens da matéria em ordem", () => {
    const partes = distribuirMinutos(itens, {}, "biologia", a.duracao + 10);
    expect(partes).toEqual([{ itemId: a.itemId, minutos: a.duracao }, { itemId: b.itemId, minutos: 10 }]);
  });

  it("conteúdo da vez pula o que está concluído", () => {
    const c = conteudoDaVez(itens, { [a.itemId]: { concluido: true } }, "biologia", ind);
    expect(c).toMatchObject({ itemId: b.itemId, topicoId: "bi2", subtopicoId: null });
  });
});

describe("alocação, cronograma e recálculo", () => {
  it("as horas livres são divididas pelo peso (sem peso: deduzido dos minutos por semana)", () => {
    const plano = novoPlano(); // biologia 300 min/sem → peso 10; história 120 → peso 4
    const itens = itensDoPlano(plano, ind);
    const cap = 600; // DISP: 120 × 5 dias
    const r = calcularAlocacao(plano, itens, {}, HOJE);
    expect(r.capacidade).toBe(cap);
    expect(r.alocacao).toEqual({ biologia: Math.floor((cap * 10) / 14 / 5) * 5, historia: Math.floor((cap * 4) / 14 / 5) * 5 });
    plano.materias[1].peso = 10;
    expect(calcularAlocacao(plano, itens, {}, HOJE).alocacao).toEqual({ biologia: 300, historia: 300 });
  });

  it("matéria sem nada a estudar não ocupa espaço; oculta também não", () => {
    const plano = novoPlano();
    const itens = itensDoPlano(plano, ind);
    const tudoFeito = Object.fromEntries(itens.filter((i) => i.materiaId === "historia").map((i) => [i.itemId, { minutos: i.duracao }]));
    expect(calcularAlocacao(plano, itens, tudoFeito, HOJE).alocacao).toEqual({ biologia: 600, historia: 0 });
    plano.materias[0].ativa = false;
    expect(calcularAlocacao(plano, itensDoPlano(plano, ind), {}, HOJE).alocacao).toEqual({ historia: 600 });
  });

  it("com data-alvo informa o que falta por semana e as matérias em risco", () => {
    const plano = { ...novoPlano(), dataAlvo: "2026-10-05", disponibilidade: { ...DISP, qua: 0, qui: 0, sex: 0 } }; // 240 min/sem
    const itens = itensDoPlano(plano, ind);
    const r = calcularAlocacao(plano, itens, {}, HOJE);
    expect(r.faltaSemanal).toBeGreaterThan(0);
    expect(r.emRisco).toEqual(expect.arrayContaining(["biologia", "historia"]));
  });

  it("projeta datas dentro dos dias disponíveis e recalcula sem apagar concluídos", () => {
    const plano = novoPlano();
    const itens = itensDoPlano(plano, ind);
    const { plano: p1, resumo } = recalcularPlano(plano, ind, {}, HOJE);
    expect(resumo.fimPrevisto).toBeTruthy();
    Object.values(p1.cronograma).forEach(({ inicio, fim }) => {
      expect(inicio >= HOJE).toBe(true);
      expect(fim >= inicio).toBe(true);
    });
    // conclui o primeiro e recalcula uma semana depois: ele guarda a data antiga
    const prog = { [itens[0].itemId]: { concluido: true, concluidoEm: "2026-09-29" } };
    const { plano: p2 } = recalcularPlano(p1, ind, prog, "2026-10-05");
    expect(p2.cronograma[itens[0].itemId]).toEqual(p1.cronograma[itens[0].itemId]);
    Object.entries(p2.cronograma).forEach(([id, d]) => { if (id !== itens[0].itemId) expect(d.inicio >= "2026-10-05").toBe(true); });
  });

  it("sem horas livres não há previsão (e não trava)", () => {
    const plano = { ...novoPlano(), disponibilidade: { seg: 0, ter: 0, qua: 0, qui: 0, sex: 0, sab: 0, dom: 0 } };
    expect(recalcularPlano(plano, ind, {}, HOJE).resumo.fimPrevisto).toBeNull();
  });
});

describe("atrasos e progresso do plano", () => {
  const plano = recalcularPlano(novoPlano(), ind, {}, HOJE).plano;
  const itens = itensDoPlano(plano, ind);
  const depois = "2026-11-30";

  it("conta itens atrasados, dias de atraso e carga acumulada", () => {
    const a = calcularAtrasos(itens, {}, plano.cronograma, depois);
    expect(a.quantidade).toBe(itens.length);
    expect(a.maxDias).toBeGreaterThan(0);
    expect(a.cargaMin).toBe(itens.reduce((s, i) => s + i.duracao, 0));
  });

  it("progresso ponderado pela duração", () => {
    const prog = { [itens[0].itemId]: { concluido: true } };
    const p = calcularProgressoPlano(itens, prog, plano.cronograma, HOJE);
    expect(p.concluidos).toBe(1);
    const total = itens.reduce((s, i) => s + i.duracao, 0);
    expect(p.pct).toBe(Math.round((itens[0].duracao / total) * 1000) / 10);
    expect(p.proximos.map((i) => i.itemId)).not.toContain(itens[0].itemId);
    const inicios = p.proximos.map((i) => plano.cronograma[i.itemId].inicio);
    expect(inicios).toEqual([...inicios].sort());
  });

});

describe("alterações individuais com histórico", () => {
  const plano = novoPlano();

  it("cada alteração gera registro com antes e depois", () => {
    const r = alterarPlano(plano, ind, { tipo: "definirPlano", campos: { ritmo: 1.25 } });
    expect(r.log).toEqual([{ tipo: "definirPlano", descricao: "Mudou ritmo", antes: "Normal", depois: "Acelerada" }]);
    const r2 = alterarPlano(plano, ind, { tipo: "moverMateria", materiaId: "historia", passo: -1 });
    expect(r2.plano.materias.map((m) => m.materiaId)).toEqual(["historia", "biologia"]);
    expect(r2.log[0].descricao).toMatch(/Antecipou História/);
  });

  it("adicionar matéria traz tópicos e subtópicos da estrutura; alteração sem efeito não registra", () => {
    const r = alterarPlano(plano, ind, { tipo: "adicionarMateria", materiaId: "quimica" });
    expect(r.plano.materias.at(-1).topicos[0].subtopicos.length).toBe(ind.subtopicosDoTopico("qu1").length);
    expect(alterarPlano(plano, ind, { tipo: "adicionarMateria", materiaId: "biologia" }).log).toEqual([]);
  });

  it("impacto: mostra quantos conteúdos mudam de data e preserva concluídos", () => {
    const base = recalcularPlano(plano, ind, {}, HOJE).plano;
    const itens = itensDoPlano(base, ind);
    const prog = { [itens[0].itemId]: { concluido: true } };
    const { plano: acelerado } = alterarPlano(base, ind, { tipo: "definirPlano", campos: { ritmo: 1.5 } });
    const imp = impactoAlteracao(base, acelerado, ind, prog, HOJE);
    expect(imp.concluidosPreservados).toBe(1);
    expect(imp.conteudosRemarcados).toBeGreaterThan(0);
    expect(imp.fimDepois <= imp.fimAntes).toBe(true);
    expect(imp.conteudosRetirados).toBe(0);
    const materia = base.materias[0].materiaId;
    const { plano: semMateria } = alterarPlano(base, ind, { tipo: "removerMateria", materiaId: materia });
    const imp2 = impactoAlteracao(base, semMateria, ind, prog, HOJE);
    const daMateria = itens.filter((it) => it.materiaId === materia);
    expect(imp2.conteudosRetirados).toBe(daMateria.filter((it) => !prog[it.itemId]).length);
    expect(imp2.conteudosIncluidos).toBe(0);
  });
});
