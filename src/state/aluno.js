/* Visão completa de um aluno, usada pelas telas do aluno e pelo painel do
   moderador: os mesmos registros e os mesmos cálculos (uma fonte só). */

import { useMemo } from "react";
import { useApp } from "./AppContext.jsx";
import {
  useAgenda, useAluno, useGarantirMetas, useHoje, useMetas, usePlano, useProgresso, useQuestoes, useResumosSemana,
  useRevisoes, useRevisoesRecorrentes, useSessoes, useSimulados, useVistos,
} from "./hooks.js";
import { calcularAtrasos, calcularProgressoPlano, conteudoDaVez, estadoItem, itensDoPlano, statusItem } from "../core/plano.js";
import { progressoVisto } from "../core/ciclos.js";
import { conteudoPlanejado, diasDoHorizonte, ehProgressao } from "../core/motorMetas.js";
import { minutosNoDia } from "../core/horario.js";
import { resumoDaSemana } from "../core/metas.js";
import { consistencia, diasComAtividade } from "../core/desempenho.js";
import { inicioDaSemana, somarDias } from "../core/datas.js";

const porOrdem = (a, b) => (a.ordemNoDia ?? 0) - (b.ordemNoDia ?? 0) || String(a.id).localeCompare(String(b.id));

/* garantir: roda o motor na virada do dia (o aluno). O painel do moderador
   só olha: mostra o que está gravado. */
export function useVisaoAluno(alunoId, { garantir = true } = {}) {
  const { ind } = useApp();
  const aluno = useAluno(alunoId);
  const plano = usePlano(alunoId);
  const progresso = useProgresso(alunoId);
  const metas = useMetas(alunoId);
  const agenda = useAgenda(alunoId);
  const revisoes = useRevisoes(alunoId);
  const revisoesRecorrentes = useRevisoesRecorrentes(alunoId);
  const sessoes = useSessoes(alunoId);
  const questoes = useQuestoes(alunoId);
  const simulados = useSimulados(alunoId);
  const resumosSemana = useResumosSemana(alunoId);
  const subtopicosVistos = useVistos(alunoId); // subtópicos que o aluno marcou (roteiro das metas)
  const hoje = useHoje();
  const { erro: erroMetas } = useGarantirMetas(garantir ? alunoId : null);

  const carregando = [aluno, plano, progresso, metas, revisoes, sessoes, questoes, simulados].some((x) => x === undefined) || !ind;

  const derivado = useMemo(() => {
    if (carregando || !hoje) return null;
    const prog = progresso || {};
    const itens = plano ? itensDoPlano(plano, ind) : [];
    const pctVista = progressoVisto(itens, prog);
    const conteudo = conteudoPlanejado(metas, itens, prog);
    const comPct = (p) => ({ ...p, pct: pctVista.topicos[p.itemId]?.pctCiclo ?? null });

    /* Cada meta com o que ela estuda: a pendente de progressão, o conteúdo
       de agora (segue a fila da matéria); a concluída, o que foi gravado. */
    const detalhar = (m) => {
      if (m.status === "pendente" && ehProgressao(m)) {
        const c = conteudo[m.id];
        return { ...m, partes: (c?.partes || []).map(comPct), categoriaViva: c?.categoria || m.categoria, semConteudo: !c?.partes?.length };
      }
      if (m.status === "pendente") {
        return { ...m, partes: m.itemId ? [comPct({ itemId: m.itemId, topicoId: m.topicoId, minutos: m.duracaoPlanejada })] : [], categoriaViva: m.categoria };
      }
      return { ...m, partes: m.partes || [], categoriaViva: m.categoria };
    };
    const visiveis = metas.filter((m) => m.status !== "dispensada").map(detalhar);
    const metasHoje = visiveis
      .filter((m) => m.dataPlanejada === hoje || (m.status === "concluida" && m.concluidaEm === hoje))
      .sort(porOrdem);
    const atrasadas = visiveis
      .filter((m) => m.status === "pendente" && m.dataPlanejada < hoje)
      .sort((a, b) => a.dataPlanejada.localeCompare(b.dataPlanejada) || porOrdem(a, b));

    // as duas semanas: metas, horas livres e conflito de cada dia
    const dias = diasDoHorizonte(hoje).map((data) => {
      const doDia = visiveis.filter((m) => m.dataPlanejada === data).sort(porOrdem);
      const disponivel = plano ? minutosNoDia(plano, data) : 0;
      const revisoesMin = doDia.filter((m) => !ehProgressao(m)).reduce((x, m) => x + m.duracaoPlanejada, 0);
      return {
        data, metas: doDia, disponivel,
        planejado: doDia.reduce((x, m) => x + (m.status === "concluida" ? m.duracaoReal || m.duracaoPlanejada : m.duracaoPlanejada), 0),
        conflito: revisoesMin > disponivel ? { minutosRevisoes: revisoesMin, minutosDia: disponivel } : null,
      };
    });

    const inicioSemana = inicioDaSemana(hoje);
    const fimSemana = somarDias(inicioSemana, 6);
    const legado = (resumosSemana || []).find((r) => r.semana === inicioSemana && r.fonte === "semanas");
    const ativos = diasComAtividade({ sessoes, questoes, simulados });
    const todasDoDia = [...atrasadas, ...metasHoje];
    return {
      itens,
      pctVista,
      detalhar,
      daVez: (materiaId) => conteudoDaVez(itens, prog, materiaId, ind),
      metasHoje,
      atrasadas,
      dias,
      fixadas: visiveis.filter((m) => m.status === "pendente" && m.fixada && m.dataPlanejada >= hoje).length,
      semana: { inicio: inicioSemana, fim: fimSemana, resumo: resumoDaSemana(metas, inicioSemana, fimSemana, hoje), legado },
      feitasHoje: todasDoDia.filter((m) => m.status === "concluida").length,
      totalHoje: todasDoDia.length,
      minutosPlanejadosHoje: todasDoDia.reduce((x, m) => x + m.duracaoPlanejada, 0),
      minutosHoje: sessoes.filter((x) => x.data === hoje).reduce((x, y) => x + y.minutos, 0),
      questoesHoje: questoes.filter((q) => q.data === hoje).reduce((x, q) => x + q.total, 0),
      progressoPlano: plano ? calcularProgressoPlano(itens, prog, plano.cronograma, hoje) : null,
      atrasos: plano ? calcularAtrasos(itens, prog, plano.cronograma, hoje) : null,
      status: (it) => statusItem(it, prog, plano?.cronograma, hoje),
      estado: (it) => estadoItem(it, prog),
      consistencia30: consistencia(ativos, { inicio: somarDias(hoje, -29), fim: hoje }),
    };
  }, [carregando, hoje, plano, progresso, metas, sessoes, questoes, simulados, resumosSemana, ind]);

  return {
    carregando, aluno, plano, progresso: progresso || {}, metas: metas || [], agenda, revisoes, revisoesRecorrentes: revisoesRecorrentes || [],
    sessoes, questoes, simulados, resumosSemana, subtopicosVistos: subtopicosVistos || {}, hoje, ind, erroMetas, ...(derivado || {}),
  };
}
