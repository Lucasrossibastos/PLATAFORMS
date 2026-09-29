import { describe, expect, it } from "vitest";
import { AREA_DA_MATERIA, GRUPOS_ICONES, ICONES_AREA as IDS } from "../services/materiais.js";
import { ICONES_AREA } from "./Areas.jsx";

describe("ícones das áreas de materiais", () => {
  it("todo ícone do seletor tem desenho, nome e aparece uma vez só", () => {
    expect(IDS.length).toBeGreaterThanOrEqual(80);
    expect(new Set(IDS).size).toBe(IDS.length);
    IDS.forEach((id) => expect(ICONES_AREA[id], id).toBeTruthy());
    GRUPOS_ICONES.forEach((g) => g.icones.forEach(([id, nome]) => expect(nome, id).toBeTruthy()));
    expect(Object.keys(ICONES_AREA).sort()).toEqual([...IDS].sort()); // nenhum desenho sem id no seletor
  });

  it("os ícones sugeridos para as 9 matérias continuam no catálogo", () => {
    Object.values(AREA_DA_MATERIA).forEach(({ icone }) => expect(IDS).toContain(icone));
  });
});
