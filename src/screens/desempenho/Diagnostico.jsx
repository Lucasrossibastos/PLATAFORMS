/* Seção 2, o diagnóstico: equilíbrio de estudos (radar por grande área) e
   mapeamento de desempenho (tempo × acerto por matéria). Cada cartão tem a
   leitura em uma frase e a troca para tabela; os gráficos ficam em graficos/. */

import { useState } from "react";
import { Link } from "react-router-dom";
import { Info, Timer } from "lucide-react";
import { useApp } from "../../state/AppContext.jsx";
import { fmtMin } from "../../core/nucleo.js";
import { QUADRANTES } from "../../core/diagnostico.js";
import RadarEquilibrio from "./graficos/RadarEquilibrio.jsx";
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

function Legenda({ itens }) {
  return (
    <ul className="mt-2 flex list-none flex-wrap justify-center gap-x-5 gap-y-1 text-xs text-slate-500 dark:text-slate-400">
      {itens.map(([nome, tipo]) => (
        <li key={nome} className="flex items-center gap-1.5">
          {tipo === "tracejado"
            ? <svg width="18" height="6" aria-hidden="true"><line x1="0" y1="3" x2="18" y2="3" stroke="var(--dg-plano)" strokeWidth="1.5" strokeDasharray="5 3" /></svg>
            : <i className="inline-block h-2.5 w-3.5 rounded-sm border-2 border-blue-600 bg-blue-600/20 dark:border-blue-500 dark:bg-blue-500/20" aria-hidden="true" />}
          {nome}
        </li>
      ))}
    </ul>
  );
}

function Equilibrio({ equilibrio }) {
  const [modo, setModo] = useState("tempo");
  const [tabela, setTabela] = useState(false);
  const { eixos, maiorFalta, minutos } = equilibrio;
  const comPlano = eixos.some((e) => e.plano != null);
  const questoes = eixos.reduce((s, e) => s + e.questoes, 0);
  const vazio = modo === "tempo" ? !minutos : !questoes;
  const comAcerto = eixos.filter((e) => e.acerto != null).sort((a, b) => b.acerto - a.acerto);

  let leitura = null;
  if (!vazio && modo === "tempo") {
    leitura = !comPlano ? <Leitura>Sem plano de estudo: o radar mostra só como o seu tempo se divide.</Leitura>
      : maiorFalta ? <Leitura><b className="font-medium">{maiorFalta.nome}</b> recebeu {fmtPctCurto(maiorFalta.tempo)} do seu tempo; o plano pede {fmtPctCurto(maiorFalta.plano)}.</Leitura>
        : <Leitura tom="bom">Seu tempo está alinhado com o que o plano pede. Bom equilíbrio.</Leitura>;
  } else if (!vazio && comAcerto.length > 1) {
    const [melhor, pior] = [comAcerto[0], comAcerto.at(-1)];
    leitura = <Leitura>Mais forte em <b className="font-medium">{melhor.nome}</b> ({fmtPctCurto(melhor.acerto)}); mais espaço para crescer em <b className="font-medium">{pior.nome}</b> ({fmtPctCurto(pior.acerto)}).</Leitura>;
  }

  return (
    <Cartao aria-labelledby="t-equilibrio" className="flex flex-col">
      <Cabecalho
        id="t-equilibrio" titulo="Equilíbrio de estudos"
        subtitulo={modo === "tempo" ? "Como o seu tempo focado se divide entre as grandes áreas, perto do que o plano pede." : "A taxa de acerto nas questões de cada grande área."}
        direita={<>
          <Segmentado rotulo="Medida do radar" valor={modo} aoMudar={setModo} opcoes={[{ id: "tempo", nome: "Tempo" }, { id: "acerto", nome: "Acerto" }]} />
          <BotaoTabela tabela={tabela} aoTrocar={() => setTabela(!tabela)} rotulo="equilíbrio de estudos" />
        </>}
      />
      <div className="mt-4 flex-1">
        {vazio ? (
          <VazioGrafico titulo={modo === "tempo" ? "Sem estudo no período" : "Sem questões no período"} texto="Conclua metas ou registre estudos e questões para ver o equilíbrio entre as áreas." />
        ) : tabela ? (
          <Tabela
            legenda="Equilíbrio por grande área"
            colunas={modo === "tempo" ? ["Área", "Seu tempo", "Minutos", ...(comPlano ? ["O plano pede"] : [])] : ["Área", "Acerto", "Questões"]}
            linhas={eixos.map((e) => (modo === "tempo"
              ? [e.nome, fmtPctCurto(e.tempo), fmtMin(e.minutos), ...(comPlano ? [fmtPctCurto(e.plano)] : [])]
              : [e.nome, fmtPctCurto(e.acerto), e.questoes]))}
          />
        ) : (
          <>
            <RadarEquilibrio eixos={eixos} modo={modo} />
            {modo === "tempo" && comPlano && <Legenda itens={[["Seu tempo", "area"], ["O plano pede", "tracejado"]]} />}
          </>
        )}
      </div>
      {leitura}
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
      <Equilibrio equilibrio={d.equilibrio} />
      <Mapa mapa={d.mapa} />
    </div>
  );
}
