import { beforeEach, describe, expect, it } from "vitest";
import { criarRepositorioLocal } from "../data/local.js";
import { semearDemonstracao, SENHA_DEMO } from "../data/semente.js";
import { ErroPermissao } from "../core/permissoes.js";
import { itensDoPlano, estadoItem } from "../core/plano.js";
import { filaDaMateria, progressoVisto } from "../core/ciclos.js";
import { conteudoPlanejado } from "../core/motorMetas.js";
import { pesosDoPlano } from "../core/jornada.js";
import { criarServicos } from "./index.js";
import { ErroValidacao } from "./base.js";
import { painelDoAluno, metricasAluno } from "./desempenho.js";

// segunda-feira, 28/09/2026, 10h (horário local)
let agora;
const relogio = () => agora;
const esperar = () => new Promise((r) => setTimeout(r, 0));

function memoria() {
  const m = new Map();
  return { getItem: (k) => (m.has(k) ? m.get(k) : null), setItem: (k, v) => m.set(k, String(v)), removeItem: (k) => m.delete(k) };
}

async function montar() {
  const repo = criarRepositorioLocal({ armazenamento: memoria(), arquivos: { salvar: async () => {} }, relogio });
  await semearDemonstracao(repo, { agora });
  const s = criarServicos(repo, { relogio });
  let usuario;
  s.auth.observar((u) => { usuario = u; });
  const entrar = async (email) => {
    await s.auth.entrar(email, SENHA_DEMO);
    await esperar();
    return usuario;
  };
  const uidDe = async (email) => (await repo.listar("usuarios", [["email", "==", email]]))[0].id;
  return { repo, s, entrar, uidDe };
}

const pdf = (nome = "prova.pdf", conteudo = "%PDF-1.4\n%fim") => new File([conteudo], nome, { type: "application/pdf" });

let t;
beforeEach(async () => {
  agora = new Date(2026, 8, 28, 10, 0);
  t = await montar();
});

describe("instalação de demonstração", () => {
  it("cria estrutura, planos gerais e planos individuais, sem histórico inventado", async () => {
    const { repo, uidDe } = t;
    const ana = await uidDe("aluno@curso.com");
    expect((await repo.listar("materias")).map((m) => m.nome)).toEqual(["Biologia", "Física", "Química", "Matemática", "Linguagens", "Filosofia", "Sociologia", "Geografia", "História"]);
    expect((await repo.listar("modelosPlano")).length).toBe(7);
    const plano = await repo.obter("planos", ana);
    expect(plano.modeloId).toBe("modelo-fuvest");
    expect(Object.keys(plano.cronograma).length).toBeGreaterThan(0);
    for (const c of ["questoes", "simulados", "sessoesEstudo", "devolutivas", "notificacoes", "playlists"]) {
      expect(await repo.listar(c)).toEqual([]);
    }
  });

  it("entra com e-mail e senha e carrega o perfil com o papel", async () => {
    const u = await t.entrar("aluno@curso.com");
    expect(u.role).toBe("aluno");
    expect(u.nome).toBe("Ana Beatriz");
    await expect(t.s.auth.entrar("aluno@curso.com", "errada")).rejects.toThrow(/não conferem/);
  });
});

describe("permissões reais nos serviços", () => {
  it("aluno não vê outro aluno nem o painel do moderador", async () => {
    const carlos = await t.uidDe("carlos@curso.com");
    await t.entrar("aluno@curso.com");
    expect(() => t.s.questoes.observar(carlos, () => {})).toThrow(ErroPermissao);
    expect(() => t.s.alunos.observarTodos(() => {})).toThrow(ErroPermissao);
    expect(() => t.s.planos.observarPlano(carlos, () => {})).toThrow(ErroPermissao);
    await expect(t.s.questoes.registrar(carlos, { data: "2026-09-28", materiaId: "biologia", topicoId: "bi1", total: 10, acertos: 5, erros: 5 })).rejects.toThrow(ErroPermissao);
  });

  it("aluno não altera plano geral nem o que só o moderador define", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await expect(t.s.planos.salvarModelo({ id: "modelo-fuvest", nome: "Hack" })).rejects.toThrow(ErroPermissao);
    await expect(t.s.planos.alterar(ana, { tipo: "definirMateria", materiaId: "biologia", campos: { peso: 9 } })).rejects.toThrow(ErroPermissao);
    await expect(t.s.planos.aplicarModelo(ana, "modelo-enem", { substituir: true })).rejects.toThrow(ErroPermissao);
  });

  it("o que o aluno pode no plano depende das permissões que o moderador deu", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { ritmo: 1.25 } });
    expect((await t.repo.obter("planos", ana)).ritmo).toBe(1.25);

    await t.entrar("moderador@curso.com");
    const plano = await t.repo.obter("planos", ana);
    await t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { permissoesAluno: { ...plano.permissoesAluno, ritmo: false, recalcular: false } } });

    await t.entrar("aluno@curso.com");
    await expect(t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { ritmo: 1 } })).rejects.toThrow(ErroPermissao);
    await expect(t.s.planos.recalcular(ana)).rejects.toThrow(ErroPermissao);
  });
});

