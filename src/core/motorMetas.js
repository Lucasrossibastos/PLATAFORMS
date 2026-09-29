/* Motor das metas diárias (funções puras; quem grava é services/metas.js).

   Horizonte: hoje + 13 dias (duas semanas), refeito a cada virada de dia e a
   cada mudança que afeta o plano. Metas concluídas nunca mudam.

   Orçamento de cada dia (horário semanal vigente naquele dia):
     1. revisões (recorrentes e as automáticas antigas) — tempo fixo, primeiro;
        se só elas passam do dia, o dia fica em CONFLITO (visível), nada é
        cortado nem empurrado em silêncio;
     2. metas que o aluno fixou num dia (arrastou) e o que ele já estudou hoje;
     3. o resto vai para a PROGRESSÃO, dividido pelo peso das matérias.

   Tamanho das metas: de 30 em 30 minutos, nunca menos de 30 (revisões
   também). Cada matéria tem uma META MÉDIA (referência, não regra): a meta
   fica na faixa de 30 min abaixo a 30 min acima dela. Só uma meta por dia
   pode sair "quebrada" (ex.: 50 min): a que completa o tempo livre do dia.

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

import { diasEntre, inicioDaSemana, somarDias } from "./datas.js";
import { minutosNoDia } from "./horario.js";
import { efeitoDosMinutos, estadoDoTopico, filaDaMateria } from "./ciclos.js";
import { pesosDoPlano } from "./jornada.js";
import { BLOCO_META, duracaoDaMeta } from "./plano.js";
import { ocorrenciasNoHorizonte, parametrosAtuais } from "./revisaoRecorrente.js";

export const HORIZONTE_DIAS = 14;
// duração em blocos de 30 (a mais próxima, nunca menos de 30): revisões e dados antigos
export const emBlocos = (min) => Math.max(BLOCO_META, Math.round((Number(min) || 0) / BLOCO_META) * BLOCO_META);
const abaixo30 = (min) => Math.floor(min / BLOCO_META) * BLOCO_META;
const acima30 = (min) => Math.ceil(min / BLOCO_META) * BLOCO_META;
/* A faixa de uma meta em torno da média da matéria (média antiga fora de 30
   vale a mais próxima: 80 → 90): de 30 min abaixo (nunca menos de 30) a
   30 min acima. */
export const VARIACAO_META = 30;
export function faixaDaMeta(mediaMin) {
  const media = emBlocos(mediaMin);
  return { media, min: Math.max(BLOCO_META, media - VARIACAO_META), max: media + VARIACAO_META };
}
export const ESTRATEGIAS_ATRASO = {
  redistribuir: "Levar para os próximos dias",
  manter: "Deixar no dia, como atrasada",
};

export const ehProgressao = (m) => m.categoria === "progressao" || m.categoria === "rever_do_zero";
export const diasDoHorizonte = (hojeIso, n = HORIZONTE_DIAS) => Array.from({ length: n }, (_, i) => somarDias(hojeIso, i));
const porData = (a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada) || (a.ordemNoDia ?? 0) - (b.ordemNoDia ?? 0) || String(a.id).localeCompare(String(b.id));

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

/* Tamanho de uma meta, dentro da faixa da matéria: a média, ou mais (até o
   máximo) para fechar o tópico atual numa meta só; menos (até o mínimo)
   para caber no que resta do dia; o fim do conteúdo da matéria pode dar uma
   meta menor. 0 = não cabe na faixa hoje. A meta segue a fila da matéria:
   termina um tópico e continua no próximo. */
const somaLista = (lista) => lista.reduce((a, b) => a + b, 0);
function consumirDaFila(lista, minutos) {
  let m = minutos;
  while (m > 0 && lista.length) {
    const usa = Math.min(m, lista[0]);
    lista[0] -= usa;
    m -= usa;
    if (lista[0] <= 0) lista.shift();
  }
}
export function tamanhoDaMeta(lista, { media, min, max }, cap) {
  const falta = somaLista(lista);
  if (!falta) return 0;
  const fimDaMateria = acima30(falta);
  const fechaTopico = acima30(lista[0]);
  const alvo = Math.min(fechaTopico > media && fechaTopico <= max ? fechaTopico : media, fimDaMateria);
  const dur = Math.min(alvo, abaixo30(cap));
  if (dur < BLOCO_META || (dur < min && dur < fimDaMateria)) return 0;
  return dur;
}

