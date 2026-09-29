/* Estudo do aluno: sessões de estudo e o histórico antigo (semanas e
   revisões automáticas). As metas diárias ficam em services/metas.js.

   sessoesEstudo/{id}         cada estudo feito: data, minutos, conteúdo, origem
   progresso/{alunoId}        minutos e ciclos por tópico (somados na mesma gravação da sessão)
   resumosSemana/{aluno_sem}  fechamento das semanas do sistema antigo
   revisoes/{id}              revisões automáticas antigas (7/15/30 dias)

   A sessão é o registro histórico; o progresso é o acumulado dela, gravado no
   mesmo lote (atômico). Apagar uma sessão desconta o progresso: o aluno só
   pode nas primeiras 24 h, e fica no histórico. */

import { carimbo, incrementar, novoId } from "../data/contrato.js";
import { distribuirMinutos, itensDoPlano } from "../core/plano.js";
import { efeitoDosMinutos, estadoDoTopico } from "../core/ciclos.js";
import { ErroValidacao, idLogRemocao, opsDeLog, recentesPrimeiro } from "./base.js";
import { opsDevolverProgresso } from "./metas.js";

export function servicoEstudo(ctx, servicos = {}) {
  const { repo } = ctx;

  async function contexto(alunoId) {
    const [plano, progDoc, ind] = await Promise.all([repo.obter("planos", alunoId), repo.obter("progresso", alunoId), ctx.indice()]);
    return { plano, prog: progDoc?.itens || {}, ind, itens: plano ? itensDoPlano(plano, ind) : [] };
  }

  /* Minutos numa sessão → o que cada tópico recebe (com a porcentagem antes
     e depois e o ciclo que fechou), no mesmo lote da sessão. */
  function efeitosNoProgresso(c, alunoId, partes, dia, sessaoId) {
    const itens = {};
    const concluidos = [];
    const finais = partes.map((p) => {
      const item = c.itens.find((it) => it.itemId === p.itemId);
      if (!item) {
        itens[p.itemId] = { minutos: incrementar(p.minutos) };
        return { itemId: p.itemId, minutos: p.minutos, concluiu: false };
      }
      const atual = c.prog[p.itemId] || {};
      const ef = efeitoDosMinutos(item, atual, p.minutos, { hojeIso: dia });
      // dados antigos: os ciclos deduzidos passam a ser gravados
      const ciclos = ef.ciclos || (Array.isArray(atual.ciclos) ? null : estadoDoTopico(item, atual).ciclos);
      itens[p.itemId] = { minutos: incrementar(p.minutos), ...(ciclos ? { ciclos } : {}) };
      if (ef.concluiu) concluidos.push(p.itemId);
      return { itemId: p.itemId, topicoId: item.topicoId, minutos: p.minutos, ciclo: ef.ciclo, pctAntes: ef.pctAntes, pctDepois: ef.pctDepois, concluiu: ef.concluiu };
    });
    const ops = partes.length ? [{ tipo: "mesclar", colecao: "progresso", id: alunoId, dados: { alunoId, ultimaOperacao: { tipo: "sessao", id: sessaoId }, itens } }] : [];
    return { ops, partes: finais, concluidos };
  }

  return {
    observarSessoes(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("sessoesEstudo", [["alunoId", "==", alunoId]], (l) => cb([...l].sort(recentesPrimeiro("data"))));
    },
    observarRevisoes(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("revisoes", [["alunoId", "==", alunoId]], cb);
    },
    observarResumosSemana(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("resumosSemana", [["alunoId", "==", alunoId]], (l) => cb([...l].sort(recentesPrimeiro("semana"))));
    },
    // moderador: sessões de todos a partir de uma data (painel da turma)
    observarSessoesDesde(inicio, cb) {
      ctx.exigir("gerenciar:alunos");
      return repo.observar("sessoesEstudo", [["data", ">=", inicio]], cb);
    },

    /* Estudo fora das metas: soma no conteúdo informado (tópico ou o da vez
       na matéria). */
    async registrarEstudoFora(alunoId, { materiaId, topicoId, subtopicoId, minutos, data }) {
      ctx.exigir("registrar:estudo", { alunoId });
      const c = await contexto(alunoId);
      const hoje = ctx.hoje();
      const erros = {};
      const min = Number(minutos);
      if (!materiaId || !c.ind.materia(materiaId)) erros.materiaId = "Escolha a matéria.";
      if (topicoId && c.ind.topico(topicoId)?.materiaId !== materiaId) erros.topicoId = "Tópico não é dessa matéria.";
      if (subtopicoId && c.ind.subtopico(subtopicoId)?.topicoId !== topicoId) erros.subtopicoId = "Subtópico não é desse tópico.";
      if (!Number.isInteger(min) || min < 5 || min > 720) erros.minutos = "Minutos: inteiro entre 5 e 720.";
      const dia = data || hoje;
      if (!/^\d{4}-\d{2}-\d{2}$/.test(dia) || dia > hoje) erros.data = "A data não pode ser no futuro.";
      if (Object.keys(erros).length) throw new ErroValidacao(erros);

      const alvo = c.itens.filter((it) => it.materiaId === materiaId && (!topicoId || it.topicoId === topicoId));
      const partes = topicoId
        ? distribuirMinutos(alvo.map((it) => ({ ...it, materiaId: "_" })), c.prog, "_", min)
        : distribuirMinutos(c.itens, c.prog, materiaId, min);
      const sessaoId = novoId();
      const efeitos = efeitosNoProgresso(c, alunoId, partes, dia, sessaoId);
      const primeiro = c.itens.find((it) => it.itemId === partes[0]?.itemId);
      await repo.lote([{
        tipo: "criar", colecao: "sessoesEstudo", id: sessaoId,
        dados: {
          alunoId, data: dia, criadoEm: carimbo(), criadoPor: ctx.usuario.uid, revisoesCriadas: [],
          minutos: min, materiaId, topicoId: topicoId || primeiro?.topicoId || null, subtopicoId: subtopicoId || null,
          itemId: primeiro?.itemId || null, partes: efeitos.partes, origem: "fora",
        },
      }, ...efeitos.ops]);
      // tópico que acabou muda o que as metas estudam; o motor confere o resto
      if (efeitos.concluidos.length) await servicos.metas?.recalcular(alunoId, { motivo: "estudo fora das metas concluiu um tópico", gatilho: "progresso" }).catch(() => {});
      return { sessaoId, concluidos: efeitos.concluidos };
    },

    // Apaga uma sessão (a de uma meta desmarca a meta). Aluno: 24 h.
    async removerSessao(sessaoId, { motivo = "" } = {}) {
      const sessao = await repo.obter("sessoesEstudo", sessaoId);
      if (!sessao) return false;
      ctx.exigir("corrigir:registro", { registro: sessao });
      const meta = sessao.metaId ? await repo.obter("metas", sessao.metaId).catch(() => null) : null;
      if (meta?.status === "concluida" && meta.sessaoId === sessaoId) return servicos.metas.desfazer(sessao.alunoId, meta.id, { motivo });
      const c = await contexto(sessao.alunoId);
      const ops = [{ tipo: "remover", colecao: "sessoesEstudo", id: sessaoId }, ...opsDevolverProgresso(c, sessao.alunoId, sessao)];
      ops.push(...opsDeLog(ctx, { alunoId: sessao.alunoId, entidade: "estudo", entidadeId: sessaoId, motivo, logId: idLogRemocao(sessaoId) }, [{
        tipo: "removerSessao", descricao: `Apagou um estudo de ${c.ind.nomeMateria(sessao.materiaId)} (${sessao.minutos} min, ${sessao.data})`, antes: `${sessao.minutos} min`, depois: null,
      }]));
      await repo.lote(ops);
      return true;
    },
  };
}
