/* Diagnóstico e ação (tela Desempenho). Funções puras sobre os registros:
   o pulso (domínio, meta semanal de questões, tempo focado), o equilíbrio
   por grande área, o mapa tempo × acerto por matéria e os focos de atenção.
   Nada é guardado: tudo sai das questões, das sessões de estudo e do plano.

   Tempo por questão: o registro de questões pode trazer `minutos` (opcional,
   o tempo gasto resolvendo). Só os registros com tempo entram no mapa. */

import { desempenhoQuestoes, filtrarRegistros, pct } from "./desempenho.js";
import { diasEntre, inicioDaSemana, somarDias } from "./datas.js";
import { materiaDoCurso } from "./estrutura.js";
import { participacao } from "./jornada.js";

/* As quatro grandes áreas do vestibular (a divisão do ENEM, que a FUVEST
   também cobre). Matéria criada fora das 9 cai em "Outras". */
export const GRANDES_AREAS = [
  { id: "linguagens", nome: "Linguagens", materias: ["linguagens"] },
  { id: "matematica", nome: "Matemática", materias: ["matematica"] },
  { id: "natureza", nome: "Natureza", materias: ["biologia", "fisica", "quimica"] },
  { id: "humanas", nome: "Humanas", materias: ["historia", "geografia", "filosofia", "sociologia"] },
];
const OUTRAS = { id: "outras", nome: "Outras" };

export const areaDaMateria = (materiaId) =>
  GRANDES_AREAS.find((a) => a.materias.includes(materiaDoCurso(materiaId)))?.id || OUTRAS.id;

export const META_QUESTOES_PADRAO = 70;
export const LIMITES_META_QUESTOES = { min: 5, max: 2000 };
export const LIMITES_MINUTOS_QUESTOES = { min: 1, max: 600 };
export const AMOSTRA_MINIMA = 5; // questões para um conteúdo virar foco
export const LIMITE_FOCO = 70; // % de acerto abaixo do qual o conteúdo pede atenção

const um = (x) => Math.round(x * 10) / 10;
const noPeriodo = (d, inicio, fim) => (!inicio || d >= inicio) && (!fim || d <= fim);
export const minutosDoRegistro = (r) => (Number.isInteger(r?.minutos) && r.minutos > 0 ? r.minutos : 0);
const somaQuestoes = (lista) => lista.reduce((s, q) => s + (q.total || 0), 0);

/* ---------- pulso ---------- */

/* Acerto no período e a variação da semana: últimos 7 dias contra os 7
   anteriores (em pontos percentuais; null se um dos lados não tem questão). */
export function taxaDeDominio(questoes, { inicio = null, fim = null } = {}, hojeIso) {
  const periodo = desempenhoQuestoes(filtrarRegistros(questoes, { inicio, fim }));
  const ult = desempenhoQuestoes(filtrarRegistros(questoes, { inicio: somarDias(hojeIso, -6), fim: hojeIso }));
  const ant = desempenhoQuestoes(filtrarRegistros(questoes, { inicio: somarDias(hojeIso, -13), fim: somarDias(hojeIso, -7) }));
  return {
    ...periodo,
    semana: { total: ult.total, pct: ult.pct },
    semanaAnterior: { total: ant.total, pct: ant.pct },
    variacao: ult.total && ant.total ? um(ult.pct - ant.pct) : null,
  };
}

/* Acerto de cada uma das últimas semanas (segunda a domingo), a mais antiga
   primeiro; semana sem questão fica com pct null (buraco na linha). */
export function acertoPorSemana(questoes, hojeIso, semanas = 8) {
  const atual = inicioDaSemana(hojeIso);
  return Array.from({ length: semanas }, (_, i) => {
    const inicio = somarDias(atual, -7 * (semanas - 1 - i));
    const d = desempenhoQuestoes(filtrarRegistros(questoes, { inicio, fim: somarDias(inicio, 6) }));
    return { semana: inicio, total: d.total, acertos: d.acertos, pct: d.total ? d.pct : null };
  });
}

/* Meta sugerida quando o aluno não definiu a sua: a média das 4 semanas
   fechadas anteriores (contando as vazias) + 10%, em dezenas. Sem histórico,
   o padrão. Sugestão alcançável: a comparação é com o próprio ritmo. */
