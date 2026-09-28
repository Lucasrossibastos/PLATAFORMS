/* Estatísticas, calculadas só dos dados do aluno (nada fixo):
     - o resumo de cada dia (flashcards_dias): o que foi respondido, em que
       estado o cartão estava, a avaliação e o tempo;
     - os cartões (estado FSRS atual).
   Funções puras: recebem os documentos e devolvem números para os gráficos. */

import { ESTADOS } from "../dados/modelo.js";
import { chaveDia, somarDias } from "../dados/datas.js";

const DIA_MS = 86400000;

// em que "grupo" entra uma resposta, pelo estado do cartão antes dela
export function grupoDaResposta(estadoAntes) {
  if (estadoAntes === ESTADOS.novo) return "novos";
  if (estadoAntes === ESTADOS.revisao) return "revisao";
  return "aprendendo"; // aprendendo e reaprendendo
}

/* Um resumo por dia: { chave → { novos, aprendendo, revisao, total, ms,
   erros, revisoesFeitas, revisoesCertas } }. revisoesFeitas/Certas contam só
   os cartões em revisão (a "retenção real" do Anki: acertou = não apertou
   Novamente). materiaId: só as respostas daquela matéria. */
export function resumirDias(dias, { materiaId = null } = {}) {
  const r = new Map();
  for (const d of dias || []) {
    const chave = d.dia || d.id;
    const s = { novos: 0, aprendendo: 0, revisao: 0, total: 0, ms: 0, erros: 0, revisoesFeitas: 0, revisoesCertas: 0 };
    for (const e of Object.values(d.revisoes || {})) {
      if (!e || (materiaId && e.materiaId !== materiaId)) continue;
      s[grupoDaResposta(e.estadoAntes)] += 1;
      s.total += 1;
      s.ms += Number(e.duracaoMs) || 0;
      if (e.avaliacao === 1) s.erros += 1;
      if (e.estadoAntes === ESTADOS.revisao) {
        s.revisoesFeitas += 1;
        if (e.avaliacao > 1) s.revisoesCertas += 1;
      }
    }
    if (s.total) r.set(chave, s);
  }
  return r;
}

// soma dos dias entre duas chaves (inclusive)
export function somarPeriodo(resumo, inicio, fim) {
  const t = { novos: 0, aprendendo: 0, revisao: 0, total: 0, ms: 0, erros: 0, revisoesFeitas: 0, revisoesCertas: 0, diasEstudados: 0 };
  for (const [chave, s] of resumo) {
    if (chave < inicio || chave > fim) continue;
    for (const k of Object.keys(s)) t[k] += s[k];
    t.diasEstudados += 1;
  }
  return t;
}

/* Sequência de dias estudados. A atual conta a partir de hoje; se hoje ainda
   não teve estudo, a partir de ontem (a sequência só quebra quando o dia
   acaba sem estudo). inicioJanela: a primeira chave carregada — a sequência
   que chega nela pode ser maior (limitada = true). */
export function sequencia(resumo, hoje, inicioJanela = null) {
  const estudou = (k) => resumo.has(k);
  let k = estudou(hoje) ? hoje : somarDias(hoje, -1);
  let atual = 0;
  while (estudou(k) && (!inicioJanela || k >= inicioJanela)) { atual += 1; k = somarDias(k, -1); }
  const limitada = Boolean(inicioJanela && atual > 0 && somarDias(k, 1) === inicioJanela);
  let maior = 0;
  let corrida = 0;
  let anterior = null;
  for (const chave of [...resumo.keys()].sort()) {
    corrida = anterior && somarDias(anterior, 1) === chave ? corrida + 1 : 1;
    maior = Math.max(maior, corrida);
    anterior = chave;
  }
  return { atual, maior: Math.max(maior, atual), limitada, estudouHoje: estudou(hoje) };
}

/* Série para o gráfico de revisões: um ponto por dia (ou por semana, de
   segunda a domingo, para períodos longos), do mais antigo para hoje. */
export function serieRevisoes(resumo, hoje, dias, { porSemana = false } = {}) {
  const inicio = somarDias(hoje, -(dias - 1));
  const pontos = [];
  if (!porSemana) {
    for (let i = 0; i < dias; i += 1) {
      const chave = somarDias(inicio, i);
      pontos.push({ chave, inicio: chave, fim: chave, ...somarPeriodo(resumo, chave, chave) });
    }
    return pontos;
  }
  // começa na segunda-feira da semana do início
  const [a, m, d] = inicio.split("-").map(Number);
  const recuo = (new Date(a, m - 1, d).getDay() + 6) % 7;
  for (let k = somarDias(inicio, -recuo); k <= hoje; k = somarDias(k, 7)) {
    const fim = somarDias(k, 6) > hoje ? hoje : somarDias(k, 6);
    pontos.push({ chave: k, inicio: k, fim, ...somarPeriodo(resumo, k, fim) });
  }
  return pontos;
}

