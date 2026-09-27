import { useRef, useState } from "react";
import { Clock4, GraduationCap, Target } from "lucide-react";
import { CICLO_TEMPLATES, VESTIBULARES, fmtMin } from "../core/nucleo.js";
import { useApp, useFrases } from "../state/AppContext.jsx";
import { Cinema } from "../ui/Cinema.jsx";
import { Barra, Botao, Dialogo, Estrela } from "../ui/ui.jsx";

const ICONES_DESTAQUE = [GraduationCap, Target, Clock4];

function ConteudoFolha({ folha, welcome, abrir }) {
  const hero = welcome.hero || {};
  if (folha === "metodo") {
    const destaque = welcome.blocos.find((b) => b.tipo === "destaque");
    return (
      <>
        {destaque && (
          <div className="destaques">
            {destaque.itens.map((d) => <div key={d.label}><strong>{d.valor}</strong><span>{d.label}</span></div>)}
          </div>
        )}
        {welcome.blocos.map((b) => {
          if (b.tipo === "titulo") return <h3 key={b.id}>{b.texto}</h3>;
          if (b.tipo === "texto") return <p key={b.id}>{b.texto}</p>;
          return null;
        })}
      </>
    );
  }
  if (folha === "professores") {
    return (
      <div className="professor">
        <span className="avatar" style={{ "--cor": hero.cor }}>
          {hero.foto ? <img src={hero.foto} alt="" /> : (hero.nome || "?").charAt(0)}
        </span>
        <div>
          <span className="eyebrow">Seus professores</span>
          <strong>{hero.nome}</strong>
          <p>{hero.subtitulo}</p>
        </div>
      </div>
    );
  }
  if (folha === "acesso") {
    return <p>O acesso é criado pelo seu professor. Entre com o e-mail cadastrado e a senha que você recebeu. Se esqueceu a senha, fale com a coordenação.</p>;
  }
  if (folha === "vestibulares") {
    return (
      <>
        <p>Cada vestibular tem um ciclo de estudos próprio: quanto tempo por semana vai para cada matéria.</p>
        <div className="lista-vest">
          {VESTIBULARES.map((v) => (
            <Botao key={v.id} variante="vidro" tamanho="sm" onClick={() => abrir(`vest:${v.id}`)}>
              <i className="ponto" style={{ background: v.cor }} />{v.nome}
            </Botao>
          ))}
        </div>
      </>
    );
  }
  const vest = VESTIBULARES.find((v) => `vest:${v.id}` === folha);
  const tpl = vest && CICLO_TEMPLATES[vest.id];
  if (!tpl) return null;
  const maior = Math.max(...tpl.alocacoes.map((a) => a.minutosSemanais));
  return (
    <>
      <p>{tpl.desc}</p>
      <div style={{ display: "grid", gap: 10 }}>
        {tpl.alocacoes.map((a) => (
          <div key={a.materiaId} className="alocacao">
            <span>{a.materiaNome}</span>
            <Barra valor={(a.minutosSemanais / maior) * 100} cor="#ffffff" />
            <span>{fmtMin(a.minutosSemanais)}/sem</span>
          </div>
        ))}
      </div>
      <Botao variante="vidro" tamanho="sm" onClick={() => abrir("vestibulares")}>Ver outros vestibulares</Botao>
    </>
  );
}

const TITULOS_FOLHA = { metodo: "Método", professores: "Professores", vestibulares: "Vestibulares", acesso: "Acesso" };

export default function Login() {
  const { db, entrar } = useApp();
  const t = useFrases();
  const [passo, setPasso] = useState("email");
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");
  const [folha, setFolha] = useState(null);
  const campo = useRef(null);

  const focar = () => setTimeout(() => campo.current?.focus(), 30);
  const irParaEmail = () => { setPasso("email"); setSenha(""); setErro(""); focar(); };

  const enviar = (e) => {
    e.preventDefault();
    if (passo === "email") {
      if (!/.+@.+\..+/.test(email.trim())) { setErro("Digite um e-mail válido para continuar."); return; }
      setErro(""); setPasso("senha"); focar();
      return;
    }
    // se der certo, a rota /entrar redireciona para as boas-vindas
    if (!entrar(email, senha)) setErro("E-mail ou senha não conferem. Confira os dados e tente de novo.");
  };

  const destaque = db.welcome.blocos.find((b) => b.tipo === "destaque")?.itens || [];
  const vestFolha = folha?.startsWith("vest:") ? VESTIBULARES.find((v) => `vest:${v.id}` === folha) : null;

  return (
    <>
      <Cinema
        nav={[
          { label: "Método", onClick: () => setFolha("metodo") },
          { label: "Professores", onClick: () => setFolha("professores") },
          { label: "Vestibulares", onClick: () => setFolha("vestibulares") },
          { label: "Acesso", onClick: () => setFolha("acesso") },
        ]}
        acoes={<Botao variante="solido" className="aparece aparece--escala" style={{ "--d": "0.34s" }} onClick={irParaEmail}>Entrar</Botao>}
        selo={<span className="selo-topo aparece aparece--pop" style={{ "--d": "0.22s" }}><Estrela />{t("inicial.selo")}</span>}
        titulo={t("inicial.titulo")}
        corDestaque={db.textos.corDestaque}
        lede={t("inicial.lede")}
        stats={destaque.map((d, i) => {
          const Icone = ICONES_DESTAQUE[i % ICONES_DESTAQUE.length];
          return { icone: <Icone aria-hidden="true" />, texto: <><b>{d.valor}</b> {d.label}</> };
        })}
      >
        <form className="capsula" onSubmit={enviar} noValidate>
          {passo === "email" ? (
            <input ref={campo} key="email" id="login-email" type="email" autoComplete="email" inputMode="email"
              placeholder="Digite seu e-mail" aria-label="E-mail" value={email}
              onChange={(e) => { setEmail(e.target.value); setErro(""); }} />
          ) : (
            <input ref={campo} key="senha" id="login-senha" type="password" autoComplete="current-password"
              placeholder="Sua senha" aria-label="Senha" value={senha}
              onChange={(e) => { setSenha(e.target.value); setErro(""); }} />
          )}
          <Botao type="submit" variante="solido">{passo === "email" ? "Continuar" : "Entrar"}</Botao>
        </form>
        <p className="cine-dica" aria-live="polite">
          {erro ? <span className="erro">{erro}</span>
            : passo === "senha" ? <>{email} · <button type="button" onClick={irParaEmail}>trocar e-mail</button></>
              : "Teste: aluno@curso.com ou moderador@curso.com · senha 123"}
        </p>
      </Cinema>

      <Dialogo className="folha" data-theme="dark" aberto={!!folha} aoFechar={() => setFolha(null)}
        titulo={vestFolha ? vestFolha.nome : TITULOS_FOLHA[folha]}>
        <ConteudoFolha folha={folha} welcome={db.welcome} abrir={setFolha} />
      </Dialogo>
    </>
  );
}
