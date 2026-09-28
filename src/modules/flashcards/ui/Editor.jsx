/* Em construção: substituído na etapa seguinte. */
import { Dialogo, Vazio } from "./comum.jsx";

export default function Editor() {
  return <Vazio titulo="Em construção" />;
}

export function EditorNota({ aoFechar }) {
  return <Dialogo aberto aoFechar={aoFechar} titulo="Editar"><div className="fc-dialogo-corpo"><Vazio titulo="O editor chega na próxima etapa" /></div></Dialogo>;
}
