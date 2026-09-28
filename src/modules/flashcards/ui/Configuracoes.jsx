/* Ajustes do aluno (as "opções do baralho" do Anki), salvos no banco, na
   conta do aluno: limites por dia, retenção-alvo e intervalo máximo do FSRS,
   passos de aprendizado e a hora da virada do dia. Mudar a retenção ou o
   intervalo máximo pode reagendar os cartões já estudados (opcional). */

import { useEffect, useMemo, useState } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { useLoja } from "../estado/hooks.js";
import { CONFIG_PADRAO, normalizarConfig } from "../dados/modelo.js";
import { criarAgendador } from "../motor/agendador.js";
import { reagendar } from "../servicos/agenda.js";
import { Botao, Confirmar, avisar } from "./comum.jsx";

const formDe = (c) => ({
  retencao: Math.round(c.retencao * 100),
  intervaloMaximo: String(c.intervaloMaximo),
  novosPorDia: String(c.novosPorDia),
  revisoesPorDia: String(c.revisoesPorDia),
  passosAprendizado: c.passosAprendizado.join(" "),
  passosReaprendizado: c.passosReaprendizado.join(" "),
  viradaDoDia: String(c.viradaDoDia),
});

const inteiro = (s) => (String(s).trim() === "" ? NaN : Number(String(s).replace(/\./g, "")));
const passos = (s) => String(s).split(/[\s,;]+/).map((p) => p.trim().toLowerCase()).filter(Boolean);

const paraConfig = (f) => ({
  retencao: f.retencao / 100,
  intervaloMaximo: inteiro(f.intervaloMaximo),
  novosPorDia: inteiro(f.novosPorDia),
  revisoesPorDia: inteiro(f.revisoesPorDia),
  passosAprendizado: passos(f.passosAprendizado),
  passosReaprendizado: passos(f.passosReaprendizado),
  viradaDoDia: inteiro(f.viradaDoDia),
});

const PRESETS_INTERVALO = [
  { dias: 30, rotulo: "1 mês" },
  { dias: 90, rotulo: "3 meses" },
  { dias: 180, rotulo: "6 meses" },
  { dias: 365, rotulo: "1 ano" },
  { dias: 36500, rotulo: "Sem limite" },
];

const um = (x) => x.toLocaleString("pt-BR", { maximumFractionDigits: 1, minimumFractionDigits: 1 });

// o que a retenção escolhida significa, com o intervalo calculado pelo próprio FSRS
function explicarRetencao(r) {
  const fator = criarAgendador({ retencao: r / 100 }).modificadorIntervalo;
  if (r === 90) return { tom: "ok", texto: "Padrão do FSRS e recomendado para a maioria: bom equilíbrio entre lembrar e o volume de revisões." };
  if (r > 95) return { tom: "alerta", texto: `Cada ponto acima de 95% custa caro: os intervalos ficam ${um(fator)}× os de 90%, ou seja, cerca de ${um(1 / fator)}× mais revisões do mesmo cartão.` };
  if (r > 90) return { tom: "ok", texto: `Intervalos ${um(fator)}× os de 90%: cerca de ${um(1 / fator)}× mais revisões, para lembrar mais na hora da prova.` };
  if (r >= 80) return { tom: "ok", texto: `Intervalos ${um(fator)}× os de 90%: menos revisões, mas você erra cerca de ${100 - r}% dos cartões na hora da revisão.` };
  return { tom: "alerta", texto: `Abaixo de 80% você esquece muito (cerca de ${100 - r}% dos cartões na revisão). Os intervalos ficam ${um(fator)}× os de 90%, mas reaprender o que esqueceu consome boa parte da economia.` };
}

