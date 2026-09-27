/* Estado de estudo do aluno sobre o motor do núcleo.
   Funções puras (ou que só alteram o rascunho recebido), fáceis de testar.
   🔥 FIREBASE: /students/{uid}/plan (semana), /students/{uid}/days/{data}
   (histórico diário) e /students/{uid}/topicProgress. */

import {
  CONQUISTAS_CATALOGO, DESEMPENHO_SIMULADOS_INICIAL, DIAS, MATERIAS_FLAT, TOPICOS_FLAT,
  dataParaDiaSemana, fmtData, gerarSemana, getCicloAluno, getDispAluno, isoLocal,
  recalcularPlanoInteligente, semanaKey, topicoDaVez,
} from "../core/nucleo.js";

export const chaveDoDia = (agora = new Date()) => dataParaDiaSemana(isoLocal(agora));
export const idxDia = (k) => DIAS.findIndex((d) => d.k === k);
const somaMin = (metas) => metas.reduce((s, m) => s + (m.minutos || 0), 0);
const materia = (id) => MATERIAS_FLAT.find((m) => m.id === id);
const topico = (id) => TOPICOS_FLAT.find((t) => t.id === id);

export const corDaMateria = (id) => materia(id)?.areaCor;

// Data ISO de cada dia da semana que começa na segunda `chave`.
export function datasDaSemana(chave) {
  const [y, m, d] = chave.split("-").map(Number);
  return Object.fromEntries(DIAS.map((dia, i) => [dia.k, isoLocal(new Date(y, m - 1, d + i))]));
}

export function contextoMotor(db, uid) {
  return {
    ciclo: getCicloAluno(db.ciclosPorAluno, uid),
    disp: getDispAluno(db.dispPorAluno, uid),
    revisoes: db.revisoes.filter((r) => r.alunoId === uid),
    progresso: db.progressoAlunos[uid] || {},
  };
}

export function gerarSemanaAluno(db, uid) {
  const { ciclo, disp, revisoes, progresso } = contextoMotor(db, uid);
  return gerarSemana(ciclo, disp, revisoes, { progresso });
}

/* Primeiro acesso (mock): a semana corrente já vem cumprida até ontem e há
   quatro semanas de histórico, para o painel não abrir vazio. A aluna de
   exemplo também traz uma pendência da semana anterior. */
export function estudoInicial(db, uid, agora = new Date()) {
  const chave = semanaKey(agora);
  const semana = gerarSemanaAluno(db, uid);
  const datas = datasDaSemana(chave);
  const hIdx = idxDia(chaveDoDia(agora));
  DIAS.slice(0, hIdx).forEach((d) => semana[d.k].forEach((m) => { m.done = true; m.feitoEm = datas[d.k]; }));

  const historico = {};
  const [y, m, dd] = chave.split("-").map(Number);
  for (let i = 1; i <= 28; i++) historico[isoLocal(new Date(y, m - 1, dd - i))] = i % 6 !== 4;

  const atrasadasAnteriores = uid === "alu1"
    ? [{ id: "atr-exemplo", materiaId: "quimica", materia: "Química", topicoId: "qu1", topico: "Físico-Química", minutos: 60, done: false, tipo: "ciclo", origem: "semana passada" }]
    : [];
  return { chave, semana, editada: false, atrasadasAnteriores, historico, registros: [], recadosVistos: [] };
}

/* Semana nova: fecha a anterior no histórico e leva o que ficou pendente. */
export function virarSemana(est, db, uid, agora = new Date()) {
  const chave = semanaKey(agora);
  if (est.chave === chave) return est;
  const datas = datasDaSemana(est.chave);
  const historico = { ...est.historico };
  DIAS.forEach((d) => {
    const metas = est.semana[d.k] || [];
    if (metas.length) historico[datas[d.k]] = metas.every((m) => m.done);
  });
  const limite = isoLocal(new Date(agora.getFullYear(), agora.getMonth(), agora.getDate() - 120));
  Object.keys(historico).forEach((iso) => { if (iso < limite) delete historico[iso]; });

  const origem = `semana de ${fmtData(est.chave).slice(0, 5)}`;
  const pendentes = [...est.atrasadasAnteriores, ...DIAS.flatMap((d) => est.semana[d.k] || [])]
    .filter((m) => !m.done && m.tipo !== "revisao")
    .map((m, i) => ({ ...m, id: `atr-${est.chave}-${i}`, origem: m.origem || origem }));

  return { ...est, chave, semana: gerarSemanaAluno(db, uid), editada: false, atrasadasAnteriores: pendentes, historico };
}