export function sugerirMetaQuestoes(questoes, hojeIso) {
  const atual = inicioDaSemana(hojeIso);
  const totais = [1, 2, 3, 4].map((k) => {
    const inicio = somarDias(atual, -7 * k);
    return somaQuestoes(questoes.filter((q) => noPeriodo(q.data, inicio, somarDias(inicio, 6))));
  });
  const media = totais.reduce((s, x) => s + x, 0) / totais.length;
  if (!media) return META_QUESTOES_PADRAO;
  return Math.min(LIMITES_META_QUESTOES.max, Math.max(20, Math.ceil(Math.round(media * 1.1) / 10) * 10));
}

/* Questões resolvidas na semana (segunda a domingo) contra a meta. */
export function metaSemanal(questoes, hojeIso, alvoDefinido) {
  const inicio = inicioDaSemana(hojeIso);
  const fim = somarDias(inicio, 6);
  const feitas = somaQuestoes(questoes.filter((q) => noPeriodo(q.data, inicio, hojeIso)));
  const definida = Number.isInteger(alvoDefinido) && alvoDefinido > 0;
  const alvo = definida ? alvoDefinido : sugerirMetaQuestoes(questoes, hojeIso);
  return {
    inicio, fim, feitas, alvo, definida,
    pct: Math.min(100, Math.round((feitas / alvo) * 100)),
    falta: Math.max(0, alvo - feitas),
    diasRestantes: diasEntre(hojeIso, fim) + 1, // hoje conta
  };
}

/* Tempo focado: sessões de estudo (metas e estudo registrado) + tempo
   informado nas questões. No período e nos últimos 7 dias. */
export function tempoFocado({ sessoes = [], questoes = [] }, { inicio = null, fim = null } = {}, hojeIso) {
  const soma = (ini, f) => {
    const estudo = sessoes.filter((s) => noPeriodo(s.data, ini, f)).reduce((x, s) => x + (s.minutos || 0), 0);
    const emQuestoes = questoes.filter((q) => noPeriodo(q.data, ini, f)).reduce((x, q) => x + minutosDoRegistro(q), 0);
    return { minutos: estudo + emQuestoes, estudo, questoes: emQuestoes };
  };
  const periodo = soma(inicio, fim);
  const dias = inicio ? diasEntre(inicio, fim || hojeIso) + 1 : null;
  return {
    ...periodo,
    semana: soma(somarDias(hojeIso, -6), hojeIso).minutos,
    semanaAnterior: soma(somarDias(hojeIso, -13), somarDias(hojeIso, -7)).minutos,
    mediaPorDia: dias ? Math.round(periodo.minutos / dias) : null,
  };
}

/* ---------- equilíbrio por grande área (radar) ---------- */

/* Para cada área: a fatia do tempo focado do período, a fatia que o plano
   pede (peso das matérias) e o acerto nas questões. As quatro áreas sempre
   aparecem; "Outras" só se tiver algo. `maiorFalta`: a área mais abaixo do
   que o plano pede (null se todas estão a menos de 5 pontos). */
export function equilibrioPorArea({ sessoes = [], questoes = [], plano = null }, { inicio = null, fim = null } = {}) {
  const base = () => ({ minutos: 0, plano: 0, total: 0, acertos: 0 });
  const g = Object.fromEntries([...GRANDES_AREAS, OUTRAS].map((a) => [a.id, base()]));
  sessoes.filter((s) => noPeriodo(s.data, inicio, fim)).forEach((s) => { g[areaDaMateria(s.materiaId)].minutos += s.minutos || 0; });
  filtrarRegistros(questoes, { inicio, fim }).forEach((q) => {
    const a = g[areaDaMateria(q.materiaId)];
    a.minutos += minutosDoRegistro(q);
    a.total += q.total || 0;
    a.acertos += q.acertos || 0;
  });
  Object.entries(plano ? participacao(plano) : {}).forEach(([materiaId, fatia]) => { g[areaDaMateria(materiaId)].plano += fatia; });

  const totalMin = Object.values(g).reduce((s, a) => s + a.minutos, 0);
  const temOutras = g.outras.minutos || g.outras.plano || g.outras.total;
  const eixos = [...GRANDES_AREAS, ...(temOutras ? [OUTRAS] : [])].map(({ id, nome }) => {
    const a = g[id];
    return {
      id, nome, minutos: a.minutos, questoes: a.total, acertos: a.acertos,
      tempo: totalMin ? pct(a.minutos, totalMin) : 0,
      plano: plano ? um(a.plano * 100) : null,
      acerto: a.total ? pct(a.acertos, a.total) : null,
    };
  });
  const faltas = plano && totalMin ? eixos.map((e) => ({ ...e, diferenca: um(e.tempo - e.plano) })).filter((e) => e.diferenca <= -5) : [];
  return {
    eixos,
    minutos: totalMin,
    maiorFalta: faltas.sort((a, b) => a.diferenca - b.diferenca)[0] || null,
  };
}