describe("questões", () => {
  it("valida acertos + erros ≤ total, inteiros não negativos e data não futura", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    const base = { data: "2026-09-28", materiaId: "biologia", topicoId: "bi1", total: 10, acertos: 6, erros: 3 };
    await expect(t.s.questoes.registrar(ana, { ...base, erros: 5 })).rejects.toThrow(ErroValidacao);
    await expect(t.s.questoes.registrar(ana, { ...base, acertos: -1 })).rejects.toThrow(ErroValidacao);
    await expect(t.s.questoes.registrar(ana, { ...base, data: "2026-09-29" })).rejects.toThrow(ErroValidacao);
    await expect(t.s.questoes.registrar(ana, { ...base, topicoId: "q1" })).rejects.toThrow(ErroValidacao); // tópico de outra matéria
    const id = await t.s.questoes.registrar(ana, base);
    const r = await t.repo.obter("questoes", id);
    expect(r).toMatchObject({ alunoId: ana, total: 10, acertos: 6, erros: 3, subtopicoId: null });
  });

  it("aluno corrige só nas primeiras 24 h; toda correção vai para o histórico", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    const id = await t.s.questoes.registrar(ana, { data: "2026-09-28", materiaId: "biologia", topicoId: "bi1", total: 10, acertos: 6, erros: 3 });
    await t.s.questoes.corrigir(id, { acertos: 7 });
    let logs = await t.repo.listar("logs", [["entidadeId", "==", id]]);
    expect(logs[0]).toMatchObject({ papel: "aluno", antes: { acertos: 6 }, depois: { acertos: 7 } });

    agora = new Date(2026, 8, 29, 11, 0); // 25 h depois
    await expect(t.s.questoes.corrigir(id, { acertos: 8 })).rejects.toThrow(ErroPermissao);
    await expect(t.s.questoes.remover(id)).rejects.toThrow(ErroPermissao);

    await t.entrar("moderador@curso.com");
    await expect(t.s.questoes.corrigir(id, { acertos: 8 })).rejects.toThrow(ErroValidacao); // 8 + 3 > 10
    await t.s.questoes.corrigir(id, { acertos: 8, erros: 2 }, { motivo: "conferido com a folha" });
    logs = await t.repo.listar("logs", [["entidadeId", "==", id]]);
    expect(logs.find((l) => l.papel === "moderador")).toMatchObject({ motivo: "conferido com a folha", antes: { acertos: 7, erros: 3 }, depois: { acertos: 8, erros: 2 } });
  });
});

describe("simulados e materiais (PDF no armazenamento, metadados no banco)", () => {
  it("simulado com PDF opcional; arquivo que não é PDF é recusado", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    const dados = { vestibularId: "fuvest", nome: "1ª fase 2025", ano: 2025, data: "2026-09-27", total: 90, acertos: 60, erros: 30 };
    await expect(t.s.simulados.registrar(ana, dados, { arquivo: new File(["oi"], "foto.png", { type: "image/png" }) })).rejects.toThrow(ErroValidacao);
    await expect(t.s.simulados.registrar(ana, dados, { arquivo: pdf("falso.pdf", "não é pdf") })).rejects.toThrow(ErroValidacao);
    const id = await t.s.simulados.registrar(ana, dados, { arquivo: pdf() });
    const doc = await t.repo.obter("simulados", id);
    expect(doc.arquivo.ref).toMatch(/^mem:simulados\//);
    expect(JSON.stringify(doc)).not.toContain("%PDF");
    const semPdf = await t.s.simulados.registrar(ana, { ...dados, nome: "sem pdf" });
    expect((await t.repo.obter("simulados", semPdf)).arquivo).toBeNull();
  });

  it("material: só o moderador publica; aluno vê só os publicados", async () => {
    await t.entrar("aluno@curso.com");
    await expect(t.s.materiais.salvar({ titulo: "x", tipo: "resumo" }, { arquivo: pdf() })).rejects.toThrow(ErroPermissao);

    await t.entrar("moderador@curso.com");
    const estados = [];
    await expect(t.s.materiais.salvar({ titulo: "Sem arquivo", tipo: "resumo" })).rejects.toThrow(ErroValidacao);
    const id = await t.s.materiais.salvar({ titulo: "Citologia", tipo: "resumo", materiaId: "biologia", topicoId: "bi1", tags: "célula, membrana" }, { arquivo: pdf("citologia.pdf"), aoEstado: (e) => estados.push(e) });
    await t.s.materiais.salvar({ titulo: "Rascunho", tipo: "lista", publicado: false }, { arquivo: pdf() });
    expect(estados).toEqual(["validando", "enviando", "enviando", "enviando", "salvando", "pronto"]);
    expect((await t.repo.obter("materiais", id)).tags).toEqual(["célula", "membrana"]);

    await t.entrar("aluno@curso.com");
    let vistos;
    t.s.materiais.observar((l) => { vistos = l; });
    await esperar();
    expect(vistos.map((m) => m.titulo)).toEqual(["Citologia"]);
  });
});

describe("notificações", () => {
  it("envio para um grupo chega só a quem é do grupo; lida só pelo destinatário", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    const carlos = await t.uidDe("carlos@curso.com");
    await t.entrar("moderador@curso.com");
    const r = await t.s.notificacoes.enviar({ titulo: "Simulado", mensagem: "Sábado, 8h.", prioridade: "alta", destino: { tipo: "grupo", vestibularId: "fuvest" } });
    expect(r.destinatarios).toBe(1);
    const [n] = await t.repo.listar("notificacoes");
    expect(n).toMatchObject({ alunoId: ana, lidaEm: null, prioridade: "alta" });
    await expect(t.s.notificacoes.marcarLida(n.id)).rejects.toThrow(ErroPermissao);

    await t.entrar("carlos@curso.com");
    expect(() => t.s.notificacoes.observarDoAluno(ana, () => {})).toThrow(ErroPermissao);
    await expect(t.s.notificacoes.marcarLida(n.id)).rejects.toThrow(ErroPermissao);
    expect(carlos).toBeTruthy();

    await t.entrar("aluno@curso.com");
    expect(await t.s.notificacoes.marcarLida(n.id)).toBe(true);
    expect((await t.repo.obter("notificacoes", n.id)).lidaEm).toBeTruthy();
    expect(await t.s.notificacoes.marcarLida(n.id)).toBe(false); // uma vez só
  });
});

