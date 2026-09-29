import { useEu, useFrases } from "../../state/hooks.js";
import { useVisaoAluno } from "../../state/aluno.js";
import { Carregando, TituloPagina } from "../../ui/ui.jsx";
import { PainelDesempenho } from "../desempenho/PainelDesempenho.jsx";

export default function DesempenhoAluno() {
  const eu = useEu();
  const v = useVisaoAluno(eu.id);
  const t = useFrases(v.aluno || eu);
  if (v.carregando) return <Carregando />;
  return (
    <>
      <TituloPagina eyebrow="Seus números" frase={t("painel.desempenho.titulo")}
        texto="O que está indo bem, onde está o gargalo e o que revisar agora. Tudo calculado dos seus registros; a comparação é só com você mesmo." />
      <PainelDesempenho v={v} />
    </>
  );
}
