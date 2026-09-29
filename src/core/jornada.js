/* Jornada do aluno: o plano individual (planos/{alunoId}) continua sendo um
   documento completo, calculado; o que muda é que ele passa a saber o que foi
   HERDADO da jornada geral (template) e o que foi SOBRESCRITO para o aluno.

   plano.sobrescritos = { [materiaId]: { peso?, ativa?, maxSessao?, prioridade?,
                                         ritmo?, topicos?, removida? : true } }
   A ordem própria dos tópicos já fica à parte em plano.ordemTopicos[materiaId]
   (o aluno ou o moderador reordenou): a presença dela é o override de ordem.

   Plano antigo, sem `sobrescritos`: o mapa é deduzido comparando com a
   jornada (marcado como inferido; ajuste o que ficar errado no painel).

   Peso: número de 1 a 10, relativo — a fatia de cada matéria nas metas é
   peso ÷ soma dos pesos. Plano antigo, sem peso: deduzido dos minutos por
   semana de hoje (a matéria com mais minutos vale 10; as outras, na mesma
   proporção, no mínimo 1). */

export const PESO_MIN = 1;
export const PESO_MAX = 10;
export const CAMPOS_MATERIA = ["peso", "ativa", "maxSessao", "prioridade", "ritmo"];
const PADRAO = { ativa: true, maxSessao: 60, prioridade: 2, ritmo: 1 };

export function validarPeso(v) {
  const n = Number(v);
  return Number.isInteger(n) && n >= PESO_MIN && n <= PESO_MAX
    ? { ok: true, erros: {} }
    : { ok: false, erros: { peso: `Peso: número inteiro de ${PESO_MIN} a ${PESO_MAX}.` } };
}

// pesos de todas as matérias do plano (os que faltam, deduzidos dos minutos)
export function pesosDoPlano(plano) {
  const materias = plano?.materias || [];
  const maxMin = Math.max(0, ...materias.map((m) => m.minutosSemanais || 0));
  return Object.fromEntries(materias.map((m) => {
    if (m.peso != null) return [m.materiaId, Number(m.peso)];
    const deduzido = maxMin ? Math.round((PESO_MAX * (m.minutosSemanais || 0)) / maxMin) : PESO_MIN;
    return [m.materiaId, Math.min(PESO_MAX, Math.max(PESO_MIN, deduzido))];
  }));
}

// fatia de cada matéria visível (soma 1): é o que decide a frequência nas metas
export function participacao(plano) {
  const pesos = pesosDoPlano(plano);
  const ativas = (plano?.materias || []).filter((m) => m.ativa !== false);
  const soma = ativas.reduce((s, m) => s + pesos[m.materiaId], 0);
  return Object.fromEntries(ativas.map((m) => [m.materiaId, soma ? pesos[m.materiaId] / soma : 0]));
}

const valorCampo = (plano, m, campo) => (campo === "peso" ? pesosDoPlano(plano)[m.materiaId] : campo === "ativa" ? m?.ativa !== false : m?.[campo] ?? PADRAO[campo] ?? null);
const assinaturaTopicos = (m) => JSON.stringify((m?.topicos || []).map((t) => [t.topicoId, t.cargaMin ?? null, (t.subtopicos || []).map((s) => s.subtopicoId)]));

/* Mapa do que está sobrescrito no aluno (explícito, ou deduzido da jornada
   para planos antigos). Inclui `ordem` (há ordemTopicos para a matéria). */