/* Encolhe metas do dia (de 30 em 30, da última para a primeira, sem sair da
   faixa) até sobrar `precisa` minutos; devolve quanto liberou. Os minutos
   liberados voltam para a fila da matéria. */
function encolher(doDia, livre, precisa, info, pendente, somar) {
  const liberavel = doDia.reduce((a, s) => a + abaixo30(s.minutos - info[s.materiaId].min), 0);
  if (livre + liberavel < precisa) return 0;
  let liberou = 0;
  for (const s of [...doDia].reverse()) {
    while (livre + liberou < precisa && s.minutos - BLOCO_META >= info[s.materiaId].min) {
      s.minutos -= BLOCO_META;
      pendente[s.materiaId].unshift(BLOCO_META);
      somar(s.materiaId, -BLOCO_META);
      liberou += BLOCO_META;
    }
  }
  return liberou;
}

/* Enche o que sobrou do dia: blocos de 30 esticam as metas (da última para
   a primeira, sem sair da faixa nem passar do conteúdo); o resto (< 30)
   completa o dia numa única meta "quebrada", no fim — esticando uma meta
   dentro da faixa ou, se nenhuma pode, tirando 30 de uma meta (que continua
   na faixa) e fazendo uma de 30 + resto (de preferência de outra matéria).
   Sem como fechar dentro das faixas, o dia fica com a folga. */
function completarDia(doDia, sobra, info, pendente, somar) {
  let resto = sobra;
  let mexeu = true;
  while (resto >= BLOCO_META && mexeu) {
    mexeu = false;
    for (const s of [...doDia].reverse()) {
      if (resto < BLOCO_META) break;
      if (s.minutos + BLOCO_META > info[s.materiaId].max || !pendente[s.materiaId].length) continue;
      s.minutos += BLOCO_META;
      consumirDaFila(pendente[s.materiaId], BLOCO_META);
      somar(s.materiaId, BLOCO_META);
      resto -= BLOCO_META;
      mexeu = true;
    }
  }
  if (resto <= 0 || resto >= BLOCO_META || !doDia.length) return [];
  const esticar = [...doDia].reverse().find((s) => s.minutos + resto <= info[s.materiaId].max);
  if (esticar) {
    esticar.minutos += resto;
    esticar.completa = true;
    consumirDaFila(pendente[esticar.materiaId], resto);
    somar(esticar.materiaId, resto);
    return [];
  }
  const tam = BLOCO_META + resto;
  const naFaixa = (id) => info[id].min <= tam && tam <= info[id].max;
  const cortar = [...doDia].reverse().find((s) => s.minutos - BLOCO_META >= info[s.materiaId].min);
  if (!cortar) return [];
  const usadas = new Set(doDia.map((s) => s.materiaId));
  const outra = Object.keys(pendente).find((id) => !usadas.has(id) && pendente[id].length && naFaixa(id));
  const materiaId = outra || (naFaixa(cortar.materiaId) ? cortar.materiaId : null);
  if (!materiaId) return [];
  cortar.minutos -= BLOCO_META;
  somar(cortar.materiaId, -BLOCO_META);
  if (outra) { pendente[cortar.materiaId].unshift(BLOCO_META); consumirDaFila(pendente[outra], tam); } // os 30 voltam para a fila
  else consumirDaFila(pendente[materiaId], resto);
  somar(materiaId, tam);
  return [{ data: cortar.data, materiaId, minutos: tam, completa: true }];
}

/* Orçamento e plano de sessões de progressão para o horizonte.

   Divisão justa pelo peso, semana a semana (segunda a domingo): a próxima
   sessão vai para a matéria com menos minutos na semana por ponto de peso.
   A conta da semana inclui o que já foi feito nela, então refazer o plano
   num dia em que o aluno cumpriu tudo dá o mesmo plano de antes (nada se
   embaralha), e toda matéria visível aparece ao menos uma vez por semana. */
