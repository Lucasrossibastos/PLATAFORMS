/* Ciclos de estudo de um tópico e a porcentagem vista.

   Um tópico pode ser estudado mais de uma vez ("rever do zero"): cada vez é
   um CICLO, e nenhum ciclo é apagado nem reescrito.

   progresso.itens[itemId] = { minutos, concluido?, concluidoEm?, ciclos?: [Ciclo] }
   Ciclo = { n, base, origem: "progressao" | "rever_do_zero", inicio?,
             concluido?, concluidoEm?, concluidoPor?: "tempo" | "marcado",
             reabertoEm?, reabertoPor?, naFila? }

   base: minutos acumulados do tópico quando o ciclo começou. Os minutos do
   ciclo são `minutos − base`, o que funciona com o incremento atômico que a
   sessão de estudo já grava.

   Dados antigos (sem `ciclos`): os ciclos são deduzidos dos campos antigos
   na leitura, sem gravar nada. O "Ver de novo" antigo apagava a data da
   conclusão (concluido: false, sem concluidoEm): vira ciclo 1 concluído com a
   data perdida marcada e um ciclo 2 aberto, com o tempo inteiro do tópico.

   Fila da matéria: os tópicos pendentes na ordem do edital; os que voltaram
   por "rever do zero" (naFila) esperam no fim, até o aluno puxá-los para a
   frente. O primeiro da fila é o tópico ATUAL (no máximo um por matéria);
   pendente com tempo, mas fora da vez, está PAUSADO (guarda a porcentagem). */

export const STATUS_TOPICO = {
  nao_visto: "Não visto",
  em_andamento: "Em andamento",
  pausado: "Pausado",
  a_rever: "Na fila para rever",
  concluido: "Concluído",
};

const cicloAberto = (n, base, extra = {}) => ({ n, base, origem: n === 1 ? "progressao" : "rever_do_zero", ...extra });

// os ciclos de um tópico (deduzidos para dados antigos)
export function ciclosDoItem(item, p = {}) {
  if (Array.isArray(p.ciclos) && p.ciclos.length) return p.ciclos;
  const minutos = p.minutos || 0;
  if (p.concluido === false) {
    // "Ver de novo" antigo: a primeira conclusão aconteceu, mas a data foi apagada
    return [
      { n: 1, base: 0, origem: "progressao", concluido: true, concluidoEm: null, dataPerdida: true },
      cicloAberto(2, Math.min(minutos, item.duracao), { reabertoEm: null }),
    ];
  }
  if (p.concluido === true) return [{ n: 1, base: 0, origem: "progressao", concluido: true, concluidoEm: p.concluidoEm || null, concluidoPor: "marcado" }];
  if (minutos >= item.duracao) return [{ n: 1, base: 0, origem: "progressao", concluido: true, concluidoEm: p.concluidoEm || null, concluidoPor: "tempo" }];
  return [cicloAberto(1, 0)];
}

/* Estado do tópico agora: ciclo atual, minutos e porcentagem do ciclo, e a
   porcentagem VISTA (a que entra no progresso: tópico já concluído uma vez
   conta como visto, mesmo sendo revisto do zero). */
export function estadoDoTopico(item, p = {}) {
  const ciclos = ciclosDoItem(item, p);
  const atual = ciclos[ciclos.length - 1];
  const minutosCiclo = Math.max(0, (p.minutos || 0) - (atual.base || 0));
  const concluido = atual.concluido === true || minutosCiclo >= item.duracao;
  const pctCiclo = concluido ? 1 : Math.min(1, minutosCiclo / item.duracao);
  const vezesConcluido = ciclos.filter((c, i) => c.concluido === true || (i === ciclos.length - 1 && concluido)).length;
  return {
    ciclo: atual.n,
    ciclos,
    minutosCiclo,
    concluido,
    restante: concluido ? 0 : Math.max(0, item.duracao - minutosCiclo),
    pctCiclo,
    pctVisto: vezesConcluido ? 1 : pctCiclo,
    vezesConcluido,
    naFila: !concluido && atual.naFila === true,
  };
}

/* Fila de uma matéria: `itens` já na ordem do edital. Devolve a fila de
   pendentes, o tópico atual e o status de cada tópico. */
export function filaDaMateria(itens, progresso = {}) {
  const estados = new Map(itens.map((it) => [it.itemId, estadoDoTopico(it, progresso[it.itemId])]));
  const pendentes = itens.filter((it) => !estados.get(it.itemId).concluido);
  const ordemReabertura = (it) => estados.get(it.itemId).ciclos.at(-1).reabertoEm || "";
  const fila = [
    ...pendentes.filter((it) => !estados.get(it.itemId).naFila),
    ...pendentes.filter((it) => estados.get(it.itemId).naFila).sort((a, b) => ordemReabertura(a).localeCompare(ordemReabertura(b))),
  ];
  const atual = fila[0] || null;
  const status = {};
  itens.forEach((it) => {
    const e = estados.get(it.itemId);
    if (e.concluido) status[it.itemId] = "concluido";
    else if (it === atual) status[it.itemId] = e.minutosCiclo > 0 ? "em_andamento" : e.ciclo > 1 ? "a_rever" : "nao_visto";
    else if (e.minutosCiclo > 0) status[it.itemId] = "pausado";
    else status[it.itemId] = e.ciclo > 1 ? "a_rever" : "nao_visto";
  });
  return { fila, atual, status, estados };
}

