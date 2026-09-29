/* Revisões de um aluno (painel do moderador): as recorrentes (ativar,
   editar, desativar), a carga delas por semana, os dias em conflito e as
   revisões automáticas antigas que ainda estão terminando o ciclo. */

import { useState } from "react";
import { Repeat, TriangleAlert } from "lucide-react";
import { fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta } from "../../core/datas.js";
import { LIMITES_REVISAO, MODOS_ATRASO, parametrosAtuais, proximaOcorrencia } from "../../core/revisaoRecorrente.js";
import { emBlocos } from "../../core/motorMetas.js";
import { useApp } from "../../state/AppContext.jsx";
import { errosDeCampo, useAcao } from "../../state/hooks.js";
import { Botao, Campo, Dialogo, MensagemErro, Vazio } from "../../ui/ui.jsx";

const INTERVALOS = [3, 7, 14, 30];

/* Ativar / editar / desativar a revisão recorrente de um tópico concluído. */
export function DialogoRevisao({ alunoId, alvo, aoFechar }) {
  const { s, ind, hoje } = useApp();
  const rev = alvo?.rev;
  const atual = rev?.ativo ? parametrosAtuais(rev) : null;
  const [f, setF] = useState(() => ({
    intervaloDias: atual?.intervaloDias ?? 7, duracaoMin: atual ? emBlocos(atual.duracaoMin) : 30,
    dataBase: atual?.dataBase ?? hoje, modoAtraso: atual?.modoAtraso ?? "fixo",
  }));
  const [motivo, setMotivo] = useState("");
  const { executar, ocupado, erro } = useAcao();
  const erros = errosDeCampo(erro);
  if (!alvo) return null;
  const nome = ind.nomeTopico(alvo.it.topicoId);
  const dados = { ...f, intervaloDias: Number(f.intervaloDias), duracaoMin: Number(f.duracaoMin) };
  const salvar = () => executar(async () => {
    if (atual) await s.revisoes.editar(alunoId, alvo.it.itemId, dados, { motivo });
    else await s.revisoes.ativar(alunoId, alvo.it.itemId, { ...dados, motivo });
    aoFechar();
  });
  const desativar = () => executar(async () => { await s.revisoes.desativar(alunoId, alvo.it.itemId, { motivo }); aoFechar(); });

  return (
    <Dialogo aberto titulo={`Revisão recorrente · ${nome}`} largura={480} aoFechar={aoFechar}>
      <div className="form">
        <p className="texto-dialogo">
          Uma meta curta de revisão que volta a cada tantos dias. Entra no dia antes da progressão; se as revisões passarem do horário, o dia fica marcado (nada é cortado).
          {atual && " Mudar vale daqui para a frente: as já feitas não mudam."}
        </p>
        <Campo rotulo="A cada" erro={erros.intervaloDias}>
          <span className="linha-entrada">
            {INTERVALOS.map((n) => (
              <button key={n} type="button" className="filtro" aria-pressed={Number(f.intervaloDias) === n} onClick={() => setF({ ...f, intervaloDias: n })}>{n} dias</button>
            ))}
            <input className="entrada entrada--sm num" type="number" min={LIMITES_REVISAO.intervaloMin} max={LIMITES_REVISAO.intervaloMax} value={f.intervaloDias}
              aria-label="Intervalo em dias" onChange={(e) => setF({ ...f, intervaloDias: e.target.value })} />
          </span>
        </Campo>
        <div className="form-linha">
          <Campo rotulo="Duração (min, de 30 em 30)" erro={erros.duracaoMin}>
            <input className="entrada num" type="number" min={LIMITES_REVISAO.duracaoMin} max={LIMITES_REVISAO.duracaoMax} step={LIMITES_REVISAO.passo} value={f.duracaoMin} onChange={(e) => setF({ ...f, duracaoMin: e.target.value })} />
          </Campo>
          <Campo rotulo="Começa em" erro={erros.dataBase}>
            <input className="entrada" type="date" value={f.dataBase} onChange={(e) => setF({ ...f, dataBase: e.target.value })} />
          </Campo>
        </div>
        <Campo rotulo="Se atrasar">
          <select className="entrada" value={f.modoAtraso} onChange={(e) => setF({ ...f, modoAtraso: e.target.value })}>
            {Object.entries(MODOS_ATRASO).map(([k, n]) => <option key={k} value={k}>{n}</option>)}
          </select>
        </Campo>
        <Campo rotulo="Motivo (opcional)" ajuda="Fica no histórico do aluno."><input className="entrada" value={motivo} onChange={(e) => setMotivo(e.target.value)} /></Campo>
        {!Object.keys(erros).length && <MensagemErro erro={erro} />}
        <div className="dialogo-acoes">
          {atual && <Botao variante="texto" disabled={ocupado} onClick={desativar}>Desativar</Botao>}
          <Botao variante="vidro" onClick={aoFechar}>Cancelar</Botao>
          <Botao variante="solido" disabled={ocupado} onClick={salvar}>{atual ? "Salvar" : rev ? "Reativar" : "Ativar"}</Botao>
        </div>
      </div>
    </Dialogo>
  );
}

