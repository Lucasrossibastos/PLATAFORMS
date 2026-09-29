/* Seção 2, o diagnóstico: acertos e erros (pizza, com recorte por matéria
   ou tópico) e mapeamento de desempenho (tempo × acerto por matéria). Cada
   cartão tem a leitura em uma frase e a troca para tabela; os gráficos ficam
   em graficos/. */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, Timer } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { QUADRANTES, acertosDoRecorte, opcoesDoRecorte } from "../../core/diagnostico.js";
import PizzaAcertos, { COR_FATIA } from "./graficos/PizzaAcertos.jsx";
import MapaDispersao from "./graficos/MapaDispersao.jsx";
import { BotaoTabela, Cabecalho, Cartao, Segmentado, Tabela, VazioGrafico, fmtNum, fmtPctCurto } from "./ui.jsx";

function Leitura({ children, tom = "neutro" }) {
  const cor = tom === "bom" ? "text-emerald-700 dark:text-emerald-300" : "text-slate-600 dark:text-slate-300";
  return (
    <p className={`mt-4 flex items-start gap-2 rounded-xl bg-slate-50 px-3.5 py-2.5 text-sm leading-relaxed dark:bg-white/[0.04] ${cor}`}>
      <Info className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
      <span>{children}</span>
    </p>
  );
}

const RECORTES = [{ id: "tudo", nome: "Tudo" }, { id: "materia", nome: "Matéria" }, { id: "topico", nome: "Tópico" }];

function Seletor({ rotulo, valor, opcoes, aoMudar }) {
  return (
    <label className="flex min-w-0 flex-1 basis-40 flex-col gap-1 text-xs font-medium text-slate-500 dark:text-slate-400">
      {rotulo}
      <select
        value={valor || ""} onChange={(e) => aoMudar(e.target.value)}
        className="w-full rounded-lg border border-slate-200 bg-white px-2.5 py-1.5 text-sm font-normal text-slate-900 outline-none focus:border-blue-600 focus:ring-2 focus:ring-blue-600/20 dark:border-white/15 dark:bg-white/5 dark:text-white"
      >
        {opcoes.map((o) => <option key={o.id} value={o.id}>{o.nome} · {o.total}</option>)}
      </select>
    </label>
  );
}

/* Acertos e erros num recorte: tudo, uma matéria ou um tópico do período. */
function AcertosErros({ registros }) {
  const { ind } = useApp();
  const [recorte, setRecorte] = useState("tudo");
  const [escolha, setEscolha] = useState({ materiaId: "", topicoId: "" });
  const [tabela, setTabela] = useState(false);
  const opcoesM = opcoesDoRecorte(registros, ind).materias;
  const materiaId = recorte === "tudo" ? null : opcoesM.some((m) => m.id === escolha.materiaId) ? escolha.materiaId : opcoesM[0]?.id || null;
  const opcoesT = materiaId ? opcoesDoRecorte(registros, ind, materiaId).topicos : [];
  const topicoId = recorte !== "topico" ? null : opcoesT.some((t) => t.id === escolha.topicoId) ? escolha.topicoId : opcoesT[0]?.id || null;
  const r = acertosDoRecorte(registros, { materiaId, topicoId }, ind);
  const nomeRecorte = topicoId ? ind.nomeTopico(topicoId) : materiaId ? ind.nomeMateria(materiaId) : "todas as matérias";

  return (
    <Cartao aria-labelledby="t-acertos" className="flex flex-col">
      <Cabecalho
        id="t-acertos" titulo="Acertos e erros"
        subtitulo="As questões do período, no geral, numa matéria ou num tópico."
        direita={r.total > 0 && <BotaoTabela tabela={tabela} aoTrocar={() => setTabela(!tabela)} rotulo="acertos e erros" />}
      />
      <div className="mt-4 flex flex-wrap items-end gap-3">
        <Segmentado rotulo="Recorte" valor={recorte} aoMudar={setRecorte} opcoes={RECORTES} />
        {recorte !== "tudo" && opcoesM.length > 0 && (
          <div className="flex w-full flex-wrap gap-3">
            <Seletor rotulo="Matéria" valor={materiaId} opcoes={opcoesM} aoMudar={(v) => setEscolha({ materiaId: v, topicoId: "" })} />
            {recorte === "topico" && opcoesT.length > 0 && (
              <Seletor rotulo="Tópico" valor={topicoId} opcoes={opcoesT} aoMudar={(v) => setEscolha({ materiaId, topicoId: v })} />
            )}
          </div>
        )}
      </div>
      <div className="mt-4 flex-1">
        {!r.total ? (
          <VazioGrafico titulo="Sem questões no período" texto="Registre questões para ver quantas você acertou, errou ou deixou em branco." />
        ) : tabela ? (
          <Tabela
            legenda={`Acertos e erros em ${nomeRecorte}`}
            colunas={["", "Questões", "Do total"]}
            linhas={r.fatias.map((f) => [f.nome, f.valor, fmtPctCurto(f.pct)])}
          />
        ) : (
          <div className="grid items-center gap-4 sm:grid-cols-[minmax(0,1fr)_auto]">
            <PizzaAcertos fatias={r.fatias} pct={r.pct} total={r.total} />
            <ul className="flex list-none flex-row flex-wrap justify-center gap-x-5 gap-y-2 text-sm sm:flex-col">
              {r.fatias.map((f) => (
                <li key={f.id} className="flex items-center gap-2">
                  <i className="inline-block size-2.5 shrink-0 rounded-sm" style={{ background: COR_FATIA[f.id] }} aria-hidden="true" />
                  <span className="text-slate-500 dark:text-slate-400">{f.nome}</span>
                  <b className="font-semibold tabular-nums text-slate-900 dark:text-white">{f.valor}</b>
                  <span className="tabular-nums text-slate-400 dark:text-slate-500">{fmtPctCurto(f.pct)}</span>
                </li>
              ))}
            </ul>
          </div>
        )}
      </div>
      {r.maisErros && (
        <Leitura>Mais erros em <b className="font-medium">{r.maisErros.nome}</b>: {r.maisErros.erros} de {r.maisErros.total} questões{recorte === "tudo" ? "" : ` (${r.nivelAbaixo} de ${nomeRecorte})`}.</Leitura>
      )}
    </Cartao>
  );
}

