/* Dados da plataforma e persistência.
   Por enquanto tudo fica no localStorage deste navegador: recarregar não perde
   nada, mas cada aparelho tem a sua cópia.
   🔥 FIREBASE: trocar carregarDados/salvarDados por leituras e escritas no
   Firestore (modelo na seção 7 da especificação) e a sessão pelo Authentication. */

import {
  ALUNOS_INICIAIS, CICLOS_POR_ALUNO_INICIAL, DEVOLUTIVAS_INICIAIS, DISP_POR_ALUNO_INICIAL,
  ENVIOS_INICIAIS, PROGRESSO_INICIAL, QUESTOES_INICIAIS, REVISOES_INICIAIS, WELCOME_INICIAL,
  isoLocal,
} from "../core/nucleo.js";

const CHAVE_DADOS = "aprova:db:v1";
const CHAVE_SESSAO = "aprova:sessao";
const VERSAO = 1;

export function dadosIniciais(agora = new Date()) {
  return structuredClone({
    versao: VERSAO,
    welcome: WELCOME_INICIAL,
    alunos: ALUNOS_INICIAIS,
    ciclosPorAluno: CICLOS_POR_ALUNO_INICIAL,
    dispPorAluno: DISP_POR_ALUNO_INICIAL,
    progressoAlunos: PROGRESSO_INICIAL,
    revisoes: REVISOES_INICIAIS,
    recadosPorAluno: {
      alu1: [{ id: "rec1", texto: "Ótimo ritmo nesta semana! Revise Termoquímica antes do simulado de sábado.", data: isoLocal(agora) }],
    },
    questoes: { alu1: QUESTOES_INICIAIS },
    envios: ENVIOS_INICIAIS,
    devolutivas: DEVOLUTIVAS_INICIAIS,
    historicoReplan: [{ id: "rp1", alunoId: "alu1", data: "2026-05-20", totalRealocado: 90, materiasFundidas: 1, qtdPendencias: 2 }],
    estudo: {},
    config: { questoesPorHora: 10 },
  });
}

export function carregarDados() {
  try {
    const salvo = JSON.parse(localStorage.getItem(CHAVE_DADOS));
    if (salvo && salvo.versao === VERSAO) return { ...dadosIniciais(), ...salvo };
  } catch { /* dado corrompido ou armazenamento bloqueado */ }
  return dadosIniciais();
}

export function salvarDados(db) {
  try { localStorage.setItem(CHAVE_DADOS, JSON.stringify(db)); } catch { /* sem armazenamento: segue em memória */ }
}

export function carregarSessao() {
  try { return JSON.parse(localStorage.getItem(CHAVE_SESSAO)); } catch { return null; }
}

export function salvarSessao(sessao) {
  try {
    if (sessao) localStorage.setItem(CHAVE_SESSAO, JSON.stringify(sessao));
    else localStorage.removeItem(CHAVE_SESSAO);
  } catch { /* idem */ }
}
