/* Metas diárias do aluno (horizonte de duas semanas).

   metas/{id}                 cada meta: o histórico de onde sai tudo (ver core/metas.js)
   agendas/{alunoId}          quando o motor rodou pela última vez e os conflitos do horizonte
   sessoesEstudo/{id}         o estudo de cada meta concluída
   progresso/{alunoId}        minutos e ciclos por tópico (somados na mesma gravação)

   O motor (core/motorMetas.js) roda na virada do dia e depois de toda
   mudança que afeta o plano; cada execução grava um registro com o antes e o
   depois. Concluir grava sessão, progresso e meta num lote só (atômico);
   desfazer, nas primeiras 24 h, apaga a sessão e devolve o progresso, com
   registro. Meta concluída nunca é tocada pelo motor. */

import { apagarCampo, carimbo, ErroDados, incrementar, novoId } from "../data/contrato.js";
import { itensDoPlano } from "../core/plano.js";
import { desfazerConclusao } from "../core/ciclos.js";
import { concluirMeta, moverMeta, novaMeta } from "../core/metas.js";
import { aplicarMudancas, ehProgressao, partesDaConclusao, recalcularMetas, resumoDoHorizonte } from "../core/motorMetas.js";
import { inicioDaSemana } from "../core/datas.js";
import { ErroValidacao, idLogRemocao, loteEmPartes, opsDeLog } from "./base.js";

export const VERSAO_MOTOR = 1;