// estado de exibição de um cartão: suspenso vence o estado FSRS
export function estadoExibido(c) {
  if (c.suspenso) return "suspenso";
  const s = c.fsrs?.state;
  if (s === ESTADOS.novo) return "novo";
  if (s === ESTADOS.revisao) return "revisao";
  return "aprendendo";
}

// quantos cartões em cada estado, por matéria (na ordem das matérias) e no total
export function distribuicao(cartoes, materias) {
  const vazio = () => ({ novo: 0, aprendendo: 0, revisao: 0, suspenso: 0, total: 0, maduros: 0 });
  const por = new Map((materias || []).map((m) => [m.id, vazio()]));
  const total = vazio();
  for (const c of cartoes || []) {
    const e = estadoExibido(c);
    if (!por.has(c.materiaId)) por.set(c.materiaId, vazio());
    for (const alvo of [por.get(c.materiaId), total]) {
      alvo[e] += 1;
      alvo.total += 1;
      // maduro, como no Anki: em revisão com intervalo de 21 dias ou mais
      if (e === "revisao" && (c.fsrs.scheduled_days || 0) >= 21) alvo.maduros += 1;
    }
  }
  const nomes = new Map((materias || []).map((m) => [m.id, m.nome]));
  const linhas = [...por.entries()]
    .map(([id, v]) => ({ id, nome: nomes.get(id) || "Sem matéria", ...v }))
    .filter((l) => l.total > 0);
  return { linhas, total };
}

/* Previsão: quantos cartões já estudados vencem em cada um dos próximos dias
   (o dia 0 inclui os atrasados). Novos e suspensos ficam de fora; o cartão
   enterrado/adiado conta na data em que volta (campo fila). */
export function previsao(cartoes, agora, { virada = 4, dias = 30 } = {}) {
  const hoje = chaveDia(agora, virada);
  const pontos = Array.from({ length: dias }, (_, i) => ({ chave: somarDias(hoje, i), total: 0 }));
  const indice = new Map(pontos.map((p, i) => [p.chave, i]));
  let atrasados = 0;
  for (const c of cartoes || []) {
    if (!c.fila || c.suspenso) continue;
    const quando = new Date(c.fila);
    const chave = chaveDia(quando, virada);
    if (chave < hoje) { atrasados += 1; pontos[0].total += 1; continue; }
    const i = indice.get(chave);
    if (i !== undefined) pontos[i].total += 1;
  }
  return { pontos, atrasados };
}

/* Curva de retenção estimada: a média da probabilidade de lembrar (R do
   FSRS) dos cartões já estudados, hoje e daqui a t dias se nenhum for
   revisado. curva(dias, estabilidade) vem do agendador (a fórmula da
   biblioteca). Cartões novos e suspensos ficam de fora. */
export function curvaRetencao(cartoes, curva, agora, { horizonte = 60, passo = 1 } = {}) {
  const base = [];
  for (const c of cartoes || []) {
    if (c.suspenso || !c.fsrs || c.fsrs.state === ESTADOS.novo || !c.fsrs.last_review || !(c.fsrs.stability > 0)) continue;
    base.push({ decorridos: Math.max(0, (agora.getTime() - new Date(c.fsrs.last_review).getTime()) / DIA_MS), s: c.fsrs.stability });
  }
  if (!base.length) return { cartoes: 0, pontos: [] };
  const pontos = [];
  for (let t = 0; t <= horizonte; t += passo) {
    let soma = 0;
    for (const b of base) soma += curva(b.decorridos + t, b.s);
    pontos.push({ dia: t, r: soma / base.length });
  }
  return { cartoes: base.length, pontos };
}

// limites do calendário: a quantidade de níveis cresce com o próprio histórico (quartis dos dias com estudo)
export function niveisCalendario(valores) {
  const v = valores.filter((x) => x > 0).sort((a, b) => a - b);
  if (!v.length) return [1, 2, 3];
  const q = (p) => v[Math.min(v.length - 1, Math.floor(p * v.length))];
  const lim = [q(0.25), q(0.5), q(0.75)];
  // sem limites repetidos (poucos dias ou todos iguais)
  for (let i = 1; i < lim.length; i += 1) if (lim[i] <= lim[i - 1]) lim[i] = lim[i - 1] + 1;
  return lim;
}

// 0 (sem estudo) a 4
export function nivelDo(valor, limites) {
  if (!valor) return 0;
  if (valor <= limites[0]) return 1;
  if (valor <= limites[1]) return 2;
  if (valor <= limites[2]) return 3;
  return 4;
}
