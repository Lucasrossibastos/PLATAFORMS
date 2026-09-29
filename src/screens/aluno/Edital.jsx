import { ListChecks } from "lucide-react";
import { useEu, useFrases } from "../../state/hooks.js";
import { useVisaoAluno } from "../../state/aluno.js";
import { Carregando, TituloPagina, Vazio } from "../../ui/ui.jsx";
import { EditalDoAluno } from "../comum/Edital.jsx";

/* Edital: as matérias em blocos; cada bloco abre a fila de estudo da
   matéria, com os subtópicos como orientação. O aluno marca o que já viu,
   revê do zero o que quiser e muda a ordem, dentro do que o professor liberou. */
export default function EditalAluno() {
  const eu = useEu();
  const v = useVisaoAluno(eu.id);
  const t = useFrases(v.aluno || eu);
  if (v.carregando) return <Carregando />;
  return (
    <>
      <TituloPagina eyebrow={t("painel.plano.eyebrow")} frase={t("painel.plano.titulo")} texto={t("painel.plano.texto")} />
      {v.plano ? <EditalDoAluno v={v} modo="aluno" /> : (
        <div className="cartao"><Vazio icone={ListChecks} titulo="Seu edital ainda não foi montado" texto="O professor escolhe a jornada do seu vestibular; depois ela vira o seu edital, ajustável." /></div>
      )}
    </>
  );
}
