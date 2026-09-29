/* Frases e cores editáveis pelo moderador (Textos e boas-vindas).
   Marcação: *palavra* vira destaque; Enter quebra a linha (títulos grandes);
   {nome}, {saudacao} e {vestibular} são trocados pelos dados do aluno.
   Resolução, do mais específico ao geral: texto do aluno → da jornada dele →
   do curso → do vestibular (grupos antigos) → texto geral → padrão abaixo.
   A tela de login é pública (aparece antes de saber quem é o aluno): só o
   texto geral vale nela.
   Dados: config/textos { geral, porGrupo: { "jornada:ID" | "curso:ID" | "vestibular:ID" }, corDestaque }
          textosAluno/{uid} { textos } */

import { MENU_ALUNO } from "./navegacao.js";

// cor do destaque na frase da tela de login (fundo branco)
export const COR_DESTAQUE_PADRAO = "#5B4BE0";

export const CORES_SUGERIDAS = [
  { nome: "Violeta", cor: "#5B4BE0" },
  { nome: "Azul", cor: "#3F63F5" },
  { nome: "Laranja", cor: "#E2761B" },
  { nome: "Rubi", cor: "#C9405A" },
  { nome: "Verde", cor: "#1E8F63" },
  { nome: "Grafite", cor: "#2B2B33" },
];

export const VARIAVEIS = ["nome", "saudacao", "vestibular"];

export const GRUPOS = [
  { id: "inicial", titulo: "Tela de login", descricao: "É pública (aparece antes de o aluno entrar), então vale para todos.", porAluno: false },
  { id: "menu", titulo: "Menu do aluno", descricao: "Os nomes das abas no topo do painel.", porAluno: true },
  { id: "painel", titulo: "Painel do aluno", descricao: "Títulos, textos de apoio, mensagens e a cor de destaque.", porAluno: true },
];

/* Telas do painel que a réplica mostra (menu: a aba que fica ativa). */
export const TELAS = [
  { id: "inicio", nome: "Dashboard", menu: "inicio" },
  { id: "plano", nome: "Edital", menu: "edital" },
  { id: "desempenho", nome: "Desempenho", menu: "desempenho" },
  { id: "questoes", nome: "Questões", menu: "questoes" },
  { id: "simulados", nome: "Simulados", menu: "simulados" },
  { id: "materiais", nome: "Materiais", menu: "materiais" },
  { id: "cursos", nome: "Meus cursos", menu: "cursos" },
  { id: "redacao", nome: "Redação", menu: "redacao" },
  { id: "avisos", nome: "Avisos", menu: null },
  { id: "boasvindas", nome: "Sobre o curso", menu: null },
];

const itensDoMenu = [...MENU_ALUNO.topo, ...MENU_ALUNO.extra.itens];
const MENU = Object.fromEntries([
  ...itensDoMenu.map((i) => [`menu.${i.k}`, { grupo: "menu", tipo: "linha", rotulo: `Aba “${i.label}”`, padrao: i.label }]),
  ["menu.extra", { grupo: "menu", tipo: "linha", rotulo: `Menu “${MENU_ALUNO.extra.label}”`, padrao: MENU_ALUNO.extra.label }],
]);

// título de uma tela: sobretítulo (linha pequena acima), título e texto de apoio
const cabecalho = (tela, { eyebrow, titulo, texto }) => ({
  ...(eyebrow != null && { [`painel.${tela}.eyebrow`]: { grupo: "painel", tela, tipo: "linha", rotulo: "Sobretítulo", padrao: eyebrow } }),
  [`painel.${tela}.titulo`]: { grupo: "painel", tela, tipo: "titulo", rotulo: "Título", padrao: titulo },
  ...(texto != null && { [`painel.${tela}.texto`]: { grupo: "painel", tela, tipo: "paragrafo", rotulo: "Texto de apoio", padrao: texto } }),
});

