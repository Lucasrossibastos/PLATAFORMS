import { describe, expect, it } from "vitest";
import { estruturaInicial, indiceEstrutura } from "./estrutura.js";
import { alterarPlano, planoDoModelo } from "./plano.js";
import { jornadaEfetiva, limparSobrescrito, participacao, pesosDoPlano, registrarSobrescritos, sobrescritosDoPlano } from "./jornada.js";

const ind = indiceEstrutura(estruturaInicial());
const modelo = {
  id: "eng", nome: "FUVEST Engenharia", versao: 1,
  materias: [
    { materiaId: "matematica", minutosSemanais: 600, maxSessao: 60, prioridade: 1, ritmo: 1, topicos: [{ topicoId: "m1", subtopicos: [] }, { topicoId: "m2", subtopicos: [] }] },
    { materiaId: "fisica", minutosSemanais: 300, maxSessao: 60, prioridade: 1, ritmo: 1, topicos: [] },
    { materiaId: "filosofia", minutosSemanais: 30, maxSessao: 30, prioridade: 3, ritmo: 1, topicos: [] },
  ],
};
const plano = () => planoDoModelo(modelo, { id: "ana" }, { hojeIso: "2026-09-28" });

describe("peso relativo", () => {
  it("plano antigo: deduzido dos minutos por semana (a maior vale 10, mínimo 1)", () => {
    expect(pesosDoPlano(plano())).toEqual({ matematica: 10, fisica: 5, filosofia: 1 });
  });

  it("peso explícito vale; a participação soma 1 e ignora matéria oculta", () => {
    const p = plano();
    p.materias[1].peso = 8;
    p.materias[2].ativa = false;
    const f = participacao(p);
    expect(f.filosofia).toBeUndefined();
    expect(f.matematica).toBeCloseTo(10 / 18);
    expect(f.fisica).toBeCloseTo(8 / 18);
  });

  it("peso é gravável pelas alterações do plano (1 a 10), com log", () => {
    const r = alterarPlano(plano(), ind, { tipo: "definirMateria", materiaId: "filosofia", campos: { peso: 2 } });
    expect(r.plano.materias[2].peso).toBe(2);
    expect(r.log[0]).toMatchObject({ descricao: expect.stringMatching(/peso/), antes: null, depois: 2 });
    expect(() => alterarPlano(plano(), ind, { tipo: "definirMateria", materiaId: "filosofia", campos: { peso: 11 } })).toThrow(/1 a 10/);
  });
});

describe("herdado × sobrescrito", () => {
  it("plano antigo: deduzido comparando com a jornada (marcado como inferido)", () => {
    const p = plano();
    p.materias[0].prioridade = 2;
    p.materias[1].topicos = [{ topicoId: "f1", subtopicos: [] }];
    p.ordemTopicos = { matematica: ["m2", "m1"] };
    p.materias.push({ materiaId: "quimica", minutosSemanais: 60, topicos: [] });
    p.materias = p.materias.filter((m) => m.materiaId !== "filosofia");
    const { mapa, inferido } = sobrescritosDoPlano(p, modelo);
    expect(inferido).toBe(true);
    expect(mapa.matematica).toEqual({ prioridade: true, ordem: true });
    expect(mapa.fisica).toEqual({ topicos: true });
    expect(mapa.quimica).toEqual({ soNoAluno: true });
    expect(mapa.filosofia).toEqual({ removida: true });
  });

  it("mapa explícito: o que o moderador mudou só para o aluno; voltar ao padrão desmarca", () => {
    let s = registrarSobrescritos({}, { tipo: "definirMateria", materiaId: "matematica", campos: { peso: 10, prioridade: 1 } });
    s = registrarSobrescritos(s, { tipo: "removerTopico", materiaId: "fisica", topicoId: "f1" });
    expect(s).toEqual({ matematica: { peso: true, prioridade: true }, fisica: { topicos: true } });
    s = limparSobrescrito(s, "fisica", "topicos");
    expect(s).toEqual({ matematica: { peso: true, prioridade: true } });
  });

  it("jornada efetiva mostra valor, valor da jornada e a origem de cada campo", () => {
    const p = plano();
    p.materias[2].peso = 4;
    p.sobrescritos = { filosofia: { peso: true } };
    const j = jornadaEfetiva(p, modelo);
    expect(j.inferido).toBe(false);
    const filo = j.materias.find((m) => m.materiaId === "filosofia");
    expect(filo.campos.peso).toEqual({ valor: 4, daJornada: 1, origem: "sobrescrito" });
    expect(filo.campos.prioridade.origem).toBe("herdado");
    expect(j.materias.find((m) => m.materiaId === "matematica").campos.peso).toEqual({ valor: 10, daJornada: 10, origem: "herdado" });
  });
});
