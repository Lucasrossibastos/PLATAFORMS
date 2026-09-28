/* As ações de agendamento gravadas no banco (repositório em memória). */

import { beforeEach, describe, expect, it } from "vitest";
import { criarRepoMemoria } from "../dados/repoMemoria.js";
import { ESTADOS, cartaoNovo, normalizarNota } from "../dados/modelo.js";
import { AVALIACOES, criarAgendador } from "../motor/agendador.js";
import { adiar, definirData, desenterrarVencidos, desfazer, enterrar, resetar, responder, suspender } from "./agenda.js";

const [NOVAMENTE, , BOM, FACIL] = AVALIACOES.map((a) => a.valor);
const agora = new Date(2026, 8, 28, 10, 0);
const nota = normalizarNota({ tipo: "basico", materiaId: "m1", topicoId: "t1", campos: { frente: "a", verso: "b" }, tags: [] });
const ag = criarAgendador({}, { fuzz: false });

let repo;
async function criarCartao(id = "n1__1", pos = 1) {
  const dados = cartaoNovo({ nota, notaId: id.split("__")[0], ordinal: "1", agora, posicaoNovo: pos });
  await repo.lote([{ tipo: "definir", colecao: "cartoes", id, dados }]);
  return repo.obter("cartoes", id);
}

beforeEach(() => { repo = criarRepoMemoria({ uid: "ana" }); });

describe("responder e desfazer", () => {
  it("grava o cartão, a revisão e o resumo do dia num lote só", async () => {
    const c = await criarCartao();
    const { depois, revisao } = await responder(repo, { cartao: c, avaliacao: FACIL, agendador: ag, agora, duracaoMs: 4200 });
    const salvo = await repo.obter("cartoes", c.id);
    expect(salvo.fsrs.state).toBe(ESTADOS.revisao);
    expect(salvo).toMatchObject({ ordemNovo: null });
    expect(salvo.fila.getTime()).toBe(depois.fsrs.due.getTime());
    expect(await repo.obter("revisoes", revisao.id)).toMatchObject({ cartaoId: c.id, avaliacao: FACIL, estadoAntes: ESTADOS.novo, dia: "2026-09-28", duracaoMs: 4200 });
    expect((await repo.obter("dias", "2026-09-28")).revisoes[revisao.id]).toMatchObject({ avaliacao: FACIL, estadoAntes: ESTADOS.novo });
  });

  it("desfazer devolve o cartão exatamente como era e apaga a revisão", async () => {
    const c = await criarCartao();
    const r1 = await responder(repo, { cartao: c, avaliacao: BOM, agendador: ag, agora });
    const r2 = await responder(repo, { cartao: r1.depois, avaliacao: NOVAMENTE, agendador: ag, agora: new Date(agora.getTime() + 600000) });
    await desfazer(repo, r2.revisao);
    const volta = await repo.obter("cartoes", c.id);
    expect(volta.fsrs).toEqual(r1.depois.fsrs);
    expect(await repo.obter("revisoes", r2.revisao.id)).toBeNull();
    const dia = await repo.obter("dias", "2026-09-28");
    expect(Object.keys(dia.revisoes)).toEqual([r1.revisao.id]);
    await desfazer(repo, r1.revisao);
    const original = await repo.obter("cartoes", c.id);
    expect(original).toMatchObject({ ordemNovo: 1, fila: null });
    expect(original.fsrs.state).toBe(ESTADOS.novo);
  });
});

describe("controles manuais", () => {
  it("suspender tira das duas filas; reativar devolve", async () => {
    const c = await criarCartao();
    const [s] = await suspender(repo, [c], true, agora);
    expect(await repo.obter("cartoes", c.id)).toMatchObject({ suspenso: true, ordemNovo: null, fila: null });
    await suspender(repo, [s], false, agora);
    expect(await repo.obter("cartoes", c.id)).toMatchObject({ suspenso: false, ordemNovo: 1 });
  });

  it("enterrar some até a virada; desenterrar devolve depois dela", async () => {
    const c = await criarCartao();
    const { depois } = await responder(repo, { cartao: c, avaliacao: BOM, agendador: ag, agora });
    await enterrar(repo, [{ ...depois, id: c.id }], { agora });
    const enterrado = await repo.obter("cartoes", c.id);
    expect(enterrado.fila).toEqual(new Date(2026, 8, 29, 4));
    expect(await desenterrarVencidos(repo, new Date(2026, 8, 28, 23))).toEqual([]);
    const [volta] = await desenterrarVencidos(repo, new Date(2026, 8, 29, 5));
    expect(volta.enterradoAte).toBeNull();
    expect((await repo.obter("cartoes", c.id)).fila.getTime()).toBe(depois.fsrs.due.getTime());
  });

  it("definir data: estudado muda o vencimento; novo sai da fila até a data ou vai para a frente", async () => {
    const a = await criarCartao("a__1", 10);
    const b = await criarCartao("b__1", 20);
    const { depois } = await responder(repo, { cartao: a, avaliacao: FACIL, agendador: ag, agora });
    const data = new Date(2026, 9, 15, 4);
    await definirData(repo, [{ ...depois, id: a.id }], data, agora);
    expect((await repo.obter("cartoes", a.id)).fila).toEqual(data);
    await definirData(repo, [b], data, agora);
    expect(await repo.obter("cartoes", b.id)).toMatchObject({ ordemNovo: null, enterradoAte: data });
    await definirData(repo, [await repo.obter("cartoes", b.id)], agora, agora);
    const hoje = await repo.obter("cartoes", b.id);
    expect(hoje.enterradoAte).toBeNull();
    expect(hoje.ordemNovo).toBeLessThan(0); // à frente de todos os novos
  });

  it("adiar em lote conta a partir de quando cada um venceria", async () => {
    const c = await criarCartao();
    const { depois } = await responder(repo, { cartao: c, avaliacao: FACIL, agendador: ag, agora });
    const [adiado] = await adiar(repo, [{ ...depois, id: c.id }], 3, agora);
    expect(adiado.fsrs.due.getTime() - depois.fsrs.due.getTime()).toBe(3 * 86400000);
  });

  it("resetar volta a novo, no fim da fila, e guarda o histórico", async () => {
    const c = await criarCartao();
    const { depois, revisao } = await responder(repo, { cartao: c, avaliacao: FACIL, agendador: ag, agora });
    const [r] = await resetar(repo, [{ ...depois, id: c.id }], ag, agora);
    expect(r.fsrs.state).toBe(ESTADOS.novo);
    expect((await repo.obter("cartoes", c.id)).ordemNovo).toBe(agora.getTime() * 1000);
    expect(await repo.obter("revisoes", revisao.id)).not.toBeNull();
  });

  it("lotes grandes são divididos (limite de 500 operações do Firestore)", async () => {
    const tamanhos = [];
    const r = criarRepoMemoria({ uid: "ana", persistencia: { gravar: async (m) => { tamanhos.push(m.length); } } });
    const muitos = Array.from({ length: 900 }, (_, i) => ({ id: `n${i}__1`, ...cartaoNovo({ nota, notaId: `n${i}`, ordinal: "1", agora, posicaoNovo: i }) }));
    await r.lote(muitos.slice(0, 400).map((c) => ({ tipo: "definir", colecao: "cartoes", id: c.id, dados: c })));
    await r.lote(muitos.slice(400).map((c) => ({ tipo: "definir", colecao: "cartoes", id: c.id, dados: c })));
    tamanhos.length = 0;
    await suspender(r, muitos, true, agora);
    expect(tamanhos).toEqual([400, 400, 100]);
  });
});
