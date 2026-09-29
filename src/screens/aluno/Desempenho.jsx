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
      <TituloPagina eyebrow={t("painel.desempenho.eyebrow")} frase={t("painel.desempenho.titulo")} texto={t("painel.desempenho.texto")} />
      <PainelDesempenho v={v} />
    </>
  );
}
