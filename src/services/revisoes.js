/* Revisões recorrentes (revisoesRecorrentes/{alunoId__itemId}): o moderador
   ativa, para um tópico já concluído, uma meta curta que volta a cada N dias.
   Uma por tópico (o id garante); desativar nunca apaga (as ocorrências feitas
   continuam no histórico) e reativar usa o mesmo documento. Toda mudança tem
   registro e refaz as metas do aluno. Ver core/revisaoRecorrente.js. */

import { carimbo, ErroDados } from "../data/contrato.js";
import { itensDoPlano } from "../core/plano.js";
import { estadoDoTopico } from "../core/ciclos.js";
import { ativarRevisao, desativarRevisao, editarRevisao, parametrosAtuais } from "../core/revisaoRecorrente.js";
import { ErroValidacao, opsDeLog } from "./base.js";

export const idRevisaoRecorrente = (alunoId, itemId) => `${alunoId}__${itemId}`;

export function servicoRevisoesRecorrentes(ctx, servicos) {
  const { repo } = ctx;
  const quem = () => ctx.usuario?.uid || null;
  const descrever = (p) => `a cada ${p.intervaloDias} dia${p.intervaloDias === 1 ? "" : "s"}, ${p.duracaoMin} min${p.modoAtraso === "desde_ultima" ? ", contando da última feita" : ""}`;

  async function gravar(alunoId, id, dados, entrada, motivo) {
    await repo.lote([
      { tipo: "definir", colecao: "revisoesRecorrentes", id, dados: { ...dados, atualizadaEm: carimbo() } },
      ...opsDeLog(ctx, { alunoId, entidade: "revisaoRecorrente", entidadeId: id, motivo }, [entrada]),
    ]);
    await servicos.metas?.recalcular(alunoId, { motivo: entrada.descricao, gatilho: "revisao" }).catch(() => {});
  }

  async function doTopico(alunoId, itemId) {
    const [plano, progDoc, ind] = await Promise.all([repo.obter("planos", alunoId), repo.obter("progresso", alunoId), ctx.indice()]);
    const item = plano ? itensDoPlano(plano, ind).find((it) => it.itemId === itemId) : null;
    if (!item) throw new ErroDados("Tópico fora do plano do aluno.", "nao-encontrado");
    return { item, ind, estado: estadoDoTopico(item, progDoc?.itens?.[itemId]) };
  }

  return {
    observar(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("revisoesRecorrentes", [["alunoId", "==", alunoId]], cb);
    },

    async ativar(alunoId, itemId, { intervaloDias, duracaoMin, dataBase, modoAtraso = "fixo", motivo = "" }) {
      ctx.exigir("gerenciar:alunos");
      const { item, ind, estado } = await doTopico(alunoId, itemId);
      const id = idRevisaoRecorrente(alunoId, itemId);
      const existente = await repo.obter("revisoesRecorrentes", id);
      const r = ativarRevisao(
        { alunoId, materiaId: item.materiaId, topicoId: item.topicoId, itemId, intervaloDias, duracaoMin, dataBase, modoAtraso },
        // concluído alguma vez (quem está revendo do zero também pode ter revisão)
        { topicoConcluido: estado.vezesConcluido > 0, existente, hojeIso: ctx.hoje(), por: quem() },
      );
      if (!r.ok) throw new ErroValidacao(r.erros);
      const { id: _i, ...dados } = r.revisao;
      await gravar(alunoId, id, dados, {
        tipo: r.reativada ? "reativarRevisao" : "ativarRevisao",
        descricao: `${r.reativada ? "Reativou" : "Ativou"} revisão de ${ind.nomeTopico(item.topicoId)}: ${descrever(parametrosAtuais(r.revisao))}`,
        antes: existente ? { ativo: false } : null, depois: parametrosAtuais(r.revisao),
      }, motivo);
      return id;
    },

    async editar(alunoId, itemId, mudancas, { motivo = "" } = {}) {
      ctx.exigir("gerenciar:alunos");
      const id = idRevisaoRecorrente(alunoId, itemId);
      const rev = await repo.obter("revisoesRecorrentes", id);
      if (!rev) throw new ErroDados("Revisão não encontrada.", "nao-encontrado");
      const r = editarRevisao(rev, mudancas, { hojeIso: ctx.hoje(), por: quem() });
      if (!r.ok) throw new ErroValidacao(r.erros);
      if (!r.mudou) return false;
      const ind = await ctx.indice();
      const { id: _i, ...dados } = r.revisao;
      await gravar(alunoId, id, dados, {
        tipo: "editarRevisao",
        descricao: `Revisão de ${ind.nomeTopico(rev.topicoId)} agora ${descrever(parametrosAtuais(r.revisao))} (as já feitas não mudam)`,
        antes: parametrosAtuais(rev), depois: parametrosAtuais(r.revisao),
      }, motivo);
      return true;
    },

    async desativar(alunoId, itemId, { motivo = "" } = {}) {
      ctx.exigir("gerenciar:alunos");
      const id = idRevisaoRecorrente(alunoId, itemId);
      const rev = await repo.obter("revisoesRecorrentes", id);
      if (!rev) throw new ErroDados("Revisão não encontrada.", "nao-encontrado");
      const r = desativarRevisao(rev, { hojeIso: ctx.hoje(), por: quem() });
      if (!r.ok) throw new ErroValidacao(r.erros);
      const ind = await ctx.indice();
      const { id: _i, ...dados } = r.revisao;
      await gravar(alunoId, id, dados, {
        tipo: "desativarRevisao", descricao: `Desativou a revisão de ${ind.nomeTopico(rev.topicoId)} (o histórico fica)`,
        antes: { ativo: true }, depois: { ativo: false },
      }, motivo);
      return true;
    },
  };
}