/* "Rever do zero": abre um ciclo novo num tópico concluído. O ciclo anterior
   fica como está (com a data da conclusão). O tópico volta para o fim da fila
   da matéria (naFila); o aluno pode puxá-lo para a frente. */
export function reabrirTopico(item, p = {}, { hojeIso, por }) {
  const e = estadoDoTopico(item, p);
  if (!e.concluido) return { ok: false, erro: "Só dá para rever do zero um tópico já concluído." };
  const ciclos = e.ciclos.map((c, i) => (i === e.ciclos.length - 1 && !c.concluido
    // concluiu pelo tempo e ainda não estava gravado: a data é a registrada, nunca inventada
    ? { ...c, concluido: true, concluidoEm: c.concluidoEm || p.concluidoEm || null, concluidoPor: "tempo", ...(c.concluidoEm || p.concluidoEm ? {} : { dataPerdida: true }) }
    : c));
  ciclos.push(cicloAberto(ciclos.length + 1, p.minutos || 0, { reabertoEm: hojeIso, reabertoPor: por, naFila: true }));
  return { ok: true, ciclos };
}

// marcar como visto fora do fluxo (Edital): conclui o ciclo atual
export function marcarTopicoVisto(item, p = {}, { hojeIso, por }) {
  const e = estadoDoTopico(item, p);
  if (e.concluido) return { ok: false, erro: "Este tópico já está concluído." };
  const ciclos = e.ciclos.map((c, i) => (i === e.ciclos.length - 1 ? { ...c, concluido: true, concluidoEm: hojeIso, concluidoPor: "marcado", marcadoPor: por } : c));
  return { ok: true, ciclos };
}

// o aluno puxou o tópico para a frente da fila: deixa de esperar no fim
export function tirarDoFimDaFila(item, p = {}) {
  const e = estadoDoTopico(item, p);
  if (!e.naFila) return null;
  return e.ciclos.map((c, i) => (i === e.ciclos.length - 1 ? { ...c, naFila: false } : c));
}

/* Efeito de minutos estudados num tópico: a porcentagem antes e depois (é o
   que a meta registra ao ser concluída) e se o ciclo terminou agora. */
export function efeitoDosMinutos(item, p = {}, minutos, { hojeIso } = {}) {
  const antes = estadoDoTopico(item, p);
  const depoisP = { ...p, minutos: (p.minutos || 0) + minutos, ...(Array.isArray(p.ciclos) ? {} : { ciclos: antes.ciclos }) };
  const depois = estadoDoTopico(item, depoisP);
  const concluiu = !antes.concluido && depois.concluido;
  const ciclos = concluiu
    ? depois.ciclos.map((c, i) => (i === depois.ciclos.length - 1 ? { ...c, concluido: true, concluidoEm: hojeIso || null, concluidoPor: "tempo" } : c))
    : null;
  return {
    itemId: item.itemId, topicoId: item.topicoId, minutos, ciclo: antes.ciclo,
    pctAntes: arred(antes.pctCiclo), pctDepois: arred(depois.pctCiclo), concluiu, ciclos,
  };
}

const arred = (x) => Math.round(x * 1000) / 1000;

/* Progresso visto: por tópico, por matéria e do plano, ponderado pela
   duração de cada tópico. `itens` é a lista do plano (itensDoPlano). */
export function progressoVisto(itens, progresso = {}) {
  const topicos = {};
  const materias = {};
  let feito = 0;
  let total = 0;
  itens.forEach((it) => {
    const e = estadoDoTopico(it, progresso[it.itemId]);
    topicos[it.itemId] = { pctVisto: arred(e.pctVisto), pctCiclo: arred(e.pctCiclo), ciclo: e.ciclo, vezesConcluido: e.vezesConcluido };
    const m = (materias[it.materiaId] ||= { feito: 0, total: 0 });
    m.feito += e.pctVisto * it.duracao;
    m.total += it.duracao;
    feito += e.pctVisto * it.duracao;
    total += it.duracao;
  });
  const pct = (a, b) => (b ? Math.round((a / b) * 1000) / 10 : 0);
  return {
    plano: pct(feito, total),
    materias: Object.fromEntries(Object.entries(materias).map(([id, m]) => [id, pct(m.feito, m.total)])),
    topicos,
  };
}