function Campo({ id, rotulo, dica, erro, children }) {
  return (
    <div className={`fc-ajuste${erro ? " fc-ajuste--erro" : ""}`}>
      <div className="fc-ajuste-texto">
        <label htmlFor={id}>{rotulo}</label>
        {dica && <p id={`${id}-dica`}>{dica}</p>}
      </div>
      <div className="fc-ajuste-controle">
        {children}
        {erro && <small className="fc-campo-erro" role="alert">{erro}</small>}
      </div>
    </div>
  );
}

export default function Configuracoes() {
  const { estado, repo } = useLoja();
  const salvo = estado.config;
  const inicial = useMemo(() => formDe(salvo), [salvo]);
  const [f, setF] = useState(inicial);
  const [erros, setErros] = useState({});
  const [reagendarJa, setReagendarJa] = useState(null); // null = a sugestão automática
  const [salvando, setSalvando] = useState(false);
  const [padroes, setPadroes] = useState(false);

  const mudou = JSON.stringify(f) !== JSON.stringify(inicial);
  // mudou em outro aparelho enquanto o formulário estava intacto: acompanha
  const [base, setBase] = useState(inicial);
  useEffect(() => {
    if (JSON.stringify(inicial) === JSON.stringify(base)) return;
    if (JSON.stringify(f) === JSON.stringify(base)) setF(inicial);
    setBase(inicial);
  }, [inicial]); // eslint-disable-line react-hooks/exhaustive-deps

  const mudar = (campo) => (e) => {
    const v = e.target.type === "range" ? Number(e.target.value) : e.target.value;
    setF((x) => ({ ...x, [campo]: v }));
    setErros((x) => ({ ...x, [campo]: undefined }));
  };

  const novo = paraConfig(f);
  const mudouAgenda = novo.retencao !== salvo.retencao || (Number.isFinite(novo.intervaloMaximo) && novo.intervaloMaximo !== salvo.intervaloMaximo);
  // sugestão: reagendar quando o intervalo máximo diminui (senão o limite novo só vale na próxima resposta)
  const sugerido = Number.isFinite(novo.intervaloMaximo) && novo.intervaloMaximo < salvo.intervaloMaximo;
  const vaiReagendar = mudouAgenda && (reagendarJa ?? sugerido);
  const ret = explicarRetencao(f.retencao);
  const novos = inteiro(f.novosPorDia);
  const revisoes = inteiro(f.revisoesPorDia);
  const poucasRevisoes = Number.isFinite(novos) && Number.isFinite(revisoes) && novos > 0 && revisoes < novos * 10;

  async function salvar(e) {
    e?.preventDefault();
    let config;
    try { config = normalizarConfig(novo); } catch (err) {
      setErros(err.campos || {});
      avisar("Confira os campos marcados.", { tipo: "erro" });
      return;
    }
    setSalvando(true);
    try {
      await repo.lote([{ tipo: "mesclar", colecao: "config", dados: config }]);
      let n = 0;
      if (vaiReagendar) n = await reagendar(repo, criarAgendador(config), new Date());
      setF(formDe(config));
      setBase(formDe(config));
      setReagendarJa(null);
      avisar(vaiReagendar ? `Ajustes salvos. ${n === 1 ? "1 cartão reagendado" : `${n.toLocaleString("pt-BR")} cartões reagendados`}.` : "Ajustes salvos.");
    } catch (err) {
      avisar(err.message || "Não foi possível salvar.", { tipo: "erro" });
    } finally { setSalvando(false); }
  }

  return (
    <form className="fc-ajustes" onSubmit={salvar} noValidate>
      <header className="fc-pagina-topo">
        <h1>Ajustes</h1>
        <Botao variante="fantasma" icone={RotateCcw} onClick={() => setPadroes(true)}>Restaurar padrões</Botao>
      </header>

      <section className="fc-ajustes-grupo" aria-labelledby="aj-limites">
        <h2 id="aj-limites">Limites por dia</h2>
        <Campo id="aj-novos" rotulo="Cartões novos por dia" erro={erros.novosPorDia}
          dica="Quantos cartões você vê pela primeira vez a cada dia. Cada novo volta várias vezes nas semanas seguintes.">
          <input id="aj-novos" className="fc-entrada fc-entrada--num" inputMode="numeric" value={f.novosPorDia} onChange={mudar("novosPorDia")} aria-describedby="aj-novos-dica" />
        </Campo>
        <Campo id="aj-revisoes" rotulo="Revisões por dia" erro={erros.revisoesPorDia}
          dica="O máximo de revisões por dia; o que passar fica para o dia seguinte. Aprendizado não conta no limite.">
          <input id="aj-revisoes" className="fc-entrada fc-entrada--num" inputMode="numeric" value={f.revisoesPorDia} onChange={mudar("revisoesPorDia")} aria-describedby="aj-revisoes-dica" />
        </Campo>
        {poucasRevisoes && (
          <p className="fc-ajuste-aviso" role="status"><AlertTriangle aria-hidden="true" />
            Regra prática do Anki: o limite de revisões deve ser pelo menos 10× o de novos ({(novos * 10).toLocaleString("pt-BR")} aqui). Com menos, as revisões se acumulam e os cartões voltam atrasados.
          </p>
        )}
      </section>

      <section className="fc-ajustes-grupo" aria-labelledby="aj-memoria">
        <h2 id="aj-memoria">Memória (FSRS)</h2>
        <Campo id="aj-retencao" rotulo="Retenção-alvo" erro={erros.retencao}
          dica="A chance de você lembrar de um cartão no dia em que ele volta. Quanto maior, mais curtos os intervalos e mais revisões.">
          <div className="fc-retencao">
            <input id="aj-retencao" type="range" min="70" max="99" step="1" value={f.retencao} onChange={mudar("retencao")}
              aria-valuetext={`${f.retencao}%`} aria-describedby="aj-retencao-dica aj-retencao-efeito" style={{ "--p": `${((f.retencao - 70) / 29) * 100}%` }} />
            <output htmlFor="aj-retencao" className="fc-retencao-valor">{f.retencao}%</output>
          </div>
          <div className="fc-retencao-escala" aria-hidden="true">
            {[70, 80, 90, 99].map((v) => <span key={v} style={{ "--x": (v - 70) / 29 }}>{v}%</span>)}
          </div>
          <p id="aj-retencao-efeito" className={`fc-ajuste-efeito fc-ajuste-efeito--${ret.tom}`}>{ret.texto}</p>
        </Campo>
        <Campo id="aj-intervalo" rotulo="Intervalo máximo" erro={erros.intervaloMaximo}
          dica="Nenhum cartão fica mais do que isso sem voltar. Útil perto da prova: com 30 dias, tudo o que você estudou passa de novo pelo menos uma vez por mês.">
          <div className="fc-intervalo">
            <input id="aj-intervalo" className="fc-entrada fc-entrada--num" inputMode="numeric" value={f.intervaloMaximo} onChange={mudar("intervaloMaximo")} aria-describedby="aj-intervalo-dica" />
            <span className="fc-unidade">dias</span>
          </div>
          <div className="fc-escolhas fc-escolhas--compactas" role="group" aria-label="Atalhos de intervalo máximo">
            {PRESETS_INTERVALO.map((p) => (
              <button key={p.dias} type="button" className="fc-escolha" aria-checked={String(inteiro(f.intervaloMaximo) === p.dias)} role="radio"
                onClick={() => { setF((x) => ({ ...x, intervaloMaximo: String(p.dias) })); setErros((x) => ({ ...x, intervaloMaximo: undefined })); }}>{p.rotulo}</button>
            ))}
          </div>
        </Campo>
        {mudouAgenda && (
          <label className="fc-ajuste-reagendar">
            <input type="checkbox" checked={vaiReagendar} onChange={(e) => setReagendarJa(e.target.checked)} />
            <span>
              <strong>Reagendar os cartões já estudados agora</strong>
              Recalcula a próxima revisão de cada cartão em revisão com {novo.retencao !== salvo.retencao ? "a nova retenção" : ""}{novo.retencao !== salvo.retencao && novo.intervaloMaximo !== salvo.intervaloMaximo ? " e " : ""}{novo.intervaloMaximo !== salvo.intervaloMaximo ? "o novo intervalo máximo" : ""}, contando da última revisão (o que já passou do prazo vence hoje). Sem isso, a mudança vale para cada cartão a partir da próxima resposta.
            </span>
          </label>
        )}
        <p className="fc-dica">Parâmetros do modelo: os padrões do FSRS-6, ajustados em milhões de revisões. A otimização com o seu próprio histórico (como no Anki) ainda não está disponível.</p>
      </section>

      <section className="fc-ajustes-grupo" aria-labelledby="aj-passos">
        <h2 id="aj-passos">Aprendizado</h2>
        <Campo id="aj-passos-a" rotulo="Passos de aprendizado" erro={erros.passosAprendizado}
          dica="Intervalos curtos para o cartão novo antes de entrar em revisão, separados por espaço (m = minutos, h = horas, d = dias). Com o FSRS, mantenha abaixo de 1 dia.">
          <input id="aj-passos-a" className="fc-entrada" value={f.passosAprendizado} onChange={mudar("passosAprendizado")} placeholder="1m 10m" aria-describedby="aj-passos-a-dica" />
        </Campo>
        <Campo id="aj-passos-r" rotulo="Passos de reaprendizado" erro={erros.passosReaprendizado}
          dica="Quando você erra um cartão em revisão (Novamente): quando ele volta antes de ser reagendado.">
          <input id="aj-passos-r" className="fc-entrada" value={f.passosReaprendizado} onChange={mudar("passosReaprendizado")} placeholder="10m" aria-describedby="aj-passos-r-dica" />
        </Campo>
      </section>

      <section className="fc-ajustes-grupo" aria-labelledby="aj-dia">
        <h2 id="aj-dia">Dia de estudo</h2>
        <Campo id="aj-virada" rotulo="O dia começa às" erro={erros.viradaDoDia}
          dica="Quem estuda de madrugada continua no dia anterior até essa hora (limites, sequência e estatísticas).">
          <select id="aj-virada" className="fc-entrada fc-entrada--num" value={f.viradaDoDia} onChange={mudar("viradaDoDia")} aria-describedby="aj-virada-dica">
            {Array.from({ length: 24 }, (_, h) => <option key={h} value={String(h)}>{`${h}h${h === CONFIG_PADRAO.viradaDoDia ? " (padrão)" : ""}`}</option>)}
          </select>
        </Campo>
      </section>

      <div className={`fc-ajustes-barra${mudou ? " fc-ajustes-barra--ativa" : ""}`} aria-hidden={!mudou}>
        <span>{mudou ? "Alterações não salvas" : "Tudo salvo"}</span>
        <Botao disabled={!mudou || salvando} onClick={() => { setF(inicial); setErros({}); setReagendarJa(null); }} tabIndex={mudou ? 0 : -1}>Descartar</Botao>
        <Botao type="submit" variante="primario" disabled={!mudou || salvando} tabIndex={mudou ? 0 : -1}>{salvando ? "Salvando…" : "Salvar"}</Botao>
      </div>

      <Confirmar aberto={padroes} titulo="Restaurar os padrões?" rotulo="Restaurar"
        aoConfirmar={() => { setF(formDe(normalizarConfig({}))); setErros({}); setPadroes(false); }}
        aoFechar={() => setPadroes(false)}>
        <p>Retenção 90%, intervalo máximo de 365 dias, 20 novos e 200 revisões por dia, passos 1m 10m e 10m, dia começando às 4h. Nada é salvo até você clicar em Salvar.</p>
      </Confirmar>
    </form>
  );
}
