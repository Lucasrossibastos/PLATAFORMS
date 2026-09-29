/* Tópicos de uma matéria no edital de um aluno, como FILA DE ESTUDO: os
   pendentes na ordem em que vão ser estudados (o primeiro é o atual; os
   pausados guardam a %), depois os já vistos, riscados. Arrastar muda a
   ordem (e a fila); "Estudar agora" leva direto para o topo. Tocar num
   tópico riscado o devolve como não visto, no fim da fila (a conclusão
   anterior fica no histórico). */

import { DndContext, KeyboardSensor, MouseSensor, TouchSensor, closestCenter, useSensor, useSensors } from "@dnd-kit/core";
import { SortableContext, arrayMove, sortableKeyboardCoordinates, useSortable, verticalListSortingStrategy } from "@dnd-kit/sortable";
import { CSS } from "@dnd-kit/utilities";
import { ArrowUpToLine, Check, GripVertical, Repeat, Trash2 } from "lucide-react";
import { fmtMin } from "../../core/nucleo.js";
import { fmtDataCurta } from "../../core/datas.js";
import { filaDaMateria } from "../../core/ciclos.js";
import { parametrosAtuais, proximaOcorrencia } from "../../core/revisaoRecorrente.js";
import { useApp } from "../../state/AppContext.jsx";
import { Barra, Botao } from "../../ui/ui.jsx";

const pct = (x) => `${Math.round((x || 0) * 100)}%`;
const ETIQUETA = {
  atual: ["Estudando agora", "etiqueta--rev"],
  pausado: ["Pausado", ""],
  concluido: ["Visto", "etiqueta--ok"],
};

function useSensores() {
  return useSensors(
    useSensor(MouseSensor, { activationConstraint: { distance: 4 } }),
    useSensor(TouchSensor, { activationConstraint: { delay: 160, tolerance: 6 } }),
    useSensor(KeyboardSensor, { coordinateGetter: sortableKeyboardCoordinates }),
  );
}

function Ordenavel({ id, children, arrastavel }) {
  const o = useSortable({ id, disabled: !arrastavel });
  const estilo = { transform: CSS.Transform.toString(o.transform), transition: o.transition };
  return children({ ref: o.setNodeRef, estilo, arrastando: o.isDragging, alca: { ...o.attributes, ...o.listeners } });
}

// data da última vez que o tópico foi concluído (nunca inventada)
function vistoEm(e) {
  const c = [...e.ciclos].reverse().find((x) => x.concluido);
  if (!c) return "visto";
  return c.concluidoEm ? `visto em ${fmtDataCurta(c.concluidoEm)}` : "visto (data não registrada)";
}

