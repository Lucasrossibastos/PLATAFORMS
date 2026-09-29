/* Motor das metas diárias (funções puras; quem grava é services/metas.js).

   Horizonte: hoje + 13 dias (duas semanas), refeito a cada virada de dia e a
   cada mudança que afeta o plano. Metas concluídas nunca mudam.

   Orçamento de cada dia (horário semanal vigente naquele dia):
     1. revisões (recorrentes e as automáticas antigas) — tempo fixo, primeiro;
        se só elas passam do dia, o dia fica em CONFLITO (visível), nada é
        cortado nem empurrado em silêncio;
     2. metas que o aluno fixou num dia (arrastou) e o que ele já estudou hoje;
     3. o resto vai para a PROGRESSÃO, dividido pelo peso das matérias.

   Progressão: cada meta é tempo de uma matéria, contínua — ela estuda o
   tópico atual da fila e, se ele acabar, segue no próximo. O conteúdo de
   uma meta pendente é calculado na hora (conteudoPlanejado), então reordenar
   o edital muda na hora o que as próximas metas vão estudar. A categoria é
   "rever_do_zero" quando a meta começa num tópico que voltou para a fila.

   Atraso (estratégia do plano, `plano.atraso`):
     "redistribuir" (padrão) — a meta de progressão que passou do dia sem ser
       feita é reaproveitada nos próximos dias (guarda o dia perdido);
     "manter" — fica no dia, como atrasada, até o aluno mover ou fazer.
   Revisões atrasadas nunca andam: acumulam como pendência. */

import { diasEntre, somarDias } from "./datas.js";
import { minutosNoDia } from "./horario.js";
import { efeitoDosMinutos, estadoDoTopico, filaDaMateria } from "./ciclos.js";
import { pesosDoPlano } from "./jornada.js";

export const HORIZONTE_DIAS = 14;
export const SESSAO_MIN = 15;
export const ESTRATEGIAS_ATRASO = {
  redistribuir: "Levar para os próximos dias",
  manter: "Deixar no dia, como atrasada",
};

export const ehProgressao = (m) => m.categoria === "progressao" || m.categoria === "rever_do_zero";
export const diasDoHorizonte = (hojeIso, n = HORIZONTE_DIAS) => Array.from({ length: n }, (_, i) => somarDias(hojeIso, i));
const porData = (a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada) || (a.ordemNoDia ?? 0) - (b.ordemNoDia ?? 0) || String(a.id).localeCompare(String(b.id));
const baixo5 = (n) => Math.floor(n / 5) * 5;

// filas de cada matéria visível (itens já na ordem do edital)
export function filasDoPlano(itens, progresso = {}) {
  const grupos = new Map();
  itens.forEach((it) => { if (!grupos.has(it.materiaId)) grupos.set(it.materiaId, []); grupos.get(it.materiaId).push(it); });
  const r = new Map();
  grupos.forEach((lista, materiaId) => r.set(materiaId, filaDaMateria(lista, progresso)));
  return r;
}

/* O que cada meta de progressão pendente vai estudar, simulando a fila de
   cada matéria na ordem das metas. { [metaId]: { partes, categoria, sobra } } */
export function conteudoPlanejado(metas, itens, progresso = {}) {
  const sim = new Map();
  filasDoPlano(itens, progresso).forEach(({ fila, estados }, materiaId) => {
    sim.set(materiaId, fila.map((it) => ({ it, resto: estados.get(it.itemId).restante, ciclo: estados.get(it.itemId).ciclo })));
  });
  const out = {};
  metas.filter((m) => m.status === "pendente" && ehProgressao(m)).sort(porData).forEach((m) => {
    const fila = sim.get(m.materiaId) || [];
    let resta = m.duracaoPlanejada;
    const partes = [];
    while (resta > 0 && fila.length) {
      const x = fila[0];
      const usa = Math.min(resta, x.resto);
      if (usa > 0) partes.push({ itemId: x.it.itemId, topicoId: x.it.topicoId, minutos: usa, ciclo: x.ciclo });
      x.resto -= usa;
      resta -= usa;
      if (x.resto <= 0) fila.shift();
    }
    out[m.id] = { partes, sobra: resta, categoria: partes[0]?.ciclo > 1 ? "rever_do_zero" : "progressao" };
  });
  return out;
}