/* Estado válido para hoje: o salvo, ou um novo (primeiro acesso / semana nova). */
export function estudoAtual(db, uid, agora = new Date()) {
  const est = db.estudo[uid];
  if (!est) return estudoInicial(db, uid, agora);
  return virarSemana(est, db, uid, agora);
}

/* ---------- Leituras ---------- */

export function listasDoDia(est, agora = new Date()) {
  const hoje = isoLocal(agora);
  const hIdx = idxDia(chaveDoDia(agora));
  const visivel = (m) => !m.done || m.feitoEm === hoje;
  const atrasadas = [
    ...est.atrasadasAnteriores.filter(visivel),
    ...DIAS.slice(0, hIdx).flatMap((d) =>
      (est.semana[d.k] || []).filter(visivel).map((m) => ({ ...m, origem: d.nome.toLowerCase() }))),
  ];
  return { hoje, metasHoje: est.semana[DIAS[hIdx].k] || [], atrasadas };
}

function statusDia(est, datas, iso, hoje) {
  const k = Object.keys(datas).find((key) => datas[key] === iso);
  if (k) {
    const metas = est.semana[k] || [];
    if (!metas.length) return "livre";
    if (metas.every((m) => m.done)) return "cumprido";
    return iso < hoje ? "perdido" : "aberto";
  }
  if (iso in est.historico) return est.historico[iso] ? "cumprido" : "perdido";
  return "sem-dado";
}

// Dias seguidos com todas as metas feitas. Hoje só conta quando fecha; dia
// sem metas não quebra a sequência.
export function sequencia(est, agora = new Date()) {
  const hoje = isoLocal(agora);
  const datas = datasDaSemana(est.chave);
  const d = new Date(agora.getFullYear(), agora.getMonth(), agora.getDate(), 12);
  let n = 0;
  for (let i = 0; i < 400; i++, d.setDate(d.getDate() - 1)) {
    const iso = isoLocal(d);
    const s = statusDia(est, datas, iso, hoje);
    if (s === "cumprido") n++;
    else if (s === "livre" || (s === "aberto" && iso === hoje)) continue;
    else break;
  }
  return n;
}

// % dos dias do mês (até hoje) com todas as metas feitas. null se não há dados.
export function aderenciaMes(est, agora = new Date()) {
  const hoje = isoLocal(agora);
  const datas = datasDaSemana(est.chave);
  let cumpridos = 0, perdidos = 0;
  for (let d = new Date(agora.getFullYear(), agora.getMonth(), 1, 12); isoLocal(d) <= hoje; d.setDate(d.getDate() + 1)) {
    const s = statusDia(est, datas, isoLocal(d), hoje);
    if (s === "cumprido") cumpridos++;
    if (s === "perdido") perdidos++;
  }
  return cumpridos + perdidos ? Math.round((cumpridos / (cumpridos + perdidos)) * 100) : null;
}

// % do programa: média dos tópicos ponderada pela carga horária.
export function progressoPrograma(progresso = {}) {
  const total = TOPICOS_FLAT.reduce((s, t) => s + t.carga, 0);
  const feito = TOPICOS_FLAT.reduce((s, t) => s + (t.carga * Math.min(100, progresso[t.id] || 0)) / 100, 0);
  return total ? Math.round((feito / total) * 100) : 0;
}