export function PainelRevisoes({ v }) {
  const { ind } = useApp();
  const [alvo, setAlvo] = useState(null);
  const revs = v.revisoesRecorrentes || [];
  const ativas = revs.filter((r) => r.ativo);
  const inativas = revs.filter((r) => !r.ativo);
  const itemDe = (r) => v.itens.find((it) => it.itemId === r.itemId) || { itemId: r.itemId, topicoId: r.topicoId, materiaId: r.materiaId };
  const ultimaFeita = (r) => v.metas.filter((m) => m.revisaoRecorrenteId === r.id && m.status === "concluida").map((m) => m.concluidaEm).sort().at(-1) || null;
  const cargaSemanal = ativas.reduce((x, r) => { const p = parametrosAtuais(r); return x + (emBlocos(p.duracaoMin) * 7) / p.intervaloDias; }, 0);
  const conflitos = (v.dias || []).filter((d) => d.conflito);
  const antigas = (v.revisoes || []).flatMap((r) => (r.sessoes || []).filter((x) => x.status === "agendada").map((x) => ({ r, dia: x.dia })));

  return (
    <>
      {conflitos.length > 0 && (
        <div className="aviso aviso--erro" role="note">
          <TriangleAlert aria-hidden="true" />
          <span>
            Revisões passam do horário do aluno em {conflitos.map((d) => `${fmtDataCurta(d.data)} (${fmtMin(d.conflito.minutosRevisoes)} de ${fmtMin(d.conflito.minutosDia)})`).join(", ")}.
            Ajuste o intervalo, a duração ou as horas livres; nada é cortado sozinho.
          </span>
        </div>
      )}

      <section className="secao" aria-labelledby="t-rev-ativas">
        <div className="secao-cabeca">
          <h2 id="t-rev-ativas" className="subtitulo">Revisões recorrentes</h2>
          <p className="previa-linha">
            {ativas.length ? <>{ativas.length} {ativas.length === 1 ? "ativa" : "ativas"} · ≈ <b className="num">{fmtMin(Math.round(cargaSemanal))}</b> por semana.</> : "Nenhuma ativa."}
            {" "}Para ativar, abra a matéria no Edital e toque em “Revisão” num tópico já visto.
          </p>
        </div>
        {ativas.length > 0 && (
          <div className="tabela-rolagem">
            <table className="tabela">
              <thead><tr><th>Tópico</th><th>A cada</th><th className="num">Duração</th><th>Próxima</th><th><span className="sr-only">Ações</span></th></tr></thead>
              <tbody>
                {ativas.map((r) => {
                  const p = parametrosAtuais(r);
                  return (
                    <tr key={r.id}>
                      <td><span className="celula-conteudo"><i className="ponto-materia" style={{ "--cor": ind.corDaMateria(r.materiaId) }} aria-hidden="true" /><span><small>{ind.nomeMateria(r.materiaId)}</small>{ind.nomeTopico(r.topicoId)}</span></span></td>
                      <td>{p.intervaloDias} dias{p.modoAtraso === "desde_ultima" && <small className="bloco-pequeno">conta da última feita</small>}</td>
                      <td className="num">{fmtMin(emBlocos(p.duracaoMin))}</td>
                      <td className="num">{fmtDataCurta(proximaOcorrencia(r, v.hoje, { ultimaFeitaEm: ultimaFeita(r) }))}</td>
                      <td><Botao variante="texto" tamanho="sm" icone={Repeat} onClick={() => setAlvo({ it: itemDe(r), rev: r })}>Editar</Botao></td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
        {inativas.length > 0 && (
          <details className="recolhivel">
            <summary>Desativadas · {inativas.length} <small>o histórico delas fica</small></summary>
            <ul className="lista-simples">
              {inativas.map((r) => (
                <li key={r.id} className="linha-simples">
                  <span>{ind.nomeTopico(r.topicoId)} <small>desativada em {fmtDataCurta(r.desativadoEm)}</small></span>
                  <Botao variante="texto" tamanho="sm" onClick={() => setAlvo({ it: itemDe(r), rev: r })}>Reativar</Botao>
                </li>
              ))}
            </ul>
          </details>
        )}
      </section>

      {antigas.length > 0 && (
        <section className="secao" aria-labelledby="t-antigas">
          <h2 id="t-antigas" className="subtitulo">Revisões automáticas antigas</h2>
          <p className="previa-linha">Não são mais criadas; as {antigas.length} que já estavam agendadas terminam o ciclo como metas.</p>
        </section>
      )}

      {!revs.length && !antigas.length && (
        <div className="cartao"><Vazio icone={Repeat} titulo="Nada de revisão ainda" texto="Revisões recorrentes são ativadas por tópico, no Edital do aluno." /></div>
      )}
      {alvo && <DialogoRevisao key={alvo.it.itemId} alunoId={v.aluno.id} alvo={alvo} aoFechar={() => setAlvo(null)} />}
    </>
  );
}