/* Orçamento e plano de sessões de progressão para o horizonte. */
export function planejarHorizonte({ hojeIso, plano, itens, progresso = {}, metas = [], dias = HORIZONTE_DIAS, estrategia = "redistribuir" }) {
  const datas = diasDoHorizonte(hojeIso, dias);
  const dentro = new Set(datas);
  const reservado = Object.fromEntries(datas.map((d) => [d, { revisoes: 0, fixadas: 0, feitas: 0 }]));
  // conteúdo já prometido a metas que o motor não mexe (não é planejado de novo)
  const prometido = {};
  const prometer = (m, min) => { prometido[m.materiaId] = (prometido[m.materiaId] || 0) + min; };
  metas.forEach((m) => {
    if (m.status === "dispensada") return;
    if (!ehProgressao(m)) {
      if (dentro.has(m.dataPlanejada)) reservado[m.dataPlanejada].revisoes += m.duracaoPlanejada;
      return;
    }
    if (m.status === "concluida") {
      if (m.concluidaEm === hojeIso) reservado[hojeIso].feitas += m.duracaoReal || m.duracaoPlanejada;
      return;
    }
    if (m.fixada && m.dataPlanejada >= hojeIso) {
      if (dentro.has(m.dataPlanejada)) reservado[m.dataPlanejada].fixadas += m.duracaoPlanejada;
      prometer(m, m.duracaoPlanejada);
    } else if (estrategia === "manter" && m.dataPlanejada < hojeIso) {
      prometer(m, m.duracaoPlanejada); // atrasada que fica no dia dela
    }
  });
  // o que já foi estudado hoje conta para o equilíbrio entre as matérias
  const feitoHoje = {};
  metas.forEach((m) => {
    if (m.status === "concluida" && m.concluidaEm === hojeIso && ehProgressao(m)) feitoHoje[m.materiaId] = (feitoHoje[m.materiaId] || 0) + (m.duracaoReal || m.duracaoPlanejada);
  });

  const conflitos = [];
  const capacidade = {};
  datas.forEach((d) => {
    const dia = minutosNoDia(plano, d);
    const r = reservado[d];
    if (r.revisoes > dia) conflitos.push({ data: d, minutosRevisoes: r.revisoes, minutosDia: dia });
    capacidade[d] = Math.max(0, dia - r.revisoes - r.fixadas - r.feitas);
  });

  // o que cada matéria ainda tem para estudar (o que já está preso em metas fixadas sai daqui)
  const pesos = pesosDoPlano(plano);
  const materias = (plano?.materias || []).filter((m) => m.ativa !== false);
  const ordemPlano = new Map(materias.map((m, i) => [m.materiaId, i]));
  const livre = {};
  filasDoPlano(itens, progresso).forEach(({ fila, estados }, materiaId) => {
    if (!ordemPlano.has(materiaId)) return;
    const resto = fila.reduce((s, it) => s + estados.get(it.itemId).restante, 0);
    livre[materiaId] = Math.max(0, resto - (prometido[materiaId] || 0));
  });
  const info = Object.fromEntries(materias.map((m) => [m.materiaId, { maxSessao: m.maxSessao || 60, prioridade: m.prioridade ?? 2, peso: pesos[m.materiaId] || 1 }]));

  /* Divisão justa pelo peso: a próxima sessão vai para a matéria com menos
     minutos por ponto de peso. Para não repetir matéria no mesmo dia, uma
     que ainda não apareceu hoje passa na frente se estiver a menos de uma
     sessão de distância da primeira. */
  const alocado = { ...prometido };
  Object.entries(feitoHoje).forEach(([id, min]) => { alocado[id] = (alocado[id] || 0) + min; });
  const razao = (id) => (alocado[id] || 0) / info[id].peso;
  const slots = [];
  datas.forEach((d) => {
    let cap = capacidade[d];
    const usadasHoje = new Set(d === hojeIso ? Object.keys(feitoHoje) : []);
    const semEspaco = new Set();
    while (cap >= SESSAO_MIN) {
      const candidatas = Object.keys(livre).filter((id) => livre[id] >= 5 && !semEspaco.has(id));
      if (!candidatas.length) break;
      candidatas.sort((a, b) => razao(a) - razao(b) || info[a].prioridade - info[b].prioridade || ordemPlano.get(a) - ordemPlano.get(b));
      const melhor = candidatas[0];
      const nova = candidatas.find((id) => !usadasHoje.has(id));
      const id = usadasHoje.has(melhor) && nova && razao(nova) - razao(melhor) <= info[melhor].maxSessao / info[melhor].peso ? nova : melhor;
      let dur = baixo5(Math.min(info[id].maxSessao, cap, livre[id]));
      if (livre[id] < SESSAO_MIN) dur = Math.min(baixo5(cap), Math.ceil(livre[id] / 5) * 5); // o finzinho do conteúdo
      if (dur < 5 || (dur < SESSAO_MIN && livre[id] >= SESSAO_MIN)) { semEspaco.add(id); continue; }
      slots.push({ data: d, materiaId: id, minutos: dur });
      alocado[id] = (alocado[id] || 0) + dur;
      livre[id] -= dur;
      cap -= dur;
      usadasHoje.add(id);
    }
  });
  return { slots, capacidade, conflitos, datas };
}

