/* Fluxo completo pelos serviços, com o adaptador Firebase nos emuladores
   (Auth, Firestore com firestore.rules, Storage com storage.rules). */

import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { criarRepositorioFirebase } from "./firebase.js";
import { modelosIniciais } from "./semente.js";
import { criarServicos } from "../services/index.js";
import { ErroPermissao } from "../core/permissoes.js";
import { itensDoPlano } from "../core/plano.js";

const PROJETO = "demo-aprova";
const HOST = "127.0.0.1";

async function limparEmuladores() {
  await fetch(`http://${HOST}:8080/emulator/v1/projects/${PROJETO}/databases/(default)/documents`, { method: "DELETE" });
  await fetch(`http://${HOST}:9099/emulator/v1/projects/${PROJETO}/accounts`, { method: "DELETE" });
}

async function aguardar(cond, ms = 10000) {
  const fim = Date.now() + ms;
  while (!cond()) {
    if (Date.now() > fim) throw new Error("tempo esgotado esperando condição");
    await new Promise((r) => setTimeout(r, 25));
  }
}

let repo, s, usuario;
const ids = {};

beforeAll(async () => {
  await limparEmuladores();
  repo = criarRepositorioFirebase({
    apiKey: "demo-chave", authDomain: `${PROJETO}.firebaseapp.com`, projectId: PROJETO,
    storageBucket: `${PROJETO}.appspot.com`, appId: "demo-app", emuladores: HOST,
  });
  s = criarServicos(repo);
  s.auth.observar((u) => { usuario = u; });
  await aguardar(() => usuario !== undefined);
});

afterAll(async () => {
  await repo?.sair().catch(() => {});
  await repo?.encerrar();
});

const entrarComo = async (email) => {
  await s.auth.entrar(email, "segredo1");
  await aguardar(() => usuario?.email === email);
};

