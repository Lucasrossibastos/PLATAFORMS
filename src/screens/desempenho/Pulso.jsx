/* Seção 1, o pulso: taxa de domínio (com a variação da semana), a meta
   semanal de questões (editável por quem pode) e o tempo focado. */

import { useState } from "react";
import { CircleCheck, Clock3, Crosshair, Pencil, Target } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { errosDeCampo, useAcao } from "../../state/hooks.js";
import { pode } from "../../core/permissoes.js";
import { fmtDataCurta } from "../../core/datas.js";
import { LIMITES_META_QUESTOES } from "../../core/diagnostico.js";
import TendenciaAcerto from "./graficos/TendenciaAcerto.jsx";
import { Cartao, Variacao, fmtPctCurto } from "./ui.jsx";

export const fmtHoras = (min) => {
  const h = Math.floor(min / 60), m = Math.round(min % 60);
  if (!h) return `${m}min`;
  return m ? `${h}h ${m}min` : `${h}h`;
};

function Rotulo({ icone: Icone, children, direita }) {
  return (
    <div className="flex min-h-6 items-center justify-between gap-2">
      <p className="flex items-center gap-2 text-sm font-medium text-slate-500 dark:text-slate-400">
        <Icone className="size-4 text-slate-400 dark:text-slate-500" aria-hidden="true" />
        {children}
      </p>
      {direita}
    </div>
  );
}

function Numero({ children, complemento }) {
  return (
    <p className="mt-4 flex items-baseline gap-2">
      <span className="text-4xl font-semibold tracking-tight tabular-nums text-slate-900 dark:text-white">{children}</span>
      {complemento && <span className="text-sm text-slate-500 dark:text-slate-400">{complemento}</span>}
    </p>
  );
}

function Dominio({ dominio, semanas }) {
  const { semana, semanaAnterior, variacao } = dominio;
  const descricao = variacao == null ? null
    : `Últimos 7 dias: ${fmtPctCurto(semana.pct)} (${semana.total} questões). Sete dias antes: ${fmtPctCurto(semanaAnterior.pct)} (${semanaAnterior.total}).`;
  const comDados = semanas.filter((s) => s.pct != null);
  return (
    <Cartao aria-labelledby="t-dominio" className="flex flex-col">
      <Rotulo icone={Crosshair} direita={<Variacao valor={variacao} descricao={descricao} />}>
        <span id="t-dominio">Taxa de domínio</span>
      </Rotulo>
      <Numero complemento={dominio.total ? "de acerto" : null}>{dominio.total ? fmtPctCurto(dominio.pct) : "–"}</Numero>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {dominio.total
          ? `${dominio.acertos} de ${dominio.total} questões no período`
          : "Nenhuma questão registrada no período."}
      </p>
      <div className="mt-auto pt-4">
        <TendenciaAcerto semanas={semanas} />
        {comDados.length >= 2 && (
          <p className="sr-only">Acerto nas últimas semanas: {comDados.map((s) => `${fmtDataCurta(s.semana)}: ${fmtPctCurto(s.pct)}`).join("; ")}.</p>
        )}
      </div>
    </Cartao>
  );
}

