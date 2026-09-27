import { useState } from "react";
import { Hand, RotateCcw, Sparkles } from "lucide-react";
import { DIAS, fmtData, fmtMin } from "../../core/nucleo.js";
import { useApp, useEstudo, useFrasesDoAluno } from "../../state/AppContext.jsx";
import { chaveDoDia, contextoMotor, corDaMateria, datasDaSemana, idxDia, moverMeta, resetarSemana } from "../../state/estudo.js";
import { Barra, Botao, TituloPagina } from "../../ui/ui.jsx";

/* Semana com as metas por dia. Mover: arrastar (mouse) ou tocar na meta e
   depois no dia (celular e teclado). Só dá para mover para hoje em diante. */
export default function Semana() {
  const { db, usuario, mudar } = useApp();
  const est = useEstudo();
  const uid = usuario.uid;
  const { disp } = contextoMotor(db, uid);
  const t = useFrasesDoAluno();
  const hIdx = idxDia(chaveDoDia());
  const datas = datasDaSemana(est.chave);
  const [arrastando, setArrastando] = useState(null); // { id, de }
  const [sobre, setSobre] = useState(null);
  const [selecao, setSelecao] = useState(null); // { id, de, materia }

  const podeReceber = (k) => idxDia(k) >= hIdx;
  const mover = (id, de, para) => {
    if (de !== para && podeReceber(para)) mudar((d) => moverMeta(d.estudo[uid], id, de, para));
    setArrastando(null); setSobre(null); setSelecao(null);
  };

  const total = DIAS.reduce((s, d) => s + (est.semana[d.k] || []).reduce((x, m) => x + m.minutos, 0), 0);
  const origem = selecao || arrastando;

  return (
    <>
      <TituloPagina
        eyebrow={`${fmtData(datas.seg).slice(0, 5)} a ${fmtData(datas.dom).slice(0, 5)}`}
        frase={t("painel.semana.titulo")}
        texto={t("painel.semana.texto")}
        direita={
          <div className="titulo-direita">
            <span className="etiqueta num">{fmtMin(total)} programados</span>
            {est.editada && (
              <Botao variante="vidro" tamanho="sm" icone={RotateCcw} onClick={() => mudar((d) => resetarSemana(d, uid))}>Voltar ao automático</Botao>
            )}
          </div>
        }
      />

      {est.editada && (
        <div className="aviso"><Sparkles aria-hidden="true" />Semana reorganizada por você. O que já foi feito continua marcado se você voltar ao automático.</div>
      )}

      <div className="semana-grade">
        {DIAS.map((d, i) => {
          const metas = est.semana[d.k] || [];
          const feitas = metas.filter((m) => m.done).length;
          const soma = metas.reduce((s, m) => s + m.minutos, 0);
          const alvo = origem && origem.de !== d.k && podeReceber(d.k);
          const classes = ["dia", i === hIdx && "dia--hoje", i < hIdx && "dia--passado", alvo && sobre === d.k && "dia--alvo", selecao && alvo && "dia--alvo"].filter(Boolean).join(" ");
          return (
            <section key={d.k} className={classes} aria-label={`${d.nome}, ${fmtData(datas[d.k])}`}
              onDragOver={(e) => { if (alvo) { e.preventDefault(); setSobre(d.k); } }}
              onDragLeave={() => setSobre(null)}
              onDrop={() => arrastando && mover(arrastando.id, arrastando.de, d.k)}>
              <div className="dia-topo">
                <strong>{d.nome}</strong>
                <span>{i === hIdx ? "hoje" : fmtData(datas[d.k]).slice(0, 5)}</span>
              </div>
              <div className="dia-topo"><span>{feitas}/{metas.length} feitas</span><span>{fmtMin(soma)} de {fmtMin(disp[d.k] || 0)}</span></div>
              <Barra valor={disp[d.k] ? (soma / disp[d.k]) * 100 : 0} cor={soma > (disp[d.k] || 0) ? "var(--danger)" : undefined} />

              {metas.map((m) => {
                const cor = m.tipo === "revisao" ? "var(--rev)" : corDaMateria(m.materiaId);
                const texto = <>
                  <strong>{m.materia}</strong>
                  {m.tipo === "revisao" && <small>REVISÃO · </small>}{fmtMin(m.minutos)}
                </>;
                if (m.done) return <div key={m.id} className="chip chip--feita" style={{ "--cor": cor }}>{texto}</div>;
                const selecionada = selecao?.id === m.id;
                return (
                  <button key={m.id} type="button" draggable
                    className={`chip${selecionada ? " chip--selecionada" : ""}${arrastando?.id === m.id ? " chip--arrastando" : ""}`}
                    style={{ "--cor": cor }} aria-pressed={selecionada}
                    aria-label={`${m.materia}, ${fmtMin(m.minutos)}. ${selecionada ? "Selecionada: escolha o dia" : "Mover para outro dia"}`}
                    onDragStart={() => { setSelecao(null); setArrastando({ id: m.id, de: d.k }); }}
                    onDragEnd={() => { setArrastando(null); setSobre(null); }}
                    onClick={() => setSelecao(selecionada ? null : { id: m.id, de: d.k, materia: m.materia })}>
                    {texto}
                  </button>
                );
              })}
              {metas.length === 0 && <p className="dia-vazio">Livre</p>}
              {selecao && alvo && (
                <Botao variante="solido" tamanho="sm" className="dia-soltar" onClick={() => mover(selecao.id, selecao.de, d.k)}>Mover para cá</Botao>
              )}
            </section>
          );
        })}
      </div>

      {selecao && (
        <div className="barra-mover" role="status">
          <Hand aria-hidden="true" width={18} height={18} />
          <span>Escolha o dia para <strong>{selecao.materia}</strong>.</span>
          <Botao variante="vidro" tamanho="sm" onClick={() => setSelecao(null)}>Cancelar</Botao>
        </div>
      )}
    </>
  );
}