export function sobrescritosDoPlano(plano, modelo) {
  const ordem = plano?.ordemTopicos || {};
  const comOrdem = (mapa) => Object.fromEntries((plano?.materias || []).map((m) => [
    m.materiaId, { ...(mapa[m.materiaId] || {}), ...(Array.isArray(ordem[m.materiaId]) && ordem[m.materiaId].length ? { ordem: true } : {}) },
  ]));
  if (plano?.sobrescritos) return { mapa: { ...plano.sobrescritos, ...comOrdem(plano.sobrescritos) }, inferido: false };
  const inferido = {};
  (plano?.materias || []).forEach((m) => {
    const naJornada = modelo?.materias?.find((x) => x.materiaId === m.materiaId);
    if (!naJornada) { inferido[m.materiaId] = { soNoAluno: true }; return; }
    const campos = {};
    CAMPOS_MATERIA.forEach((c) => { if (valorCampo(plano, m, c) !== valorCampo(modelo, naJornada, c)) campos[c] = true; });
    if (assinaturaTopicos(m) !== assinaturaTopicos(naJornada)) campos.topicos = true;
    inferido[m.materiaId] = campos;
  });
  (modelo?.materias || []).forEach((mm) => {
    if (!plano?.materias?.some((m) => m.materiaId === mm.materiaId)) inferido[mm.materiaId] = { removida: true };
  });
  return { mapa: { ...inferido, ...comOrdem(inferido) }, inferido: true };
}

/* Jornada efetiva para o painel do moderador: cada matéria com o valor de
   cada campo, o da jornada geral e se é herdado ou sobrescrito. */
export function jornadaEfetiva(plano, modelo) {
  const { mapa, inferido } = sobrescritosDoPlano(plano, modelo);
  const materias = (plano?.materias || []).map((m) => {
    const naJornada = modelo?.materias?.find((x) => x.materiaId === m.materiaId) || null;
    const s = mapa[m.materiaId] || {};
    const campos = Object.fromEntries(CAMPOS_MATERIA.map((c) => [c, {
      valor: valorCampo(plano, m, c),
      daJornada: naJornada ? valorCampo(modelo, naJornada, c) : null,
      origem: !naJornada || s[c] ? "sobrescrito" : "herdado",
    }]));
    return {
      materiaId: m.materiaId,
      soNoAluno: !naJornada,
      campos,
      topicos: { origem: !naJornada || s.topicos ? "sobrescrito" : "herdado" },
      ordem: { origem: s.ordem ? "sobrescrito" : "herdado" },
    };
  });
  const removidas = Object.entries(mapa).filter(([, s]) => s.removida).map(([id]) => id);
  return { materias, removidas, inferido };
}

/* Depois de uma alteração do moderador no plano de UM aluno: o que passa a
   ser sobrescrito (as operações de alterarPlano). A ordem não entra aqui: ela
   já fica marcada por ordemTopicos. */
export function registrarSobrescritos(sobrescritos = {}, op) {
  const s = structuredClone(sobrescritos || {});
  const marcar = (materiaId, campos) => { if (campos.length) s[materiaId] = { ...(s[materiaId] || {}), ...Object.fromEntries(campos.map((c) => [c, true])) }; };
  switch (op.tipo) {
    // minutos por semana é o peso dos planos antigos (sem peso explícito)
    case "definirMateria": marcar(op.materiaId, [...new Set(Object.keys(op.campos || {}).map((c) => (c === "minutosSemanais" ? "peso" : c)).filter((c) => CAMPOS_MATERIA.includes(c)))]); break;
    case "adicionarTopico": case "removerTopico": case "definirCarga":
    case "adicionarSubtopico": case "removerSubtopico": case "moverSubtopico": marcar(op.materiaId, ["topicos"]); break;
    case "adicionarMateria": marcar(op.materiaId, ["soNoAluno"]); break;
    case "removerMateria": s[op.materiaId] = { removida: true }; break;
    default: break;
  }
  return s;
}

// "voltar ao padrão da jornada" num campo: desmarca o override
export function limparSobrescrito(sobrescritos = {}, materiaId, campo) {
  const s = structuredClone(sobrescritos || {});
  if (s[materiaId]) {
    delete s[materiaId][campo];
    if (!Object.keys(s[materiaId]).length) delete s[materiaId];
  }
  return s;
}