/* Encaixa o plano de sessões nas metas que já existem, mexendo o mínimo:
   mesma matéria no mesmo dia → fica; atrasada da matéria → vai para o dia
   livre (guarda o dia perdido); outra futura da matéria → muda de dia; o que
   faltar é criado. Futuras sem uso são apagadas; as que têm histórico
   (atrasadas) e não couberam são dispensadas, nunca apagadas. */
export function reconciliar({ metas, slots, hojeIso, estrategia = "redistribuir" }) {
  const livres = metas.filter((m) => ehProgressao(m) && m.status === "pendente"
    && !(m.fixada && m.dataPlanejada >= hojeIso)
    && !(estrategia === "manter" && m.dataPlanejada < hojeIso));
  const usadas = new Set();
  const atribuicoes = slots.map((s) => ({ slot: s, meta: null }));
  const pegar = (filtro, ordenar) => {
    atribuicoes.forEach((a) => {
      if (a.meta) return;
      const opcoes = livres.filter((m) => !usadas.has(m.id) && m.materiaId === a.slot.materiaId && filtro(m, a.slot));
      if (!opcoes.length) return;
      if (ordenar) opcoes.sort(ordenar(a.slot));
      a.meta = opcoes[0];
      usadas.add(a.meta.id);
    });
  };
  pegar((m, s) => m.dataPlanejada === s.data);
  pegar((m) => m.dataPlanejada < hojeIso, () => porData);
  pegar((m) => m.dataPlanejada >= hojeIso, (s) => (a, b) => Math.abs(diasEntre(a.dataPlanejada, s.data)) - Math.abs(diasEntre(b.dataPlanejada, s.data)) || porData(a, b));

  const ordemNoDia = {};
  const criar = [];
  const atualizar = [];
  atribuicoes.forEach(({ slot, meta }) => {
    const ordem = (ordemNoDia[slot.data] = (ordemNoDia[slot.data] ?? 100) + 1);
    if (!meta) { criar.push({ materiaId: slot.materiaId, dataPlanejada: slot.data, duracaoPlanejada: slot.minutos, ordemNoDia: ordem }); return; }
    const patch = {};
    if (meta.dataPlanejada !== slot.data) {
      patch.dataPlanejada = slot.data;
      if (meta.dataPlanejada < hojeIso) patch.datasAnteriores = [...(meta.datasAnteriores || []), meta.dataPlanejada];
    }
    if (meta.duracaoPlanejada !== slot.minutos) patch.duracaoPlanejada = slot.minutos;
    if ((meta.ordemNoDia ?? 0) !== ordem) patch.ordemNoDia = ordem;
    if (meta.fixada) patch.fixada = false;
    if (Object.keys(patch).length) atualizar.push({ id: meta.id, patch });
  });
  const apagar = [];
  const dispensar = [];
  livres.filter((m) => !usadas.has(m.id)).forEach((m) => {
    if (m.dataPlanejada >= hojeIso && !(m.datasAnteriores || []).length) apagar.push(m.id);
    else dispensar.push(m.id);
  });
  return { criar, atualizar, apagar, dispensar };
}