function Mapa({ mapa }) {
  const { usuario } = useApp();
  const [tabela, setTabela] = useState(false);
  const { pontos, media, registrosComTempo, registrosSemTempo } = mapa;
  const alertas = ["base", "apressado", "lento"].flatMap((q) => pontos.filter((p) => p.quadrante === q)).slice(0, 2);
  const aluno = usuario?.role === "aluno";

  return (
    <Cartao aria-labelledby="t-mapa" className="flex flex-col">
      <Cabecalho
        id="t-mapa" titulo="Mapeamento de desempenho"
        subtitulo="Cada bolha é uma matéria: tempo médio por questão × taxa de acerto. As linhas tracejadas são a sua média."
        direita={pontos.length > 0 && <BotaoTabela tabela={tabela} aoTrocar={() => setTabela(!tabela)} rotulo="mapeamento de desempenho" />}
      />
      <div className="mt-4 flex-1">
        {!pontos.length ? (
          <VazioGrafico
            icone={Timer} titulo="Registre o tempo gasto nas questões"
            texto={registrosSemTempo
              ? `Seus ${registrosSemTempo} registros do período não têm tempo. Preencha “Tempo gasto” ao registrar para ver onde você está rápido, mas errando, ou preciso, mas lento.`
              : "Ao registrar questões, preencha “Tempo gasto”: o mapa mostra onde você está rápido, mas errando, ou preciso, mas lento."}
          />
        ) : tabela ? (
          <Tabela
            legenda="Tempo por questão e acerto por matéria"
            colunas={["Matéria", "Min/questão", "Acerto", "Questões", "Leitura"]}
            linhas={pontos.map((p) => [p.nome, fmtNum(p.minPorQuestao), fmtPctCurto(p.acerto), p.total, QUADRANTES[p.quadrante]?.nome || "–"])}
          />
        ) : (
          <MapaDispersao pontos={pontos} media={media} />
        )}
      </div>
      {pontos.length > 0 && (
        alertas.length ? (
          <div className="mt-4 space-y-2">
            {alertas.map((p) => (
              <Leitura key={p.materiaId}><b className="font-medium">{p.nome}</b>: {QUADRANTES[p.quadrante].nome.toLowerCase()} (comparado à sua média). {QUADRANTES[p.quadrante].acao}</Leitura>
            ))}
          </div>
        ) : pontos.length > 1 ? (
          <Leitura tom="bom">Todas as matérias cronometradas estão rápidas e precisas perto da sua média.</Leitura>
        ) : (
          <Leitura>Cronometre questões de outras matérias para comparar: com uma só, o mapa ainda não separa as leituras.</Leitura>
        )
      )}
      {pontos.length > 0 && (
        <p className="mt-3 text-xs text-slate-400 dark:text-slate-500">
          {registrosComTempo} {registrosComTempo === 1 ? "registro cronometrado" : "registros cronometrados"} · média de {fmtNum(media.minPorQuestao)} min por questão
          {registrosSemTempo > 0 && ` · ${registrosSemTempo} sem tempo ficaram de fora`}
          {aluno && registrosSemTempo > 0 && <> · <Link to="/aluno/questoes" className="font-medium text-blue-600 hover:underline dark:text-blue-400">registrar com tempo</Link></>}
        </p>
      )}
    </Cartao>
  );
}

export default function Diagnostico({ d }) {
  return (
    <div className="grid grid-cols-1 gap-4 md:gap-6 lg:grid-cols-2">
      <AcertosErros registros={d.registros} />
      <Mapa mapa={d.mapa} />
    </div>
  );
}