// tipo: "titulo" (título, com *destaque*), "linha", "paragrafo", "cor" (#rrggbb)
export const TEXTOS = {
  "inicial.entrar": { grupo: "inicial", tipo: "linha", rotulo: "Título do acesso", padrao: "Entrar na plataforma" },
  "inicial.selo": { grupo: "inicial", tipo: "linha", rotulo: "Linha abaixo do título do acesso", padrao: "Plataforma de estudos para vestibular" },
  "inicial.botao": { grupo: "inicial", tipo: "linha", rotulo: "Botão de entrar", padrao: "Entrar" },
  "inicial.titulo": { grupo: "inicial", tipo: "titulo", rotulo: "Frase principal", padrao: "Bem-vindo à *elite*." },
  "inicial.lede": { grupo: "inicial", tipo: "paragrafo", rotulo: "Texto de apoio", padrao: "Ciclos de estudo por vestibular, metas diárias que cabem na sua rotina e revisões no tempo certo, com o professor acompanhando." },

  ...MENU,

  "painel.cor": { grupo: "painel", tela: null, tipo: "cor", rotulo: "Cor de destaque do painel", padrao: "" },

  "painel.dashboard.saudacao": { grupo: "painel", tela: "inicio", tipo: "titulo", rotulo: "Saudação do Dashboard", padrao: "{saudacao}, *{nome}*." },
  "painel.dashboard.vazioTitulo": { grupo: "painel", tela: "inicio", tipo: "linha", rotulo: "Dia sem metas: título", padrao: "Nenhuma meta para hoje" },
  "painel.dashboard.vazioTexto": { grupo: "painel", tela: "inicio", tipo: "paragrafo", rotulo: "Dia sem metas: texto", padrao: "Dia livre no seu plano. Use para revisar ou registrar estudo por fora." },
  "painel.semana.texto": { grupo: "painel", tela: "inicio", tipo: "paragrafo", rotulo: "Instrução das 2 semanas", padrao: "Arraste uma meta para outro dia, ou toque nela e depois no dia: ela fica fixada lá e o resto se ajusta." },

  ...cabecalho("plano", { eyebrow: "Seu conteúdo programático", titulo: "Seu *edital*", texto: "Toque numa matéria para ver a fila de estudo. Arraste para mudar a ordem, ajuste os tempos, marque o que já domina e toque num tópico riscado para ver de novo." }),
  ...cabecalho("desempenho", { eyebrow: "Seus números", titulo: "Seu *desempenho*", texto: "O que está indo bem, onde está o gargalo e o que corrigir agora. Tudo calculado dos seus registros; a comparação é só com você mesmo." }),
  "painel.desempenho.recadoFocos": { grupo: "painel", tela: "desempenho", tipo: "paragrafo", rotulo: "Recado nos focos de atenção", padrao: "Corrija seus erros e registre-os em seu caderno." },
  ...cabecalho("questoes", { eyebrow: "Banco de questões", titulo: "Suas *questões*", texto: "Cada registro é um bloco de questões: quantas fez, quantas acertou e quantas errou. O desempenho sai daqui." }),
  ...cabecalho("simulados", { eyebrow: "Provas completas", titulo: "Seus *simulados*", texto: "Escolha uma prova, resolva no tempo dela e registre o resultado. O histórico fica separado por vestibular: cada prova tem a sua escala." }),
  ...cabecalho("materiais", { eyebrow: "Listas e PDFs do professor", titulo: "Materiais de *estudo*", texto: "Escolha a área para ver as listas e os materiais de cada tópico." }),
  ...cabecalho("cursos", { eyebrow: "Aulas do seu professor", titulo: "Meus *cursos*" }),
  ...cabecalho("redacao", { eyebrow: "Devolutivas do professor", titulo: "Suas *redações*" }),
  ...cabecalho("avisos", { eyebrow: "Do seu professor", titulo: "Seus *avisos*" }),
  "painel.boasvindas.titulo": { grupo: "painel", tela: "boasvindas", tipo: "titulo", rotulo: "Título", padrao: "Boas-vindas ao *curso*" },
};

export const grupoDaJornada = (id) => `jornada:${id}`;
export const grupoDoCurso = (id) => `curso:${id}`;
export const grupoDoVestibular = (id) => `vestibular:${id}`;
export const ehCor = (v) => /^#[0-9a-f]{6}$/i.test(String(v ?? "").trim());

/* Camadas que valem para um aluno, da mais específica à mais geral. */
export function camadasDoAluno(config, { doAluno, jornadaId, vestibularId, cursoId } = {}) {
  return [
    doAluno,
    jornadaId && config?.porGrupo?.[grupoDaJornada(jornadaId)],
    cursoId && config?.porGrupo?.[grupoDoCurso(cursoId)],
    vestibularId && config?.porGrupo?.[grupoDoVestibular(vestibularId)],
    config?.geral,
  ].filter(Boolean);
}

// Texto efetivo de uma chave. Campo vazio conta como "sem personalização".
export function textoDe(config, chave, contexto = {}) {
  for (const camada of camadasDoAluno(config, contexto)) {
    if (String(camada[chave] ?? "").trim()) return camada[chave];
  }
  return TEXTOS[chave]?.padrao || "";
}

/* Onde está o texto que vale abaixo de uma camada: "jornada", "geral" ou
   "padrão" (para o editor mostrar de onde o campo herda). */
export function origemDe(config, chave, contexto = {}) {
  const nomes = [];
  if (contexto.jornadaId) nomes.push(["jornada", config?.porGrupo?.[grupoDaJornada(contexto.jornadaId)]]);
  if (contexto.cursoId) nomes.push(["curso", config?.porGrupo?.[grupoDoCurso(contexto.cursoId)]]);
  if (contexto.vestibularId) nomes.push(["vestibular", config?.porGrupo?.[grupoDoVestibular(contexto.vestibularId)]]);
  nomes.push(["geral", config?.geral]);
  return nomes.find(([, camada]) => String(camada?.[chave] ?? "").trim())?.[0] || "padrão";
}

export function preencher(texto, vars = {}) {
  return String(texto ?? "").replace(/\{(\w+)\}/g, (marca, chave) => (vars[chave] != null ? vars[chave] : marca));
}

export const linhasDe = (texto) => String(texto ?? "").split(/\r?\n/).map((l) => l.trim()).filter(Boolean);

// "Bem-vindo à *elite*." → [{ texto: "Bem-vindo à " }, { texto: "elite", destaque: true }, { texto: "." }]
export function partesDe(linha) {
  const partes = [];
  const re = /\*([^*]+)\*/g;
  let i = 0, m;
  while ((m = re.exec(linha))) {
    if (m.index > i) partes.push({ texto: linha.slice(i, m.index) });
    partes.push({ texto: m[1], destaque: true });
    i = re.lastIndex;
  }
  if (i < linha.length) partes.push({ texto: linha.slice(i) });
  return partes;
}

// "Prof. Moderador" → "Prof" (o ponto final vem da frase, não do nome)
export const primeiroNome = (nome = "") => nome.trim().split(/\s+/)[0].replace(/\.+$/, "");

export function saudacao(agora = new Date()) {
  const h = agora.getHours();
  return h < 12 ? "Bom dia" : h < 18 ? "Boa tarde" : "Boa noite";
}
