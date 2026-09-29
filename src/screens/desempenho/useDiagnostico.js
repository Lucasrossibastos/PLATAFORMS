/* Os números da tela Desempenho num lugar só (memorizados): o layout e os
   gráficos só desenham. Tudo vem de core/diagnostico.js. */

import { useMemo } from "react";
import { useApp } from "../../state/AppContext.jsx";
import { filtrarRegistros } from "../../core/desempenho.js";
import { fmtDataCurta, somarDias } from "../../core/datas.js";
import {
  acertoPorSemana, equilibrioPorArea, focosDeAtencao, mapaTempoAcerto, metaSemanal, taxaDeDominio, tempoFocado,
} from "../../core/diagnostico.js";

export const PERIODOS = [
  { id: "7d", nome: "7 dias", dias: 7 },
  { id: "30d", nome: "30 dias", dias: 30 },
  { id: "90d", nome: "90 dias", dias: 90 },
  { id: "tudo", nome: "Tudo", dias: null },
];

export function datasDoPeriodo(id, hojeIso) {
  const dias = PERIODOS.find((p) => p.id === id)?.dias;
  return dias ? { inicio: somarDias(hojeIso, -(dias - 1)), fim: hojeIso } : { inicio: null, fim: null };
}

export const rotuloDoPeriodo = ({ inicio, fim }) => (inicio ? `${fmtDataCurta(inicio)} a ${fmtDataCurta(fim)}` : "todo o histórico");

export function useDiagnostico(v, periodo) {
  const { ind } = useApp();
  const { carregando, hoje, questoes, sessoes, simulados, plano } = v;
  return useMemo(() => {
    if (carregando || !ind || !hoje) return null;
    const filtro = datasDoPeriodo(periodo, hoje);
    const q = questoes || [];
    const s = sessoes || [];
    return {
      filtro,
      dominio: taxaDeDominio(q, filtro, hoje),
      semanas: acertoPorSemana(q, hoje, 8),
      meta: metaSemanal(q, hoje, plano?.metaQuestoesSemana),
      tempo: tempoFocado({ sessoes: s, questoes: q }, filtro, hoje),
      equilibrio: equilibrioPorArea({ sessoes: s, questoes: q, plano }, filtro),
      mapa: mapaTempoAcerto(q, filtro, ind),
      focos: focosDeAtencao(q, filtro, ind),
      registros: filtrarRegistros(q, filtro),
      simulados: filtrarRegistros(simulados || [], filtro),
    };
  }, [carregando, hoje, questoes, sessoes, simulados, plano, ind, periodo]);
}