describe("metas diárias, sessões e progresso", () => {
  const metasDe = (alunoId) => t.repo.listar("metas", [["alunoId", "==", alunoId]]);
  const deHoje = async (alunoId, dia = "2026-09-28") => (await metasDe(alunoId)).filter((m) => m.dataPlanejada === dia && m.status === "pendente");

  it("duas semanas de metas; concluir cria sessão, soma progresso e grava a % vista; desfazer volta com registro", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const metas = await metasDe(ana);
    expect(new Set(metas.map((m) => m.dataPlanejada)).size).toBeGreaterThanOrEqual(12);
    expect(metas.every((m) => m.status === "pendente" && m.categoria === "progressao")).toBe(true);
    const [meta] = await deHoje(ana);

    const r = await t.s.metas.concluir(ana, meta.id);
    const sessao = await t.repo.obter("sessoesEstudo", r.sessaoId);
    expect(sessao).toMatchObject({ alunoId: ana, minutos: meta.duracaoPlanejada, materiaId: meta.materiaId, data: "2026-09-28", origem: "meta", metaId: meta.id });
    const feita = await t.repo.obter("metas", meta.id);
    expect(feita).toMatchObject({ status: "concluida", concluidaEm: "2026-09-28", duracaoReal: meta.duracaoPlanejada, sessaoId: r.sessaoId });
    expect(feita.partes[0]).toMatchObject({ pctAntes: 0, ciclo: 1 });
    expect(feita.partes[0].pctDepois).toBeGreaterThan(0);
    const prog = (await t.repo.obter("progresso", ana)).itens;
    expect(sessao.partes.reduce((x, p) => x + prog[p.itemId].minutos, 0)).toBe(meta.duracaoPlanejada);

    await t.s.metas.desfazer(ana, meta.id);
    expect(await t.repo.obter("sessoesEstudo", r.sessaoId)).toBeNull();
    expect(await t.repo.obter("metas", meta.id)).toMatchObject({ status: "pendente" });
    const prog2 = (await t.repo.obter("progresso", ana)).itens;
    expect(sessao.partes.every((p) => prog2[p.itemId].minutos === 0)).toBe(true);
    expect(await t.repo.listar("logs", [["alunoId", "==", ana], ["tipo", "==", "desfazerMeta"]])).toHaveLength(1);
  });

  it("toda execução do motor fica registrada, com quem, antes e depois", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    await t.s.metas.garantir(ana); // mesmo dia: não roda de novo
    const logs = await t.repo.listar("logs", [["alunoId", "==", ana], ["tipo", "==", "recalcularMetas"]]);
    expect(logs).toHaveLength(1);
    expect(logs[0]).toMatchObject({ papel: "aluno", antes: { metas: 0 }, depois: { mudancas: { criadas: expect.any(Number) } } });
    expect(logs[0].depois.metas).toBeGreaterThan(0);
  });

  it("depois de 24 h o aluno não desfaz a meta de ontem", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const [meta] = await deHoje(ana);
    await t.s.metas.concluir(ana, meta.id);
    agora = new Date(2026, 8, 29, 12, 0);
    await expect(t.s.metas.desfazer(ana, meta.id)).rejects.toThrow(ErroPermissao);
  });

  it("virada do dia: a meta não feita vai para a frente guardando o dia perdido; a concluída não muda", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const [feita, perdida] = await deHoje(ana);
    await t.s.metas.concluir(ana, feita.id);
    const antes = await t.repo.obter("metas", feita.id);
    agora = new Date(2026, 8, 29, 9, 0);
    await t.s.metas.garantir(ana);
    expect(await t.repo.obter("metas", feita.id)).toEqual(antes);
    const depois = await t.repo.obter("metas", perdida.id);
    expect(depois.datasAnteriores).toEqual(["2026-09-28"]);
    expect(depois.dataPlanejada >= "2026-09-29").toBe(true);
  });

  it("arrastar fixa a meta no dia; organizar de novo solta", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const [meta] = await deHoje(ana);
    await t.s.metas.mover(ana, meta.id, "2026-10-01");
    expect(await t.repo.obter("metas", meta.id)).toMatchObject({ dataPlanejada: "2026-10-01", fixada: true, datasAnteriores: [] });
    await expect(t.s.metas.mover(ana, meta.id, "2026-09-27")).rejects.toThrow(/hoje ou um dia à frente/);
    await t.s.metas.reorganizar(ana);
    expect((await t.repo.obter("metas", meta.id))?.fixada).not.toBe(true);
  });

  it("rever do zero reabre o tópico sem duplicar estado: ciclo novo no fim da fila, o anterior fica com a data", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    const plano = await t.repo.obter("planos", ana);
    const ind = await t.s.ctx.indice();
    const itens = itensDoPlano(plano, ind);
    const comDois = itens.find((it) => itens.filter((x) => x.materiaId === it.materiaId).length >= 2).materiaId;
    const [primeiro, segundo] = itens.filter((it) => it.materiaId === comDois);
    await t.s.planos.concluirItem(ana, primeiro.itemId);
    expect(await t.repo.listar("revisoes", [["alunoId", "==", ana]])).toEqual([]); // não cria mais revisões automáticas
    const pctAntes = progressoVisto(itens, (await t.repo.obter("progresso", ana)).itens).plano;

    await t.s.planos.reverDoZero(ana, primeiro.itemId);
    let prog = (await t.repo.obter("progresso", ana)).itens;
    expect(Object.keys(prog)).toEqual([primeiro.itemId]); // um registro por tópico, sem cópia
    expect(prog[primeiro.itemId].ciclos).toMatchObject([
      { n: 1, concluido: true, concluidoEm: "2026-09-28" },
      { n: 2, origem: "rever_do_zero", naFila: true, reabertoEm: "2026-09-28" },
    ]);
    expect(progressoVisto(itens, prog).plano).toBeLessThan(pctAntes); // volta a contar como não visto
    const materia = itens.filter((it) => it.materiaId === primeiro.materiaId);
    let fila = filaDaMateria(materia, prog);
    expect(fila.atual.itemId).toBe(segundo.itemId); // um só tópico atual por matéria; o revisto espera no fim
    expect(fila.fila.at(-1).itemId).toBe(primeiro.itemId);
    await expect(t.s.planos.reverDoZero(ana, primeiro.itemId)).rejects.toThrow(/já concluído/);
    const [log] = await t.repo.listar("logs", [["alunoId", "==", ana], ["tipo", "==", "reverDoZero"]]);
    expect(log).toMatchObject({ papel: "aluno", antes: { ciclo: 1 }, depois: { ciclo: 2, naFila: true } });

    // arrastado para a frente, vira o tópico atual e as metas da matéria passam a ser "rever do zero"
    const ordem = [primeiro.topicoId, ...materia.filter((it) => it !== primeiro).map((it) => it.topicoId)];
    await t.s.planos.ordenarTopicos(ana, primeiro.materiaId, ordem);
    prog = (await t.repo.obter("progresso", ana)).itens;
    fila = filaDaMateria(itensDoPlano(await t.repo.obter("planos", ana), ind).filter((it) => it.materiaId === primeiro.materiaId), prog);
    expect(fila.atual.itemId).toBe(primeiro.itemId);
    expect(fila.status[segundo.itemId]).toBe("nao_visto");
    const metas = await metasDe(ana);
    const conteudo = conteudoPlanejado(metas, itensDoPlano(await t.repo.obter("planos", ana), ind), prog);
    const daMateria = metas.filter((m) => m.materiaId === primeiro.materiaId && m.status === "pendente").sort((a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada));
    expect(conteudo[daMateria[0].id]).toMatchObject({ categoria: "rever_do_zero", partes: [{ itemId: primeiro.itemId, ciclo: 2 }] });
  });

  it("revisão recorrente: só o moderador ativa, só em tópico concluído, uma por tópico; vira meta no dia do ciclo", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    const ind = await t.s.ctx.indice();
    const item = itensDoPlano(await t.repo.obter("planos", ana), ind)[0];
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    await expect(t.s.revisoes.ativar(ana, item.itemId, { intervaloDias: 3, duracaoMin: 20 })).rejects.toThrow(ErroPermissao);
    await t.entrar("moderador@curso.com");
    await expect(t.s.revisoes.ativar(ana, item.itemId, { intervaloDias: 3, duracaoMin: 20 })).rejects.toThrow(/concluído/);
    await t.s.planos.concluirItem(ana, item.itemId);
    await t.s.revisoes.ativar(ana, item.itemId, { intervaloDias: 3, duracaoMin: 20, dataBase: "2026-09-29" });
    await expect(t.s.revisoes.ativar(ana, item.itemId, { intervaloDias: 5, duracaoMin: 20 })).rejects.toThrow(/Edite a existente/);
    const rev = (await metasDe(ana)).filter((m) => m.categoria === "revisao_recorrente").map((m) => m.dataPlanejada).sort();
    expect(rev).toEqual(["2026-09-29", "2026-10-02", "2026-10-05", "2026-10-08", "2026-10-11"]);

    await t.s.revisoes.editar(ana, item.itemId, { intervaloDias: 7 });
    const depois = (await metasDe(ana)).filter((m) => m.categoria === "revisao_recorrente").map((m) => m.dataPlanejada).sort();
    expect(depois).toEqual(["2026-09-29", "2026-10-06"]);
    await t.s.revisoes.desativar(ana, item.itemId);
    expect((await metasDe(ana)).filter((m) => m.categoria === "revisao_recorrente")).toEqual([]);
    expect((await t.repo.obter("revisoesRecorrentes", `${ana}__${item.itemId}`)).parametros).toHaveLength(2); // nada apagado
    const tipos = (await t.repo.listar("logs", [["alunoId", "==", ana]])).map((l) => l.tipo);
    expect(tipos).toEqual(expect.arrayContaining(["ativarRevisao", "editarRevisao", "desativarRevisao"]));
  });

  it("dados antigos: a semana do sistema velho vira resumo parcial (sem apagar nada) e o 'Ver de novo' antigo vira ciclo 2", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    const ind = await t.s.ctx.indice();
    const [item] = itensDoPlano(await t.repo.obter("planos", ana), ind);
    const semanaAntiga = {
      alunoId: ana, chave: "2026-09-28", pendentes: [], editada: false, geracao: 0,
      metas: { seg: [{ id: "x1", tipo: "ciclo", materiaId: item.materiaId, minutos: 50, done: true, feitoEm: "2026-09-28" }, { id: "x2", tipo: "ciclo", materiaId: item.materiaId, minutos: 30, done: false }], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] },
    };
    await t.repo.lote([
      { tipo: "definir", colecao: "semanas", id: ana, dados: semanaAntiga },
      { tipo: "mesclar", colecao: "progresso", id: ana, dados: { itens: { [item.itemId]: { minutos: item.duracao, concluido: false } } } },
    ]);
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    expect(await t.repo.obter("resumosSemana", `${ana}_2026-09-28`)).toMatchObject({ metas: 2, cumpridas: 1, naoCumpridas: 1, fonte: "semanas", parcial: true });
    expect((await t.repo.obter("semanas", ana)).metas.seg).toHaveLength(2); // o registro antigo continua lá
    const prog = (await t.repo.obter("progresso", ana)).itens;
    const fila = filaDaMateria(itensDoPlano(await t.repo.obter("planos", ana), ind).filter((it) => it.materiaId === item.materiaId), prog);
    expect(fila.estados.get(item.itemId)).toMatchObject({ ciclo: 2, pctVisto: 0, restante: item.duracao, vezesConcluido: 1 });
  });

  it("menos horas na semana: revisões não são cortadas; o dia fica em conflito, visível ao moderador", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    const ind = await t.s.ctx.indice();
    const itens = itensDoPlano(await t.repo.obter("planos", ana), ind).slice(0, 3);
    await t.entrar("moderador@curso.com");
    for (const it of itens) {
      await t.s.planos.concluirItem(ana, it.itemId);
      await t.s.revisoes.ativar(ana, it.itemId, { intervaloDias: 7, duracaoMin: 40, dataBase: "2026-09-30" });
    }
    await t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { disponibilidade: { seg: 60, ter: 60, qua: 60, qui: 60, sex: 60, sab: 0, dom: 0 } } });
    const agenda = await t.repo.obter("agendas", ana);
    expect(agenda.conflitos[0]).toEqual({ data: "2026-09-30", minutosRevisoes: 120, minutosDia: 60 });
    const doDia = (await metasDe(ana)).filter((m) => m.dataPlanejada === "2026-09-30");
    expect(doDia.map((m) => m.categoria)).toEqual(["revisao_recorrente", "revisao_recorrente", "revisao_recorrente"]);
    // a versão antiga do horário continua valendo para o passado
    expect((await t.repo.obter("planos", ana)).horarios).toHaveLength(2);
  });
});