export function resumoAluno(db, uid, est, agora = new Date()) {
  const { hoje, metasHoje, atrasadas } = listasDoDia(est, agora);
  const todas = [...atrasadas, ...metasHoje];
  const feitas = todas.filter((m) => m.done).length;
  const minutosPlanejados = somaMin(todas);
  const minutosEstudados = somaMin(todas.filter((m) => m.done))
    + somaMin(est.registros.filter((r) => r.tipo === "fora" && r.data === hoje));
  const questoes = db.questoes[uid] || [];
  const questoesHoje = questoes.filter((q) => q.data === hoje).reduce((s, q) => s + (q.feitas || 0), 0);
  const totalFeitas = questoes.reduce((s, q) => s + (q.feitas || 0), 0);
  const acertos = questoes.reduce((s, q) => s + (q.acertos || 0), 0);
  const progresso = db.progressoAlunos[uid] || {};
  const streak = sequencia(est, agora);

  const statsConquista = {
    streak,
    totalFeitas,
    taxaAcerto: totalFeitas ? Math.round((acertos / totalFeitas) * 100) : 0,
    topicosConcluidos: Object.values(progresso).filter((v) => v >= 100).length,
    revisoesFeitas: db.revisoes.filter((r) => r.alunoId === uid)
      .reduce((s, r) => s + r.sessoes.filter((x) => x.status === "concluida").length, 0),
    simuladosFeitos: (DESEMPENHO_SIMULADOS_INICIAL[uid]?.geral || []).length,
  };
  const recado = (db.recadosPorAluno[uid] || []).find((r) => !est.recadosVistos.includes(r.id)) || null;

  return {
    hoje, metasHoje, atrasadas, feitas, total: todas.length,
    pct: todas.length ? Math.round((feitas / todas.length) * 100) : 0,
    minutosPlanejados, minutosEstudados, questoesHoje,
    metaQuestoes: Math.round((minutosPlanejados / 60) * (db.config.questoesPorHora || 10)),
    streak,
    aderencia: aderenciaMes(est, agora),
    progresso: progressoPrograma(progresso),
    proximaConquista: CONQUISTAS_CATALOGO.find((c) => !c.regra(statsConquista)) || null,
    proximaMeta: todas.find((m) => !m.done) || null,
    recado,
    ultimoRecado: (db.recadosPorAluno[uid] || [])[0] || null,
  };
}

/* ---------- Escritas (alteram o rascunho) ---------- */

export function acharMeta(est, id) {
  const pendente = est.atrasadasAnteriores.find((m) => m.id === id);
  if (pendente) return pendente;
  for (const d of DIAS) {
    const m = (est.semana[d.k] || []).find((x) => x.id === id);
    if (m) return m;
  }
  return null;
}

export function alternarMeta(est, id, agora = new Date()) {
  const m = acharMeta(est, id);
  if (!m) return null;
  m.done = !m.done;
  if (m.done) m.feitoEm = isoLocal(agora);
  else delete m.feitoEm;
  return m;
}

// Depois de concluir: o tópico ainda tem meta aberta hoje?
export function topicoFechouHoje(est, topicoId, agora = new Date()) {
  if (!topicoId) return false;
  const { metasHoje, atrasadas } = listasDoDia(est, agora);
  return ![...metasHoje, ...atrasadas].some((m) => m.topicoId === topicoId && !m.done);
}

// "Domino o conteúdo" / "concluí mais rápido": tópico a 100% e as metas
// abertas desse tópico passam para o próximo da matéria.
export function dominarTopico(db, uid, topicoId) {
  const progresso = { ...(db.progressoAlunos[uid] || {}), [topicoId]: 100 };
  db.progressoAlunos[uid] = progresso;
  const est = db.estudo[uid];
  const avancar = (m) => {
    if (m.done || m.topicoId !== topicoId || m.tipo === "revisao") return;
    const t = topicoDaVez(m.materiaId, progresso);
    if (t) { m.topicoId = t.id; m.topico = t.nome; }
  };
  est.atrasadasAnteriores.forEach(avancar);
  DIAS.forEach((d) => (est.semana[d.k] || []).forEach(avancar));
}

