import { Navigate, useNavigate, useParams } from "react-router-dom";
import { ArrowLeft, CircleDashed, ImageIcon } from "lucide-react";
import { useApp } from "../state/AppContext.jsx";
import { baseDoPapel } from "../navegacao.js";
import { Botao, TituloPagina } from "../ui/ui.jsx";

function Bloco({ bloco }) {
  switch (bloco.tipo) {
    case "titulo": return <h2 className="bloco-titulo">{bloco.texto}</h2>;
    case "texto": return <p className="bloco-texto">{bloco.texto}</p>;
    case "divisor": return <div className="bloco-divisor" />;
    case "foto":
      return bloco.url
        ? <figure className="bloco-foto"><img src={bloco.url} alt={bloco.legenda || ""} /></figure>
        : <div className="cartao vazio"><ImageIcon aria-hidden="true" /></div>;
    case "destaque":
      return (
        <div className="bloco-destaque">
          {(bloco.itens || []).map((d) => (
            <div key={d.label} className="stat-cartao"><strong>{d.valor}</strong><span>{d.label}</span></div>
          ))}
        </div>
      );
    default: return null;
  }
}

/* Página de boas-vindas dentro da plataforma (o conteúdo é do moderador). */
export function BoasVindasPagina() {
  const { db } = useApp();
  const hero = db.welcome.hero || {};
  return (
    <>
      <TituloPagina eyebrow={hero.nome} antes="Boas-vindas ao" destaque="curso" />
      <div className="cartao professor">
        <span className="avatar" style={{ "--cor": hero.cor }}>
          {hero.foto ? <img src={hero.foto} alt="" /> : (hero.nome || "?").charAt(0)}
        </span>
        <div>
          <span className="eyebrow">Seus professores</span>
          <strong>{hero.nome}</strong>
          {hero.subtitulo && <p>{hero.subtitulo}</p>}
        </div>
      </div>
      <div className="cartao blocos">
        {db.welcome.blocos.map((b) => <Bloco key={b.id} bloco={b} />)}
      </div>
    </>
  );
}

/* Telas ainda não construídas: mostra o que vão fazer. */
export function EmBreve({ menu }) {
  const { tela } = useParams();
  const { usuario } = useApp();
  const navigate = useNavigate();
  const item = menu.find((i) => i.k === tela);
  const base = baseDoPapel(usuario.role);
  if (!item) return <Navigate to={base} replace />;
  return (
    <div className="em-breve">
      <TituloPagina eyebrow="Próxima etapa" antes={item.label} texto={item.resumo} />
      {item.itens?.length > 0 && (
        <ul>
          {item.itens.map((t) => <li key={t}><CircleDashed aria-hidden="true" />{t}</li>)}
        </ul>
      )}
      {item.k !== menu[0].k && (
        <Botao variante="vidro" icone={ArrowLeft} style={{ marginTop: 28 }} onClick={() => navigate(base)}>Voltar ao início</Botao>
      )}
    </div>
  );
}