describe("plano individual: alterações, histórico e recálculo", () => {
  it("alteração do moderador registra antes/depois e preserva o que já foi estudado", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const [meta] = (await t.repo.listar("metas", [["alunoId", "==", ana]])).filter((m) => m.dataPlanejada === "2026-09-28");
    const { sessaoId } = await t.s.metas.concluir(ana, meta.id);
    const feita = await t.repo.obter("metas", meta.id);
    const progAntes = (await t.repo.obter("progresso", ana)).itens;

    await t.entrar("moderador@curso.com");
    const novoPeso = pesosDoPlano(await t.repo.obter("planos", ana)).biologia === 10 ? 1 : 10;
    const previa = await t.s.planos.previa(ana, { tipo: "definirMateria", materiaId: "biologia", campos: { peso: novoPeso } });
    expect(previa.alteracoes[0]).toMatchObject({ depois: novoPeso });
    expect(previa.conteudosRemarcados).toBeGreaterThan(0);
    const r = await t.s.planos.alterar(ana, { tipo: "definirMateria", materiaId: "biologia", campos: { peso: novoPeso } }, { motivo: "reforço" });
    expect(r.mudou).toBe(true);

    expect(await t.repo.obter("sessoesEstudo", sessaoId)).toBeTruthy();
    expect((await t.repo.obter("progresso", ana)).itens).toEqual(progAntes);
    expect(await t.repo.obter("metas", meta.id)).toEqual(feita); // o motor nunca reescreve o passado
    expect((await t.repo.obter("planos", ana)).sobrescritos.biologia).toEqual({ peso: true }); // só para a Ana
    const [log] = await t.repo.listar("logs", [["alunoId", "==", ana], ["tipo", "==", "definirMateria"]]);
    expect(log).toMatchObject({ autorNome: "Prof. Moderador", papel: "moderador", depois: novoPeso, motivo: "reforço" });
  });

  it("não substitui o plano existente sem confirmação; com confirmação guarda o anterior", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    await expect(t.s.planos.aplicarModelo(ana, "modelo-enem")).rejects.toMatchObject({ codigo: "plano-existente" });
    await t.s.planos.aplicarModelo(ana, "modelo-enem", { substituir: true });
    expect((await t.repo.obter("planos", ana)).modeloId).toBe("modelo-enem");
    const anteriores = await t.repo.listar("planosAnteriores", [["alunoId", "==", ana]]);
    expect(anteriores[0].plano.modeloId).toBe("modelo-fuvest");
  });

  it("recalcular com data-alvo mantém o cronograma dos concluídos", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    const ind = await t.s.ctx.indice();
    const item = itensDoPlano(await t.repo.obter("planos", ana), ind)[0];
    await t.s.planos.concluirItem(ana, item.itemId);
    const antes = (await t.repo.obter("planos", ana)).cronograma[item.itemId];
    await t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { dataAlvo: "2027-06-30" } });
    const depois = await t.repo.obter("planos", ana);
    expect(depois.cronograma[item.itemId]).toEqual(antes);
    expect(depois.dataAlvo).toBe("2027-06-30");
  });
});

