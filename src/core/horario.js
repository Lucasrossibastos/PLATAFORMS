/* Horário semanal de estudo do aluno, versionado por data de início.

   plano.horarios = [{ desde: "AAAA-MM-DD", dias: { seg: min, …, dom: min }, por?, criadoEm? }]

   Mudar a rotina ACRESCENTA uma versão; as anteriores ficam, para reconstruir
   como as metas passadas foram geradas. Vale, em cada data, a versão com o
   maior `desde` que não passa dela (em empate, a gravada por último).

   Plano antigo, sem `horarios`: vale como uma versão só, desde o início do
   plano, com a `disponibilidade` que ele tem (deduzido na leitura, sem gravar
   nada). `disponibilidade` continua espelhando a versão vigente hoje, para o
   motor atual. */

import { DIAS, DISP_PADRAO, dataParaDiaSemana } from "./nucleo.js";

export const MAX_MIN_DIA = 16 * 60;
const DATA = /^\d{4}-\d{2}-\d{2}$/;
const INICIO_DESCONHECIDO = "2000-01-01";

export const normalizarDias = (dias) => Object.fromEntries(DIAS.map((d) => [d.k, Math.max(0, Math.round(Number(dias?.[d.k]) || 0))]));

export function validarDias(dias) {
  const erros = {};
  DIAS.forEach((d) => {
    const v = Number(dias?.[d.k] ?? 0);
    if (!Number.isInteger(v) || v < 0 || v > MAX_MIN_DIA) erros[d.k] = `${d.nome}: minutos inteiros de 0 a ${MAX_MIN_DIA}.`;
  });
  return { ok: !Object.keys(erros).length, erros };
}

// as versões do plano (as antigas deduzidas), em ordem de gravação
export function horariosDoPlano(plano) {
  const lista = Array.isArray(plano?.horarios) && plano.horarios.length
    ? plano.horarios
    : [{ desde: plano?.inicio || INICIO_DESCONHECIDO, dias: plano?.disponibilidade || DISP_PADRAO, deduzido: true }];
  return lista.map((h) => ({ ...h, dias: normalizarDias(h.dias) }));
}

// versão vigente numa data (null antes da primeira: o plano não existia)
export function horarioEm(plano, iso) {
  let vigente = null;
  horariosDoPlano(plano).forEach((h) => {
    if (h.desde <= iso && (!vigente || h.desde >= vigente.desde)) vigente = h;
  });
  return vigente;
}

export const minutosNoDia = (plano, iso) => horarioEm(plano, iso)?.dias[dataParaDiaSemana(iso)] ?? 0;

/* Nova rotina a partir de `desde` (hoje ou depois: o passado fica como foi).
   Devolve os campos a gravar no plano: a lista com a versão nova no fim e a
   `disponibilidade` vigente hoje. */
export function novaVersaoHorario(plano, dias, { desde, hojeIso, por = null }) {
  const erros = { ...validarDias(dias).erros };
  if (!DATA.test(desde || "")) erros.desde = "Escolha a data de início da nova rotina.";
  else if (hojeIso && desde < hojeIso) erros.desde = "A nova rotina vale de hoje em diante; o que já passou continua como foi.";
  if (Object.keys(erros).length) return { ok: false, erros };
  // a versão deduzida de um plano antigo passa a ser gravada (é o mesmo dado, agora explícito)
  const anteriores = horariosDoPlano(plano).map(({ deduzido: _d, ...h }) => h);
  const horarios = [...anteriores, { desde, dias: normalizarDias(dias), ...(por ? { por } : {}), ...(hojeIso ? { criadoEm: hojeIso } : {}) }];
  const hoje = horarioEm({ horarios }, hojeIso || desde);
  return { ok: true, horarios, disponibilidade: (hoje || horarios[horarios.length - 1]).dias };
}