/* ---------- mapa tempo × acerto por matéria (dispersão) ---------- */

export const QUADRANTES = {
  forte: { nome: "Rápido e preciso", acao: "Ponto forte: mantenha com revisões." },
  lento: { nome: "Preciso, mas lento", acao: "Treine o ritmo com questões cronometradas." },
  apressado: { nome: "Rápido, mas errando", acao: "Desacelere: leia o enunciado com mais calma." },
  base: { nome: "Lento e errando", acao: "Volte à teoria antes de mais questões." },
};

/* Um ponto por matéria com questões cronometradas no período: minutos por
   questão (x) e acerto (y), comparados à média do próprio aluno (as linhas
   de referência). Com uma matéria só não há com o que comparar: sem quadrante. */
export function mapaTempoAcerto(questoes, filtro = {}, ind) {
  const noFiltro = filtrarRegistros(questoes, filtro).filter((q) => q.total > 0);
  const comTempo = noFiltro.filter((q) => minutosDoRegistro(q) > 0);
  const g = new Map();
  comTempo.forEach((q) => {
    const x = g.get(q.materiaId) || { total: 0, acertos: 0, minutos: 0 };
    x.total += q.total; x.acertos += q.acertos || 0; x.minutos += minutosDoRegistro(q);
    g.set(q.materiaId, x);
  });
  const total = comTempo.reduce((s, q) => s + q.total, 0);
  const media = total ? {
    minPorQuestao: um(comTempo.reduce((s, q) => s + minutosDoRegistro(q), 0) / total),
    acerto: pct(comTempo.reduce((s, q) => s + (q.acertos || 0), 0), total),
  } : null;
  const pontos = [...g.entries()].map(([materiaId, x]) => {
    const p = { materiaId, nome: ind?.nomeMateria(materiaId) || materiaId, total: x.total, acertos: x.acertos, minutos: x.minutos, minPorQuestao: um(x.minutos / x.total), acerto: pct(x.acertos, x.total) };
    const rapido = p.minPorQuestao <= media.minPorQuestao;
    const preciso = p.acerto >= media.acerto;
    return { ...p, quadrante: g.size < 2 ? null : preciso ? (rapido ? "forte" : "lento") : (rapido ? "apressado" : "base") };
  }).sort((a, b) => a.nome.localeCompare(b.nome, "pt-BR"));
  return { pontos, media, registrosComTempo: comTempo.length, registrosSemTempo: noFiltro.length - comTempo.length };
}

/* ---------- focos de atenção ---------- */

/* Os conteúdos com menor acerto no período: por subtópico quando o registro
   tem, senão pelo tópico. Só entra quem tem a amostra mínima e está abaixo
   do limite (acima dele, não é foco: é bom sinal). */
export function focosDeAtencao(questoes, filtro = {}, ind, { limite = 3, minimo = AMOSTRA_MINIMA, abaixoDe = LIMITE_FOCO } = {}) {
  const g = new Map();
  filtrarRegistros(questoes, filtro).forEach((q) => {
    if (!q.topicoId || !q.total) return;
    const chave = q.subtopicoId ? `s:${q.subtopicoId}` : `t:${q.topicoId}`;
    const x = g.get(chave) || { chave, materiaId: q.materiaId, topicoId: q.topicoId, subtopicoId: q.subtopicoId || null, total: 0, acertos: 0 };
    x.total += q.total; x.acertos += q.acertos || 0;
    g.set(chave, x);
  });
  const candidatos = [...g.values()].filter((x) => x.total >= minimo).map((x) => ({
    ...x,
    pct: pct(x.acertos, x.total),
    nome: x.subtopicoId ? ind.nomeSubtopico(x.subtopicoId) : ind.nomeTopico(x.topicoId),
    contexto: x.subtopicoId ? `${ind.nomeMateria(x.materiaId)} · ${ind.nomeTopico(x.topicoId)}` : ind.nomeMateria(x.materiaId),
  }));
  return {
    focos: candidatos.filter((x) => x.pct < abaixoDe).sort((a, b) => a.pct - b.pct || b.total - a.total).slice(0, limite),
    avaliados: candidatos.length,
  };
}