describe("desempenho calculado dos registros", () => {
  it("painel e métricas saem dos registros reais", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.questoes.registrar(ana, { data: "2026-09-28", materiaId: "biologia", topicoId: "bi1", total: 20, acertos: 15, erros: 5 });
    await t.s.questoes.registrar(ana, { data: "2026-09-27", materiaId: "quimica", topicoId: "qu1", total: 10, acertos: 4, erros: 5 });
    await t.s.simulados.registrar(ana, { vestibularId: "fuvest", nome: "1ª fase", data: "2026-09-26", total: 90, acertos: 54, erros: 36 });
    const [questoes, simulados, plano, progDoc] = await Promise.all([
      t.repo.listar("questoes"), t.repo.listar("simulados"), t.repo.obter("planos", ana), t.repo.obter("progresso", ana),
    ]);
    const ind = await t.s.ctx.indice();
    const p = painelDoAluno({ questoes, simulados, sessoes: [], plano, progresso: progDoc.itens, ind, hojeIso: "2026-09-28" });
    expect(p.questoes).toMatchObject({ total: 30, acertos: 19, erros: 10, emBranco: 1, pct: 63.3 });
    expect(p.simulados.porVestibular[0]).toMatchObject({ vestibularId: "fuvest", mediaPct: 60 });
    expect(p.ultimos30.diasEstudados).toBe(3);
    expect(p.porMateria.map((m) => m.id)).toEqual(["biologia", "quimica"]);
    const m = metricasAluno({ aluno: { id: ana }, plano, progresso: progDoc.itens, questoes, simulados, sessoes: [], ind, hojeIso: "2026-09-28" });
    expect(m).toMatchObject({ questoes30: 30, pct30: 63.3, diasEstudados30: 3, diasSemEstudar: 0, situacao: "em_dia" });
  });
});

