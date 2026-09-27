import { ListChecks } from "lucide-react";
import { useEu, useFrases } from "../../state/hooks.js";
import { useVisaoAluno } from "../../state/aluno.js";
import { Carregando, TituloPagina, Vazio } from "../../ui/ui.jsx";
import { PainelPlano } from "../comum/Plano.jsx";

/* "Meu plano de estudos": o plano individual do aluno, interativo dentro do
   que o professor liberou. */
export default function PlanoAluno() {
  const eu = useEu();
  const v = useVisaoAluno(eu.id);
  const t = useFrases(v.aluno || eu);
  if (v.carregando) return <Carregando />;
  return (
    <>
      <TituloPagina eyebrow="Plano individual" frase={t("painel.plano.titulo")}
        texto="A sequência de conteúdos, as datas previstas, o que está atrasado e as revisões. Recalcular nunca apaga o que você já fez." />
      {v.plano ? <PainelPlano v={v} modo="aluno" /> : (
        <div className="cartao"><Vazio icone={ListChecks} titulo="Seu plano ainda não foi criado" texto="O professor aplica um plano geral do seu vestibular e curso; depois ele vira o seu plano, ajustável." /></div>
      )}
    </>
  );
}
