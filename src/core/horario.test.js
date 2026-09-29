import { describe, expect, it } from "vitest";
import { horarioEm, horariosDoPlano, minutosNoDia, novaVersaoHorario } from "./horario.js";

const SEMANA = { seg: 120, ter: 120, qua: 120, qui: 120, sex: 120, sab: 60, dom: 0 };
const antigo = { inicio: "2026-08-03", disponibilidade: SEMANA };

describe("horário semanal versionado", () => {
  it("plano antigo vale como uma versão só, desde o início, deduzida sem gravar", () => {
    expect(horariosDoPlano(antigo)).toEqual([{ desde: "2026-08-03", dias: SEMANA, deduzido: true }]);
    expect(minutosNoDia(antigo, "2026-09-28")).toBe(120); // segunda
    expect(minutosNoDia(antigo, "2026-08-01")).toBe(0); // antes do plano existir
  });

  it("nova rotina acrescenta uma versão; a anterior continua valendo para o passado", () => {
    const r = novaVersaoHorario(antigo, { ...SEMANA, seg: 30 }, { desde: "2026-09-28", hojeIso: "2026-09-28", por: "ana" });
    expect(r.ok).toBe(true);
    expect(r.horarios).toHaveLength(2);
    expect(r.horarios[0]).toEqual({ desde: "2026-08-03", dias: SEMANA }); // a antiga fica explícita e igual
    const plano = { ...antigo, horarios: r.horarios, disponibilidade: r.disponibilidade };
    expect(minutosNoDia(plano, "2026-09-21")).toBe(120); // segunda passada: como era
    expect(minutosNoDia(plano, "2026-09-28")).toBe(30);
    expect(r.disponibilidade.seg).toBe(30);
  });

  it("versão marcada para o futuro só vale a partir da data; em empate vale a gravada por último", () => {
    const r1 = novaVersaoHorario(antigo, { ...SEMANA, seg: 45 }, { desde: "2026-10-05", hojeIso: "2026-09-28" });
    expect(r1.disponibilidade.seg).toBe(120); // hoje ainda é a antiga
    const p1 = { ...antigo, horarios: r1.horarios };
    expect(minutosNoDia(p1, "2026-10-05")).toBe(45);
    const r2 = novaVersaoHorario(p1, { ...SEMANA, seg: 90 }, { desde: "2026-10-05", hojeIso: "2026-09-29" });
    expect(horarioEm({ horarios: r2.horarios }, "2026-10-05").dias.seg).toBe(90);
    expect(r2.horarios).toHaveLength(3); // nada foi apagado
  });

  it("não reescreve o passado nem aceita minutos inválidos", () => {
    expect(novaVersaoHorario(antigo, SEMANA, { desde: "2026-09-27", hojeIso: "2026-09-28" }).erros.desde).toMatch(/de hoje em diante/);
    expect(novaVersaoHorario(antigo, { ...SEMANA, ter: -5 }, { desde: "2026-09-28", hojeIso: "2026-09-28" }).erros.ter).toBeTruthy();
    expect(novaVersaoHorario(antigo, { ...SEMANA, qua: 30.5 }, { desde: "2026-09-28", hojeIso: "2026-09-28" }).ok).toBe(false);
  });
});
