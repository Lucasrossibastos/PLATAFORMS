import { createContext, useCallback, useContext, useEffect, useMemo, useRef, useState } from "react";
import { MOCK_USERS } from "../core/nucleo.js";
import { carregarDados, carregarSessao, dadosIniciais, salvarDados, salvarSessao } from "./dados.js";
import { estudoAtual } from "./estudo.js";

const Ctx = createContext(null);

// Contas de teste do núcleo + alunos cadastrados (que também entram com e-mail e senha).
// 🔥 FIREBASE: signInWithEmailAndPassword + /users/{uid}.role
function acharConta(db, email, senha) {
  const e = email.trim().toLowerCase();
  const mock = MOCK_USERS.find((u) => u.email === e && u.password === senha);
  if (mock) return { uid: mock.uid, name: mock.name, email: mock.email, role: mock.role };
  const aluno = db.alunos.find((a) => a.email === e && a.senha === senha);
  return aluno ? { uid: aluno.id, name: aluno.nome, email: aluno.email, role: "aluno" } : null;
}

function contaPorUid(db, uid) {
  const mock = MOCK_USERS.find((u) => u.uid === uid);
  if (mock) return { uid, name: mock.name, email: mock.email, role: mock.role };
  const aluno = db.alunos.find((a) => a.id === uid);
  return aluno ? { uid, name: aluno.nome, email: aluno.email, role: "aluno" } : null;
}

export function AppProvider({ children }) {
  const [db, setDb] = useState(carregarDados);
  const [sessao, setSessao] = useState(carregarSessao);
  const dbRef = useRef(db);

  useEffect(() => {
    const t = setTimeout(() => salvarDados(db), 250);
    return () => clearTimeout(t);
  }, [db]);
  useEffect(() => salvarSessao(sessao), [sessao]);

  // Aplica `fn` num rascunho e devolve o que `fn` devolver. Usa a ref para
  // encadear chamadas no mesmo evento sem perder alterações.
  const mudar = useCallback((fn) => {
    const rascunho = structuredClone(dbRef.current);
    const retorno = fn(rascunho);
    dbRef.current = rascunho;
    setDb(rascunho);
    return retorno;
  }, []);

  const usuario = useMemo(() => (sessao ? contaPorUid(db, sessao.uid) : null), [db, sessao]);

  const entrar = useCallback((email, senha) => {
    const conta = acharConta(dbRef.current, email, senha);
    if (conta) setSessao({ uid: conta.uid });
    return conta;
  }, []);
  const sair = useCallback(() => setSessao(null), []);
  const restaurarExemplo = useCallback(() => {
    const novo = dadosIniciais();
    dbRef.current = novo;
    setDb(novo);
  }, []);

  const valor = useMemo(
    () => ({ db, usuario, mudar, entrar, sair, restaurarExemplo }),
    [db, usuario, mudar, entrar, sair, restaurarExemplo],
  );
  return <Ctx.Provider value={valor}>{children}</Ctx.Provider>;
}

export function useApp() {
  return useContext(Ctx);
}

export const rotaInicial = (usuario) => (usuario?.role === "moderador" ? "/moderador/alunos" : "/aluno/dashboard");

/* Estudo do aluno logado, sempre válido para hoje. Se for o primeiro acesso ou
   a semana virou, calcula o novo estado e grava logo depois do render. */
export function useEstudo() {
  const { db, usuario, mudar } = useApp();
  const uid = usuario.uid;

  // se o app ficar aberto na virada do dia, recalcula ao voltar para a aba
  const [tique, setTique] = useState(0);
  useEffect(() => {
    const ver = () => { if (!document.hidden) setTique((n) => n + 1); };
    document.addEventListener("visibilitychange", ver);
    return () => document.removeEventListener("visibilitychange", ver);
  }, []);

  const salvo = db.estudo[uid];
  const est = useMemo(() => estudoAtual(db, uid), [db, uid, tique]); // tique: nova data ao voltar
  const precisaGravar = est !== salvo;

  useEffect(() => {
    if (precisaGravar) mudar((d) => { d.estudo[uid] = structuredClone(est); });
  }, [precisaGravar, est, uid, mudar]);

  return est;
}