export function planejarHorizonte({ hojeIso, plano, itens, progresso = {}, metas = [], dias = HORIZONTE_DIAS, estrategia = "redistribuir" }) {
  const datas = diasDoHorizonte(hojeIso, dias);
  const dentro = new Set(datas);
  const semanaDeHoje = inicioDaSemana(hojeIso);
  const reservado = Object.fromEntries(datas.map((d) => [d, { revisoes: 0, fixadas: 0, feitas: 0 }]));
  // minutos de cada matéria já contados em cada semana (feitos ou presos em metas que o motor não mexe)
  const naSemana = {};
  const contar = (semana, materiaId, min) => { const s = (naSemana[semana] ||= {}); s[materiaId] = (s[materiaId] || 0) + min; };
  const prometido = {}; // conteúdo que já tem meta (não é planejado de novo)
  const feitoHoje = new Set();
  metas.forEach((m) => {
    if (m.status === "dispensada") return;
    if (!ehProgressao(m)) {
      if (dentro.has(m.dataPlanejada)) reservado[m.dataPlanejada].revisoes += m.duracaoPlanejada;
      return;
    }
    if (m.status === "concluida") {
      const min = m.duracaoReal || m.duracaoPlanejada;
      if (m.concluidaEm === hojeIso) { reservado[hojeIso].feitas += min; feitoHoje.add(m.materiaId); }
      if (m.concluidaEm >= semanaDeHoje && m.concluidaEm <= hojeIso) contar(semanaDeHoje, m.materiaId, min);
      return;
    }
    const fixa = m.fixada && m.dataPlanejada >= hojeIso;
    const mantida = estrategia === "manter" && m.dataPlanejada < hojeIso; // atrasada que fica no dia dela
    if (!fixa && !mantida) return;
    if (fixa && dentro.has(m.dataPlanejada)) reservado[m.dataPlanejada].fixadas += m.duracaoPlanejada;
    prometido[m.materiaId] = (prometido[m.materiaId] || 0) + m.duracaoPlanejada;
    contar(fixa ? inicioDaSemana(m.dataPlanejada) : semanaDeHoje, m.materiaId, m.duracaoPlanejada);
  });

  const conflitos = [];
  const capacidade = {};
  datas.forEach((d) => {
    const dia = minutosNoDia(plano, d);
    const r = reservado[d];
    if (r.revisoes > dia) conflitos.push({ data: d, minutosRevisoes: r.revisoes, minutosDia: dia });
    capacidade[d] = Math.max(0, dia - r.revisoes - r.fixadas - r.feitas);
  });

  // o que cada matéria visível ainda tem para estudar
  const pesos = pesosDoPlano(plano);
  const materias = (plano?.materias || []).filter((m) => m.ativa !== false);
  const ordemPlano = new Map(materias.map((m, i) => [m.materiaId, i]));
  /* O que falta de cada tópico, na ordem da fila de cada matéria (o que já
     está preso em metas que o motor não mexe sai do começo da fila). */
  const pendente = {};
  filasDoPlano(itens, progresso).forEach(({ fila, estados }, materiaId) => {
    if (!ordemPlano.has(materiaId)) return;
    const lista = fila.map((it) => estados.get(it.itemId).restante).filter((x) => x > 0);
    consumirDaFila(lista, prometido[materiaId] || 0);
    pendente[materiaId] = lista;
  });
  const info = Object.fromEntries(materias.map((m) => {
    return [m.materiaId, { ...faixaDaMeta(duracaoDaMeta(plano, m)), prioridade: m.prioridade ?? 2, peso: pesos[m.materiaId] || 1 }];
  }));

  const slots = [];
  let semana = null;
  let alocado = {};
  const razao = (id) => (alocado[id] || 0) / info[id].peso;
  const somar = (id, min) => { alocado[id] = (alocado[id] || 0) + min; };
  datas.forEach((d) => {
    if (inicioDaSemana(d) !== semana) {
      semana = inicioDaSemana(d);
      alocado = { ...(naSemana[semana] || {}) };
    }
    let cap = capacidade[d];
    const usadasHoje = new Set(d === hojeIso ? feitoHoje : []);
    const semEspaco = new Set();
    const doDia = [];
    while (cap >= BLOCO_META) {
      const candidatas = Object.keys(pendente).filter((id) => pendente[id].length && !semEspaco.has(id));
      if (!candidatas.length) break;
      candidatas.sort((a, b) => razao(a) - razao(b) || info[a].prioridade - info[b].prioridade || ordemPlano.get(a) - ordemPlano.get(b));
      // não repetir matéria no dia: a que ainda não apareceu passa na frente se estiver a menos de uma sessão da primeira
      const melhor = candidatas[0];
      const nova = candidatas.find((id) => !usadasHoje.has(id));
      const id = usadasHoje.has(melhor) && nova && razao(nova) - razao(melhor) <= info[melhor].media / info[melhor].peso ? nova : melhor;
      let dur = tamanhoDaMeta(pendente[id], info[id], cap);
      // não coube na faixa: abre espaço encolhendo as metas do dia (sem tirá-las da faixa)
      if (!dur) {
        cap += encolher(doDia, cap, info[id].min, info, pendente, somar);
        dur = tamanhoDaMeta(pendente[id], info[id], cap);
      }
      if (!dur) { semEspaco.add(id); continue; }
      doDia.push({ data: d, materiaId: id, minutos: dur });
      somar(id, dur);
      consumirDaFila(pendente[id], dur);
      cap -= dur;
      usadasHoje.add(id);
    }
    // dia curto demais para a faixa de qualquer matéria: uma meta do tamanho do dia (melhor que nada)
    if (!doDia.length && cap >= BLOCO_META) {
      const id = Object.keys(pendente).filter((x) => pendente[x].length)
        .sort((a, b) => razao(a) - razao(b) || info[a].prioridade - info[b].prioridade || ordemPlano.get(a) - ordemPlano.get(b))[0];
      if (id) {
        const dur = Math.min(abaixo30(cap), acima30(somaLista(pendente[id])));
        doDia.push({ data: d, materiaId: id, minutos: dur });
        somar(id, dur);
        consumirDaFila(pendente[id], dur);
        cap -= dur;
      }
    }
    const extra = completarDia(doDia, cap, info, pendente, somar);
    // a meta que completa o dia vai por último
    const dia = [...doDia, ...extra].sort((a, b) => (a.completa ? 1 : 0) - (b.completa ? 1 : 0));
    slots.push(...dia.map(({ completa: _c, ...s }) => s));
  });
  return { slots, capacidade, conflitos, datas };
}

