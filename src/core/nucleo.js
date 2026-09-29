/* ============================================================================
   NÚCLEO DA PLATAFORMA DE VESTIBULAR — tudo que NÃO é visual
   ----------------------------------------------------------------------------
   Extraído do protótipo (src/App.jsx). Sem React, sem estilos: pode ser usado
   com qualquer layout/arte. Aqui ficam só regras e catálogos; os dados reais
   vêm dos serviços (src/services) e do banco (src/data).

   Conteúdo:
   · Usuários e papéis (aluno / moderador)
   · Taxonomia: áreas → matérias → tópicos → subtópicos
   · Vestibulares e templates de ciclo de estudo por vestibular
   · Cursos em vídeo (categorias) e devolutivas de redação (competências ENEM)

   O motor de metas antigo (semana a semana) saiu daqui: as metas diárias são
   do core/motorMetas.js. As correções abaixo são do histórico deste arquivo.

   Correções aplicadas nesta versão (marcadas com "CORREÇÃO" no código).
   Todas são compatíveis com as chamadas antigas:
   1. Alocações com id de ÁREA (ex.: "matematica" nos CICLO_TEMPLATES) são
      divididas entre as matérias da área, proporcionalmente à carga horária.
   2. O tópico de cada meta segue o progresso do aluno (opcoes.progresso),
      em vez de ser sempre o primeiro tópico da matéria.
   3. recalcularPlanoInteligente aceita opcoes.hoje e não aloca metas em
      dias que já passaram.
   4. hojeISO e semanaKey usam a data local, não UTC (no Brasil, depois das
      21h o toISOString já devolvia o dia seguinte).
   5. No recálculo, pendências de matérias que não estão no ciclo voltam para
      a fila em vez de serem descartadas.
   6. No recálculo, as pendências são distribuídas ANTES de qualquer outra
      sessão (a prioridade estava só no comentário).
   7. Matéria sem pendência só recebe o que falta da sua cota semanal, e não
      mais uma "sessão típica" extra quando a semana dela já foi cumprida.
   8. Pendência que não cabe na semana volta em resumo.naoCouberam em vez de
      sumir em silêncio.
   9. opcoes.conteudoDaVez(materiaId): o plano individual informa tópico e
      subtópico de cada sessão (a taxonomia deixa de ser fixa no código).
  10. opcoes.semana: revisões entram pela data dentro da semana, não pelos
      "próximos 7 dias" (que caíam no dia da semana errado).
  11. As sessões semanais de cada matéria saem equilibradas (105 min com
      máximo de 90 → 55 + 50), em vez de uma sessão cheia e uma sobra de 15.
  12. Alocação com ehMateria: true não é expandida como área (o id da
      matéria pode coincidir com o de uma área do protótipo).
============================================================================ */

// Estrutura universal de matérias — 🔥 FIREBASE: /studyPlan (global)