// resumo das metas pendentes de progressão no horizonte (para o registro do recálculo)
export function resumoDoHorizonte(metas, hojeIso) {
  const fim = somarDias(hojeIso, HORIZONTE_DIAS - 1);
  const r = { metas: 0, minutos: 0, porMateria: {} };
  metas.forEach((m) => {
    if (m.status !== "pendente" || !ehProgressao(m) || m.dataPlanejada < hojeIso || m.dataPlanejada > fim) return;
    r.metas += 1;
    r.minutos += m.duracaoPlanejada;
    r.porMateria[m.materiaId] = (r.porMateria[m.materiaId] || 0) + m.duracaoPlanejada;
  });
  return r;
}

/* Concluir uma meta: o que cada tópico recebe. Progressão: os minutos vão
   pela fila da matéria (o atual e, se acabar, o próximo), com a % vista
   antes e depois e os ciclos que terminaram. Revisão: registra o tópico,
   sem mexer na % vista (é prática, não estudo novo). */
export function partesDaConclusao({ meta, itens, progresso = {}, minutos, hojeIso }) {
  if (!ehProgressao(meta)) {
    const it = itens.find((x) => x.itemId === meta.itemId);
    if (!it) return { partes: [{ itemId: meta.itemId, topicoId: meta.topicoId, minutos, ciclo: null, pctAntes: null, pctDepois: null, concluiu: false }], progresso: {}, concluidos: [] };
    const ef = efeitoDosMinutos(it, progresso[it.itemId], 0);
    return { partes: [{ itemId: it.itemId, topicoId: it.topicoId, minutos, ciclo: ef.ciclo, pctAntes: ef.pctAntes, pctDepois: ef.pctAntes, concluiu: false }], progresso: {}, concluidos: [] };
  }
  const { fila } = filaDaMateria(itens.filter((x) => x.materiaId === meta.materiaId), progresso);
  const partes = [];
  const patch = {};
  const concluidos = [];
  let resta = minutos;
  for (const it of fila) {
    if (resta <= 0) break;
    const p = progresso[it.itemId] || {};
    const e = estadoDoTopico(it, p);
    const usa = Math.min(resta, e.restante);
    const ef = efeitoDosMinutos(it, p, usa, { hojeIso });
    partes.push({ itemId: it.itemId, topicoId: it.topicoId, minutos: usa, ciclo: ef.ciclo, pctAntes: ef.pctAntes, pctDepois: ef.pctDepois, concluiu: ef.concluiu });
    // dados antigos: os ciclos deduzidos passam a ser gravados (a dedução depende dos minutos)
    const ciclos = ef.ciclos || (Array.isArray(p.ciclos) ? null : e.ciclos);
    patch[it.itemId] = { minutos: usa, ...(ciclos ? { ciclos } : {}) };
    if (ef.concluiu) concluidos.push(it.itemId);
    resta -= usa;
  }
  if (resta > 0 && partes.length) { // conteúdo da matéria acabou: o tempo extra fica no último tópico estudado
    const ult = partes[partes.length - 1];
    ult.minutos += resta;
    patch[ult.itemId].minutos += resta;
  }
  return { partes, progresso: patch, concluidos };
}
