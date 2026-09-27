/* Dados da plataforma e persistência.
   Por enquanto tudo fica no localStorage deste navegador: recarregar não perde
   nada, mas cada aparelho tem a sua cópia.
   🔥 FIREBASE: trocar carregarDados/salvarDados por leituras e escritas no
   Firestore (modelo na seção 7 da especificação) e a sessão pelo Authentication. */

import {
  ALUNOS_INICIAIS, CICLOS_POR_ALUNO_INICIAL, DEVOLUTIVAS_INICIAIS, DISP_POR_ALUNO_INICIAL,
  ENVIOS_INICIAIS, INSTRUCOES_REDACAO_INICIAL, PLAYLISTS_INICIAIS, PROGRESSO_INICIAL,
  QUESTOES_INICIAIS, REVISOES_INICIAIS, WELCOME_INICIAL, isoLocal,
} from "../core/nucleo.js";
import { textosIniciais } from "../textos.js";
import fotoExemplo from "../assets/redacao-exemplo.jpg";

const RELEVANCIA_EXEMPLO = { v1: "alta", v2: "alta", v3: "media", v4: "alta", v5: "media", v6: "alta", v7: "alta", v8: "alta" };

// Correção de exemplo sobre a folha em src/assets (posições em fração da imagem).
const MARCACOES_EXEMPLO = [
  { id: "m1", x: 0.285, y: 0.152, tipo: "elogio", competencia: "c2", texto: "Repertório pertinente: o filme dialoga com o tema e prepara a tese." },
  { id: "m2", x: 0.82, y: 0.311, tipo: "elogio", competencia: "c3", texto: "Tese clara, já com os dois eixos que o texto vai desenvolver." },
  { id: "m3", x: 0.35, y: 0.469, tipo: "problema", competencia: "c1", texto: "Falta vírgula depois de “Mundial”: o adjunto adverbial deslocado (“Segundo o Fórum Econômico Mundial”) precisa ser isolado." },
  { id: "m4", x: 0.262, y: 0.588, tipo: "problema", competencia: "c4", texto: "“Nesse sentido” já foi usado no fim da introdução. Varie o conectivo: “Além disso”, “Paralelamente”." },
  { id: "m5", x: 0.849, y: 0.628, tipo: "problema", competencia: "c3", texto: "O dado aparece, mas não é explicado. Diga por que a informalidade prova que os ganhos da tecnologia se concentram." },
  { id: "m6", x: 0.421, y: 0.787, tipo: "elogio", competencia: "c5", texto: "Proposta completa: agente, ação, meio, finalidade e detalhamento." },
];

function devolutivasIniciais() {
  const devs = DEVOLUTIVAS_INICIAIS.map((d) => ({ marcacoes: [], proposta: "", ...d }));
  const dv2 = devs.find((d) => d.id === "dv2");
  Object.assign(dv2, { foto: fotoExemplo, marcacoes: MARCACOES_EXEMPLO });
  // outro aluno com o mesmo tema: permite mostrar a média do tema
  devs.push({
    id: "dv4", alunoId: "alu2", tema: dv2.tema, vestibular: "enem", rubrica: "enem",
    notas: { c1: 120, c2: 160, c3: 120, c4: 120, c5: 160 }, recebidaEm: "2026-09-17", canal: "whatsapp",
    comentario: "Estrutura correta. Falta aprofundar os argumentos do desenvolvimento.", pontosFortes: "Proposta de intervenção bem detalhada.",
    aMelhorar: "Revisar concordância verbal e usar repertório no D1.", foto: null, marcacoes: [], proposta: "",
    status: "enviada", enviadaEm: "2026-09-21", lida: true,
  });
  return devs;
}

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
    devolutivas: devolutivasIniciais(),
    instrucoesRedacao: INSTRUCOES_REDACAO_INICIAL,
    playlists: PLAYLISTS_INICIAIS.map((pl) => ({
      capa: null, ...pl, videos: pl.videos.map((v) => ({ relevancia: RELEVANCIA_EXEMPLO[v.id] || "", ...v })),
    })),
    assistidos: { alu1: { v1: true } },
    historicoReplan: [{ id: "rp1", alunoId: "alu1", data: "2026-05-20", totalRealocado: 90, materiasFundidas: 1, qtdPendencias: 2 }],
    estudo: {},
    config: { questoesPorHora: 10 },
    textos: textosIniciais(),
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