const AREAS = [
  {
    id: "humanas", nome: "Humanas", cor: "#C9793A",
    materias: [
      { id: "historia", nome: "História", topicos: [
        { id: "h1", nome: "Brasil Colônia", carga: 360, subs: ["Pré-colonial", "Capitanias hereditárias", "Ciclo da cana-de-açúcar", "Insurreição Pernambucana", "Ciclo do ouro", "Inconfidências"] },
        { id: "h2", nome: "Era Vargas", carga: 240, subs: ["Estado Novo", "Populismo"] },
      ]},
      { id: "geografia", nome: "Geografia", topicos: [
        { id: "g1", nome: "Geopolítica", carga: 300, subs: ["Guerra Fria", "Globalização", "Blocos econômicos"] },
      ]},
      { id: "filosofia", nome: "Filosofia", topicos: [
        { id: "f1", nome: "Filosofia Antiga", carga: 180, subs: ["Sócrates", "Platão", "Aristóteles"] },
      ]},
      { id: "sociologia", nome: "Sociologia", topicos: [
        { id: "s1", nome: "Sociologia Clássica", carga: 180, subs: ["Durkheim", "Weber", "Marx"] },
      ]},
    ],
  },
  {
    id: "linguagens", nome: "Linguagens", cor: "#4B8FC4",
    materias: [
      { id: "portugues", nome: "Português", topicos: [
        { id: "p1", nome: "Sintaxe", carga: 300, subs: ["Período composto", "Regência", "Concordância"] },
      ]},
      { id: "literatura", nome: "Literatura", topicos: [
        { id: "l1", nome: "Modernismo", carga: 240, subs: ["1ª fase", "2ª fase", "Geração de 45"] },
      ]},
      { id: "redacao", nome: "Redação", topicos: [
        { id: "r1", nome: "Dissertativo-argumentativo", carga: 360, subs: ["Tese", "Argumentação", "Proposta"] },
      ]},
      { id: "ingles", nome: "Inglês", topicos: [
        { id: "i1", nome: "Reading", carga: 180, subs: ["Skimming", "Scanning", "Cognatos"] },
      ]},
    ],
  },
  {
    id: "matematica", nome: "Matemática", cor: "#CC5A8A",
    materias: [
      { id: "algebra", nome: "Álgebra", topicos: [
        { id: "a1", nome: "Funções", carga: 420, subs: ["Função afim", "Função quadrática", "Exponencial", "Logaritmo"] },
      ]},
      { id: "geometria", nome: "Geometria", topicos: [
        { id: "ge1", nome: "Geometria Plana", carga: 300, subs: ["Triângulos", "Círculo", "Áreas"] },
      ]},
      { id: "trigonometria", nome: "Trigonometria", topicos: [
        { id: "t1", nome: "Ciclo Trigonométrico", carga: 240, subs: ["Seno e cosseno", "Identidades", "Equações"] },
      ]},
      { id: "estatistica", nome: "Estatística", topicos: [
        { id: "e1", nome: "Análise de Dados", carga: 180, subs: ["Média/Moda/Mediana", "Probabilidade"] },
      ]},
    ],
  },
  {
    id: "naturais", nome: "Naturais", cor: "#5AA555",
    materias: [
      { id: "fisica", nome: "Física", topicos: [
        { id: "fi1", nome: "Mecânica", carga: 420, subs: ["Cinemática", "Dinâmica", "Energia"] },
      ]},
      { id: "quimica", nome: "Química", topicos: [
        { id: "qu1", nome: "Físico-Química", carga: 360, subs: ["Termoquímica", "Cinética", "Equilíbrio"] },
      ]},
      { id: "biologia", nome: "Biologia", topicos: [
        { id: "bi1", nome: "Citologia", carga: 240, subs: ["Membrana", "Organelas", "Divisão celular"] },
      ]},
    ],
  },
];

// índice rápido matéria→área e topico→info

const MATERIAS_FLAT = AREAS.flatMap((a) =>
  a.materias.map((m) => ({ ...m, areaId: a.id, areaNome: a.nome, areaCor: a.cor }))
);

const TOPICOS_FLAT = MATERIAS_FLAT.flatMap((m) =>
  m.topicos.map((t) => ({ ...t, materiaId: m.id, materiaNome: m.nome, areaNome: m.areaNome, areaCor: m.areaCor }))
);

// retorna os tópicos de uma matéria (por id) — usado no seletor em cascata

const topicosDaMateria = (materiaId) => {
  const m = MATERIAS_FLAT.find((x) => x.id === materiaId);
  return m ? m.topicos : [];
};

// Vestibulares disponíveis — 🔥 FIREBASE: poderia virar coleção /vestibulares
// Cada um tem uma cor de acento para a etiqueta visual minimalista.

const VESTIBULARES = [
  { id: "fuvest", nome: "FUVEST", cor: "#D0555F" },
  { id: "unicamp", nome: "UNICAMP", cor: "#4B8FC4" },
  { id: "unesp", nome: "UNESP", cor: "#C9A13A" },
  { id: "enem_med", nome: "ENEM MED", cor: "#CC5A8A" },
  { id: "bahiana", nome: "BAHIANA", cor: "#3FA99B" },
  { id: "fgv_insper", nome: "FGV/INSPER", cor: "#8A8FD6" },
  { id: "enem", nome: "ENEM", cor: "#C9793A" },
];

const vestInfo = (id) => VESTIBULARES.find((v) => v.id === id) || VESTIBULARES[0];