export function FilaTopicos({ materiaId, topicos, itens, v, pode, ocupado, aoOrdenar, aoCortar, aoReverDoZero, aoRevisao, aoOperar, renderSubtopicos, carga }) {
  const { ind } = useApp();
  const sensores = useSensores();
  const itensM = topicos.map((t) => itens.get(`t:${t.topicoId}`)).filter(Boolean);
  const { fila, atual, status, estados } = filaDaMateria(itensM, v.progresso);
  const doTopico = new Map(topicos.map((t) => [t.topicoId, t]));
  const pendentes = fila.map((it) => doTopico.get(it.topicoId));
  const vistos = itensM.filter((it) => status[it.itemId] === "concluido").map((it) => doTopico.get(it.topicoId));
  const revisaoDe = (itemId) => (v.revisoesRecorrentes || []).find((r) => r.itemId === itemId);
  const ordenar = (novaFila) => aoOrdenar([...novaFila, ...vistos].map((t) => t.topicoId));
  const fimArrasto = ({ active, over }) => {
    if (!over || active.id === over.id) return;
    ordenar(arrayMove(pendentes, pendentes.findIndex((t) => t.topicoId === active.id), pendentes.findIndex((t) => t.topicoId === over.id)));
  };

  const linha = (t, i, { ref, estilo, arrastando, alca } = {}) => {
    const it = itens.get(`t:${t.topicoId}`);
    const e = estados.get(it.itemId);
    const st = it === atual ? "atual" : status[it.itemId];
    const [rotulo, classe] = ETIQUETA[st] || [];
    const visto = st === "concluido";
    const nomeT = ind.nomeTopico(t.topicoId);
    const rev = revisaoDe(it.itemId);
    const pRev = rev?.ativo ? parametrosAtuais(rev) : null;
    const info = visto
      ? [vistoEm(e), pRev && `revisão a cada ${pRev.intervaloDias} dias · próxima ${fmtDataCurta(proximaOcorrencia(rev, v.hoje))}`]
      : [`${fmtMin(it.duracao)} de estudo`, e.minutosCiclo > 0 && `${fmtMin(Math.min(e.minutosCiclo, it.duracao))} feitos`];
    return (
      <li key={t.topicoId} ref={ref} style={estilo} className={`topico${visto ? " topico--cortado" : ""}${st === "atual" ? " topico--atual" : ""}${arrastando ? " topico--arrastando" : ""}`}>
        <div className="topico-cabeca">
          {alca && pode.reordenar && !visto
            ? <button type="button" className="icone-btn alca" aria-label={`Arrastar ${nomeT}`} title="Arraste para mudar a ordem" {...alca}><GripVertical /></button>
            : <span className="topico-num num" aria-hidden="true">{visto ? <Check width={13} height={13} /> : i + 1}</span>}
          <div className="topico-texto">
            {visto && pode.cortar ? (
              <button type="button" className="topico-riscado" disabled={ocupado} aria-label={`${nomeT}: visto. Tocar para voltar a não visto`}
                title="Tocar para voltar a não visto" onClick={() => aoReverDoZero(it)}><strong>{nomeT}</strong></button>
            ) : <strong>{nomeT}{rotulo && <span className={`etiqueta ${classe}`}>{rotulo}</span>}</strong>}
            <small>{info.filter(Boolean).join(" · ")}{visto && pode.cortar ? " · toque para ver de novo" : ""}</small>
            {!visto && e.pctCiclo > 0 && <span className="topico-barra"><Barra valor={e.pctCiclo * 100} cor="var(--cor)" /><small className="num">{pct(e.pctCiclo)}</small></span>}
          </div>
          <span className="topico-acoes">
            {carga && !visto && carga(t)}
            {pode.reordenar && !visto && st !== "atual" && (
              <button type="button" className="icone-btn" aria-label={`Estudar ${nomeT} agora`} title="Estudar agora (vai para o topo da fila)" disabled={ocupado}
                onClick={() => ordenar([t, ...pendentes.filter((x) => x !== t)])}><ArrowUpToLine /></button>
            )}
            {pode.cortar && !visto && <Botao variante="vidro" tamanho="sm" icone={Check} disabled={ocupado} aria-label={`Marcar ${nomeT} como visto`} onClick={() => aoCortar(it)}>Já vi</Botao>}
            {pode.revisoes && e.vezesConcluido > 0 && (
              <Botao variante={rev?.ativo ? "vidro" : "texto"} tamanho="sm" icone={Repeat} disabled={ocupado} aria-label={`Revisão recorrente de ${nomeT}`} onClick={() => aoRevisao(it, rev)}>
                {rev?.ativo ? `${pRev.intervaloDias}d` : "Revisão"}
              </Botao>
            )}
            {pode.estrutura && <button type="button" className="icone-btn" aria-label={`Tirar ${nomeT} do edital`} title="Tirar do edital" disabled={ocupado} onClick={() => aoOperar({ tipo: "removerTopico", materiaId, topicoId: t.topicoId }, `Tirar ${nomeT} do edital`)}><Trash2 /></button>}
          </span>
        </div>
        {renderSubtopicos(t)}
      </li>
    );
  };

  return (
    <>
      <DndContext sensors={sensores} collisionDetection={closestCenter} onDragEnd={fimArrasto}>
        <SortableContext items={pendentes.map((t) => t.topicoId)} strategy={verticalListSortingStrategy}>
          <ol className="lista-topicos">
            {pendentes.map((t, i) => (
              <Ordenavel key={t.topicoId} id={t.topicoId} arrastavel={pode.reordenar && !ocupado}>
                {(o) => linha(t, i, o)}
              </Ordenavel>
            ))}
          </ol>
        </SortableContext>
      </DndContext>
      {pendentes.length === 0 && vistos.length > 0 && <p className="previa-linha">Tudo visto nesta matéria.</p>}
      {vistos.length > 0 && (
        <>
          <h3 className="eyebrow fila-vistos">Vistos · {vistos.length}</h3>
          <ol className="lista-topicos">{vistos.map((t, i) => linha(t, i))}</ol>
        </>
      )}
    </>
  );
}