function MetaSemanal({ v, meta }) {
  const { s, usuario } = useApp();
  const [editando, setEditando] = useState(false);
  const [valor, setValor] = useState("");
  const { executar, ocupado, erro } = useAcao();
  const podeEditar = !!v.plano && pode(usuario, "alterar:plano", { alunoId: v.aluno.id, plano: v.plano, permissao: "metaQuestoes" });
  const cumprida = meta.feitas >= meta.alvo;
  const porDia = meta.falta ? Math.ceil(meta.falta / meta.diasRestantes) : 0;
  const salvar = (n) => executar(async () => { await s.planos.definirMetaQuestoes(v.aluno.id, n); setEditando(false); });
  const erroCampo = errosDeCampo(erro).metaQuestoes || erro?.message;

  return (
    <Cartao aria-labelledby="t-meta" className="flex flex-col">
      <Rotulo
        icone={Target}
        direita={podeEditar && !editando && (
          <button
            type="button" onClick={() => { setValor(String(meta.alvo)); setEditando(true); }}
            className="inline-flex size-7 items-center justify-center rounded-lg text-slate-400 transition-colors hover:bg-slate-100 hover:text-slate-700 focus-visible:outline-2 focus-visible:outline-blue-600 dark:hover:bg-white/10 dark:hover:text-white"
          >
            <Pencil className="size-3.5" aria-hidden="true" /><span className="sr-only">Mudar a meta semanal</span>
          </button>
        )}
      >
        <span id="t-meta">Meta semanal</span>
        {!meta.definida && <span className="rounded-full bg-slate-100 px-1.5 py-0.5 text-[11px] font-medium text-slate-500 dark:bg-white/10 dark:text-slate-400" title="Sugerida pelo seu ritmo das últimas 4 semanas (+10%).">sugerida</span>}
      </Rotulo>

      {editando ? (
        <form className="mt-4" onSubmit={(e) => { e.preventDefault(); salvar(valor); }}>
          <label className="block text-sm text-slate-600 dark:text-slate-300" htmlFor="meta-questoes">Questões por semana</label>
          <div className="mt-1.5 flex flex-wrap items-center gap-2">
            <input
              id="meta-questoes" type="number" inputMode="numeric" min={LIMITES_META_QUESTOES.min} max={LIMITES_META_QUESTOES.max} value={valor} autoFocus
              onChange={(e) => setValor(e.target.value)}
              className="w-24 rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-sm tabular-nums text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
            />
            <button type="submit" disabled={ocupado} className="rounded-lg bg-blue-600 px-3 py-1.5 text-sm font-medium text-white transition-colors hover:bg-blue-700 disabled:opacity-50 dark:bg-blue-500 dark:hover:bg-blue-400">Salvar</button>
            <button type="button" onClick={() => setEditando(false)} className="rounded-lg px-2.5 py-1.5 text-sm font-medium text-slate-500 hover:text-slate-900 dark:text-slate-400 dark:hover:text-white">Cancelar</button>
          </div>
          {meta.definida && (
            <button type="button" disabled={ocupado} onClick={() => salvar("")} className="mt-2 text-xs font-medium text-blue-600 hover:underline dark:text-blue-400">
              Voltar à meta sugerida pelo seu ritmo
            </button>
          )}
          {erroCampo && <p className="mt-2 text-xs text-rose-600 dark:text-rose-400" role="alert">{erroCampo}</p>}
        </form>
      ) : (
        <>
          <Numero complemento={`de ${meta.alvo} questões`}>{meta.feitas}</Numero>
          <div
            className="mt-4 h-2 overflow-hidden rounded-full bg-slate-100 dark:bg-white/10"
            role="progressbar" aria-valuemin={0} aria-valuemax={meta.alvo} aria-valuenow={Math.min(meta.feitas, meta.alvo)}
            aria-label={`${meta.feitas} de ${meta.alvo} questões resolvidas na semana`}
          >
            <div className="h-full rounded-full bg-blue-600 transition-[width] duration-500 dark:bg-blue-500" style={{ width: `${meta.pct}%` }} />
          </div>
          <p className="mt-3 flex items-center gap-1.5 text-sm text-slate-500 dark:text-slate-400">
            {cumprida ? (
              <><CircleCheck className="size-4 text-emerald-600 dark:text-emerald-400" aria-hidden="true" /><span className="text-slate-700 dark:text-slate-200">Meta da semana cumprida.</span></>
            ) : (
              <span>Faltam <b className="font-medium text-slate-700 tabular-nums dark:text-slate-200">{meta.falta}</b> · cerca de {porDia} por dia até domingo</span>
            )}
          </p>
        </>
      )}
      <p className="mt-auto pt-4 text-xs text-slate-400 dark:text-slate-500">Semana de {fmtDataCurta(meta.inicio)} a {fmtDataCurta(meta.fim)}</p>
    </Cartao>
  );
}

function TempoFocado({ tempo }) {
  const variacao = tempo.semana || tempo.semanaAnterior ? (tempo.semana - tempo.semanaAnterior) / 60 : null;
  return (
    <Cartao aria-labelledby="t-tempo" className="flex flex-col">
      <Rotulo
        icone={Clock3}
        direita={<Variacao valor={variacao} sufixo=" h" descricao={`Últimos 7 dias: ${fmtHoras(tempo.semana)}. Sete dias antes: ${fmtHoras(tempo.semanaAnterior)}.`} />}
      >
        <span id="t-tempo">Tempo focado</span>
      </Rotulo>
      <Numero>{fmtHoras(tempo.minutos)}</Numero>
      <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
        {tempo.minutos
          ? tempo.questoes ? `${fmtHoras(tempo.estudo)} estudando · ${fmtHoras(tempo.questoes)} em questões` : "Em metas e estudos registrados"
          : "Nenhum estudo registrado no período."}
      </p>
      <dl className="mt-auto grid grid-cols-2 gap-3 pt-4 text-sm">
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Últimos 7 dias</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-900 dark:text-white">{fmtHoras(tempo.semana)}</dd>
        </div>
        <div className="rounded-xl bg-slate-50 px-3 py-2 dark:bg-white/[0.04]">
          <dt className="text-xs text-slate-500 dark:text-slate-400">Média por dia</dt>
          <dd className="mt-0.5 font-medium tabular-nums text-slate-900 dark:text-white">{tempo.mediaPorDia == null ? "–" : fmtHoras(tempo.mediaPorDia)}</dd>
        </div>
      </dl>
    </Cartao>
  );
}

export default function Pulso({ v, d }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:grid-cols-3 md:gap-6">
      <Dominio dominio={d.dominio} semanas={d.semanas} />
      <MetaSemanal v={v} meta={d.meta} />
      <TempoFocado tempo={d.tempo} />
    </div>
  );
}