// Ciclos por vestibular: base dos planos gerais criados na instalação de demonstração

const CICLO_TEMPLATES = {
  enem: {
    nome: "ENEM",
    cor: "#C9793A",
    desc: "Distribuição equilibrada entre as 4 áreas + Redação.",
    alocacoes: [
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "historia",    materiaNome: "História",    minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "geografia",   materiaNome: "Geografia",   minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "redacao",     materiaNome: "Redação",     minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "ingles",      materiaNome: "Inglês",      minutosSemanais: 120, maxSessao: 60 },
    ],
  },
  enem_med: {
    nome: "ENEM Medicina",
    cor: "#CC5A8A",
    desc: "Foco em Ciências da Natureza. Biologia e Química com peso alto.",
    alocacoes: [
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 480, maxSessao: 90 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 360, maxSessao: 90 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "redacao",     materiaNome: "Redação",     minutosSemanais: 180, maxSessao: 60 },
    ],
  },
  fuvest: {
    nome: "FUVEST",
    cor: "#D0555F",
    desc: "Vestibular abrangente. Matemática e Ciências com peso alto.",
    alocacoes: [
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 360, maxSessao: 90 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "literatura",  materiaNome: "Literatura",  minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "historia",    materiaNome: "História",    minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "geografia",   materiaNome: "Geografia",   minutosSemanais: 120, maxSessao: 60 },
      { materiaId: "ingles",      materiaNome: "Inglês",      minutosSemanais: 120, maxSessao: 60 },
    ],
  },
  unicamp: {
    nome: "UNICAMP",
    cor: "#4B8FC4",
    desc: "Forte ênfase em Redação e Linguagens. Interdisciplinar.",
    alocacoes: [
      { materiaId: "redacao",     materiaNome: "Redação",     minutosSemanais: 360, maxSessao: 90 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "literatura",  materiaNome: "Literatura",  minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "historia",    materiaNome: "História",    minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "geografia",   materiaNome: "Geografia",   minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 180, maxSessao: 60 },
    ],
  },
  unesp: {
    nome: "UNESP",
    cor: "#C9A13A",
    desc: "Equilibrado. Peso ligeiramente maior em Exatas e Humanas.",
    alocacoes: [
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 300, maxSessao: 90 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "historia",    materiaNome: "História",    minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "geografia",   materiaNome: "Geografia",   minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "redacao",     materiaNome: "Redação",     minutosSemanais: 180, maxSessao: 60 },
    ],
  },
  bahiana: {
    nome: "BAHIANA",
    cor: "#3FA99B",
    desc: "Saúde: Biologia e Química com muito peso. Foco biomédico.",
    alocacoes: [
      { materiaId: "biologia",    materiaNome: "Biologia",    minutosSemanais: 480, maxSessao: 90 },
      { materiaId: "quimica",     materiaNome: "Química",     minutosSemanais: 360, maxSessao: 90 },
      { materiaId: "fisica",      materiaNome: "Física",      minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 180, maxSessao: 60 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 180, maxSessao: 60 },
    ],
  },
  fgv_insper: {
    nome: "FGV/INSPER",
    cor: "#8A8FD6",
    desc: "Exatas e Inglês com peso alto. Foco em raciocínio lógico.",
    alocacoes: [
      { materiaId: "matematica",  materiaNome: "Matemática",  minutosSemanais: 480, maxSessao: 90 },
      { materiaId: "ingles",      materiaNome: "Inglês",      minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "portugues",   materiaNome: "Português",   minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "redacao",     materiaNome: "Redação",     minutosSemanais: 240, maxSessao: 80 },
      { materiaId: "historia",    materiaNome: "História",    minutosSemanais: 180, maxSessao: 60 },
    ],
  },
};

const DISP_PADRAO = { seg: 240, ter: 240, qua: 210, qui: 240, sex: 180, sab: 360, dom: 120 };

const DIAS = [
  { k: "seg", nome: "Segunda" }, { k: "ter", nome: "Terça" }, { k: "qua", nome: "Quarta" },
  { k: "qui", nome: "Quinta" }, { k: "sex", nome: "Sexta" }, { k: "sab", nome: "Sábado" }, { k: "dom", nome: "Domingo" },
];