// "Preciso de mais tempo": nova meta no dia seguinte com mais folga
// (no domingo, fica no próprio dia). Devolve o nome do dia escolhido.
export function adicionarTempoExtra(db, uid, { materiaId, topicoId, minutos }, agora = new Date()) {
  const est = db.estudo[uid];
  const { disp } = contextoMotor(db, uid);
  const hIdx = idxDia(chaveDoDia(agora));
  const folga = (k) => (disp[k] || 0) - somaMin(est.semana[k] || []);
  const seguintes = DIAS.slice(hIdx + 1);
  const destino = seguintes.length ? seguintes.reduce((a, b) => (folga(b.k) > folga(a.k) ? b : a)) : DIAS[hIdx];
  const mat = materia(materiaId);
  est.semana[destino.k].push({
    id: `extra-${Date.now()}`, materiaId, materia: mat?.nome || "",
    topicoId: topicoId || undefined, topico: topico(topicoId)?.nome || mat?.nome || "",
    minutos, done: false, tipo: "ciclo", extra: true,
  });
  return destino.nome;
}

export function registrarEstudoFora(est, { materiaId, topicoId, minutos }, agora = new Date()) {
  est.registros.push({ id: `reg-${Date.now()}`, tipo: "fora", materiaId, topicoId, minutos, data: isoLocal(agora) });
}

export function registrarQuestoes(db, uid, { materiaId, topicoId, feitas, acertos, obs }, agora = new Date()) {
  db.questoes[uid] = db.questoes[uid] || [];
  db.questoes[uid].push({
    id: `q-${Date.now()}`, materiaId, materia: materia(materiaId)?.nome || "",
    topicoId, topico: topico(topicoId)?.nome || "",
    feitas, acertos, erros: feitas - acertos, obs: obs || "", data: isoLocal(agora),
  });
}

export function previaReplanejamento(db, uid, est, agora = new Date()) {
  const { ciclo, disp, revisoes, progresso } = contextoMotor(db, uid);
  const pendentes = est.atrasadasAnteriores.filter((m) => !m.done);
  return recalcularPlanoInteligente(ciclo, disp, est.semana, pendentes, revisoes, { hoje: chaveDoDia(agora), progresso });
}

// Aplica a prévia. O que não coube na semana continua como atrasado.
export function aplicarReplanejamento(db, uid, { semana, resumo }, agora = new Date()) {
  const est = db.estudo[uid];
  const hoje = isoLocal(agora);
  const { naoCouberam = [], ...registro } = resumo;
  const sobras = naoCouberam.map((x, i) => {
    const t = topicoDaVez(x.materiaId, db.progressoAlunos[uid]);
    return {
      id: `atr-sobra-${Date.now()}-${i}`, materiaId: x.materiaId, materia: x.materia,
      topicoId: t?.id, topico: t?.nome || x.materia, minutos: x.minutos,
      done: false, tipo: "ciclo", origem: "sem espaço na semana",
    };
  });
  est.semana = semana;
  est.atrasadasAnteriores = [...est.atrasadasAnteriores.filter((m) => m.done && m.feitoEm === hoje), ...sobras];
  est.editada = false;
  db.historicoReplan.unshift({ id: `rp-${Date.now()}`, alunoId: uid, data: hoje, ...registro });
}

export function moverMeta(est, id, de, para) {
  const i = (est.semana[de] || []).findIndex((m) => m.id === id);
  if (i < 0 || de === para) return;
  const [meta] = est.semana[de].splice(i, 1);
  est.semana[para].push(meta);
  est.editada = true;
}

// Volta à distribuição automática, mantendo o que já foi feito.
export function resetarSemana(db, uid) {
  const est = db.estudo[uid];
  const feitas = new Map(DIAS.flatMap((d) => est.semana[d.k] || []).filter((m) => m.done).map((m) => [m.id, m.feitoEm]));
  const nova = gerarSemanaAluno(db, uid);
  DIAS.forEach((d) => nova[d.k].forEach((m) => {
    if (feitas.has(m.id)) { m.done = true; m.feitoEm = feitas.get(m.id); }
  }));
  est.semana = nova;
  est.editada = false;
}
