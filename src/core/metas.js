/* Registro de cada meta (coleção metas/{id}): é o histórico de onde saem o
   resumo da semana, o tempo por categoria e o progresso.

   Meta = {
     alunoId, categoria, materiaId,
     itemId, topicoId           tópico fixo em rever_do_zero e revisao_recorrente;
                                na progressão, o tópico é o atual da matéria na
                                hora de estudar (a meta é contínua: pode terminar
                                um tópico e seguir no próximo)
     dataPlanejada, duracaoPlanejada,
     status: "pendente" | "concluida",
     datasAnteriores: []        dias em que ela estava planejada e não foi feita
     ordemNoDia, geracao, geradaEm, geradaPor ("motor" | uid do moderador/aluno)
     revisaoRecorrenteId, ocorrenciaEm       só na revisão recorrente
     — ao concluir —
     concluidaEm, duracaoReal, sessaoId,
     partes: [{ itemId, topicoId, minutos, ciclo, pctAntes, pctDepois, concluiu }]
   }

   Regras: concluída é imutável para o motor (correção só com log, como os
   outros registros); pendente pode mudar de dia; a que passou do dia sem ser
   feita guarda esse dia em datasAnteriores e nunca é apagada. */

export const CATEGORIAS = {
  progressao: "Progressão",
  rever_do_zero: "Rever do zero",
  revisao_recorrente: "Revisão recorrente",
  revisao_automatica: "Revisão automática (antiga)",
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
export const DURACAO_MIN = 5;
export const DURACAO_MAX = 720;

export function validarMeta(d) {
  const erros = {};
  if (!d?.alunoId) erros.alunoId = "Meta sem aluno.";
  if (!Object.hasOwn(CATEGORIAS, d?.categoria)) erros.categoria = "Categoria de meta desconhecida.";
  if (!d?.materiaId) erros.materiaId = "Meta sem matéria.";
  if (!DATA.test(d?.dataPlanejada || "")) erros.dataPlanejada = "Data planejada inválida.";
  const dur = Number(d?.duracaoPlanejada);
  if (!Number.isInteger(dur) || dur < DURACAO_MIN || dur > DURACAO_MAX) erros.duracaoPlanejada = `Duração: minutos inteiros de ${DURACAO_MIN} a ${DURACAO_MAX}.`;
  if ((d?.categoria === "rever_do_zero" || d?.categoria === "revisao_recorrente") && !d?.itemId) erros.itemId = "Esta meta precisa do tópico.";
  if (d?.categoria === "revisao_recorrente" && !d?.revisaoRecorrenteId) erros.revisaoRecorrenteId = "Meta de revisão sem a revisão recorrente.";
  return { ok: !Object.keys(erros).length, erros };
}

export function novaMeta(d, { geradaEm, geradaPor = "motor", geracao = 0 } = {}) {
  const v = validarMeta(d);
  if (!v.ok) return { ok: false, erros: v.erros };
  return {
    ok: true,
    meta: {
      alunoId: d.alunoId, categoria: d.categoria, materiaId: d.materiaId,
      itemId: d.itemId || null, topicoId: d.topicoId || null,
      dataPlanejada: d.dataPlanejada, duracaoPlanejada: Number(d.duracaoPlanejada),
      status: "pendente", datasAnteriores: [], ordemNoDia: d.ordemNoDia ?? 0,
      geracao, geradaEm: geradaEm || null, geradaPor,
      ...(d.categoria === "revisao_recorrente" ? { revisaoRecorrenteId: d.revisaoRecorrenteId, ocorrenciaEm: d.ocorrenciaEm || d.dataPlanejada } : {}),
    },
  };
}

export const ehAtrasada = (m, hojeIso) => m.status === "pendente" && m.dataPlanejada < hojeIso;

/* Levar para outro dia (arrastar ou replanejar). Só a pendente; a que já
   passou do dia guarda o dia em que não foi feita. Não leva para o passado. */
export function moverMeta(m, novaData, hojeIso) {
  if (m.status !== "pendente") return { ok: false, erro: "Meta concluída não muda de dia." };
  if (!DATA.test(novaData || "") || novaData < hojeIso) return { ok: false, erro: "Escolha hoje ou um dia à frente." };
  if (novaData === m.dataPlanejada) return { ok: true, meta: m };
  const perdeu = m.dataPlanejada < hojeIso;
  return {
    ok: true,
    meta: { ...m, dataPlanejada: novaData, datasAnteriores: perdeu ? [...(m.datasAnteriores || []), m.dataPlanejada] : [...(m.datasAnteriores || [])] },
  };
}

/* Concluir: registra o tempo real e o que cada tópico avançou (a porcentagem
   vista antes e depois, de efeitoDosMinutos). */
export function concluirMeta(m, { hojeIso, duracaoReal, sessaoId = null, partes = [] }) {
  if (m.status === "concluida") return { ok: false, erro: "Esta meta já foi concluída." };
  const dur = Number(duracaoReal ?? m.duracaoPlanejada);
  if (!Number.isInteger(dur) || dur < 1 || dur > DURACAO_MAX) return { ok: false, erro: `Tempo real: minutos inteiros de 1 a ${DURACAO_MAX}.` };
  return {
    ok: true,
    meta: {
      ...m, status: "concluida", concluidaEm: hojeIso, duracaoReal: dur, sessaoId,
      partes: partes.map(({ itemId, topicoId, minutos, ciclo, pctAntes, pctDepois, concluiu }) => ({ itemId, topicoId, minutos, ciclo, pctAntes, pctDepois, concluiu: !!concluiu })),
      // o tópico da progressão fica gravado: é o que foi estudado de fato
      ...(m.categoria === "progressao" && partes[0] ? { itemId: partes[0].itemId, topicoId: partes[0].topicoId } : {}),
    },
  };
}

/* Resumo de uma semana (segunda a domingo) a partir dos registros: conta a
   meta que esteve planejada na semana (no dia atual dela ou num dia que
   passou sem ser feita) e a que foi concluída na semana. */
export function resumoDaSemana(metas, inicio, fim) {
  const naSemana = (d) => d >= inicio && d <= fim;
  const vazio = () => ({ metas: 0, cumpridas: 0, minutosPlanejados: 0, minutosFeitos: 0 });
  const r = { ...vazio(), naoCumpridas: 0, porCategoria: {} };
  metas.forEach((m) => {
    const planejada = naSemana(m.dataPlanejada) || (m.datasAnteriores || []).some(naSemana);
    const feita = m.status === "concluida" && naSemana(m.concluidaEm);
    if (!planejada && !feita) return;
    const c = (r.porCategoria[m.categoria] ||= vazio());
    [r, c].forEach((alvo) => {
      if (planejada) { alvo.metas += 1; alvo.minutosPlanejados += m.duracaoPlanejada; }
      if (feita) { alvo.cumpridas += 1; alvo.minutosFeitos += m.duracaoReal || 0; }
    });
    if (planejada && !feita) r.naoCumpridas += 1;
  });
  return r;
}

// tempo total estudado por categoria (relatórios)
export function tempoPorCategoria(metas) {
  const r = Object.fromEntries(Object.keys(CATEGORIAS).map((k) => [k, 0]));
  metas.forEach((m) => { if (m.status === "concluida") r[m.categoria] = (r[m.categoria] || 0) + (m.duracaoReal || 0); });
  return r;
}
