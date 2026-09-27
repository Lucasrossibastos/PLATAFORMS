import { describe, expect, it } from "vitest";
import { linhasDe, partesDe, preencher, primeiroNome, textoDe, textosIniciais } from "./textos.js";

describe("frases editáveis", () => {
  it("o padrão da página inicial é a frase pedida pelo cliente", () => {
    expect(textoDe(textosIniciais(), "inicial.titulo")).toBe("Bem-vindo à *elite*.");
  });

  it("aluno > geral > padrão, e campo vazio volta para o nível de cima", () => {
    const t = { geral: { "painel.semana.titulo": "Semana *focada*" }, porAluno: { alu1: { "painel.semana.titulo": "Bora, *Ana*" }, alu2: { "painel.semana.titulo": "" } } };
    expect(textoDe(t, "painel.semana.titulo", "alu1")).toBe("Bora, *Ana*");
    expect(textoDe(t, "painel.semana.titulo", "alu2")).toBe("Semana *focada*");
    expect(textoDe({ geral: {}, porAluno: {} }, "painel.semana.titulo", "alu1")).toBe("Sua *semana*");
  });

  it("marca o destaque e quebra linhas", () => {
    expect(partesDe("Bem-vindo à *elite*.")).toEqual([{ texto: "Bem-vindo à " }, { texto: "elite", destaque: true }, { texto: "." }]);
    expect(partesDe("sem destaque")).toEqual([{ texto: "sem destaque" }]);
    expect(linhasDe("linha um\n\n  linha dois ")).toEqual(["linha um", "linha dois"]);
  });

  it("troca as variáveis conhecidas e mantém as desconhecidas", () => {
    expect(preencher("{saudacao}, {nome}. {outra}", { saudacao: "Boa noite", nome: "Ana" })).toBe("Boa noite, Ana. {outra}");
  });

  it("primeiro nome sem ponto final (evita \"Prof..\")", () => {
    expect(primeiroNome("Prof. Moderador")).toBe("Prof");
    expect(primeiroNome("Ana Beatriz")).toBe("Ana");
  });
});