/* Metas das revisões recorrentes no horizonte (entram antes da progressão).
   Concluídas e atrasadas nunca mudam. Das futuras pendentes: a que ainda cai
   numa data do ciclo fica (com a duração da versão atual); a que não cai
   mais sai. Revisão desativada: as futuras saem e as atrasadas por fazer são
   dispensadas (ficam no histórico como não cumpridas). */
export const idMetaRevisao = (revisaoId, data) => `rr_${revisaoId}_${data}`;
export function planejarRevisoes({ revisoes = [], metas, hojeIso, dias = HORIZONTE_DIAS }) {
  const fim = somarDias(hojeIso, dias - 1);
  const r = { criar: [], atualizar: [], apagar: [], dispensar: [] };
  revisoes.forEach((rev) => {
    const minhas = metas.filter((m) => m.categoria === "revisao_recorrente" && m.revisaoRecorrenteId === rev.id);
    const ultimaFeitaEm = minhas.filter((m) => m.status === "concluida").map((m) => m.concluidaEm).sort().at(-1) || null;
    const atrasadas = minhas.filter((m) => m.status === "pendente" && m.dataPlanejada < hojeIso);
    const datas = ocorrenciasNoHorizonte(rev, hojeIso, fim, { ultimaFeitaEm, atrasadaPendente: atrasadas.length > 0 });
    const p = parametrosAtuais(rev);
    const dur = p ? emBlocos(p.duracaoMin) : null; // de 30 em 30 (revisões antigas de 20 viram 30)
    if (!rev.ativo) atrasadas.forEach((m) => r.dispensar.push(m.id));
    minhas.filter((m) => m.status === "pendente" && m.dataPlanejada >= hojeIso).forEach((m) => {
      if (!datas.includes(m.ocorrenciaEm || m.dataPlanejada)) (m.datasAnteriores?.length ? r.dispensar : r.apagar).push(m.id);
      else if (p && m.duracaoPlanejada !== dur) r.atualizar.push({ id: m.id, patch: { duracaoPlanejada: dur } });
    });
    const cobertas = new Set(minhas.map((m) => m.ocorrenciaEm || m.dataPlanejada));
    datas.filter((d) => !cobertas.has(d)).forEach((d) => r.criar.push({
      id: idMetaRevisao(rev.id, d), categoria: "revisao_recorrente", revisaoRecorrenteId: rev.id, ocorrenciaEm: d,
      materiaId: rev.materiaId, itemId: rev.itemId, topicoId: rev.topicoId, dataPlanejada: d, duracaoPlanejada: dur, ordemNoDia: 10,
    }));
  });
  return r;
}