// formata minutos → "4h30" / "45min" / "0min"

const fmtMin = (min) => {
  if (!min) return "0min";
  const h = Math.floor(min / 60), m = min % 60;
  if (h && m) return `${h}h${String(m).padStart(2, "0")}`;
  if (h) return `${h}h`;
  return `${m}min`;
};


// Helper: dado uma data ISO (YYYY-MM-DD), retorna a chave do dia da semana.

const dataParaDiaSemana = (iso) => {
  if (!iso) return null;
  const [y, m, d] = iso.split("-").map(Number);
  const dow = new Date(y, m - 1, d).getDay();
  return ["dom", "seg", "ter", "qua", "qui", "sex", "sab"][dow];
};

// CORREÇÃO 4: data local no formato YYYY-MM-DD (toISOString converte para UTC).
const isoLocal = (dt = new Date()) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

const CATEGORIAS_PLAYLIST = [
  { id: "introducao", nome: "Introdução ao curso" },
  { id: "atualidades", nome: "Atualidades" },
  { id: "redacao", nome: "Redação" },
  { id: "outro", nome: "Outros cursos" },
];

const CORES_PLAYLIST = ["#C9793A", "#4B8FC4", "#8FB3FF", "#5AA555", "#FF6B5E", "#3FA99B", "#C9A13A"];

function provedorDoLink(url = "") {
  if (/youtu\.?be/i.test(url)) return "YouTube";
  if (/vimeo\.com/i.test(url)) return "Vimeo";
  if (/pandavideo/i.test(url)) return "Panda Video";
  if (/drive\.google/i.test(url)) return "Google Drive";
  return "Link externo";
}

const COMPETENCIAS_ENEM = [
  { id: "c1", nome: "C1 · Norma-padrão da língua escrita" },
  { id: "c2", nome: "C2 · Compreensão da proposta e repertório" },
  { id: "c3", nome: "C3 · Seleção e organização dos argumentos" },
  { id: "c4", nome: "C4 · Coesão textual" },
  { id: "c5", nome: "C5 · Proposta de intervenção" },
];

const CANAIS_ENVIO = [
  { id: "whatsapp", nome: "WhatsApp" }, { id: "email", nome: "E-mail" },
  { id: "presencial", nome: "Em mãos" }, { id: "outro", nome: "Outro" },
];

const INSTRUCOES_REDACAO_INICIAL = "Envie sua redação (foto nítida ou PDF) pelo WhatsApp da turma, com o tema no começo da mensagem. A devolutiva aparece aqui em até 7 dias.";

// ENEM usa competências; os demais vestibulares começam com nota livre (o moderador pode trocar)

const rubricaPadrao = (vest) => (vest === "enem" || vest === "enem_med" ? "enem" : "livre");

const hojeISO = () => isoLocal(new Date());

const fmtData = (iso) => (iso ? iso.split("-").reverse().join("/") : "");

// Nota total e percentual da nota máxima (permite comparar ENEM com nota livre)

function notaDevolutiva(d) {
  if (d.rubrica === "enem") {
    const total = COMPETENCIAS_ENEM.reduce((s, c) => s + (Number(d.notas?.[c.id]) || 0), 0);
    return { total, max: 1000, pct: total / 10, texto: String(total) };
  }
  const n = Number(d.notaLivre) || 0, m = Number(d.escalaLivre) || 10;
  return { total: n, max: m, pct: m ? (n / m) * 100 : 0, texto: `${n} / ${m}` };
}

export {
  AREAS,
  MATERIAS_FLAT,
  TOPICOS_FLAT,
  topicosDaMateria,
  VESTIBULARES,
  vestInfo,
  CICLO_TEMPLATES,
  DISP_PADRAO,
  DIAS,
  fmtMin,
  dataParaDiaSemana,
  isoLocal,
  CATEGORIAS_PLAYLIST,
  CORES_PLAYLIST,
  provedorDoLink,
  COMPETENCIAS_ENEM,
  CANAIS_ENVIO,
  INSTRUCOES_REDACAO_INICIAL,
  rubricaPadrao,
  hojeISO,
  fmtData,
  notaDevolutiva,
};