describe("estrutura acadêmica", () => {
  it("ids gerados; arquivar tira da lista mas mantém o nome para o histórico", async () => {
    await t.entrar("moderador@curso.com");
    const id = await t.s.estrutura.salvar("topico", { nome: "Bioquímica", materiaId: "biologia", cargaMin: 120 });
    expect(id).toMatch(/^[A-Za-z0-9]{20}$/);
    await expect(t.s.estrutura.salvar("topico", { nome: "Sem matéria" })).rejects.toThrow(ErroValidacao);
    await t.s.estrutura.arquivar("topico", id);
    const ind = await t.s.ctx.indice();
    expect(ind.topicosDaMateria("biologia").some((x) => x.id === id)).toBe(false);
    expect(ind.nomeTopico(id)).toBe("Bioquímica");
  });
});

describe("jornadas práticas e edital por aluno", () => {
  it("jornada em um passo: 9 matérias, todos os tópicos, mesmo peso, sem horas por semana", async () => {
    await t.entrar("moderador@curso.com");
    const id = await t.s.planos.criarJornada({ vestibularId: "fuvest", cursoId: "medicina" });
    const m = await t.repo.obter("modelosPlano", id);
    expect(m.nome).toBe("FUVEST · Medicina");
    expect(m.materias).toHaveLength(9);
    expect(m.materias.every((x) => x.peso === 5 && x.maxSessao === 60 && x.minutosSemanais === undefined)).toBe(true);
    expect(m.materias.find((x) => x.materiaId === "geografia").topicos.map((x) => x.topicoId)).toEqual(["g1", "g2"]);
  });

  it("tópico novo na jornada entra na estrutura, na jornada e nos alunos dela, com log", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    const topicoId = await t.s.planos.novoTopico({ materiaId: "geografia", nome: "Geografia urbana", cargaMin: 90, modeloId: "modelo-fuvest", propagar: true });
    const sub = await t.s.planos.novoSubtopico({ materiaId: "geografia", topicoId, nome: "Metrópoles", modeloId: "modelo-fuvest", propagar: true });
    const modelo = await t.repo.obter("modelosPlano", "modelo-fuvest");
    const plano = await t.repo.obter("planos", ana);
    for (const p of [modelo, plano]) {
      const geo = p.materias.find((x) => x.materiaId === "geografia");
      expect(geo.topicos.at(-1)).toMatchObject({ topicoId, subtopicos: [{ subtopicoId: sub }] });
    }
    const carlos = await t.repo.obter("planos", await t.uidDe("carlos@curso.com"));
    expect(JSON.stringify(carlos)).not.toContain(topicoId); // outra jornada
    const logs = await t.repo.listar("logs", [["alunoId", "==", ana], ["tipo", "==", "adicionarTopico"]]);
    expect(logs[0]).toMatchObject({ motivo: "Incluído pela jornada", papel: "moderador" });
  });

  it("moderador oculta uma matéria do aluno: some das metas, fica no plano", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    await t.s.planos.alterar(ana, { tipo: "definirMateria", materiaId: "historia", campos: { ativa: false } });
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    const materias = new Set((await t.repo.listar("metas", [["alunoId", "==", ana]])).map((m) => m.materiaId));
    expect(materias.has("historia")).toBe(false);
    expect(materias.size).toBeGreaterThan(3);
    expect((await t.repo.obter("planos", ana)).materias.find((m) => m.materiaId === "historia").ativa).toBe(false);
  });

  it("levar a mudança da jornada aos alunos mantém o ajuste individual de cada um", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    // Ana ganhou um ajuste próprio em Biologia; História segue igual à jornada
    await t.s.planos.alterar(ana, { tipo: "definirMateria", materiaId: "biologia", campos: { peso: 3 } });
    const r = await t.s.planos.alterarJornada("modelo-fuvest", [
      { tipo: "definirMateria", materiaId: "biologia", campos: { peso: 8 } },
      { tipo: "definirMateria", materiaId: "historia", campos: { peso: 2, maxSessao: 45, ativa: false } },
      { tipo: "moverTopico", materiaId: "geografia", topicoId: "g2", passo: -1 },
    ], { propagar: true });
    expect(r).toMatchObject({ mudou: true, alunos: 1 });
    const modelo = await t.repo.obter("modelosPlano", "modelo-fuvest");
    const plano = await t.repo.obter("planos", ana);
    const m = (p, id) => p.materias.find((x) => x.materiaId === id);
    expect(m(modelo, "biologia").peso).toBe(8);
    expect(m(plano, "biologia").peso).toBe(3); // ajuste da Ana fica
    expect(m(plano, "historia")).toMatchObject({ peso: 2, maxSessao: 45, ativa: false });
    expect(m(modelo, "geografia").topicos[0].topicoId).toBe("g2");
    expect(m(plano, "geografia").topicos[0].topicoId).toBe("g1"); // ordem fica só na jornada
    const logs = await t.repo.listar("logs", [["alunoId", "==", ana], ["motivo", "==", "Levado pela jornada"]]);
    expect(logs.length).toBeGreaterThan(0);
  });

  it("sem levar aos alunos, a jornada muda sozinha", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    const antes = await t.repo.obter("planos", ana);
    const r = await t.s.planos.alterarJornada("modelo-fuvest", { tipo: "definirMateria", materiaId: "fisica", campos: { prioridade: 1 } });
    expect(r).toEqual({ mudou: true, alunos: 0 });
    expect((await t.repo.obter("planos", ana)).materias).toEqual(antes.materias);
  });

  it("devolutiva com textos anexados: PDF ou imagem; o resto é recusado", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    const anexo = await t.s.redacao.enviarAnexo(ana, pdf("proposta.pdf"));
    expect(anexo).toMatchObject({ nome: "proposta.pdf", tipo: "application/pdf" });
    await expect(t.s.redacao.enviarAnexo(ana, new File(["x"], "nota.txt", { type: "text/plain" }))).rejects.toThrow(ErroValidacao);
    await expect(t.s.redacao.enviarAnexo(ana, pdf("falso.pdf", "nada"))).rejects.toThrow(ErroValidacao);
    const id = await t.s.redacao.salvar({ alunoId: ana, tema: "Tema", status: "enviada", enviadaEm: "2026-09-28", anexos: [anexo] });
    await t.entrar("aluno@curso.com");
    let minhas;
    t.s.redacao.observar(ana, (l) => { minhas = l; });
    await esperar();
    expect(minhas.find((d) => d.id === id).anexos[0].nome).toBe("proposta.pdf");
    await t.entrar("aluno@curso.com");
    await expect(t.s.redacao.enviarAnexo(ana, pdf())).rejects.toThrow(ErroPermissao);
  });

  it("aluno muda a ordem dos tópicos sem tocar nas matérias do edital", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    const antes = await t.repo.obter("planos", ana);
    await t.s.planos.alterar(ana, { tipo: "moverTopico", materiaId: "geografia", topicoId: "g2", passo: -1 });
    const depois = await t.repo.obter("planos", ana);
    expect(depois.materias).toEqual(antes.materias);
    expect(depois.ordemTopicos.geografia).toEqual(["g2", "g1"]);
    const ind = await t.s.ctx.indice();
    expect(itensDoPlano(depois, ind).filter((it) => it.materiaId === "geografia").map((it) => it.topicoId)).toEqual(["g2", "g1"]);
    await expect(t.s.planos.alterar(ana, { tipo: "moverMateria", materiaId: "historia", passo: -1 })).rejects.toThrow(ErroPermissao);
    await expect(t.s.planos.alterar(ana, { tipo: "definirMateria", materiaId: "historia", campos: { ativa: false } })).rejects.toThrow(ErroPermissao);
  });

  it("aluno ajusta a duração das metas e o tempo de um tópico; as metas se refazem com esses tempos", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.metas.garantir(ana);
    await t.s.planos.alterar(ana, { tipo: "definirDuracaoMeta", materiaId: "matematica", minutos: 25 });
    const mat = (await t.repo.listar("metas", [["alunoId", "==", ana]])).filter((m) => m.materiaId === "matematica" && m.status === "pendente");
    expect(mat.length).toBeGreaterThan(0);
    expect(mat.every((m) => m.duracaoPlanejada <= 25)).toBe(true);
    await t.s.planos.alterar(ana, { tipo: "definirTempoTopico", materiaId: "matematica", topicoId: "a1", minutos: 333 });
    const plano = await t.repo.obter("planos", ana);
    expect(plano).toMatchObject({ duracaoMeta: { matematica: 25 }, tempoTopico: { a1: 333 } });
    expect(plano.materias.find((m) => m.materiaId === "matematica").maxSessao).not.toBe(25); // a cópia da jornada fica
    expect(itensDoPlano(plano, await t.s.ctx.indice()).find((it) => it.topicoId === "a1").duracao).toBe(333);
    // o moderador pode tirar essa liberdade
    await t.entrar("moderador@curso.com");
    await t.s.planos.alterar(ana, { tipo: "definirPlano", campos: { permissoesAluno: { ...plano.permissoesAluno, tempos: false } } });
    await t.entrar("aluno@curso.com");
    await expect(t.s.planos.alterar(ana, { tipo: "definirDuracaoMeta", materiaId: "matematica", minutos: 40 })).rejects.toThrow(ErroPermissao);
  });

  it("aluno marca subtópico como visto (se pode concluir conteúdos)", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("aluno@curso.com");
    await t.s.planos.marcarSubtopico(ana, "g2-tecnicas-e-cultivo", true);
    expect((await t.repo.obter("vistos", ana)).subtopicos).toEqual({ "g2-tecnicas-e-cultivo": true });
    await t.s.planos.marcarSubtopico(ana, "g2-tecnicas-e-cultivo", false);
    expect((await t.repo.obter("vistos", ana)).subtopicos).toEqual({});
    const carlos = await t.uidDe("carlos@curso.com");
    await expect(t.s.planos.marcarSubtopico(carlos, "g2-tecnicas-e-cultivo", true)).rejects.toThrow(ErroPermissao);
  });
});

