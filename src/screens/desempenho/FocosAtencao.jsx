/* Seção 3, plano de ação: os conteúdos com menor acerto no período e o que
   fazer com cada um. "Revisar" leva o tópico para o topo da fila da matéria
   (as próximas metas estudam ele); se já foi visto, ele volta como não visto
   (a conclusão anterior fica no histórico). O aluno também pode abrir as
   listas da matéria para praticar. */

import { useState } from "react";
import { Link } from "react-router-dom";
import { ArrowUpToLine, CircleCheck, Library, ListChecks } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { useAcao, useAreasMateriais } from "../../state/hooks.js";
import { pode } from "../../core/permissoes.js";
import { filaDaMateria } from "../../core/ciclos.js";
import { AMOSTRA_MINIMA, LIMITE_FOCO } from "../../core/diagnostico.js";
import { useVisualMateria } from "../../ui/Areas.jsx";
import { Dialogo, MensagemErro } from "../../ui/ui.jsx";
import { Cabecalho, Cartao, VazioGrafico, fmtPctCurto } from "./ui.jsx";

/* O que "pôr nas próximas metas" significa para o tópico agora. */
function situacaoNoPlano(v, foco) {
  const it = (v.itens || []).find((x) => x.topicoId === foco.topicoId);
  if (!it) return { tipo: "fora" };
  const itensM = v.itens.filter((x) => x.materiaId === it.materiaId);
  const { fila, atual, status } = filaDaMateria(itensM, v.progresso);
  const visto = status[it.itemId] === "concluido";
  const outros = (lista) => lista.filter((x) => x.topicoId !== it.topicoId).map((x) => x.topicoId);
  const ordem = [it.topicoId, ...outros(fila), ...outros(itensM.filter((x) => status[x.itemId] === "concluido"))];
  return { tipo: visto ? "visto" : it === atual ? "atual" : "pendente", it, ordem };
}

function Opcao({ icone: Icone, titulo, texto, ...resto }) {
  const Tag = resto.to ? Link : "button";
  return (
    <Tag
      {...(resto.to ? {} : { type: "button" })}
      {...resto}
      className="flex w-full items-start gap-3 rounded-xl p-3.5 text-left ring-1 ring-slate-200 transition hover:bg-blue-50/60 hover:ring-blue-600/40 focus-visible:outline-2 focus-visible:outline-blue-600 disabled:pointer-events-none disabled:opacity-50 dark:ring-white/10 dark:hover:bg-white/5 dark:hover:ring-blue-400/40"
    >
      <span className="flex size-8 shrink-0 items-center justify-center rounded-lg bg-blue-50 text-blue-600 dark:bg-blue-400/10 dark:text-blue-400">
        <Icone className="size-4" aria-hidden="true" />
      </span>
      <span className="min-w-0">
        <span className="block text-sm font-medium text-slate-900 dark:text-white">{titulo}</span>
        <span className="mt-0.5 block text-sm leading-relaxed text-slate-500 dark:text-slate-400">{texto}</span>
      </span>
    </Tag>
  );
}

