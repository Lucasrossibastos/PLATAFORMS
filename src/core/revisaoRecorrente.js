/* Meta de revisão recorrente (coleção revisoesRecorrentes/{id}): o moderador
   ativa, para um tópico já concluído, uma meta curta que reaparece a cada
   `intervaloDias`, com `duracaoMin` fixos. Nada começa ativo.

   Revisão = {
     alunoId, materiaId, topicoId, itemId,
     ativo, ativadoPor, ativadoEm, desativadoPor?, desativadoEm?,
     parametros: [{ desde, intervaloDias, duracaoMin, dataBase, modoAtraso, por, em }]
   }
   A versão vigente dos parâmetros é a última; editar ACRESCENTA uma versão
   (vale do dia da edição em diante). As anteriores ficam para explicar as
   ocorrências já geradas, que nunca mudam.

   modoAtraso: "fixo" (padrão) — as ocorrências caem em dataBase + N ×
   intervaloDias, feitas ou não; atraso só acumula pendência. "desde_ultima" —
   a próxima conta a partir da última feita. */

import { diasEntre, somarDias } from "./datas.js";

export const MODOS_ATRASO = {
  fixo: "Ciclo fixo a partir da data-base (atraso acumula pendência)",
  desde_ultima: "Conta a partir da última revisão feita",
};

const DATA = /^\d{4}-\d{2}-\d{2}$/;
export const LIMITES_REVISAO = { intervaloMin: 1, intervaloMax: 365, duracaoMin: 5, duracaoMax: 180 };

export function validarParametros(p) {
  const erros = {};
  const i = Number(p?.intervaloDias);
  const d = Number(p?.duracaoMin);
  const L = LIMITES_REVISAO;
  if (!Number.isInteger(i) || i < L.intervaloMin || i > L.intervaloMax) erros.intervaloDias = `Intervalo: de ${L.intervaloMin} a ${L.intervaloMax} dias.`;
  if (!Number.isInteger(d) || d < L.duracaoMin || d > L.duracaoMax) erros.duracaoMin = `Duração: de ${L.duracaoMin} a ${L.duracaoMax} minutos.`;
  if (!DATA.test(p?.dataBase || "")) erros.dataBase = "Escolha a data-base do ciclo.";
  if (p?.modoAtraso && !Object.hasOwn(MODOS_ATRASO, p.modoAtraso)) erros.modoAtraso = "Modo de atraso desconhecido.";
  return { ok: !Object.keys(erros).length, erros };
}

export const parametrosAtuais = (rev) => rev?.parametros?.[rev.parametros.length - 1] || null;

/* Ativar para um tópico. topicoConcluido e existente (a revisão que o
   tópico já tem, ativa ou não) vêm de quem chama. Uma revisão desativada é
   reativada (mesmo documento, histórico junto), nunca duplicada. */
export function ativarRevisao({ alunoId, materiaId, topicoId, itemId, intervaloDias, duracaoMin, dataBase, modoAtraso = "fixo" }, { topicoConcluido, existente = null, hojeIso, por }) {
  if (!topicoConcluido) return { ok: false, erros: { itemId: "Só dá para ativar revisão em tópico já concluído." } };
  if (existente?.ativo) return { ok: false, erros: { itemId: "Este tópico já tem uma revisão ativa. Edite a existente." } };
  const params = { intervaloDias: Number(intervaloDias), duracaoMin: Number(duracaoMin), dataBase: dataBase || hojeIso, modoAtraso };
  const v = validarParametros(params);
  if (!v.ok) return { ok: false, erros: v.erros };
  const versao = { desde: hojeIso, ...params, por, em: hojeIso };
  const revisao = existente
    ? { ...existente, ativo: true, ativadoPor: por, ativadoEm: hojeIso, parametros: [...(existente.parametros || []), versao] }
    : { alunoId, materiaId, topicoId, itemId, ativo: true, ativadoPor: por, ativadoEm: hojeIso, parametros: [versao] };
  return { ok: true, revisao, reativada: !!existente };
}

// editar intervalo/duração/data-base/modo: nova versão, só para a frente
export function editarRevisao(rev, mudancas, { hojeIso, por }) {
  if (!rev?.ativo) return { ok: false, erros: { ativo: "Ative a revisão antes de editar." } };
  const atual = parametrosAtuais(rev);
  const params = {
    intervaloDias: Number(mudancas.intervaloDias ?? atual.intervaloDias),
    duracaoMin: Number(mudancas.duracaoMin ?? atual.duracaoMin),
    dataBase: mudancas.dataBase ?? atual.dataBase,
    modoAtraso: mudancas.modoAtraso ?? atual.modoAtraso ?? "fixo",
  };
  const v = validarParametros(params);
  if (!v.ok) return { ok: false, erros: v.erros };
  const igual = ["intervaloDias", "duracaoMin", "dataBase", "modoAtraso"].every((k) => params[k] === (atual[k] ?? (k === "modoAtraso" ? "fixo" : undefined)));
  if (igual) return { ok: true, revisao: rev, mudou: false };
  return { ok: true, mudou: true, revisao: { ...rev, parametros: [...rev.parametros, { desde: hojeIso, ...params, por, em: hojeIso }] } };
}

// desativar não apaga nada: as ocorrências geradas continuam no histórico
export function desativarRevisao(rev, { hojeIso, por }) {
  if (!rev?.ativo) return { ok: false, erros: { ativo: "Esta revisão já está desativada." } };
  return { ok: true, revisao: { ...rev, ativo: false, desativadoPor: por, desativadoEm: hojeIso } };
}

/* Próxima ocorrência a partir de hoje (inclusive), com os parâmetros atuais.
   fixo: dataBase + N × intervalo. desde_ultima: última feita + intervalo. */
export function proximaOcorrencia(rev, hojeIso, { ultimaFeitaEm = null } = {}) {
  if (!rev?.ativo) return null;
  const p = parametrosAtuais(rev);
  if (!p) return null;
  if ((p.modoAtraso || "fixo") === "desde_ultima") {
    const base = ultimaFeitaEm && ultimaFeitaEm > p.dataBase ? somarDias(ultimaFeitaEm, p.intervaloDias) : p.dataBase;
    return base < hojeIso ? hojeIso : base;
  }
  if (hojeIso <= p.dataBase) return p.dataBase;
  const n = Math.ceil(diasEntre(p.dataBase, hojeIso) / p.intervaloDias);
  return somarDias(p.dataBase, n * p.intervaloDias);
}

/* Ocorrências de hoje até `fimIso` com os parâmetros atuais. As que já
   passaram (feitas ou atrasadas) são metas gravadas e nunca são refeitas;
   editar muda só daqui para a frente. No modo "desde a última", enquanto
   houver uma atrasada por fazer, a próxima espera por ela. */
export function ocorrenciasNoHorizonte(rev, hojeIso, fimIso, { ultimaFeitaEm = null, atrasadaPendente = false } = {}) {
  if (!rev?.ativo) return [];
  const p = parametrosAtuais(rev);
  if (!p) return [];
  const modo = p.modoAtraso || "fixo";
  if (modo === "desde_ultima" && atrasadaPendente) return [];
  const out = [];
  for (let d = proximaOcorrencia(rev, hojeIso, { ultimaFeitaEm }); d && d <= fimIso; d = somarDias(d, p.intervaloDias)) out.push(d);
  return out;
}