export function servicoMetas(ctx) {
  const { repo } = ctx;

  async function contexto(alunoId) {
    const [plano, progDoc, metas, revisoes, revisoesAntigas, ind] = await Promise.all([
      repo.obter("planos", alunoId), repo.obter("progresso", alunoId),
      repo.listar("metas", [["alunoId", "==", alunoId]]),
      repo.listar("revisoesRecorrentes", [["alunoId", "==", alunoId]]),
      repo.listar("revisoes", [["alunoId", "==", alunoId]]),
      ctx.indice(),
    ]);
    return { plano, prog: progDoc?.itens || {}, metas, revisoes, revisoesAntigas, ind, itens: plano ? itensDoPlano(plano, ind) : [] };
  }

  // uma execução por aluno de cada vez (a virada do dia e um clique podem chegar juntos)
  const filas = new Map();
  const emFila = (alunoId, fn) => {
    const antes = filas.get(alunoId) || Promise.resolve();
    const agora = antes.catch(() => {}).then(fn);
    filas.set(alunoId, agora);
    return agora;
  };

  /* Na primeira execução, a semana do sistema antigo (semanas/{alunoId})
     vira um resumo parcial: o que foi cumprido nela continua contando. */
  async function opsDaSemanaAntiga(alunoId, hoje) {
    const doc = await repo.obter("semanas", alunoId);
    if (!doc?.chave || !doc.metas) return [];
    const id = `${alunoId}_${doc.chave}`;
    if (await repo.obter("resumosSemana", id)) return [];
    const todas = Object.values(doc.metas).flat();
    const feitas = todas.filter((m) => m.done);
    const soma = (l) => l.reduce((s, m) => s + (m.minutos || 0), 0);
    return [{
      tipo: "definir", colecao: "resumosSemana", id,
      dados: {
        alunoId, semana: doc.chave, metas: todas.length, cumpridas: feitas.length, naoCumpridas: todas.length - feitas.length,
        minutosPlanejados: soma(todas), minutosFeitos: soma(feitas), fonte: "semanas",
        ...(doc.chave === inicioDaSemana(hoje) ? { parcial: true, ate: hoje } : {}), criadoEm: carimbo(),
      },
    }];
  }

  async function executar(alunoId, { motivo, gatilho }) {
    const c = await contexto(alunoId);
    if (!c.plano) return null;
    const hoje = ctx.hoje();
    const agenda = await repo.obter("agendas", alunoId);
    const geracao = (agenda?.geracao || 0) + 1;
    const r = recalcularMetas({
      hojeIso: hoje, plano: c.plano, itens: c.itens, progresso: c.prog, metas: c.metas,
      revisoes: c.revisoes, revisoesAntigas: c.revisoesAntigas,
    });
    const ops = [];
    const criadas = [];
    r.criar.forEach((x) => {
      const { id, ...d } = x;
      const v = novaMeta({ alunoId, ...d }, { geradaEm: hoje, geracao });
      if (!v.ok) return; // matéria/tópico que saiu do plano no meio do caminho: fica para a próxima
      const metaId = id || novoId();
      criadas.push({ ...v.meta, id: metaId });
      ops.push({ tipo: "criar", colecao: "metas", id: metaId, dados: { ...v.meta, criadaEm: carimbo() } });
    });
    r.atualizar.forEach((a) => ops.push({ tipo: "atualizar", colecao: "metas", id: a.id, dados: { ...a.patch, atualizadaEm: carimbo() } }));
    r.dispensar.forEach((id) => ops.push({ tipo: "atualizar", colecao: "metas", id, dados: { status: "dispensada", dispensadaEm: hoje, atualizadaEm: carimbo() } }));
    r.apagar.forEach((id) => ops.push({ tipo: "remover", colecao: "metas", id }));

    const depois = aplicarMudancas(c.metas, { ...r, criar: criadas });
    const antesR = resumoDoHorizonte(c.metas, hoje);
    const depoisR = resumoDoHorizonte(depois, hoje);
    const mudancas = { criadas: criadas.length, alteradas: r.atualizar.length, apagadas: r.apagar.length, dispensadas: r.dispensar.length };
    ops.push(...opsDeLog(ctx, { alunoId, entidade: "metas", entidadeId: alunoId, motivo }, [{
      tipo: "recalcularMetas",
      descricao: `Metas refeitas (${motivo || gatilho}): ${mudancas.criadas} novas, ${mudancas.alteradas} ajustadas, ${mudancas.apagadas + mudancas.dispensadas} retiradas${r.conflitos.length ? ` · ${r.conflitos.length} dia(s) em conflito` : ""}`,
      antes: antesR, depois: { ...depoisR, mudancas, conflitos: r.conflitos },
    }]));
    if (!agenda) ops.push(...await opsDaSemanaAntiga(alunoId, hoje));
    ops.push({
      tipo: "definir", colecao: "agendas", id: alunoId,
      dados: { alunoId, geradaEm: hoje, versao: VERSAO_MOTOR, geracao, gatilho, conflitos: r.conflitos, atualizadaEm: carimbo() },
    });
    await loteEmPartes(repo, ops);
    return { geradaEm: hoje, conflitos: r.conflitos, mudancas };
  }

  async function carregarMeta(metaId) {
    const meta = await repo.obter("metas", metaId);
    if (!meta) throw new ErroDados("Meta não encontrada. Recarregue a página.", "nao-encontrado");
    return meta;
  }

  const recalcular = (alunoId, { motivo = "", gatilho = "manual" } = {}) => emFila(alunoId, () => executar(alunoId, { motivo, gatilho }));

  return {
    observar(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("metas", [["alunoId", "==", alunoId]], cb);
    },
    observarAgenda(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observarDoc("agendas", alunoId, cb);
    },
    // moderador: agendas de todos (conflitos na lista de alunos)
    observarAgendas(cb) {
      ctx.exigir("gerenciar:alunos");
      return repo.observar("agendas", [], cb);
    },

    /* Metas em dia: roda o motor na virada do dia (ou se o motor mudou). */
    async garantir(alunoId) {
      ctx.exigir("registrar:estudo", { alunoId });
      return emFila(alunoId, async () => {
        const agenda = await repo.obter("agendas", alunoId);
        if (agenda?.geradaEm === ctx.hoje() && agenda.versao === VERSAO_MOTOR) return agenda;
        return executar(alunoId, { motivo: agenda ? "virada do dia" : "primeiro planejamento", gatilho: "virada" });
      });
    },

    // chamado depois de mudanças no plano, nas revisões e no progresso
    async recalcular(alunoId, opcoes) {
      ctx.exigir("registrar:estudo", { alunoId });
      return recalcular(alunoId, opcoes);
    },

    /* Concluir: sessão de estudo + progresso (minutos e ciclos) + meta, num lote. */
    async concluir(alunoId, metaId, { minutos } = {}) {
      ctx.exigir("registrar:estudo", { alunoId });
      return emFila(alunoId, async () => {
        const meta = await carregarMeta(metaId);
        if (meta.alunoId !== alunoId) throw new ErroDados("Meta de outro aluno.", "permissao");
        if (meta.status !== "pendente") throw new ErroDados("Esta meta já não está pendente.", "estado");
        const c = await contexto(alunoId);
        const hoje = ctx.hoje();
        const dur = Number(minutos ?? meta.duracaoPlanejada);
        if (!Number.isInteger(dur) || dur < 1 || dur > 720) throw new ErroValidacao({ minutos: "Tempo: minutos inteiros de 1 a 720." });
        const efeito = partesDaConclusao({ meta, itens: c.itens, progresso: c.prog, minutos: dur, hojeIso: hoje });
        const sessaoId = novoId();
        const r = concluirMeta(meta, { hojeIso: hoje, duracaoReal: dur, sessaoId, partes: efeito.partes });
        if (!r.ok) throw new ErroDados(r.erro, "estado");
        const primeira = efeito.partes[0];
        const categoria = ehProgressao(meta) ? (primeira?.ciclo > 1 ? "rever_do_zero" : "progressao") : meta.categoria;
        const ops = [{
          tipo: "criar", colecao: "sessoesEstudo", id: sessaoId,
          dados: {
            alunoId, data: hoje, criadoEm: carimbo(), criadoPor: ctx.usuario.uid, minutos: dur, materiaId: meta.materiaId,
            topicoId: primeira?.topicoId || meta.topicoId || null, subtopicoId: null, itemId: primeira?.itemId || meta.itemId || null,
            partes: efeito.partes, revisoesCriadas: [], origem: ehProgressao(meta) ? "meta" : "revisao", metaId, categoria,
          },
        }];
        const itens = Object.fromEntries(Object.entries(efeito.progresso).map(([id, x]) => [id, { minutos: incrementar(x.minutos), ...(x.ciclos ? { ciclos: x.ciclos } : {}) }]));
        if (Object.keys(itens).length) {
          ops.push({ tipo: "mesclar", colecao: "progresso", id: alunoId, dados: { alunoId, ultimaOperacao: { tipo: "sessao", id: sessaoId }, itens } });
        }
        const campos = ["status", "concluidaEm", "duracaoReal", "sessaoId", "partes", "itemId", "topicoId"];
        const dados = Object.fromEntries(campos.map((k) => [k, r.meta[k] ?? null]));
        ops.push({ tipo: "atualizar", colecao: "metas", id: metaId, dados: { ...dados, categoria, concluidaEmTs: carimbo(), atualizadaEm: carimbo() } });
        if (meta.revisaoAntigaId) ops.push(...await opsRevisaoAntiga(meta, "realizada", { realizadaEm: hoje, sessaoId }));
        await repo.lote(ops);
        // o dia só muda se o tempo foi outro ou se a meta era de outro dia
        if (dur !== meta.duracaoPlanejada || meta.dataPlanejada !== hoje) {
          await executar(alunoId, { motivo: "meta concluída com outro tempo ou em outro dia", gatilho: "conclusao" });
        }
        return { sessaoId, partes: efeito.partes, concluidos: efeito.concluidos, categoria };
      });
    },

    /* Desfazer uma conclusão (aluno: 24 h). Apaga a sessão, devolve os minutos
       e reabre o ciclo que ela tinha fechado; tudo com registro. */
    async desfazer(alunoId, metaId, { motivo = "" } = {}) {
      ctx.exigir("registrar:estudo", { alunoId });
      return emFila(alunoId, async () => {
        const meta = await carregarMeta(metaId);
        if (meta.alunoId !== alunoId || meta.status !== "concluida") throw new ErroDados("Esta meta não está concluída.", "estado");
        const sessao = meta.sessaoId ? await repo.obter("sessoesEstudo", meta.sessaoId) : null;
        const logId = idLogRemocao(sessao?.id || metaId);
        const c = await contexto(alunoId);
        if (sessao) ctx.exigir("corrigir:registro", { registro: sessao });
        const ops = [];
        if (sessao) {
          ops.push({ tipo: "remover", colecao: "sessoesEstudo", id: sessao.id });
          ops.push(...opsDevolverProgresso(c, alunoId, sessao));
        }
        const fora = Object.fromEntries(["concluidaEm", "concluidaEmTs", "duracaoReal", "sessaoId", "partes"].map((k) => [k, apagarCampo()]));
        ops.push({ tipo: "atualizar", colecao: "metas", id: metaId, dados: { ...fora, status: "pendente", ultimoLogId: logId, atualizadaEm: carimbo() } });
        if (meta.revisaoAntigaId) ops.push(...await opsRevisaoAntiga(meta, "agendada"));
        ops.push(...opsDeLog(ctx, { alunoId, entidade: "estudo", entidadeId: sessao?.id || metaId, motivo, logId }, [{
          tipo: "desfazerMeta",
          descricao: `Desmarcou uma meta de ${c.ind.nomeMateria(meta.materiaId)} (${meta.duracaoReal || meta.duracaoPlanejada} min)`,
          antes: "concluída", depois: "pendente",
        }]));
        await repo.lote(ops);
        await executar(alunoId, { motivo: "meta desmarcada", gatilho: "desfazer" });
        return true;
      });
    },

    /* Arrastar para outro dia: a meta fica fixada ali e o resto se ajusta. */
    async mover(alunoId, metaId, novaData) {
      ctx.exigir("registrar:estudo", { alunoId });
      return emFila(alunoId, async () => {
        const meta = await carregarMeta(metaId);
        if (meta.alunoId !== alunoId) throw new ErroDados("Meta de outro aluno.", "permissao");
        const r = moverMeta(meta, novaData, ctx.hoje());
        if (!r.ok) throw new ErroDados(r.erro, "estado");
        if (r.mesmoDia) return false;
        await repo.atualizar("metas", metaId, { dataPlanejada: r.meta.dataPlanejada, datasAnteriores: r.meta.datasAnteriores, fixada: true, atualizadaEm: carimbo() });
        await executar(alunoId, { motivo: "meta levada para outro dia", gatilho: "mover" });
        return true;
      });
    },

    /* "Organizar de novo": solta as metas fixadas e deixa o motor distribuir. */
    async reorganizar(alunoId) {
      ctx.exigir("registrar:estudo", { alunoId });
      return emFila(alunoId, async () => {
        const hoje = ctx.hoje();
        const fixadas = (await repo.listar("metas", [["alunoId", "==", alunoId]])).filter((m) => m.status === "pendente" && m.fixada && m.dataPlanejada >= hoje);
        if (fixadas.length) await repo.lote(fixadas.map((m) => ({ tipo: "atualizar", colecao: "metas", id: m.id, dados: { fixada: false, atualizadaEm: carimbo() } })));
        return executar(alunoId, { motivo: "organizar de novo", gatilho: "reorganizar" });
      });
    },
  };

  // sessão de revisão automática antiga: acompanha a meta (histórico da coleção antiga)
  async function opsRevisaoAntiga(meta, status, extra = {}) {
    const r = await repo.obter("revisoes", meta.revisaoAntigaId);
    if (!r) return [];
    const sessoes = (r.sessoes || []).map((s) => {
      if (s.dia !== meta.revisaoDia) return s;
      const { realizadaEm: _r, sessaoId: _s, ...base } = s;
      return { ...base, status, ...extra };
    });
    return [{ tipo: "atualizar", colecao: "revisoes", id: r.id, dados: { sessoes } }];
  }
}

/* Devolve ao progresso o que uma sessão somou: minutos e, se ela fechou um
   ciclo pelo tempo, reabre esse ciclo (se nada mais novo aconteceu nele). */
export function opsDevolverProgresso(c, alunoId, sessao) {
  const itens = {};
  (sessao.partes || []).forEach((p) => {
    const item = c.itens.find((it) => it.itemId === p.itemId);
    itens[p.itemId] = { minutos: incrementar(-p.minutos) };
    if (!p.concluiu || !item) return;
    const atual = c.prog[p.itemId] || {};
    const ciclos = desfazerConclusao(item, atual, p.ciclo ?? 1);
    if (ciclos) itens[p.itemId].ciclos = ciclos;
    if (!Array.isArray(atual.ciclos) && atual.concluido !== true) itens[p.itemId].concluidoEm = apagarCampo(); // dado antigo
  });
  if (!Object.keys(itens).length) return [];
  return [{ tipo: "mesclar", colecao: "progresso", id: alunoId, dados: { alunoId, ultimaOperacao: { tipo: "remocao", id: sessao.id }, itens } }];
}
