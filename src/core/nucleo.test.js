import { describe, expect, it } from "vitest";
import { dataParaDiaSemana, hojeISO, isoLocal } from "./nucleo.js";

describe("datas locais (correção 4)", () => {
  it("hojeISO e isoLocal usam a data local, não UTC", () => {
    const d = new Date();
    const esperado = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
    expect(hojeISO()).toBe(esperado);
    expect(isoLocal(new Date(2026, 8, 27, 23, 30))).toBe("2026-09-27"); // domingo à noite continua domingo
  });

  it("dia da semana de uma data", () => {
    expect(dataParaDiaSemana("2026-09-28")).toBe("seg");
    expect(dataParaDiaSemana("2026-09-27")).toBe("dom");
  });
});