describe("áreas de materiais e provas para simulado", () => {
  const imagem = () => new File([new Uint8Array([255, 216, 255, 224, 0, 16])], "capa.jpg", { type: "image/jpeg" });

  it("cria as áreas das matérias de uma vez; material entra na área; apagar a área não apaga o material", async () => {
    await t.entrar("moderador@curso.com");
    const antigo = await t.s.materiais.salvar({ titulo: "Resumo de Citologia", materiaId: "biologia" }, { arquivo: pdf("citologia.pdf") });
    const semMateria = await t.s.materiais.salvar({ titulo: "Cronograma geral" }, { arquivo: pdf("geral.pdf") });
    expect(await t.s.materiais.criarAreasDasMaterias()).toBe(9);
    expect(await t.s.materiais.criarAreasDasMaterias()).toBe(0); // não duplica
    const areas = await t.repo.listar("areasMateriais");
    const fisica = areas.find((a) => a.materiaId === "fisica");
    expect(fisica).toMatchObject({ nome: "Física", rotulo: "Listas de", icone: "atomo", cor: "#EF4444" });
    // o material que já existia foi para a área da matéria dele; o sem matéria fica em "Outros"
    expect((await t.repo.obter("materiais", antigo)).areaId).toBe(areas.find((a) => a.materiaId === "biologia").id);
    expect((await t.repo.obter("materiais", semMateria)).areaId).toBeNull();
    const id = await t.s.materiais.salvar({ titulo: "Eletrostática", materiaId: "fisica", areaId: fisica.id, questoes: 72, tipo: "lista" }, { arquivo: pdf("eletro.pdf") });
    expect(await t.repo.obter("materiais", id)).toMatchObject({ areaId: fisica.id, questoes: 72 });
    await expect(t.s.materiais.salvar({ titulo: "X", areaId: "nao-existe" }, { arquivo: pdf() })).rejects.toThrow(ErroValidacao);
    await expect(t.s.materiais.salvar({ titulo: "X", questoes: 0 }, { arquivo: pdf() })).rejects.toThrow(ErroValidacao);
    await t.s.materiais.removerArea(fisica.id);
    expect(await t.repo.obter("materiais", id)).toMatchObject({ titulo: "Eletrostática", areaId: null });
    await t.entrar("aluno@curso.com");
    await expect(t.s.materiais.salvarArea({ nome: "Minha" })).rejects.toThrow(ErroPermissao);
  });

  it("prova com PDF e capa; o aluno vê só publicadas; o simulado registrado guarda a prova", async () => {
    const ana = await t.uidDe("aluno@curso.com");
    await t.entrar("moderador@curso.com");
    await expect(t.s.provas.salvar({ titulo: "ENEM 2018 · Dia 2 · Prova verde" })).rejects.toThrow(ErroValidacao); // sem PDF
    await expect(t.s.provas.salvar({ titulo: "X" }, { arquivo: pdf(), capa: new File(["x"], "c.txt", { type: "text/plain" }) })).rejects.toThrow(ErroValidacao);
    const id = await t.s.provas.salvar({ titulo: "ENEM 2018 · Dia 2 · Prova verde", vestibularId: "enem", ano: 2018 }, { arquivo: pdf("enem-2018-d2.pdf"), capa: imagem() });
    await t.s.provas.salvar({ titulo: "Rascunho", publicado: false }, { arquivo: pdf() });
    const prova = await t.repo.obter("provas", id);
    expect(prova).toMatchObject({ vestibularId: "enem", ano: 2018, publicado: true, arquivo: { nome: "enem-2018-d2.pdf" } });
    expect(prova.capa.ref).toBeTruthy();
    await t.entrar("aluno@curso.com");
    let vistas;
    t.s.provas.observar((l) => { vistas = l; });
    await esperar();
    expect(vistas.map((p) => p.titulo)).toEqual(["ENEM 2018 · Dia 2 · Prova verde"]);
    await expect(t.s.provas.remover(id)).rejects.toThrow(ErroPermissao);
    const sim = await t.s.simulados.registrar(ana, { vestibularId: "enem", nome: prova.titulo, ano: 2018, data: "2026-09-27", total: 90, acertos: 54, erros: 36, provaId: id });
    expect((await t.repo.obter("simulados", sim)).provaId).toBe(id);
  });
});