/* Revisões automáticas antigas (7/15/30 dias, coleção revisoes): não nascem
   mais, mas as já agendadas terminam o ciclo como metas. */
export const idMetaRevisaoAntiga = (revisaoId, dia) => `ra_${revisaoId}_${dia}`;
export function metasDasRevisoesAntigas({ revisoes = [], metas, hojeIso, dias = HORIZONTE_DIAS }) {
  const fim = somarDias(hojeIso, dias - 1);
  const existe = new Set(metas.map((m) => m.id));
  const criar = [];
  revisoes.forEach((r) => (r.sessoes || []).forEach((s) => {
    const id = idMetaRevisaoAntiga(r.id, s.dia);
    if (s.status !== "agendada" || s.dia > fim || existe.has(id)) return;
    criar.push({
      id, categoria: "revisao_automatica", revisaoAntigaId: r.id, revisaoDia: s.dia, materiaId: r.materiaId,
      itemId: r.itemId || null, topicoId: r.topicoId || null, dataPlanejada: s.dia, duracaoPlanejada: emBlocos(r.duracaoMin || BLOCO_META), ordemNoDia: 20,
    });
  }));
  return criar;
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

/* Uma execução completa do motor: revisões antigas que ainda faltam,
   revisões recorrentes e, com o que sobra de cada dia, a progressão.
   Devolve as mudanças (ninguém grava aqui) e os conflitos do horizonte. */
export function recalcularMetas({ hojeIso, plano, itens, progresso = {}, metas = [], revisoes = [], revisoesAntigas = [], dias = HORIZONTE_DIAS }) {
  const estrategia = plano?.atraso === "manter" ? "manter" : "redistribuir";
  const antigas = metasDasRevisoesAntigas({ revisoes: revisoesAntigas, metas, hojeIso, dias });
  const rec = planejarRevisoes({ revisoes, metas, hojeIso, dias });
  const comRevisoes = aplicarMudancas(metas, { criar: [...antigas, ...rec.criar], atualizar: rec.atualizar, apagar: rec.apagar, dispensar: rec.dispensar });
  const h = planejarHorizonte({ hojeIso, plano, itens, progresso, metas: comRevisoes, dias, estrategia });
  const prog = reconciliar({ metas: comRevisoes, slots: h.slots, hojeIso, estrategia });
  return {
    criar: [...antigas, ...rec.criar, ...prog.criar.map((c) => ({ categoria: "progressao", ...c }))],
    atualizar: [...rec.atualizar, ...prog.atualizar],
    apagar: [...rec.apagar, ...prog.apagar],
    dispensar: [...rec.dispensar, ...prog.dispensar],
    conflitos: h.conflitos,
    capacidade: h.capacidade,
  };
}

// as metas depois das mudanças (para simular e para o registro de antes/depois)
export function aplicarMudancas(metas, { criar = [], atualizar = [], apagar = [], dispensar = [] }, novoId = (i) => `nova${i}`) {
  const fora = new Set(apagar);
  const disp = new Set(dispensar);
  const patch = new Map();
  atualizar.forEach((a) => patch.set(a.id, { ...(patch.get(a.id) || {}), ...a.patch }));
  return [
    ...metas.filter((m) => !fora.has(m.id)).map((m) => {
      const x = patch.has(m.id) ? { ...m, ...patch.get(m.id) } : m;
      return disp.has(m.id) ? { ...x, status: "dispensada" } : x;
    }),
    ...criar.map((c, i) => ({ status: "pendente", datasAnteriores: [], ...c, id: c.id || novoId(i) })),
  ];
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