function DialogoRevisar({ v, foco, aoFechar }) {
  const { s, ind, usuario } = useApp();
  const areas = useAreasMateriais() || [];
  const { executar, ocupado, erro } = useAcao();
  const [feito, setFeito] = useState(null);
  const alunoId = v.aluno.id;
  const sit = situacaoNoPlano(v, foco);
  const permite = (permissao) => !!v.plano && pode(usuario, "alterar:plano", { alunoId, plano: v.plano, permissao });
  const podePriorizar = sit.tipo === "pendente" ? permite("reordenar") : sit.tipo === "visto" ? permite("reordenar") && permite("concluirItens") : false;
  const nomeMateria = ind.nomeMateria(foco.materiaId);
  const nomeTopico = ind.nomeTopico(foco.topicoId);
  const area = areas.find((a) => a.materiaId === foco.materiaId);
  const aluno = usuario?.role === "aluno";

  const priorizar = () => executar(async () => {
    if (sit.tipo === "visto") await s.planos.reverDoZero(alunoId, sit.it.itemId, { motivo: `Revisar pelo Desempenho (${fmtPctCurto(foco.pct)} de acerto)` });
    await s.planos.ordenarTopicos(alunoId, foco.materiaId, sit.ordem, { motivo: "Revisar pelo Desempenho" });
    setFeito(`${nomeTopico} está no topo da fila de ${nomeMateria}: as próximas metas da matéria estudam ele.`);
  });

  const textoPriorizar = {
    pendente: `${nomeTopico} vai para o topo da fila de ${nomeMateria}, e as próximas metas da matéria estudam ele.`,
    visto: `${nomeTopico} já foi visto: volta como não visto, no topo da fila de ${nomeMateria}. A conclusão anterior fica no histórico.`,
  }[sit.tipo];

  return (
    <Dialogo aberto titulo={`Revisar ${foco.nome}`} largura={480} aoFechar={aoFechar}>
      <div className="space-y-4">
        <p className="text-sm leading-relaxed text-slate-600 dark:text-slate-300">
          {foco.contexto} · <b className="font-semibold text-rose-600 tabular-nums dark:text-rose-400">{fmtPctCurto(foco.pct)}</b> de acerto em {foco.total} questões no período.
        </p>
        {feito ? (
          <p className="flex items-start gap-2 rounded-xl bg-emerald-50 px-3.5 py-3 text-sm text-emerald-800 dark:bg-emerald-400/10 dark:text-emerald-200" role="status">
            <CircleCheck className="mt-0.5 size-4 shrink-0" aria-hidden="true" />{feito}
          </p>
        ) : (
          <div className="space-y-2.5">
            {sit.tipo === "atual" && (
              <p className="flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-3 text-sm text-slate-600 dark:bg-white/[0.04] dark:text-slate-300">
                <ListChecks className="mt-0.5 size-4 shrink-0 text-blue-600 dark:text-blue-400" aria-hidden="true" />
                {nomeTopico} já é o tópico da vez em {nomeMateria}: está nas próximas metas.
              </p>
            )}
            {podePriorizar && <Opcao icone={ArrowUpToLine} titulo="Pôr nas próximas metas" texto={textoPriorizar} disabled={ocupado} onClick={priorizar} />}
            {aluno && (
              <Opcao
                icone={Library} to={area ? `/aluno/materiais/${area.id}` : "/aluno/materiais"}
                titulo={area ? `Praticar nas listas de ${nomeMateria}` : "Praticar nos materiais"}
                texto="Resolva mais questões do conteúdo e registre o resultado (com o tempo gasto)."
              />
            )}
            {!podePriorizar && sit.tipo !== "atual" && !aluno && (
              <p className="text-sm text-slate-500 dark:text-slate-400">{sit.tipo === "fora" ? "Este tópico não está no plano do aluno." : "Sem ação disponível para este tópico."}</p>
            )}
            {!podePriorizar && aluno && sit.tipo !== "atual" && sit.tipo !== "fora" && (
              <p className="text-xs text-slate-400 dark:text-slate-500">Mudar a ordem do seu plano depende de liberação do professor.</p>
            )}
          </div>
        )}
        <MensagemErro erro={erro} />
        <div className="flex justify-end">
          <button type="button" onClick={aoFechar} className="rounded-lg px-3 py-1.5 text-sm font-medium text-slate-600 hover:bg-slate-100 dark:text-slate-300 dark:hover:bg-white/10">
            {feito ? "Fechar" : "Agora não"}
          </button>
        </div>
      </div>
    </Dialogo>
  );
}

export default function FocosAtencao({ v, focos: { focos, avaliados } }) {
  const visual = useVisualMateria();
  const [alvo, setAlvo] = useState(null);
  return (
    <Cartao aria-labelledby="t-focos">
      <Cabecalho
        id="t-focos" titulo="Focos de atenção"
        subtitulo={`Os conteúdos com menor acerto no período (a partir de ${AMOSTRA_MINIMA} questões e abaixo de ${LIMITE_FOCO}%). Revise um por vez.`}
      />
      {focos.length ? (
        <ul className="mt-4 list-none divide-y divide-slate-100 dark:divide-white/10">
          {focos.map((f, i) => (
            <li key={f.chave} className="flex items-center gap-3 py-4 last:pb-0 sm:gap-4">
              <span className="hidden size-7 shrink-0 items-center justify-center rounded-full bg-slate-100 text-xs font-semibold tabular-nums text-slate-500 sm:flex dark:bg-white/10 dark:text-slate-400">{i + 1}</span>
              <div className="min-w-0 flex-1">
                <p className="truncate font-medium text-slate-900 dark:text-white">{f.nome}</p>
                <p className="mt-0.5 flex items-center gap-1.5 truncate text-sm text-slate-500 dark:text-slate-400">
                  <i className="inline-block size-2 shrink-0 rounded-full" style={{ background: visual(f.materiaId).cor }} aria-hidden="true" />
                  <span className="truncate">{f.contexto} · {f.acertos} de {f.total}</span>
                </p>
              </div>
              <span className="shrink-0 text-sm font-semibold tabular-nums text-rose-600 dark:text-rose-400" title={`${f.acertos} acertos em ${f.total} questões`}>{fmtPctCurto(f.pct)}</span>
              <button
                type="button" onClick={() => setAlvo(f)}
                className="shrink-0 rounded-lg border border-blue-600 px-3 py-1.5 text-sm font-medium text-blue-600 transition-colors hover:bg-blue-600 hover:text-white focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-blue-600 sm:px-3.5 dark:border-blue-400 dark:text-blue-400 dark:hover:bg-blue-500 dark:hover:text-white"
                aria-label={`Revisar ${f.nome}`}
              >
                Revisar
              </button>
            </li>
          ))}
        </ul>
      ) : (
        <div className="mt-4">
          {avaliados ? (
            <VazioGrafico altura="h-36" icone={CircleCheck} titulo={`Nenhum conteúdo abaixo de ${LIMITE_FOCO}% no período`} texto="Bom sinal. Continue registrando questões para acompanhar." />
          ) : (
            <VazioGrafico altura="h-36" icone={ListChecks} titulo="Ainda sem dados suficientes" texto={`Registre questões com o tópico (${AMOSTRA_MINIMA} ou mais por conteúdo) para ver onde revisar.`} />
          )}
        </div>
      )}
      {alvo && <DialogoRevisar v={v} foco={alvo} aoFechar={() => setAlvo(null)} />}
    </Cartao>
  );
}