describe("Firebase (emuladores): fluxo moderador → aluno", () => {
  it("instala o primeiro moderador (uma vez só)", async () => {
    expect(await s.auth.precisaInstalar()).toBe(true);
    await s.auth.instalar({ nome: "Prof. Teste", email: "mod@teste.com", senha: "segredo1" });
    await aguardar(() => usuario?.role === "moderador");
    expect(await s.auth.precisaInstalar()).toBe(false);
    await expect(s.auth.instalar({ nome: "Outro", email: "outro@teste.com", senha: "segredo1" })).rejects.toThrow(/já tem um moderador/);
  });

  it("moderador monta estrutura, plano geral, aluno, plano individual, material e aviso", async () => {
    expect(await s.estrutura.importarInicial()).toBe(true);
    const ind = await s.ctx.indice();
    expect(ind.materia("biologia").nome).toBe("Biologia");

    const { id: _i, ...modelo } = modelosIniciais(ind).find((m) => m.vestibularId === "fuvest");
    ids.modelo = await s.planos.salvarModelo(modelo);

    ids.ana = await s.alunos.criar({ nome: "Ana Teste", email: "ana@teste.com", senha: "segredo1", vestibularId: "fuvest", cursoId: "medicina" });
    ids.bia = await s.alunos.criar({ nome: "Bia Teste", email: "bia@teste.com", senha: "segredo1", vestibularId: "unicamp" });
    expect(usuario.role).toBe("moderador"); // criar aluno não troca a sessão

    const resumo = await s.planos.aplicarModelo(ids.ana, ids.modelo);
    expect(resumo.capacidade).toBeGreaterThan(0);
    await expect(s.planos.aplicarModelo(ids.ana, ids.modelo)).rejects.toMatchObject({ codigo: "plano-existente" });

    const pdf = new File(["%PDF-1.4\n% teste"], "citologia.pdf", { type: "application/pdf" });
    ids.material = await s.materiais.salvar({ titulo: "Citologia", tipo: "resumo", materiaId: "biologia" }, { arquivo: pdf });
    const envio = await s.notificacoes.enviar({ titulo: "Bem-vinda", mensagem: "Seu plano está pronto.", destino: { tipo: "grupo", vestibularId: "fuvest" } });
    expect(envio.destinatarios).toBe(1);
  });

  it("aluna estuda: metas, concluir, desfazer, rever do zero, questões, aviso lido, material", async () => {
    await s.auth.sair();
    await entrarComo("ana@teste.com");
    expect(usuario.role).toBe("aluno");

    await s.metas.garantir(ids.ana);
    const hojeIso = s.ctx.hoje();
    const metas = await repo.listar("metas", [["alunoId", "==", ids.ana]]);
    const meta = metas.find((m) => m.dataPlanejada === hojeIso && m.status === "pendente");
    const feita = await s.metas.concluir(ids.ana, meta.id);
    const prog = (await repo.obter("progresso", ids.ana)).itens;
    const sessao = await repo.obter("sessoesEstudo", feita.sessaoId);
    expect(sessao.partes.reduce((t, p) => t + prog[p.itemId].minutos, 0)).toBe(meta.duracaoPlanejada);
    expect(sessao.criadoEm).toMatch(/^\d{4}-\d{2}-\d{2}T/); // carimbo do servidor lido como texto
    expect((await repo.obter("metas", meta.id)).status).toBe("concluida");

    await s.metas.desfazer(ids.ana, meta.id); // dentro de 24 h, com log
    expect(await repo.obter("sessoesEstudo", feita.sessaoId)).toBeNull();
    expect((await repo.obter("metas", meta.id)).status).toBe("pendente");
    const logs = await repo.listar("logs", [["alunoId", "==", ids.ana]]);
    expect(logs.some((l) => l.id === `rm_${feita.sessaoId}`)).toBe(true);

    // meta concluída não se apaga nem se reescreve sem registro
    const outra = await s.metas.concluir(ids.ana, meta.id);
    await expect(repo.remover("metas", meta.id)).rejects.toMatchObject({ codigo: "permissao" });
    await expect(repo.atualizar("metas", meta.id, { duracaoReal: 500 })).rejects.toMatchObject({ codigo: "permissao" });
    expect(outra.sessaoId).toBeTruthy();

    // marcar como visto e rever do zero: ciclos com registro, sem apagar a conclusão
    const ind = await s.ctx.indice();
    const item = itensDoPlano(await repo.obter("planos", ids.ana), ind).find((it) => it.materiaId === "matematica");
    await s.planos.concluirItem(ids.ana, item.itemId);
    await s.planos.reverDoZero(ids.ana, item.itemId);
    const ciclos = (await repo.obter("progresso", ids.ana)).itens[item.itemId].ciclos;
    expect(ciclos.map((c) => [c.n, !!c.concluido])).toEqual([[1, true], [2, false]]);

    const hoje = s.ctx.hoje();
    const q = await s.questoes.registrar(ids.ana, { data: hoje, materiaId: "biologia", topicoId: "bi1", total: 20, acertos: 12, erros: 6 });
    await s.questoes.corrigir(q, { acertos: 13, erros: 5 });
    expect((await repo.obter("questoes", q)).acertos).toBe(13);

    await s.planos.alterar(ids.ana, { tipo: "definirPlano", campos: { ritmo: 1.25 } });
    expect((await repo.obter("planos", ids.ana)).ritmo).toBe(1.25);

    const [aviso] = await repo.listar("notificacoes", [["alunoId", "==", ids.ana]]);
    expect(await s.notificacoes.marcarLida(aviso.id)).toBe(true);

    const [material] = await repo.listar("materiais", [["publicado", "==", true]]);
    expect(await s.materiais.url(material.arquivo.ref)).toMatch(/^http/);
  });

  it("o servidor barra o que o serviço também barra", async () => {
    await expect(repo.listar("usuarios", [["role", "==", "aluno"]])).rejects.toMatchObject({ codigo: "permissao" });
    await expect(repo.obter("planos", ids.bia)).rejects.toMatchObject({ codigo: "permissao" });
    await expect(repo.atualizar("usuarios", ids.ana, { role: "moderador" })).rejects.toMatchObject({ codigo: "permissao" });
    await expect(repo.definir("modelosPlano", ids.modelo, { nome: "hack" })).rejects.toMatchObject({ codigo: "permissao" });
    expect(() => s.questoes.observar(ids.bia, () => {})).toThrow(ErroPermissao);
    // gravação direta de histórico sem log: recusada pelo servidor
    const [q] = await repo.listar("questoes", [["alunoId", "==", ids.ana]]);
    await expect(repo.atualizar("questoes", q.id, { acertos: 20, erros: 0 })).rejects.toMatchObject({ codigo: "permissao" });
    await expect(repo.remover("questoes", q.id)).rejects.toMatchObject({ codigo: "permissao" });
    // revisão recorrente é só do moderador
    await expect(repo.definir("revisoesRecorrentes", `${ids.ana}__t:x`, { alunoId: ids.ana, itemId: "t:x", ativo: true, parametros: [{}] })).rejects.toMatchObject({ codigo: "permissao" });
  });

  it("moderador vê a turma e o histórico de alterações", async () => {
    await s.auth.sair();
    await entrarComo("mod@teste.com");
    const alunos = await new Promise((ok) => { const parar = s.alunos.observarTodos((l) => { if (l.length === 2) { parar(); ok(l); } }); });
    expect(alunos.map((a) => a.nome)).toEqual(["Ana Teste", "Bia Teste"]);
    const logs = await repo.listar("logs", [["alunoId", "==", ids.ana]]);
    expect(logs.map((l) => l.tipo)).toEqual(expect.arrayContaining(["cadastro", "aplicarPlano", "desfazerMeta", "corrigir", "definirPlano", "recalcularMetas", "reverDoZero"]));
    expect(logs.find((l) => l.tipo === "definirPlano")).toMatchObject({ papel: "aluno", antes: "Normal", depois: "Acelerada" });

    // revisão recorrente num tópico já concluído: uma por tópico, vira meta, desativar não apaga
    const ind = await s.ctx.indice();
    const item = itensDoPlano(await repo.obter("planos", ids.ana), ind).find((it) => it.materiaId === "matematica");
    await s.revisoes.ativar(ids.ana, item.itemId, { intervaloDias: 2, duracaoMin: 30 });
    const rev = (await repo.listar("metas", [["alunoId", "==", ids.ana]])).filter((m) => m.categoria === "revisao_recorrente");
    expect(rev.length).toBeGreaterThanOrEqual(7);
    expect(rev.every((m) => m.duracaoPlanejada === 30)).toBe(true);
    await s.revisoes.desativar(ids.ana, item.itemId);
    expect((await repo.obter("revisoesRecorrentes", `${ids.ana}__${item.itemId}`)).ativo).toBe(false);
    await expect(repo.remover("revisoesRecorrentes", `${ids.ana}__${item.itemId}`)).rejects.toMatchObject({ codigo: "permissao" });
  });
});
