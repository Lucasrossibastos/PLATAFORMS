import React, { useState, useEffect, useContext, createContext, useMemo, useRef } from "react";
import {
  LineChart, Line, BarChart, Bar, PieChart, Pie, Cell,
  XAxis, YAxis, CartesianGrid, Tooltip, ResponsiveContainer, Legend
} from "recharts";
import {
  GraduationCap, LayoutDashboard, CalendarDays, FileQuestion, TrendingUp,
  ListChecks, Clock4, NotebookPen, FileText, Library, Users, BookMarked,
  Repeat, UploadCloud, Settings2, Sun, Moon, LogOut, Menu, X, Plus,
  Check, AlertTriangle, RefreshCw, ChevronRight, ChevronDown, Sparkles,
  Trash2, Pencil, Eye, Search, Trophy, Flame, Target, BookOpen, User,
  Lock, Mail, GripVertical, FilePlus, CheckCircle2, XCircle, Filter,
  ArrowRight, Zap, PlusCircle, Save, Image as ImageIcon, Minus,
  PlayCircle, PenLine, Video, ArrowUp, ArrowDown, Link2, Send, Paperclip, ExternalLink, EyeOff
} from "lucide-react";

/* ============================================================================
   PLATAFORMA PRÉ-VESTIBULAR — PROTÓTIPO VISUAL COMPLETO (MOCK)
   ----------------------------------------------------------------------------
   ⚠️  Este arquivo é um PROTÓTIPO de interface com dados simulados em memória.
       O objetivo é validar layout, navegação e experiência antes da
       integração real com Firebase.

   🔥 FIREBASE: todos os pontos marcados com este comentário indicam onde a
       lógica mockada deve ser substituída por chamadas reais ao Firebase
       (Authentication / Firestore / Storage). Procure por "🔥 FIREBASE" no
       arquivo para localizar cada ponto de integração.
   ========================================================================== */

/* ----------------------------------------------------------------------------
   TEMA (claro/escuro) — paleta sóbria com destaque em laranja, estilo Ferretto
---------------------------------------------------------------------------- */
const ThemeContext = createContext();
const useTheme = () => useContext(ThemeContext);

const ACCENT = "#f97316"; // laranja
const ACCENT_SOFT = "#fb923c";
const DANGER = "#ef4444";
const GREEN = "#22c55e";

function ThemeProvider({ children }) {
  const [dark, setDark] = useState(true); // dark mode padrão
  const value = useMemo(() => ({ dark, toggle: () => setDark((d) => !d) }), [dark]);
  return <ThemeContext.Provider value={value}>{children}</ThemeContext.Provider>;
}

// Paleta derivada do tema, usada em estilos inline e nos gráficos
function usePalette() {
  const { dark } = useTheme();
  return dark
    ? {
        bg: "#0c0d10", surface: "#15171c", surface2: "#1c1f26", border: "#2a2e37",
        text: "#e7e9ee", textSoft: "#9aa0ac", textFaint: "#5f6672",
        accent: ACCENT, accentSoft: ACCENT_SOFT, danger: DANGER, green: GREEN,
        chartGrid: "#262a33", inputBg: "#1c1f26", overlay: "rgba(0,0,0,.6)",
      }
    : {
        bg: "#f6f7f9", surface: "#ffffff", surface2: "#f0f1f4", border: "#e3e6ea",
        text: "#1a1c20", textSoft: "#5b626d", textFaint: "#9aa0ac",
        accent: "#ea580c", accentSoft: ACCENT, danger: "#dc2626", green: "#16a34a",
        chartGrid: "#e8eaee", inputBg: "#f0f1f4", overlay: "rgba(15,18,24,.35)",
      };
}

/* ----------------------------------------------------------------------------
   DADOS MOCK
   🔥 FIREBASE: substituir todo este bloco por leituras do Firestore.
---------------------------------------------------------------------------- */

// 🔥 FIREBASE Authentication: usuários virão de signInWithEmailAndPassword +
//    um documento de perfil em /users/{uid} com o campo "role".
const MOCK_USERS = [
  { uid: "mod1", name: "Prof. Moderador", email: "moderador@curso.com", password: "123", role: "moderador" },
  { uid: "alu1", name: "Ana Beatriz", email: "aluno@curso.com", password: "123", role: "aluno" },
];

// Estrutura universal de matérias — 🔥 FIREBASE: /studyPlan (global)
const AREAS = [
  {
    id: "humanas", nome: "Humanas", cor: "#a855f7",
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
    id: "linguagens", nome: "Linguagens", cor: "#3b82f6",
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
    id: "matematica", nome: "Matemática", cor: "#f97316",
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
    id: "naturais", nome: "Naturais", cor: "#22c55e",
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
  { id: "fuvest", nome: "FUVEST", cor: "#ef4444" },
  { id: "unicamp", nome: "UNICAMP", cor: "#3b82f6" },
  { id: "unesp", nome: "UNESP", cor: "#eab308" },
  { id: "enem_med", nome: "ENEM MED", cor: "#ec4899" },
  { id: "bahiana", nome: "BAHIANA", cor: "#14b8a6" },
  { id: "fgv_insper", nome: "FGV/INSPER", cor: "#8b5cf6" },
  { id: "enem", nome: "ENEM", cor: "#f97316" },
];
const vestInfo = (id) => VESTIBULARES.find((v) => v.id === id) || VESTIBULARES[0];

// Modelos de prova para CLASSIFICAR um simulado (lista do aluno ao anexar).
// Diferente da lista de vestibular-alvo: aqui o aluno indica de qual prova é o
// simulado que está enviando.
const MODELOS_PROVA = [
  { id: "enem", nome: "ENEM", cor: "#f97316" },
  { id: "fuvest", nome: "FUVEST", cor: "#ef4444" },
  { id: "unicamp", nome: "UNICAMP", cor: "#3b82f6" },
  { id: "unesp", nome: "UNESP", cor: "#eab308" },
  { id: "bahiana", nome: "BAHIANA", cor: "#14b8a6" },
  { id: "insper", nome: "INSPER", cor: "#8b5cf6" },
  { id: "fgv", nome: "FGV", cor: "#a855f7" },
];
const modeloInfo = (id) => MODELOS_PROVA.find((v) => v.id === id) || VESTIBULARES.find((v) => v.id === id) || MODELOS_PROVA[0];

// Ciclo de estudos do aluno (mock) — 🔥 FIREBASE: /students/{uid}/cycle
// =========================================================================
// CICLOS DE ESTUDO — templates por vestibular + estrutura por aluno
// =========================================================================
// Cada ciclo tem: blocos (matéria + minutos por sessão),
//                semanas (duração do ciclo antes de repetir: 1, 2, 3 ou 4),
//                frequenciaDias (a cada quantos dias o ciclo avança)
// Os blocos são distribuídos ao longo das (semanas * 7) dias pelo engine.

// =========================================================================
// CICLOS DE ESTUDO — modelo de ALOCAÇÃO SEMANAL por matéria
// =========================================================================
// Cada ciclo define QUANTOS MINUTOS POR SEMANA o aluno dedica a cada matéria.
// A engine distribui automaticamente esses minutos nos dias da semana,
// respeitando a disponibilidade diária. Sessões são quebradas em blocos de
// no máximo maxSessao minutos (padrão 90min) para variedade diária.
// O ciclo se repete automaticamente toda semana até o moderador alterá-lo.

const CICLO_TEMPLATES = {
  enem: {
    nome: "ENEM",
    cor: "#f97316",
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
    cor: "#ec4899",
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
    cor: "#ef4444",
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
    cor: "#3b82f6",
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
    cor: "#eab308",
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
    cor: "#14b8a6",
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
    cor: "#8b5cf6",
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

// Estrutura de ciclo por aluno — 🔥 FIREBASE: /students/{uid}/cycle
// { alocacoes: [{ materiaId, materiaNome, minutosSemanais, maxSessao }] }
const CICLOS_POR_ALUNO_INICIAL = {
  alu1: { alocacoes: CICLO_TEMPLATES.fuvest.alocacoes.map((a) => ({ ...a })) },
  alu2: { alocacoes: CICLO_TEMPLATES.enem_med.alocacoes.map((a) => ({ ...a })) },
  alu3: { alocacoes: CICLO_TEMPLATES.unicamp.alocacoes.map((a) => ({ ...a })) },
};
const CICLO_PADRAO = { alocacoes: CICLO_TEMPLATES.enem.alocacoes.map((a) => ({ ...a })) };

// Retorna o ciclo de um aluno, ou o padrão se não houver.
const getCicloAluno = (ciclosPorAluno, uid) =>
  ciclosPorAluno[uid] || CICLO_PADRAO;

// =========================================================================
// Disponibilidade por aluno — 🔥 FIREBASE: /students/{uid}/availability
// =========================================================================
const DISP_POR_ALUNO_INICIAL = {
  alu1: { seg: 240, ter: 240, qua: 210, qui: 240, sex: 180, sab: 360, dom: 120 },
  alu2: { seg: 180, ter: 180, qua: 180, qui: 180, sex: 120, sab: 300, dom: 60 },
  alu3: { seg: 300, ter: 300, qua: 240, qui: 300, sex: 240, sab: 420, dom: 180 },
};
const DISP_PADRAO = { seg: 240, ter: 240, qua: 210, qui: 240, sex: 180, sab: 360, dom: 120 };

const getDispAluno = (dispPorAluno, uid) =>
  dispPorAluno[uid] || { ...DISP_PADRAO };
const DIAS = [
  { k: "seg", nome: "Segunda" }, { k: "ter", nome: "Terça" }, { k: "qua", nome: "Quarta" },
  { k: "qui", nome: "Quinta" }, { k: "sex", nome: "Sexta" }, { k: "sab", nome: "Sábado" }, { k: "dom", nome: "Domingo" },
];
// formata minutos → "4h30" / "45min" / "0"
const fmtMin = (min) => {
  if (!min) return "0";
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

// Agrupa revisões agendadas nos próximos 7 dias por dia-da-semana.
function revisoesPorDiaSemana(revisoes) {
  const hoje = new Date(); hoje.setHours(0, 0, 0, 0);
  const fim = new Date(hoje); fim.setDate(fim.getDate() + 7);
  const out = { seg: [], ter: [], qua: [], qui: [], sex: [], sab: [], dom: [] };
  (revisoes || []).forEach((r) => {
    (r.sessoes || []).forEach((s) => {
      if (s.status !== "agendada") return;
      const [y, m, d] = s.dia.split("-").map(Number);
      const dt = new Date(y, m - 1, d); dt.setHours(0, 0, 0, 0);
      if (dt >= hoje && dt <= fim) {
        const k = dataParaDiaSemana(s.dia);
        if (k && out[k]) out[k].push({
          revisaoId: r.id, materiaId: r.materiaId || "", materia: r.materia,
          topicoId: r.topicoId, topico: r.topico, duracaoMin: r.duracaoMin, dia: s.dia,
        });
      }
    });
  });
  return out;
}
/* ============================================================================
   ENGINE DE GERAÇÃO DE METAS — modelo de ALOCAÇÃO SEMANAL
   ============================================================================
   Recebe as alocações semanais por matéria e a disponibilidade diária do aluno.
   1. Revisões espaçadas entram primeiro (prioridade), consumindo a disponibilidade.
   2. Para cada matéria: divide o total semanal em sessões de no máximo maxSessao.
   3. Sessões são intercaladas entre matérias para variedade diária.
   4. Cada sessão é alocada ao dia com MAIOR capacidade restante que comporte ela
      (best-fit greedy) — isso garante distribuição natural ao longo da semana.
   5. Não estoura o teto diário.
   6. O ciclo se repete sozinho toda semana sem configuração adicional.
   🔥 FIREBASE: resultado persistido em /students/{uid}/dailyGoals/{semanaKey}
------------------------------------------------------------------------------ */

// Chave da semana corrente (segunda-feira no formato YYYY-MM-DD).
// Usada para detectar virada de semana e regenerar automaticamente.
function semanaKey(dt = new Date()) {
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=dom
  const seg = new Date(d); seg.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return seg.toISOString().slice(0, 10);
}

/* Engine principal: distribui alocações semanais nos dias respeitando disponibilidade.
   Aceita `cicloConfig` com { alocacoes } ou o formato antigo { blocos } para retrocompat. */
function distribuirSemana(cicloConfig, disp, revisoes = []) {
  // normaliza: aceita tanto { alocacoes } quanto o formato legado { blocos }
  const alocacoes = cicloConfig?.alocacoes
    || (cicloConfig?.blocos || []).map((b) => ({ ...b, minutosSemanais: b.minutos * 5, maxSessao: b.minutos }))
    || [];

  const resultado = {};
  DIAS.forEach((d) => { resultado[d.k] = []; });

  // capacidade restante por dia (inicia com a disponibilidade total)
  const cap = {};
  DIAS.forEach((d) => { cap[d.k] = Math.max(0, disp[d.k] || 0); });

  // --- ETAPA 1: revisões espaçadas (prioridade) ---
  const revsPorDia = revisoesPorDiaSemana(revisoes);
  DIAS.forEach((d) => {
    (revsPorDia[d.k] || []).forEach((rev, idx) => {
      const dur = Math.min(rev.duracaoMin, cap[d.k]);
      if (dur >= 5) {
        resultado[d.k].push({
          id: `rev-${d.k}-${idx}-${rev.dia || ""}`,
          materiaId: rev.materiaId || "", materia: rev.materia,
          topicoId: rev.topicoId, topico: rev.topico,
          minutos: dur, done: false, tipo: "revisao", revisaoId: rev.revisaoId,
        });
        cap[d.k] -= dur;
      }
    });
  });

  // --- ETAPA 2: sessões de cada matéria ---
  // Quebra o total semanal de cada matéria em sessões de no máximo maxSessao.
  const sessoesPorMateria = {};
  alocacoes.forEach((aloc) => {
    if (!aloc.minutosSemanais || aloc.minutosSemanais <= 0) return;
    const maxS = Math.min(aloc.maxSessao || 90, aloc.minutosSemanais);
    const lista = [];
    let rest = aloc.minutosSemanais;
    while (rest > 0) {
      const dur = Math.min(rest, maxS);
      if (dur >= 15) lista.push({ ...aloc, minutos: dur });
      rest -= dur;
    }
    if (lista.length > 0) sessoesPorMateria[aloc.materiaId] = lista;
  });

  // --- ETAPA 3: intercala sessões de diferentes matérias ---
  // [M1s1, M2s1, M3s1, M1s2, M2s2, M3s2, ...]  → variedade diária
  const arrays = Object.values(sessoesPorMateria);
  const interleaved = [];
  const maxLen = arrays.reduce((m, a) => Math.max(m, a.length), 0);
  for (let i = 0; i < maxLen; i++) {
    arrays.forEach((arr) => { if (arr[i]) interleaved.push(arr[i]); });
  }

  // --- ETAPA 4: best-fit greedy — maior capacidade restante que comporte a sessão ---
  interleaved.forEach((sessao, idx) => {
    // ordena dias por capacidade desc, pega o primeiro que cabe
    const dia = DIAS
      .filter((d) => cap[d.k] >= sessao.minutos)
      .sort((a, b) => cap[b.k] - cap[a.k])[0];
    if (!dia) return; // não coube em nenhum dia desta semana
    const mat = MATERIAS_FLAT.find((m) => m.id === sessao.materiaId);
    const topico = mat?.topicos?.[0];
    resultado[dia.k].push({
      id: `${dia.k}-${sessao.materiaId}-${idx}`,
      materiaId: sessao.materiaId, materia: sessao.materiaNome,
      topicoId: topico?.id, topico: topico ? topico.nome : sessao.materiaNome,
      minutos: sessao.minutos, done: false, tipo: "ciclo",
    });
    cap[dia.k] -= sessao.minutos;
  });

  return resultado;
}

/* Atalho — mantém a assinatura gerarSemana(cicloConfig, disp, revisoes) para
   retrocompatibilidade com os useEffects e callbacks existentes. */
function gerarSemana(cicloConfig, disp, revisoes = []) {
  return distribuirSemana(cicloConfig, disp, revisoes);
}

/* Gera o resumo semanal de horas por matéria com base nas alocações do ciclo.
   Usado na pré-visualização do editor. */
function resumoCicloSemanal(cicloConfig, disp) {
  const totalDisp = Object.values(disp || {}).reduce((s, v) => s + v, 0);
  const alocacoes = cicloConfig?.alocacoes || [];
  const totalAloc = alocacoes.reduce((s, a) => s + (a.minutosSemanais || 0), 0);
  return { totalDisp, totalAloc, overflow: totalAloc > totalDisp };
}

/* Replanejamento de metas atrasadas SEM estourar o tempo diário do aluno.
   Para cada meta atrasada, procura o próximo dia que ainda tem folga
   (capacidade = disponibilidade do dia − minutos já ocupados naquele dia).
   Se a meta não couber inteira num dia, ela é FATIADA: parte entra na folga
   de hoje, o restante segue para os próximos dias. Nunca ultrapassa o teto.
   Retorna { plano, sobra } — sobra = minutos que não couberam na janela. */
function replanejarAtrasadas(atrasadas, disp, semanaAtual) {
  // capacidade livre de cada dia = disponibilidade(min) − já ocupado
  const ocupado = {};
  DIAS.forEach((d) => {
    const metasDia = (semanaAtual[d.k] || []).filter((m) => !m.done);
    ocupado[d.k] = metasDia.reduce((s, m) => s + m.minutos, 0);
  });
  const capacidade = {};
  DIAS.forEach((d) => { capacidade[d.k] = Math.max(0, (disp[d.k] || 0) - ocupado[d.k]); });

  // ordem dos próximos dias a partir de amanhã (índice 0 = hoje/seg no mock)
  const ordemDias = DIAS.map((d) => d.k);
  const plano = []; // { meta, diaKey, diaNome, minutos }
  let sobra = 0;

  atrasadas.forEach((meta) => {
    let restante = meta.minutos;
    // começa a alocar a partir do dia seguinte (i = 1) para não sobrecarregar hoje
    for (let i = 1; i < ordemDias.length && restante > 0; i++) {
      const dk = ordemDias[i];
      const livre = capacidade[dk];
      if (livre <= 0) continue;
      const aloca = Math.min(livre, restante);
      plano.push({ meta, diaKey: dk, diaNome: DIAS.find((d) => d.k === dk).nome, minutos: aloca });
      capacidade[dk] -= aloca;
      restante -= aloca;
    }
    if (restante > 0) sobra += restante; // não coube na janela desta semana
  });

  return { plano, sobra };
}

/* RECÁLCULO INTELIGENTE DO PLANO INTEIRO (botão 🔄).
   Em vez de só realocar as atrasadas, regenera a semana do zero a partir dos
   ciclos + disponibilidade, reincorporando o tempo PENDENTE (atrasadas + metas
   não concluídas) como prioridade. As pendências são agregadas por matéria e
   podem ser fundidas em blocos maiores num dia que caiba — nunca estourando o
   teto diário. Mantém as metas já concluídas intactas.
   Retorna { semana, resumo } onde resumo descreve o que mudou. */
function recalcularPlanoInteligente(cicloConfig, disp, semanaAtual, atrasadas, revisoes = []) {
  // extrai alocações no novo formato ou converte do antigo
  const alocacoes = cicloConfig?.alocacoes
    || (cicloConfig?.blocos || []).map((b) => ({ ...b, minutosSemanais: b.minutos * 5, maxSessao: b.minutos }))
    || [];
  // 1) tempo pendente por matéria = atrasadas + metas futuras não concluídas
  //    Revisões NÃO viram pendência — elas têm cronograma próprio e são preservadas.
  const pendentePorMat = {};
  const addPend = (mid, nome, min) => {
    if (!pendentePorMat[mid]) pendentePorMat[mid] = { materiaId: mid, materia: nome, minutos: 0 };
    pendentePorMat[mid].minutos += min;
  };
  (atrasadas || []).forEach((m) => addPend(m.materiaId, m.materia, m.minutos));
  DIAS.forEach((d) => (semanaAtual[d.k] || []).forEach((m) => {
    if (!m.done && m.tipo !== "revisao") addPend(m.materiaId, m.materia, m.minutos);
  }));

  // 2) revisões agendadas para esta semana (entram como prioritárias no dia certo)
  const revsPorDia = revisoesPorDiaSemana(revisoes);

  // 3) capacidade = disponibilidade − minutos JÁ CONCLUÍDOS no dia
  const capacidade = {};
  DIAS.forEach((d) => {
    const feitoMin = (semanaAtual[d.k] || []).filter((m) => m.done).reduce((s, m) => s + m.minutos, 0);
    capacidade[d.k] = Math.max(0, (disp[d.k] || 0) - feitoMin);
  });

  // 4) nova semana começa com as metas CONCLUÍDAS preservadas
  const novaSemana = {};
  DIAS.forEach((d) => { novaSemana[d.k] = (semanaAtual[d.k] || []).filter((m) => m.done); });

  // 5) injeta as REVISÕES agendadas como metas prioritárias, descontando capacidade
  let totalRevisoes = 0;
  DIAS.forEach((d) => {
    (revsPorDia[d.k] || []).forEach((rev, idx) => {
      const aloca = Math.min(rev.duracaoMin, capacidade[d.k]);
      if (aloca >= 5) {
        novaSemana[d.k].push({
          id: `rev-${d.k}-${idx}-${rev.dia}`,
          materiaId: rev.materiaId, materia: rev.materia,
          topicoId: rev.topicoId, topico: rev.topico,
          minutos: aloca, done: false, tipo: "revisao", revisaoId: rev.revisaoId,
        });
        capacidade[d.k] -= aloca; totalRevisoes += aloca;
      }
    });
  });

  // 6) ordem de prioridade das matérias: segue alocações; o tempo
  //    de cada matéria = pendência (se houver) ou alocação semanal / 5 (um dia típico).
  let totalRealocado = 0, materiasFundidas = 0;
  const fila = [];
  alocacoes.forEach((aloc) => {
    const sessaoTipica = Math.min(aloc.maxSessao || 90, Math.round((aloc.minutosSemanais || 0) / 5));
    const pend = pendentePorMat[aloc.materiaId];
    if (pend && pend.minutos > 0) {
      fila.push({ ...pend, fundida: pend.minutos > sessaoTipica });
      if (pend.minutos > sessaoTipica) materiasFundidas++;
    } else if (sessaoTipica > 0) {
      fila.push({ materiaId: aloc.materiaId, materia: aloc.materiaNome, minutos: sessaoTipica, fundida: false });
    }
  });

  // 7) distribui a fila pelos dias, em rodadas, respeitando o teto (já descontadas as revisões)
  let guard = 0, idx = 0;
  while (fila.some((f) => f.minutos > 0) && guard < 200) {
    const item = fila[idx % Math.max(1, fila.length)];
    if (item && item.minutos > 0) {
      const dk = DIAS.map((d) => d.k).find((k) => capacidade[k] >= Math.min(15, item.minutos));
      if (dk) {
        const aloca = Math.min(capacidade[dk], item.minutos);
        const mat = MATERIAS_FLAT.find((m) => m.id === item.materiaId);
        const topico = mat?.topicos?.[0];
        novaSemana[dk].push({
          id: `r${Date.now()}-${guard}`, materiaId: item.materiaId, materia: item.materia,
          topicoId: topico?.id, topico: topico ? topico.nome : item.materia,
          minutos: aloca, done: false, replanejada: true, tipo: "ciclo",
        });
        capacidade[dk] -= aloca; item.minutos -= aloca; totalRealocado += aloca;
      } else { item.minutos = 0; } // sem folga em lugar nenhum
    }
    idx++; guard++;
  }

  return { semana: novaSemana, resumo: { totalRealocado, materiasFundidas, qtdPendencias: Object.keys(pendentePorMat).length, totalRevisoes } };
}

/* ----------------------------------------------------------------------------
   PRIMITIVOS DE UI
---------------------------------------------------------------------------- */
function Btn({ children, onClick, variant = "primary", size = "md", icon: Icon, style, disabled, title }) {
  const p = usePalette();
  const sizes = {
    sm: { padding: "6px 12px", fontSize: 13, gap: 6 },
    md: { padding: "10px 16px", fontSize: 14, gap: 8 },
    lg: { padding: "13px 22px", fontSize: 15, gap: 8 },
  }[size];
  const variants = {
    primary: { background: p.accent, color: "#fff", border: "1px solid " + p.accent },
    soft: { background: p.surface2, color: p.text, border: "1px solid " + p.border },
    ghost: { background: "transparent", color: p.textSoft, border: "1px solid transparent" },
    danger: { background: "transparent", color: p.danger, border: "1px solid " + p.danger + "55" },
    outline: { background: "transparent", color: p.accent, border: "1px solid " + p.accent + "88" },
  }[variant];
  return (
    <button
      onClick={onClick} disabled={disabled} title={title}
      style={{
        display: "inline-flex", alignItems: "center", justifyContent: "center",
        gap: sizes.gap, padding: sizes.padding, fontSize: sizes.fontSize, fontWeight: 600,
        borderRadius: 10, cursor: disabled ? "not-allowed" : "pointer", opacity: disabled ? 0.5 : 1,
        transition: "all .18s ease", whiteSpace: "nowrap", ...variants, ...style,
      }}
      onMouseEnter={(e) => { if (!disabled) e.currentTarget.style.filter = "brightness(1.1)"; }}
      onMouseLeave={(e) => { e.currentTarget.style.filter = "none"; }}
    >
      {Icon && <Icon size={sizes.fontSize + 3} />}
      {children}
    </button>
  );
}

function Card({ children, style, pad = 20, onClick, hover }) {
  const p = usePalette();
  return (
    <div
      onClick={onClick}
      style={{
        background: p.surface, border: "1px solid " + p.border, borderRadius: 16,
        padding: pad, transition: "all .2s ease", cursor: onClick ? "pointer" : "default", ...style,
      }}
      onMouseEnter={(e) => { if (hover) { e.currentTarget.style.borderColor = p.accent + "66"; e.currentTarget.style.transform = "translateY(-2px)"; } }}
      onMouseLeave={(e) => { if (hover) { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.transform = "none"; } }}
    >
      {children}
    </div>
  );
}

function Field({ label, children }) {
  const p = usePalette();
  return (
    <label style={{ display: "block", marginBottom: 14 }}>
      {label && <span style={{ display: "block", fontSize: 12.5, fontWeight: 600, color: p.textSoft, marginBottom: 6, letterSpacing: ".02em" }}>{label}</span>}
      {children}
    </label>
  );
}

function Input(props) {
  const p = usePalette();
  return (
    <input
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
        background: p.inputBg, border: "1px solid " + p.border, color: p.text,
        fontSize: 14, outline: "none", transition: "border .15s", ...props.style,
      }}
      onFocus={(e) => (e.target.style.borderColor = p.accent)}
      onBlur={(e) => (e.target.style.borderColor = p.border)}
    />
  );
}

function Select({ children, ...props }) {
  const p = usePalette();
  return (
    <select
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
        background: p.inputBg, border: "1px solid " + p.border, color: p.text,
        fontSize: 14, outline: "none", cursor: "pointer", ...props.style,
      }}
    >
      {children}
    </select>
  );
}

function Textarea(props) {
  const p = usePalette();
  return (
    <textarea
      {...props}
      style={{
        width: "100%", boxSizing: "border-box", padding: "11px 13px", borderRadius: 10,
        background: p.inputBg, border: "1px solid " + p.border, color: p.text,
        fontSize: 14, outline: "none", resize: "vertical", fontFamily: "inherit", lineHeight: 1.6, ...props.style,
      }}
      onFocus={(e) => (e.target.style.borderColor = p.accent)}
      onBlur={(e) => (e.target.style.borderColor = p.border)}
    />
  );
}

function Badge({ children, color, soft }) {
  const p = usePalette();
  const c = color || p.accent;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 4, padding: "3px 9px", borderRadius: 999,
      fontSize: 11.5, fontWeight: 700, letterSpacing: ".02em",
      background: soft ? c + "1f" : c, color: soft ? c : "#fff", border: soft ? "1px solid " + c + "33" : "none",
    }}>{children}</span>
  );
}

function Modal({ open, onClose, title, children, width = 480 }) {
  const p = usePalette();
  if (!open) return null;
  return (
    <div
      onClick={onClose}
      style={{
        position: "fixed", inset: 0, background: p.overlay, zIndex: 100,
        display: "flex", alignItems: "center", justifyContent: "center", padding: 20,
        animation: "fadeIn .15s ease", backdropFilter: "blur(3px)",
      }}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        style={{
          background: p.surface, border: "1px solid " + p.border, borderRadius: 18,
          width: "100%", maxWidth: width, maxHeight: "88vh", overflowY: "auto",
          boxShadow: "0 24px 60px rgba(0,0,0,.45)", animation: "popIn .2s cubic-bezier(.16,1,.3,1)",
        }}
      >
        {title && (
          <div style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "18px 22px", borderBottom: "1px solid " + p.border }}>
            <h3 style={{ margin: 0, fontSize: 17, fontWeight: 700, color: p.text }}>{title}</h3>
            <button onClick={onClose} style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", padding: 4 }}><X size={20} /></button>
          </div>
        )}
        <div style={{ padding: 22 }}>{children}</div>
      </div>
    </div>
  );
}

function SectionTitle({ icon: Icon, title, subtitle, right }) {
  const p = usePalette();
  return (
    <div style={{ display: "flex", alignItems: "flex-start", justifyContent: "space-between", marginBottom: 22, gap: 16, flexWrap: "wrap" }}>
      <div style={{ display: "flex", gap: 13 }}>
        {Icon && (
          <div style={{ width: 42, height: 42, borderRadius: 12, background: p.accent + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
            <Icon size={21} color={p.accent} />
          </div>
        )}
        <div>
          <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: "-.02em" }}>{title}</h2>
          {subtitle && <p style={{ margin: "3px 0 0", fontSize: 13.5, color: p.textSoft }}>{subtitle}</p>}
        </div>
      </div>
      {right}
    </div>
  );
}

function Empty({ icon: Icon, title, sub }) {
  const p = usePalette();
  return (
    <div style={{ textAlign: "center", padding: "50px 20px", color: p.textFaint }}>
      {Icon && <Icon size={40} style={{ marginBottom: 12, opacity: .5 }} />}
      <p style={{ margin: 0, fontSize: 15, fontWeight: 600, color: p.textSoft }}>{title}</p>
      {sub && <p style={{ margin: "5px 0 0", fontSize: 13 }}>{sub}</p>}
    </div>
  );
}

function ProgressBar({ value, color, height = 8 }) {
  const p = usePalette();
  return (
    <div style={{ width: "100%", height, background: p.surface2, borderRadius: 999, overflow: "hidden" }}>
      <div style={{ width: `${Math.min(100, value)}%`, height: "100%", background: color || p.accent, borderRadius: 999, transition: "width .5s cubic-bezier(.16,1,.3,1)" }} />
    </div>
  );
}

/* Seletor matéria → tópico em cascata. Mostra os subtópicos do tópico
   escolhido como guia (somente leitura). Reutilizado em todos os formulários.
   value = { materia, topico }  /  onChange recebe o objeto atualizado. */
function MateriaTopicoSelect({ value, onChange, labelMateria = "Matéria", labelTopico = "Tópico" }) {
  const p = usePalette();
  const topicos = topicosDaMateria(value.materia);
  const topicoSel = topicos.find((t) => t.id === value.topico);
  return (
    <>
      <Field label={labelMateria}>
        <Select value={value.materia} onChange={(e) => onChange({ ...value, materia: e.target.value, topico: "" })}>
          <option value="">Selecione...</option>
          {MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
        </Select>
      </Field>
      <Field label={labelTopico}>
        <Select value={value.topico} onChange={(e) => onChange({ ...value, topico: e.target.value })} disabled={!value.materia}
          style={{ opacity: value.materia ? 1 : 0.5, cursor: value.materia ? "pointer" : "not-allowed" }}>
          <option value="">{value.materia ? "Selecione o tópico..." : "Escolha a matéria primeiro"}</option>
          {topicos.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
        </Select>
      </Field>
      {/* subtópicos como guia de estudos (somente leitura) */}
      {topicoSel && (
        <div style={{ margin: "-6px 0 14px", padding: "10px 12px", background: p.surface2, borderRadius: 10, border: "1px dashed " + p.border }}>
          <div style={{ fontSize: 10.5, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 7 }}>Guia de estudos — subtópicos</div>
          <div style={{ display: "flex", gap: 6, flexWrap: "wrap" }}>
            {topicoSel.subs.map((s) => (
              <span key={s} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 7, background: p.surface, border: "1px solid " + p.border, color: p.textSoft }}>{s}</span>
            ))}
          </div>
        </div>
      )}
    </>
  );
}

/* Etiqueta visual de vestibular/modelo — minimalista. Resolve tanto a lista
   de vestibular-alvo quanto a de modelos de prova. */
function VestBadge({ id, size = "md" }) {
  const v = modeloInfo(id);
  const pad = size === "sm" ? "2px 8px" : "3px 10px";
  const fs = size === "sm" ? 10.5 : 11.5;
  return (
    <span style={{
      display: "inline-flex", alignItems: "center", gap: 5, padding: pad, borderRadius: 7,
      fontSize: fs, fontWeight: 700, letterSpacing: ".02em",
      background: v.cor + "1c", color: v.cor, border: "1px solid " + v.cor + "44",
    }}>
      <span style={{ width: 6, height: 6, borderRadius: 99, background: v.cor }} />{v.nome}
    </span>
  );
}

/* ----------------------------------------------------------------------------
   TELA DE LOGIN
   🔥 FIREBASE Authentication: signInWithEmailAndPassword(auth, email, senha)
      e depois carregar /users/{uid} para obter o "role".
---------------------------------------------------------------------------- */
function LoginScreen({ onLogin }) {
  const p = usePalette();
  const { dark, toggle } = useTheme();
  const [email, setEmail] = useState("");
  const [senha, setSenha] = useState("");
  const [erro, setErro] = useState("");

  const entrar = () => {
    // 🔥 FIREBASE: trocar por chamada real ao Authentication.
    const u = MOCK_USERS.find((x) => x.email === email.trim() && x.password === senha);
    if (!u) { setErro("E-mail ou senha inválidos."); return; }
    onLogin(u);
  };

  return (
    <div style={{ minHeight: "100vh", background: p.bg, display: "flex", alignItems: "center", justifyContent: "center", padding: 20, position: "relative", overflow: "hidden" }}>
      {/* atmosfera de fundo */}
      <div style={{ position: "absolute", top: "-20%", right: "-10%", width: 500, height: 500, background: `radial-gradient(circle, ${ACCENT}22, transparent 70%)`, filter: "blur(40px)" }} />
      <div style={{ position: "absolute", bottom: "-25%", left: "-15%", width: 600, height: 600, background: `radial-gradient(circle, ${ACCENT}14, transparent 70%)`, filter: "blur(50px)" }} />

      <button onClick={toggle} style={{ position: "absolute", top: 22, right: 22, background: p.surface, border: "1px solid " + p.border, borderRadius: 10, padding: 10, cursor: "pointer", color: p.text, zIndex: 2 }}>
        {dark ? <Sun size={18} /> : <Moon size={18} />}
      </button>

      <Card style={{ width: "100%", maxWidth: 420, position: "relative", zIndex: 2, boxShadow: "0 20px 60px rgba(0,0,0,.3)" }} pad={36}>
        <div style={{ display: "flex", alignItems: "center", gap: 11, marginBottom: 6 }}>
          <div style={{ width: 44, height: 44, borderRadius: 13, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_SOFT})`, display: "flex", alignItems: "center", justifyContent: "center" }}>
            <GraduationCap size={24} color="#fff" />
          </div>
          <div>
            <div style={{ fontSize: 19, fontWeight: 800, color: p.text, letterSpacing: "-.02em" }}>Aprova<span style={{ color: p.accent }}>+</span></div>
            <div style={{ fontSize: 12, color: p.textSoft }}>Plataforma de estudos</div>
          </div>
        </div>

        <h1 style={{ fontSize: 24, fontWeight: 800, color: p.text, margin: "26px 0 4px", letterSpacing: "-.02em" }}>Bem-vindo de volta</h1>
        <p style={{ fontSize: 14, color: p.textSoft, margin: "0 0 26px" }}>Entre para continuar seus estudos.</p>

        <Field label="E-mail">
          <div style={{ position: "relative" }}>
            <Mail size={17} style={{ position: "absolute", left: 12, top: 13, color: p.textFaint }} />
            <Input type="email" placeholder="seu@email.com" value={email} onChange={(e) => setEmail(e.target.value)} style={{ paddingLeft: 38 }} onKeyDown={(e) => e.key === "Enter" && entrar()} />
          </div>
        </Field>
        <Field label="Senha">
          <div style={{ position: "relative" }}>
            <Lock size={17} style={{ position: "absolute", left: 12, top: 13, color: p.textFaint }} />
            <Input type="password" placeholder="••••••••" value={senha} onChange={(e) => setSenha(e.target.value)} style={{ paddingLeft: 38 }} onKeyDown={(e) => e.key === "Enter" && entrar()} />
          </div>
        </Field>

        {erro && <div style={{ background: p.danger + "1a", color: p.danger, padding: "9px 12px", borderRadius: 9, fontSize: 13, marginBottom: 14, fontWeight: 600 }}>{erro}</div>}

        <Btn onClick={entrar} size="lg" style={{ width: "100%", marginTop: 4 }}>Entrar</Btn>

        <div style={{ marginTop: 22, padding: 13, background: p.surface2, borderRadius: 10, fontSize: 12.5, color: p.textSoft, lineHeight: 1.7 }}>
          <strong style={{ color: p.text }}>Contas de teste:</strong><br />
          Moderador → <code style={{ color: p.accent }}>moderador@curso.com</code> / 123<br />
          Aluno → <code style={{ color: p.accent }}>aluno@curso.com</code> / 123
        </div>
      </Card>
    </div>
  );
}

/* ----------------------------------------------------------------------------
   PÁGINA DE BOAS-VINDAS (modelo de blocos)
   Primeira tela após o login. 100% montada pelo moderador via editor de blocos.
   🔥 FIREBASE: conteúdo em /config/welcome (blocos no Firestore, fotos no Storage).
---------------------------------------------------------------------------- */
function BlocoView({ bloco }) {
  const p = usePalette();
  switch (bloco.tipo) {
    case "titulo":
      return <h2 style={{ fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: "-.02em", margin: "10px 0 2px" }}>{bloco.texto}</h2>;
    case "texto":
      return <p style={{ fontSize: 15, color: p.textSoft, lineHeight: 1.8, margin: "0 0 4px", whiteSpace: "pre-wrap" }}>{bloco.texto}</p>;
    case "foto":
      return bloco.url ? (
        <img src={bloco.url} alt={bloco.legenda || ""} style={{ width: "100%", borderRadius: 16, border: "1px solid " + p.border, display: "block" }} />
      ) : (
        <div style={{ width: "100%", height: 200, borderRadius: 16, background: p.surface2, border: "1px dashed " + p.border, display: "flex", alignItems: "center", justifyContent: "center", color: p.textFaint }}>
          <ImageIcon size={32} style={{ opacity: .5 }} />
        </div>
      );
    case "destaque":
      return (
        <div style={{ display: "grid", gridTemplateColumns: `repeat(${Math.max(1, (bloco.itens || []).length)},1fr)`, gap: 14 }} className="welcome-grid">
          {(bloco.itens || []).map((d, i) => (
            <Card key={i} pad={20} style={{ textAlign: "center" }}>
              <div style={{ fontSize: 26, fontWeight: 900, color: p.accent }}>{d.valor}</div>
              <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 4 }}>{d.label}</div>
            </Card>
          ))}
        </div>
      );
    case "divisor":
      return <div style={{ height: 1, background: p.border, margin: "8px 0" }} />;
    default:
      return null;
  }
}

function WelcomePage({ welcome, onEnter, isStandalone, alunoStats }) {
  const p = usePalette();
  const hero = welcome.hero || {};
  const cor = hero.cor || ACCENT;
  return (
    <div style={{ maxWidth: 920, margin: "0 auto", animation: "fadeIn .4s ease" }}>
      {/* hero */}
      <div style={{ position: "relative", borderRadius: 22, overflow: "hidden", marginBottom: 26, border: "1px solid " + p.border }}>
        <div style={{ position: "absolute", inset: 0, background: `linear-gradient(135deg, ${cor}cc, ${cor}77)` }} />
        <div style={{ position: "absolute", inset: 0, background: "radial-gradient(circle at 80% 20%, rgba(255,255,255,.18), transparent 50%)" }} />
        <div style={{ position: "relative", padding: "46px 40px", display: "flex", gap: 30, alignItems: "center", flexWrap: "wrap" }}>
          <div style={{ width: 120, height: 120, borderRadius: 24, background: "rgba(255,255,255,.18)", border: "3px solid rgba(255,255,255,.4)", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, overflow: "hidden" }}>
            {/* 🔥 FIREBASE Storage: foto de perfil do instrutor */}
            {hero.foto ? <img src={hero.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={52} color="#fff" />}
          </div>
          <div style={{ flex: 1, minWidth: 240 }}>
            <Badge color="#fff" soft><Sparkles size={12} /> Instrutor</Badge>
            <h1 style={{ fontSize: 32, fontWeight: 900, color: "#fff", margin: "10px 0 6px", letterSpacing: "-.03em" }}>{hero.nome}</h1>
            <p style={{ fontSize: 15.5, color: "rgba(255,255,255,.92)", margin: 0, lineHeight: 1.6 }}>{hero.subtitulo}</p>
          </div>
        </div>
      </div>

      {/* painel-resumo do aluno (Lote 3) — só aparece quando o aluno está vendo a página, no fluxo de gate */}
      {alunoStats && <WelcomePainelResumo stats={alunoStats} />}

      {/* blocos */}
      <div style={{ display: "flex", flexDirection: "column", gap: 16, marginBottom: 28 }}>
        {(welcome.blocos || []).map((b) => <BlocoView key={b.id} bloco={b} />)}
      </div>

      {!isStandalone && (
        <div style={{ textAlign: "center" }}>
          <Btn onClick={onEnter} size="lg" icon={ArrowRight} style={{ minWidth: 240 }}>Acessar a plataforma</Btn>
        </div>
      )}
    </div>
  );
}

/* Painel-resumo discreto do aluno na tela de boas-vindas — minimalismo intencional:
   3 indicadores chave em linha + um destaque (próxima conquista ou alerta). */
function WelcomePainelResumo({ stats }) {
  const p = usePalette();
  const { streak = 0, progresso = 0, aderencia = 0, proximaConquista, materiaRisco } = stats;
  return (
    <div style={{ marginBottom: 26 }}>
      {/* 3 indicadores essenciais em uma linha */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3, 1fr)", gap: 14, marginBottom: 14 }} className="stat-grid">
        <div style={{ padding: 16, borderRadius: 14, background: p.surface, border: "1px solid " + p.border, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
            <Flame size={14} color={p.accent} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".06em" }}>Sequência</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: p.text, lineHeight: 1 }}>{streak}<span style={{ fontSize: 13, fontWeight: 600, color: p.textSoft, marginLeft: 4 }}>dias</span></div>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: p.surface, border: "1px solid " + p.border, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
            <Target size={14} color={p.accent} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".06em" }}>Progresso</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: p.text, lineHeight: 1 }}>{progresso}<span style={{ fontSize: 14, color: p.textSoft }}>%</span></div>
        </div>
        <div style={{ padding: 16, borderRadius: 14, background: p.surface, border: "1px solid " + p.border, textAlign: "center" }}>
          <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 6, marginBottom: 4 }}>
            <CalendarDays size={14} color={p.green} />
            <span style={{ fontSize: 10.5, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".06em" }}>Aderência</span>
          </div>
          <div style={{ fontSize: 26, fontWeight: 900, color: p.text, lineHeight: 1 }}>{aderencia}<span style={{ fontSize: 14, color: p.textSoft }}>%</span></div>
        </div>
      </div>

      {/* um destaque discreto — ou próxima conquista, ou alerta — não os dois ao mesmo tempo */}
      {materiaRisco ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: p.danger + "0d", border: "1px solid " + p.danger + "33", fontSize: 12.5, color: p.textSoft }}>
          <AlertTriangle size={14} color={p.danger} style={{ flexShrink: 0 }} />
          <span>Atenção em <strong style={{ color: p.text }}>{materiaRisco}</strong> — está atrasado em relação ao cronograma.</span>
        </div>
      ) : proximaConquista ? (
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "10px 14px", borderRadius: 11, background: p.surface, border: "1px solid " + p.border, fontSize: 12.5, color: p.textSoft }}>
          <span style={{ fontSize: 16 }}>{proximaConquista.icon}</span>
          <span>A próxima conquista é <strong style={{ color: p.text }}>{proximaConquista.titulo}</strong> — {proximaConquista.desc.toLowerCase()}.</span>
        </div>
      ) : null}
    </div>
  );
}

/* ----------------------------------------------------------------------------
   LAYOUT / SHELL — sidebar fina + header
---------------------------------------------------------------------------- */
function Shell({ user, menu, active, setActive, onLogout, children }) {
  const p = usePalette();
  const { dark, toggle } = useTheme();
  const [open, setOpen] = useState(false); // mobile

  const SidebarInner = (
    <>
      <div style={{ padding: "20px 18px 14px", display: "flex", alignItems: "center", gap: 10 }}>
        <div style={{ width: 36, height: 36, borderRadius: 11, background: `linear-gradient(135deg, ${ACCENT}, ${ACCENT_SOFT})`, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <GraduationCap size={20} color="#fff" />
        </div>
        <div>
          <div style={{ fontSize: 16, fontWeight: 800, color: p.text, letterSpacing: "-.02em" }}>Aprova<span style={{ color: p.accent }}>+</span></div>
          <div style={{ fontSize: 10.5, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>{user.role}</div>
        </div>
      </div>

      <nav style={{ flex: 1, padding: "8px 10px", overflowY: "auto" }}>
        {menu.map((item) => {
          const on = active === item.k;
          return (
            <button
              key={item.k}
              onClick={() => { setActive(item.k); setOpen(false); }}
              style={{
                width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "10px 12px",
                marginBottom: 3, borderRadius: 10, border: "none", cursor: "pointer", textAlign: "left",
                background: on ? p.accent + "1f" : "transparent",
                color: on ? p.accent : p.textSoft, fontWeight: on ? 700 : 500, fontSize: 13.5,
                transition: "all .15s", position: "relative",
              }}
              onMouseEnter={(e) => { if (!on) { e.currentTarget.style.background = p.surface2; e.currentTarget.style.color = p.text; } }}
              onMouseLeave={(e) => { if (!on) { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = p.textSoft; } }}
            >
              {on && <div style={{ position: "absolute", left: 0, top: 8, bottom: 8, width: 3, borderRadius: 99, background: p.accent }} />}
              <item.icon size={18} style={{ flexShrink: 0 }} />
              <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{item.label}</span>
            </button>
          );
        })}
      </nav>

      <div style={{ padding: "12px 12px 16px", borderTop: "1px solid " + p.border }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 10px", marginBottom: 6 }}>
          <div style={{ width: 32, height: 32, borderRadius: 9, background: p.accent + "22", display: "flex", alignItems: "center", justifyContent: "center", color: p.accent, fontWeight: 800, fontSize: 13, flexShrink: 0 }}>
            {user.name.charAt(0)}
          </div>
          <div style={{ overflow: "hidden" }}>
            <div style={{ fontSize: 13, fontWeight: 700, color: p.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.name}</div>
            <div style={{ fontSize: 11, color: p.textFaint, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{user.email}</div>
          </div>
        </div>
        <button onClick={onLogout} style={{ width: "100%", display: "flex", alignItems: "center", gap: 10, padding: "9px 12px", borderRadius: 10, border: "none", background: "transparent", color: p.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 600 }}
          onMouseEnter={(e) => { e.currentTarget.style.background = p.danger + "18"; e.currentTarget.style.color = p.danger; }}
          onMouseLeave={(e) => { e.currentTarget.style.background = "transparent"; e.currentTarget.style.color = p.textSoft; }}>
          <LogOut size={17} /> Sair
        </button>
      </div>
    </>
  );

  const activeItem = menu.find((m) => m.k === active);

  return (
    <div style={{ minHeight: "100vh", background: p.bg, display: "flex" }}>
      {/* sidebar desktop */}
      <aside style={{ width: 232, borderRight: "1px solid " + p.border, background: p.surface, display: "flex", flexDirection: "column", position: "sticky", top: 0, height: "100vh" }} className="sidebar-desktop">
        {SidebarInner}
      </aside>

      {/* sidebar mobile */}
      {open && (
        <>
          <div onClick={() => setOpen(false)} style={{ position: "fixed", inset: 0, background: p.overlay, zIndex: 40 }} className="sidebar-overlay" />
          <aside style={{ width: 232, borderRight: "1px solid " + p.border, background: p.surface, display: "flex", flexDirection: "column", position: "fixed", top: 0, left: 0, height: "100vh", zIndex: 50, animation: "slideIn .2s ease" }} className="sidebar-mobile">
            {SidebarInner}
          </aside>
        </>
      )}

      {/* conteúdo */}
      <div style={{ flex: 1, minWidth: 0, display: "flex", flexDirection: "column" }}>
        <header style={{ height: 60, borderBottom: "1px solid " + p.border, background: p.surface + "cc", backdropFilter: "blur(8px)", position: "sticky", top: 0, zIndex: 30, display: "flex", alignItems: "center", justifyContent: "space-between", padding: "0 22px" }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <button onClick={() => setOpen(true)} className="menu-btn" style={{ display: "none", background: "none", border: "none", color: p.text, cursor: "pointer" }}><Menu size={22} /></button>
            <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
              {activeItem && <activeItem.icon size={18} color={p.accent} />}
              <span style={{ fontSize: 15, fontWeight: 700, color: p.text }}>{activeItem?.label}</span>
            </div>
          </div>
          <button onClick={toggle} style={{ background: p.surface2, border: "1px solid " + p.border, borderRadius: 10, padding: 9, cursor: "pointer", color: p.text, display: "flex", transition: "all .2s" }} title="Alternar tema">
            {dark ? <Sun size={17} /> : <Moon size={17} />}
          </button>
        </header>
        <main style={{ flex: 1, padding: "26px 26px 60px", maxWidth: 1180, width: "100%", margin: "0 auto", boxSizing: "border-box" }}>
          {children}
        </main>
      </div>
    </div>
  );
}

/* ============================================================================
   PAINEL DO ALUNO
   ========================================================================== */

/* ---- 1. DASHBOARD -------------------------------------------------------- */
function AlunoDashboard({ store, setStore, vestibular, disp, semana, setSemana, ciclo, onReplan, questoesPorHora = 10, recados = [], revisoes = [] }) {
  const p = usePalette();
  const { metasHoje, atrasadas } = store;
  const [popup, setPopup] = useState(null);      // {topico} conclusão de tópico
  const [redistOpen, setRedistOpen] = useState(false);
  const [progOpen, setProgOpen] = useState(false);
  const [extra, setExtra] = useState(30);
  const [recadoVisto, setRecadoVisto] = useState(false);

  const todasMetas = [...atrasadas, ...metasHoje];
  const feitas = todasMetas.filter((m) => m.done).length;
  const total = todasMetas.length;
  const pct = total ? Math.round((feitas / total) * 100) : 0;

  const concluir = (meta, lista) => {
    // 🔥 FIREBASE: atualizar campo done em /students/{uid}/dailyGoals/{date}
    const upd = { ...store };
    const arr = lista === "atrasadas" ? upd.atrasadas : upd.metasHoje;
    const m = arr.find((x) => x.id === meta.id);
    if (m) m.done = true;
    setStore(upd);
    // verifica se foi a última meta daquele tópico no dia
    const aindaDoTopico = upd.metasHoje.filter((x) => x.topicoId === meta.topicoId && !x.done);
    if (aindaDoTopico.length === 0 && meta.topicoId) {
      setTimeout(() => setPopup({ topico: meta.topico, topicoId: meta.topicoId }), 350);
    }
  };

  const minutosEstudados = todasMetas.filter((m) => m.done).reduce((s, m) => s + m.minutos, 0);

  // meta diária de questões = proporção × horas planejadas hoje
  const minutosHoje = todasMetas.reduce((s, m) => s + m.minutos, 0);
  const metaQuestoesHoje = Math.round((minutosHoje / 60) * questoesPorHora);

  // recálculo inteligente (recalcula tudo do zero, fundindo pendências)
  const { semana: semanaRecalc, resumo: resumoRecalc } = useMemo(
    () => recalcularPlanoInteligente(ciclo || [], disp || {}, semana || {}, atrasadas || [], revisoes || []),
    [ciclo, disp, semana, atrasadas, revisoes]
  );
  // agrupa a nova semana por dia para a pré-visualização (só as replanejadas)
  const recalcPorDia = useMemo(() => {
    return DIAS.map((d) => {
      const metas = (semanaRecalc[d.k] || []);
      const novas = metas.filter((m) => m.replanejada);
      const totalDia = metas.reduce((s, m) => s + m.minutos, 0);
      return novas.length ? { nome: d.nome, novas, totalDia, teto: disp[d.k] || 0 } : null;
    }).filter(Boolean);
  }, [semanaRecalc, disp]);

  const confirmarReplan = () => {
    // 🔥 FIREBASE: persistir nova semana + registrar no histórico de replanejamentos
    if (setSemana) setSemana(semanaRecalc);
    setStore({ ...store, atrasadas: [], metasHoje: semanaRecalc.seg || [] });
    if (onReplan) onReplan(resumoRecalc);
    setRedistOpen(false);
  };

  const recadoAtual = recados[0];

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {/* recado do moderador */}
      {recadoAtual && !recadoVisto && (
        <div style={{ display: "flex", alignItems: "flex-start", gap: 11, padding: "13px 16px", marginBottom: 18, borderRadius: 13, background: p.accent + "14", border: "1px solid " + p.accent + "44" }}>
          <div style={{ width: 30, height: 30, borderRadius: 9, background: p.accent + "26", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><Mail size={15} color={p.accent} /></div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 12.5, fontWeight: 700, color: p.accent, marginBottom: 2 }}>Recado do instrutor</div>
            <div style={{ fontSize: 13.5, color: p.text, lineHeight: 1.5 }}>{recadoAtual.texto}</div>
          </div>
          <button onClick={() => setRecadoVisto(true)} style={{ background: "none", border: "none", color: p.textFaint, cursor: "pointer", padding: 2 }}><X size={16} /></button>
        </div>
      )}

      {/* revisões aparecem agora INTEGRADAS nas metas do dia, com badge "REVISÃO" */}

      <SectionTitle icon={LayoutDashboard} title="Metas de hoje" subtitle={new Date().toLocaleDateString("pt-BR", { weekday: "long", day: "numeric", month: "long" })}
        right={<div style={{ display: "flex", alignItems: "center", gap: 14 }}>
          {vestibular && <VestBadge id={vestibular} />}
          <div style={{ textAlign: "right" }}>
            <div style={{ fontSize: 13, color: p.textSoft, fontWeight: 600 }}>{feitas} de {total} metas concluídas</div>
            <div style={{ width: 160, marginTop: 6 }}><ProgressBar value={pct} /></div>
          </div>
        </div>} />

      {/* faixa compacta: streak + meta de questões — numa linha só, mais clean */}
      <div style={{ display: "flex", alignItems: "center", gap: 18, padding: "12px 16px", marginBottom: 22, borderRadius: 13, background: p.surface, border: "1px solid " + p.border, flexWrap: "wrap" }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9 }}>
          <Flame size={17} color={p.accent} />
          <span style={{ fontSize: 14, fontWeight: 800, color: p.text }}>{store.streak || 0}</span>
          <span style={{ fontSize: 12.5, color: p.textSoft }}>dias seguidos</span>
        </div>
        <div style={{ width: 1, height: 22, background: p.border }} />
        <div style={{ display: "flex", alignItems: "center", gap: 9, flex: 1, minWidth: 200 }}>
          <FileQuestion size={16} color="#3b82f6" />
          <span style={{ fontSize: 12.5, color: p.textSoft }}>Questões hoje</span>
          <div style={{ flex: 1, minWidth: 80, maxWidth: 220 }}>
            <ProgressBar value={metaQuestoesHoje ? (store.questoesHoje || 0) / metaQuestoesHoje * 100 : 0} color="#3b82f6" height={6} />
          </div>
          <span style={{ fontSize: 13, fontWeight: 700, color: p.text }}>{store.questoesHoje || 0}<span style={{ color: p.textFaint, fontWeight: 500 }}>/{metaQuestoesHoje}</span></span>
        </div>
      </div>
      {atrasadas.length > 0 && (
        <div style={{ marginBottom: 22 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={17} color={p.danger} />
            <span style={{ fontSize: 13.5, fontWeight: 800, color: p.danger, textTransform: "uppercase", letterSpacing: ".04em" }}>Metas atrasadas</span>
          </div>
          {atrasadas.map((m) => <MetaRow key={m.id} meta={m} onDone={() => concluir(m, "atrasadas")} atrasada />)}
        </div>
      )}

      {/* Metas de hoje */}
      <div style={{ marginBottom: 26 }}>
        {metasHoje.map((m) => <MetaRow key={m.id} meta={m} onDone={() => concluir(m, "hoje")} />)}
        {metasHoje.length === 0 && <Empty icon={CheckCircle2} title="Nenhuma meta para hoje" sub="Configure seus ciclos e disponibilidade." />}
      </div>

      {/* resumo rodapé */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 14, marginBottom: 20 }} className="stat-grid">
        <StatCard icon={FileQuestion} label="Questões hoje" value={store.questoesHoje} color="#3b82f6" />
        <StatCard icon={Clock4} label="Horas estudadas hoje" value={(minutosEstudados / 60).toFixed(1) + "h"} color={p.green} />
        <StatCard icon={Target} label="Progresso do plano" value={store.progressoGeral + "%"} color={p.accent} />
      </div>

      {/* botão Progresso fixo */}
      <Btn onClick={() => setProgOpen(true)} variant="soft" size="lg" icon={TrendingUp} style={{ width: "100%" }}>Registrar progresso</Btn>

      {/* botão flutuante redistribuir */}
      <button onClick={() => setRedistOpen(true)} title="Redistribuir metas atrasadas"
        style={{ position: "fixed", right: 24, bottom: 24, width: 50, height: 50, borderRadius: 16, background: p.accent, border: "none", color: "#fff", cursor: "pointer", boxShadow: "0 8px 24px " + p.accent + "66", display: "flex", alignItems: "center", justifyContent: "center", zIndex: 35, transition: "transform .2s" }}
        onMouseEnter={(e) => e.currentTarget.style.transform = "scale(1.08) rotate(90deg)"}
        onMouseLeave={(e) => e.currentTarget.style.transform = "none"}>
        <RefreshCw size={22} />
      </button>

      {/* POP-UP conclusão de tópico */}
      <Modal open={!!popup} onClose={() => setPopup(null)} title={null} width={430}>
        {popup && (
          <div style={{ textAlign: "center" }}>
            <div style={{ fontSize: 44, marginBottom: 8 }}>🎉</div>
            <h3 style={{ margin: "0 0 8px", fontSize: 19, fontWeight: 800, color: p.text }}>Tempo planejado concluído!</h3>
            <p style={{ fontSize: 14, color: p.textSoft, margin: "0 0 22px", lineHeight: 1.6 }}>
              Você concluiu o tempo planejado para <strong style={{ color: p.accent }}>{popup.topico}</strong>! Como você se sente sobre o conteúdo?
            </p>
            <div style={{ display: "flex", flexDirection: "column", gap: 10 }}>
              <Btn onClick={() => { /* 🔥 FIREBASE: marcar tópico concluído + avançar ciclo */ setPopup(null); }} icon={Check} size="lg">Estou dominando o conteúdo</Btn>
              <Btn onClick={() => { setPopup({ ...popup, needTime: true }); }} variant="outline" size="lg" icon={Clock4}>Preciso de mais tempo</Btn>
            </div>
            {popup.needTime && (
              <div style={{ marginTop: 18, padding: 16, background: p.surface2, borderRadius: 12, textAlign: "left" }}>
                <Field label="Minutos adicionais necessários">
                  <Input type="number" value={extra} onChange={(e) => setExtra(+e.target.value)} />
                </Field>
                <p style={{ fontSize: 12, color: p.textFaint, margin: "0 0 12px", lineHeight: 1.5 }}>
                  ⓘ O sistema redistribuirá esses {extra} min nas próximas sessões, respeitando sua disponibilidade e ciclos.
                </p>
                <Btn onClick={() => { /* 🔥 FIREBASE: persistir extensão + recalcular metas */ setPopup(null); }} style={{ width: "100%" }}>Confirmar extensão</Btn>
              </div>
            )}
          </div>
        )}
      </Modal>

      {/* MODAL replanejamento inteligente — recalcula o plano inteiro pelos ciclos */}
      <Modal open={redistOpen} onClose={() => setRedistOpen(false)} title="Replanejar metas" width={540}>
        <p style={{ fontSize: 13.5, color: p.textSoft, lineHeight: 1.6, marginTop: 0 }}>
          O plano será <strong style={{ color: p.text }}>recalculado do zero</strong> a partir dos seus ciclos e disponibilidade. As pendências são reincorporadas com prioridade — podendo ser <strong style={{ color: p.text }}>fundidas em blocos maiores</strong> — sempre respeitando o teto de cada dia. Metas já concluídas são preservadas.
        </p>

        {/* resumo do recálculo */}
        <div style={{ display: "flex", gap: 10, marginBottom: 14 }}>
          <div style={{ flex: 1, padding: "11px 13px", borderRadius: 11, background: p.surface2, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: p.accent }}>{fmtMin(resumoRecalc.totalRealocado)}</div>
            <div style={{ fontSize: 11, color: p.textSoft, marginTop: 2 }}>tempo replanejado</div>
          </div>
          <div style={{ flex: 1, padding: "11px 13px", borderRadius: 11, background: p.surface2, textAlign: "center" }}>
            <div style={{ fontSize: 20, fontWeight: 900, color: p.text }}>{resumoRecalc.materiasFundidas}</div>
            <div style={{ fontSize: 11, color: p.textSoft, marginTop: 2 }}>blocos fundidos</div>
          </div>
        </div>

        <div style={{ background: p.surface2, borderRadius: 12, padding: 14, marginBottom: 14, maxHeight: 280, overflowY: "auto" }}>
          {recalcPorDia.length === 0 && <span style={{ color: p.textFaint, fontSize: 13 }}>Nada novo a alocar — você está em dia! 🎉</span>}
          {recalcPorDia.map((dia, i) => (
            <div key={i} style={{ paddingBottom: 10, marginBottom: 10, borderBottom: i < recalcPorDia.length - 1 ? "1px solid " + p.border : "none" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 6 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: p.text }}>{dia.nome}</span>
                <span style={{ fontSize: 11.5, color: dia.totalDia <= dia.teto ? p.green : p.danger, fontWeight: 700 }}>{fmtMin(dia.totalDia)} / {fmtMin(dia.teto)}</span>
              </div>
              {dia.novas.map((m, j) => (
                <div key={j} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, color: p.textSoft, padding: "3px 0" }}>
                  <span>{m.materia} · {m.topico}</span>
                  <span style={{ color: p.accent, fontWeight: 600 }}>{fmtMin(m.minutos)}</span>
                </div>
              ))}
            </div>
          ))}
        </div>

        <div style={{ display: "flex", gap: 10 }}>
          <Btn variant="soft" onClick={() => setRedistOpen(false)} style={{ flex: 1 }}>Cancelar</Btn>
          <Btn onClick={confirmarReplan} style={{ flex: 1 }} icon={Check}>Confirmar recálculo</Btn>
        </div>
      </Modal>

      {/* MODAL progresso */}
      <ProgressoModal open={progOpen} onClose={() => setProgOpen(false)} />
    </div>
  );
}

function MetaRow({ meta, onDone, atrasada }) {
  const p = usePalette();
  const isRev = meta.tipo === "revisao";
  const corRev = "#a855f7";
  return (
    <div style={{
      display: "flex", alignItems: "center", gap: 14, padding: "14px 16px", marginBottom: 9, borderRadius: 13,
      background: atrasada ? p.danger + "0f" : isRev ? corRev + "0c" : p.surface,
      border: "1px solid " + (atrasada ? p.danger + "44" : isRev ? corRev + "40" : p.border),
      opacity: meta.done ? 0.55 : 1, transition: "all .25s",
    }}>
      <div style={{ width: 40, height: 40, borderRadius: 10, background: isRev ? corRev + "1f" : p.surface2, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, fontSize: 12, fontWeight: 800, color: isRev ? corRev : p.accent }}>
        {meta.minutos}'
      </div>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
          <span style={{ fontSize: 14.5, fontWeight: 700, color: p.text, textDecoration: meta.done ? "line-through" : "none" }}>{meta.materia}</span>
          {isRev && <Badge color={corRev} soft><RefreshCw size={10} /> REVISÃO</Badge>}
          {atrasada && <Badge color={p.danger}><AlertTriangle size={11} /> Atrasada · {meta.origem || "ontem"}</Badge>}
        </div>
        <div style={{ fontSize: 13, color: p.textSoft, marginTop: 2, textDecoration: meta.done ? "line-through" : "none" }}>{meta.topico}</div>
      </div>
      {meta.done
        ? <div style={{ display: "flex", alignItems: "center", gap: 6, color: p.green, fontSize: 13, fontWeight: 700 }}><CheckCircle2 size={18} /> Feita</div>
        : <Btn onClick={onDone} size="sm" icon={Check}>Meta concluída</Btn>}
    </div>
  );
}

function StatCard({ icon: Icon, label, value, color }) {
  const p = usePalette();
  return (
    <Card pad={18}>
      <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
        <div style={{ width: 40, height: 40, borderRadius: 11, background: (color || p.accent) + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
          <Icon size={20} color={color || p.accent} />
        </div>
        <div>
          <div style={{ fontSize: 21, fontWeight: 800, color: p.text, lineHeight: 1 }}>{value}</div>
          <div style={{ fontSize: 12, color: p.textSoft, marginTop: 3 }}>{label}</div>
        </div>
      </div>
    </Card>
  );
}

function ProgressoModal({ open, onClose }) {
  const p = usePalette();
  const [aba, setAba] = useState("fora");
  const tabs = [
    { k: "fora", label: "Estudei por fora", icon: BookOpen },
    { k: "rapido", label: "Conclui mais rápido", icon: Zap },
    { k: "mais", label: "Preciso de mais tempo", icon: Clock4 },
  ];
  const [form, setForm] = useState({ materia: "", topico: "", min: 30 });
  return (
    <Modal open={open} onClose={onClose} title="Registrar progresso" width={500}>
      <div style={{ display: "flex", gap: 6, marginBottom: 18, background: p.surface2, padding: 4, borderRadius: 11 }}>
        {tabs.map((t) => (
          <button key={t.k} onClick={() => setAba(t.k)} style={{
            flex: 1, display: "flex", flexDirection: "column", alignItems: "center", gap: 4, padding: "10px 6px", borderRadius: 8,
            border: "none", cursor: "pointer", background: aba === t.k ? p.surface : "transparent",
            color: aba === t.k ? p.accent : p.textSoft, fontWeight: 600, fontSize: 11.5, transition: "all .15s",
          }}>
            <t.icon size={17} />{t.label}
          </button>
        ))}
      </div>

      {aba === "fora" && (
        <>
          <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0 }}>Registre um estudo feito por conta própria. Entra no histórico e nos gráficos.</p>
          <MateriaTopicoSelect value={{ materia: form.materia, topico: form.topico }} onChange={(v) => setForm({ ...form, ...v })} labelTopico="Tópico estudado" />
          <Field label="Tempo (min)"><Input type="number" value={form.min} onChange={(e) => setForm({ ...form, min: +e.target.value })} /></Field>
        </>
      )}
      {aba === "rapido" && (
        <>
          <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0 }}>Terminou antes do previsto? O sistema libera o tempo restante e adianta o próximo sub-tópico.</p>
          <MateriaTopicoSelect value={{ materia: form.materia, topico: form.topico }} onChange={(v) => setForm({ ...form, ...v })} labelTopico="Tópico concluído" />
        </>
      )}
      {aba === "mais" && (
        <>
          <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0 }}>Precisa de mais tempo num tópico? Informe e o sistema redistribui respeitando ciclos e disponibilidade.</p>
          <MateriaTopicoSelect value={{ materia: form.materia, topico: form.topico }} onChange={(v) => setForm({ ...form, ...v })} />
          <Field label="Tempo adicional (min)"><Input type="number" value={form.min} onChange={(e) => setForm({ ...form, min: +e.target.value })} /></Field>
        </>
      )}
      {/* 🔥 FIREBASE: gravar registro em /students/{uid}/progressLog e recalcular metas via engine */}
      <Btn onClick={onClose} style={{ width: "100%", marginTop: 6 }} icon={Save}>Salvar</Btn>
    </Modal>
  );
}

/* ---- 2. SEMANA ----------------------------------------------------------- */
/* ---- 2. SEMANA — visualização interativa com drag entre dias ------------- */
function AlunoSemana({ semana, semanaEditada, setSemanaEditada }) {
  const p = usePalette();
  // semana exibida = editada (se houver) ou a gerada pela engine
  const diasAtivos = semanaEditada || semana;
  const [dragging, setDragging] = useState(null); // { metaId, diaOrigem }
  const [overDia, setOverDia] = useState(null);
  const editada = !!semanaEditada;

  const moverMeta = (diaDestino) => {
    if (!dragging || dragging.diaOrigem === diaDestino) { setDragging(null); setOverDia(null); return; }
    const base = semanaEditada || JSON.parse(JSON.stringify(semana));
    const meta = (base[dragging.diaOrigem] || []).find((m) => m.id === dragging.metaId);
    if (!meta) { setDragging(null); setOverDia(null); return; }
    const novaBase = {};
    DIAS.forEach((d) => { novaBase[d.k] = [...(base[d.k] || [])]; });
    novaBase[dragging.diaOrigem] = novaBase[dragging.diaOrigem].filter((m) => m.id !== dragging.metaId);
    novaBase[diaDestino] = [...novaBase[diaDestino], meta];
    setSemanaEditada(novaBase);
    setDragging(null); setOverDia(null);
  };

  const resetar = () => setSemanaEditada(null);

  const totalSemana = DIAS.reduce((s, d) => s + (diasAtivos[d.k] || []).reduce((x, m) => x + m.minutos, 0), 0);

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={CalendarDays} title="Sua semana"
        subtitle="Arraste as metas entre os dias para reorganizar — sem afetar as próximas semanas"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            <span style={{ fontSize: 12.5, color: p.textFaint }}>{fmtMin(totalSemana)} programados</span>
            {editada && (
              <Btn size="sm" variant="soft" icon={RefreshCw} onClick={resetar} title="Voltar à distribuição automática">Resetar</Btn>
            )}
          </div>
        }
      />

      {editada && (
        <div style={{ display: "flex", alignItems: "center", gap: 8, padding: "9px 13px", marginBottom: 16, borderRadius: 11, background: p.accent + "12", border: "1px solid " + p.accent + "33", fontSize: 12.5, color: p.textSoft }}>
          <Sparkles size={13} color={p.accent} />
          Semana reorganizada manualmente. As próximas semanas continuam sendo geradas automaticamente pelo ciclo.
        </div>
      )}

      <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 10 }} className="week-grid">
        {DIAS.map((d) => {
          const metas = diasAtivos[d.k] || [];
          const feitas = metas.filter((m) => m.done).length;
          const totalDia = metas.reduce((s, m) => s + m.minutos, 0);
          const isOver = overDia === d.k && dragging && dragging.diaOrigem !== d.k;
          return (
            <div key={d.k}
              onDragOver={(e) => { e.preventDefault(); setOverDia(d.k); }}
              onDragLeave={() => setOverDia(null)}
              onDrop={() => moverMeta(d.k)}
              style={{ minHeight: 180, borderRadius: 16, padding: 12, background: isOver ? p.accent + "10" : p.surface, border: "1px solid " + (isOver ? p.accent + "77" : p.border), transition: "all .15s" }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10 }}>
                <span style={{ fontSize: 13, fontWeight: 800, color: p.text }}>{d.nome.slice(0, 3)}</span>
                <span style={{ fontSize: 10, color: p.textFaint }}>{feitas}/{metas.length} · {fmtMin(totalDia)}</span>
              </div>
              {metas.map((m) => {
                const isRev = m.tipo === "revisao";
                const corRev = "#a855f7";
                const mat = MATERIAS_FLAT.find((x) => x.id === m.materiaId);
                const corMat = mat?.areaCor || p.accent;
                const isDraggingThis = dragging?.metaId === m.id;
                return (
                  <div key={m.id} draggable={!m.done}
                    onDragStart={() => !m.done && setDragging({ metaId: m.id, diaOrigem: d.k })}
                    onDragEnd={() => { setDragging(null); setOverDia(null); }}
                    style={{ fontSize: 11, padding: "6px 8px", marginBottom: 5, borderRadius: 8,
                      background: isRev ? corRev + "14" : corMat + "14",
                      borderLeft: "2px solid " + (isRev ? corRev : corMat),
                      color: m.done ? p.textFaint : p.textSoft,
                      textDecoration: m.done ? "line-through" : "none",
                      opacity: isDraggingThis ? 0.35 : m.done ? 0.6 : 1,
                      cursor: m.done ? "default" : "grab", lineHeight: 1.4,
                      transition: "opacity .15s",
                    }}>
                    <span style={{ fontWeight: 700, color: m.done ? p.textFaint : p.text }}>{m.materia}</span>
                    {isRev && <span style={{ marginLeft: 4, fontSize: 9, fontWeight: 800, color: corRev }}>REVISÃO</span>}
                    <br />{fmtMin(m.minutos)}
                  </div>
                );
              })}
              {metas.length === 0 && (
                <div style={{ fontSize: 11, color: p.textFaint, textAlign: "center", marginTop: 20, opacity: isOver ? 0 : 0.6 }}>Livre</div>
              )}
              {isOver && (
                <div style={{ fontSize: 11, color: p.accent, textAlign: "center", marginTop: 10, fontWeight: 600 }}>Soltar aqui</div>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}

/* ---- 3. BANCO DE QUESTÕES ------------------------------------------------ */
function AlunoQuestoes({ store, setStore }) {
  const p = usePalette();
  const [add, setAdd] = useState(false);
  const [form, setForm] = useState({ materia: "", topico: "", feitas: "", acertos: "", obs: "" });
  const [fMat, setFMat] = useState(""); const [fTop, setFTop] = useState("");

  const questoes = store.questoes; // cada item: { feitas, acertos, materia, topico, obs, data }
  const filtradas = questoes.filter((q) =>
    (!fMat || q.materiaId === fMat) && (!fTop || (q.topico || "").toLowerCase().includes(fTop.toLowerCase()))
  );
  const totalFeitas = questoes.reduce((s, q) => s + (q.feitas || 0), 0);
  const totalAcertos = questoes.reduce((s, q) => s + (q.acertos || 0), 0);
  const taxa = totalFeitas ? Math.round((totalAcertos / totalFeitas) * 100) : 0;

  const feitasNum = Math.max(0, parseInt(form.feitas) || 0);
  const acertosNum = Math.min(feitasNum, Math.max(0, parseInt(form.acertos) || 0));
  const errosNum = feitasNum - acertosNum;

  const salvar = () => {
    if (!form.materia || feitasNum <= 0) return;
    const mat = MATERIAS_FLAT.find((m) => m.id === form.materia);
    const top = topicosDaMateria(form.materia).find((t) => t.id === form.topico);
    // 🔥 FIREBASE: addDoc em /students/{uid}/questions  (registro agregado)
    setStore({ ...store, questoes: [{
      id: Date.now() + "", feitas: feitasNum, acertos: acertosNum, erros: errosNum,
      materia: mat.nome, materiaId: mat.id, topico: top ? top.nome : "", topicoId: form.topico,
      obs: form.obs, data: new Date().toISOString().slice(0, 10),
    }, ...questoes] });
    setForm({ materia: "", topico: "", feitas: "", acertos: "", obs: "" }); setAdd(false);
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={FileQuestion} title="Banco de Questões" subtitle={`${totalFeitas} questões · ${taxa}% de acerto`}
        right={<Btn icon={Plus} onClick={() => setAdd(true)}>Registrar questões</Btn>} />

      {/* resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }} className="stat-grid">
        <StatCard icon={FileQuestion} label="Total de questões" value={totalFeitas} color="#3b82f6" />
        <StatCard icon={CheckCircle2} label="Acertos" value={totalAcertos} color={p.green} />
        <StatCard icon={TrendingUp} label="Taxa de acerto" value={taxa + "%"} color={p.accent} />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, marginBottom: 18 }} className="stat-grid">
        <Select value={fMat} onChange={(e) => setFMat(e.target.value)}><option value="">Todas as matérias</option>{MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</Select>
        <Input placeholder="Filtrar por tópico..." value={fTop} onChange={(e) => setFTop(e.target.value)} />
      </div>

      <Card pad={0}>
        {filtradas.length === 0 && <Empty icon={FileQuestion} title="Nenhum registro" sub="Registre lotes de questões para acompanhar a evolução." />}
        {filtradas.map((q, i) => {
          const tx = q.feitas ? Math.round((q.acertos / q.feitas) * 100) : 0;
          return (
            <div key={q.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", borderBottom: i < filtradas.length - 1 ? "1px solid " + p.border : "none" }}>
              <div style={{ width: 46, height: 46, borderRadius: 11, background: (tx >= 70 ? p.green : tx >= 50 ? p.accent : p.danger) + "1f", display: "flex", flexDirection: "column", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <span style={{ fontSize: 14, fontWeight: 800, color: tx >= 70 ? p.green : tx >= 50 ? p.accent : p.danger, lineHeight: 1 }}>{tx}%</span>
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{q.materia} <span style={{ color: p.textFaint, fontWeight: 400 }}>· {q.topico || "—"}</span></div>
                <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 2 }}>
                  <span style={{ color: p.green, fontWeight: 600 }}>{q.acertos} acertos</span> · <span style={{ color: p.danger, fontWeight: 600 }}>{q.erros} erros</span> · {q.feitas} feitas
                  {q.obs && <> — {q.obs}</>}
                </div>
              </div>
              <span style={{ fontSize: 12, color: p.textFaint }}>{q.data}</span>
            </div>
          );
        })}
      </Card>

      <Modal open={add} onClose={() => setAdd(false)} title="Registrar questões">
        <MateriaTopicoSelect value={{ materia: form.materia, topico: form.topico }} onChange={(v) => setForm({ ...form, ...v })} />
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }}>
          <Field label="Questões feitas"><Input type="number" min={1} value={form.feitas} onChange={(e) => setForm({ ...form, feitas: e.target.value })} placeholder="Ex: 20" /></Field>
          <Field label="Acertos"><Input type="number" min={0} max={feitasNum || undefined} value={form.acertos} onChange={(e) => setForm({ ...form, acertos: e.target.value })} placeholder="Ex: 15" /></Field>
        </div>
        {/* prévia do cálculo automático de erros */}
        {feitasNum > 0 && (
          <div style={{ display: "flex", gap: 10, padding: "10px 13px", borderRadius: 10, background: p.surface2, marginBottom: 14, fontSize: 13 }}>
            <span style={{ color: p.green, fontWeight: 700 }}>✅ {acertosNum} acertos</span>
            <span style={{ color: p.danger, fontWeight: 700 }}>❌ {errosNum} erros</span>
            <span style={{ color: p.textSoft, marginLeft: "auto" }}>taxa <strong style={{ color: p.text }}>{Math.round((acertosNum / feitasNum) * 100)}%</strong></span>
          </div>
        )}
        <Field label="Observação (opcional)"><Textarea rows={2} value={form.obs} onChange={(e) => setForm({ ...form, obs: e.target.value })} placeholder="Anote o que aprendeu..." /></Field>
        <Btn onClick={salvar} style={{ width: "100%" }} icon={Save} disabled={!form.materia || feitasNum <= 0}>Salvar registro</Btn>
      </Modal>
    </div>
  );
}

/* ---- 4. DESEMPENHO ------------------------------------------------------- */
function AlunoDesempenho({ store }) {
  const p = usePalette();
  const [aba, setAba] = useState("questoes");

  const abas = [
    { k: "questoes",    label: "Questões",     icon: FileQuestion },
    { k: "simulados",   label: "Simulados",    icon: FileText },
    { k: "calendario",  label: "Calendário",   icon: CalendarDays },
    { k: "perspectiva", label: "Perspectiva",  icon: Target },
  ];

  const acertos = store.questoes.reduce((s, q) => s + (q.acertos || 0), 0);
  const totalQ = store.questoes.reduce((s, q) => s + (q.feitas || 0), 0);
  const erros = totalQ - acertos;
  const pieData = [{ name: "Acertos", value: acertos }, { name: "Erros", value: erros }];
  const evolucao = [
    { dia: "Sem 1", taxa: 58 }, { dia: "Sem 2", taxa: 64 }, { dia: "Sem 3", taxa: 61 },
    { dia: "Sem 4", taxa: 72 }, { dia: "Sem 5", taxa: 78 },
  ];
  const porMateria = [
    { materia: "Mat", taxa: 74 }, { materia: "Port", taxa: 81 }, { materia: "Fís", taxa: 66 },
    { materia: "Quí", taxa: 59 }, { materia: "Bio", taxa: 77 }, { materia: "Hist", taxa: 70 },
  ];
  const simData = [
    { nome: "ENEM 24", taxa: 71 }, { nome: "FUVEST 23", taxa: 64 }, { nome: "UNICAMP 24", taxa: 69 },
  ];

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={TrendingUp} title="Desempenho" subtitle="Questões, simulados e consistência" />

      {/* sub-abas internas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, padding: "4px 4px", background: p.surface, border: "1px solid " + p.border, borderRadius: 13, width: "fit-content" }}>
        {abas.map((a) => (
          <button key={a.k} onClick={() => setAba(a.k)} style={{
            display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 14px", borderRadius: 10, cursor: "pointer", transition: "all .15s", border: "none",
            background: aba === a.k ? p.accent : "transparent", color: aba === a.k ? "#fff" : p.textSoft, fontWeight: aba === a.k ? 700 : 500, fontSize: 13,
          }}>
            <a.icon size={14} />{a.label}
          </button>
        ))}
      </div>

      {aba === "questoes" && (
        <>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1.4fr", gap: 16, marginBottom: 16 }} className="chart-grid">
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Acertos × Erros</h3>
              <ResponsiveContainer width="100%" height={210}>
                <PieChart>
                  <Pie data={pieData} dataKey="value" nameKey="name" cx="50%" cy="50%" innerRadius={50} outerRadius={80} paddingAngle={3}>
                    <Cell fill={p.green} /><Cell fill={p.danger} />
                  </Pie>
                  <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} />
                  <Legend />
                </PieChart>
              </ResponsiveContainer>
              <div style={{ textAlign: "center", fontSize: 13, color: p.textSoft }}>Taxa de acerto: <strong style={{ color: p.green }}>{totalQ ? Math.round(acertos / totalQ * 100) : 0}%</strong></div>
            </Card>
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Evolução ao longo do tempo</h3>
              <ResponsiveContainer width="100%" height={250}>
                <LineChart data={evolucao}>
                  <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
                  <XAxis dataKey="dia" stroke={p.textSoft} fontSize={12} />
                  <YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
                  <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} />
                  <Line type="monotone" dataKey="taxa" stroke={p.accent} strokeWidth={3} dot={{ fill: p.accent, r: 4 }} />
                </LineChart>
              </ResponsiveContainer>
            </Card>
          </div>
          <Card>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Comparativo entre matérias</h3>
            <ResponsiveContainer width="100%" height={260}>
              <BarChart data={porMateria}>
                <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
                <XAxis dataKey="materia" stroke={p.textSoft} fontSize={12} />
                <YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} cursor={{ fill: p.accent + "11" }} />
                <Bar dataKey="taxa" fill={p.accent} radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>
        </>
      )}

      {aba === "simulados" && (
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Desempenho nos simulados</h3>
          <ResponsiveContainer width="100%" height={280}>
            <BarChart data={simData}>
              <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
              <XAxis dataKey="nome" stroke={p.textSoft} fontSize={12} />
              <YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} cursor={{ fill: p.accent + "11" }} />
              <Bar dataKey="taxa" fill="#3b82f6" radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      )}

      {aba === "calendario" && <GridConsistencia seed={1} />}

      {aba === "perspectiva" && (
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16 }} className="chart-grid">
          <PrevisaoConclusao progresso={store.progressoGeral || 0} />
          <MateriasEmRisco />
        </div>
      )}
    </div>
  );
}

/* Grid de consistência mensal — estilo GitHub: cada dia do mês colorido por status */
function GridConsistencia({ seed = 0 }) {
  const p = usePalette();
  const dados = useMemo(() => gerarConsistenciaMock(seed), [seed]);
  const cumpridos = dados.filter((d) => d.status === "cumprido").length;
  const perdidos = dados.filter((d) => d.status === "perdido").length;
  const totalAteHoje = cumpridos + perdidos;
  const aderencia = totalAteHoje ? Math.round((cumpridos / totalAteHoje) * 100) : 0;
  const mes = new Date().toLocaleDateString("pt-BR", { month: "long", year: "numeric" });

  return (
    <Card>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 12, flexWrap: "wrap", gap: 8 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>Consistência mensal</h3>
          <p style={{ margin: "3px 0 0", fontSize: 12, color: p.textFaint, textTransform: "capitalize" }}>{mes}</p>
        </div>
        <div style={{ fontSize: 13, color: p.textSoft }}>Aderência: <strong style={{ color: p.green, fontSize: 15 }}>{aderencia}%</strong></div>
      </div>
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(28px, 1fr))", gap: 4 }}>
        {dados.map((d) => {
          const cor = d.status === "cumprido" ? p.green : d.status === "perdido" ? p.surface2 : p.surface2;
          const corBorder = d.status === "cumprido" ? p.green : d.status === "perdido" ? p.border : p.border + "44";
          return (
            <div key={d.dia} title={`Dia ${d.dia} · ${d.status}`} style={{ aspectRatio: "1 / 1", borderRadius: 5, background: cor, border: "1px solid " + corBorder, opacity: d.status === "futuro" ? 0.35 : 1, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 9.5, fontWeight: 700, color: d.status === "cumprido" ? "#fff" : p.textFaint }}>
              {d.dia}
            </div>
          );
        })}
      </div>
      <div style={{ display: "flex", gap: 14, marginTop: 12, fontSize: 11.5, color: p.textSoft }}>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: p.green, borderRadius: 3 }} /> Cumprido</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5 }}><span style={{ width: 10, height: 10, background: p.surface2, border: "1px solid " + p.border, borderRadius: 3 }} /> Perdido</span>
        <span style={{ display: "flex", alignItems: "center", gap: 5, opacity: 0.5 }}><span style={{ width: 10, height: 10, background: p.surface2, borderRadius: 3 }} /> Futuro</span>
      </div>
    </Card>
  );
}

/* Previsão de conclusão do plano com base no ritmo atual */
function PrevisaoConclusao({ progresso = 0 }) {
  const p = usePalette();
  // mock: assume um ritmo médio de ~1,5%/semana → estima quantas semanas faltam
  const restante = Math.max(0, 100 - progresso);
  const ritmoSemanal = 1.5;
  const semanas = restante > 0 ? Math.ceil(restante / ritmoSemanal) : 0;
  const dt = new Date(); dt.setDate(dt.getDate() + semanas * 7);
  const dataPrev = dt.toLocaleDateString("pt-BR", { day: "2-digit", month: "long", year: "numeric" });

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <Target size={17} color={p.accent} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>Previsão de conclusão</h3>
      </div>
      <div style={{ fontSize: 26, fontWeight: 900, color: p.text, lineHeight: 1, textTransform: "capitalize" }}>{dataPrev}</div>
      <p style={{ margin: "8px 0 0", fontSize: 12.5, color: p.textSoft, lineHeight: 1.55 }}>
        Estimativa baseada no ritmo atual de ~{ritmoSemanal}% por semana. Você está em <strong style={{ color: p.text }}>{progresso}%</strong> e faltam aproximadamente <strong style={{ color: p.text }}>{semanas} semanas</strong>.
      </p>
    </Card>
  );
}

/* Matérias em risco — alerta visual para tópicos atrasados */
function MateriasEmRisco() {
  const p = usePalette();
  // mock: alguns itens em risco
  const risco = [
    { materia: "Química", topico: "Cinética", atraso: 5, severidade: "alta" },
    { materia: "Física", topico: "Eletricidade", atraso: 3, severidade: "media" },
    { materia: "Redação", topico: "Tese", atraso: 2, severidade: "baixa" },
  ];
  const corSev = (s) => s === "alta" ? p.danger : s === "media" ? p.accent : "#eab308";

  return (
    <Card>
      <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 12 }}>
        <AlertTriangle size={17} color={p.danger} />
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>Matérias em risco</h3>
      </div>
      {risco.length === 0 ? (
        <p style={{ fontSize: 13, color: p.textFaint, margin: 0 }}>Nada em risco no momento. ✓</p>
      ) : (
        risco.map((r, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 10, padding: "8px 0", borderBottom: i < risco.length - 1 ? "1px solid " + p.border : "none" }}>
            <div style={{ width: 6, height: 28, borderRadius: 3, background: corSev(r.severidade) }} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>{r.materia} · <span style={{ fontWeight: 500, color: p.textSoft }}>{r.topico}</span></div>
              <div style={{ fontSize: 11.5, color: p.textFaint, marginTop: 1 }}>{r.atraso} dias atrás do cronograma ideal</div>
            </div>
          </div>
        ))
      )}
    </Card>
  );
}

/* ---- 5. PLANO DE ESTUDOS (aluno, com drag & drop) ------------------------
   Obs.: o pedido cita react-beautiful-dnd. Como o ambiente de preview não
   permite instalar libs externas, o drag & drop aqui usa a HTML5 Drag and
   Drop API nativa (mesmo comportamento visual). 🔥 Na integração final pode-se
   trocar por react-beautiful-dnd sem alterar a UI.
--------------------------------------------------------------------------- */
function AlunoPlano({ ordemSubs, setOrdemSubs }) {
  const p = usePalette();
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const onDrop = (topicoId) => {
    const list = [...(ordemSubs[topicoId] || [])];
    const from = dragItem.current, to = dragOver.current;
    if (from == null || to == null || from === to) return;
    const [moved] = list.splice(from, 1);
    list.splice(to, 0, moved);
    // 🔥 FIREBASE: salvar ordem em /students/{uid}/subtopicOrder/{topicoId}
    setOrdemSubs({ ...ordemSubs, [topicoId]: list });
    dragItem.current = null; dragOver.current = null;
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={ListChecks} title="Plano de Estudos" subtitle="Arraste os sub-tópicos para definir a ordem que prefere estudar" />
      {AREAS.map((area) => (
        <div key={area.id} style={{ marginBottom: 24 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 12 }}>
            <div style={{ width: 10, height: 10, borderRadius: 3, background: area.cor }} />
            <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: p.text }}>{area.nome}</h3>
          </div>
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 14 }} className="plano-grid">
            {area.materias.flatMap((m) => m.topicos.map((t) => {
              const subs = ordemSubs[t.id] || t.subs;
              const prog = Math.floor(Math.random() * 60) + 10; // mock progresso
              return (
                <Card key={t.id} pad={16}>
                  <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 4 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: area.cor, textTransform: "uppercase", letterSpacing: ".04em" }}>{m.nome}</span>
                    <span style={{ fontSize: 11, color: p.textFaint }}>{Math.round(t.carga / 60)}h</span>
                  </div>
                  <h4 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: p.text }}>{t.nome}</h4>
                  <div style={{ marginBottom: 12 }}><ProgressBar value={prog} color={area.cor} /><div style={{ fontSize: 11, color: p.textFaint, marginTop: 4 }}>{prog}% concluído</div></div>
                  {subs.map((s, idx) => (
                    <div key={s} draggable
                      onDragStart={() => (dragItem.current = idx)}
                      onDragEnter={() => (dragOver.current = idx)}
                      onDragEnd={() => onDrop(t.id)}
                      onDragOver={(e) => e.preventDefault()}
                      style={{ display: "flex", alignItems: "center", gap: 8, padding: "8px 10px", marginBottom: 5, borderRadius: 9, background: p.surface2, cursor: "grab", fontSize: 13, color: p.text, border: "1px solid transparent", transition: "all .15s" }}
                      onMouseEnter={(e) => e.currentTarget.style.borderColor = area.cor + "55"}
                      onMouseLeave={(e) => e.currentTarget.style.borderColor = "transparent"}>
                      <GripVertical size={15} color={p.textFaint} />
                      <span>{s}</span>
                    </div>
                  ))}
                </Card>
              );
            }))}
          </div>
        </div>
      ))}
    </div>
  );
}

/* ---- 6. ORGANIZAÇÃO PESSOAL (disponibilidade em horas + minutos) --------- */
function AlunoOrganizacao({ disp, setDisp, onRecalc, recesso, setRecesso }) {
  const p = usePalette();
  const totalMin = Object.values(disp).reduce((s, v) => s + (+v || 0), 0);

  const setDia = (k, h, m) => {
    const min = Math.max(0, (parseInt(h) || 0) * 60 + (parseInt(m) || 0));
    setDisp({ ...disp, [k]: min });
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Clock4} title="Organização Pessoal" subtitle="Informe seu tempo livre por dia (horas e minutos). A engine usa isso como limite diário." />
      <Card>
        <div style={{ display: "grid", gridTemplateColumns: "repeat(7,1fr)", gap: 12 }} className="week-grid">
          {DIAS.map((d) => {
            const min = disp[d.k] || 0;
            const h = Math.floor(min / 60), m = min % 60;
            return (
              <div key={d.k} style={{ textAlign: "center" }}>
                <div style={{ fontSize: 12.5, fontWeight: 700, color: p.textSoft, marginBottom: 8 }}>{d.nome.slice(0, 3)}</div>
                <div style={{ background: p.surface2, border: "1px solid " + p.border, borderRadius: 12, padding: "10px 8px" }}>
                  <div style={{ display: "flex", alignItems: "center", justifyContent: "center", gap: 2 }}>
                    <input type="number" min={0} max={24} value={h} onChange={(e) => setDia(d.k, e.target.value, m)}
                      style={{ width: 34, textAlign: "center", fontSize: 19, fontWeight: 800, color: p.accent, background: "transparent", border: "none", outline: "none" }} />
                    <span style={{ fontSize: 12, color: p.textFaint, fontWeight: 700 }}>h</span>
                    <input type="number" min={0} max={59} step={5} value={m} onChange={(e) => setDia(d.k, h, e.target.value)}
                      style={{ width: 34, textAlign: "center", fontSize: 19, fontWeight: 800, color: p.text, background: "transparent", border: "none", outline: "none" }} />
                    <span style={{ fontSize: 12, color: p.textFaint, fontWeight: 700 }}>m</span>
                  </div>
                </div>
                <div style={{ fontSize: 10.5, color: p.textFaint, marginTop: 5 }}>{fmtMin(min)}</div>
              </div>
            );
          })}
        </div>
        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginTop: 22, paddingTop: 18, borderTop: "1px solid " + p.border, flexWrap: "wrap", gap: 10 }}>
          <span style={{ fontSize: 14, color: p.textSoft }}>Total semanal: <strong style={{ color: p.text, fontSize: 16 }}>{fmtMin(totalMin)}</strong></span>
          {/* 🔥 FIREBASE: salvar disponibilidade + disparar recálculo da engine */}
          <Btn icon={RefreshCw} onClick={onRecalc}>Salvar e recalcular metas</Btn>
        </div>
      </Card>
      <div style={{ marginTop: 14, padding: 14, background: p.accent + "12", border: "1px solid " + p.accent + "33", borderRadius: 12, fontSize: 13, color: p.textSoft, lineHeight: 1.6 }}>
        <Sparkles size={15} color={p.accent} style={{ verticalAlign: "-2px", marginRight: 6 }} />
        As metas de cada dia somam exatamente o tempo disponível informado. Ao alterar, as metas futuras são recalculadas automaticamente respeitando seus ciclos.
      </div>

      {/* Modo Férias / Recesso */}
      <Card style={{ marginTop: 18 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 4 }}>
          <Sun size={18} color={p.accent} />
          <h3 style={{ margin: 0, fontSize: 15, fontWeight: 800, color: p.text }}>Modo Férias / Pausa</h3>
        </div>
        <p style={{ fontSize: 13, color: p.textSoft, margin: "0 0 14px", lineHeight: 1.6 }}>
          Defina um período em que você estará ausente. O sistema pausa as metas e reagenda automaticamente após o término, <strong style={{ color: p.text }}>sem gerar atrasos</strong>.
        </p>
        {recesso?.ativo ? (
          <div style={{ display: "flex", alignItems: "center", gap: 12, padding: 14, borderRadius: 11, background: p.accent + "12", border: "1px solid " + p.accent + "44" }}>
            <div style={{ flex: 1 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>Recesso ativo</div>
              <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 2 }}>
                De {recesso.ini.split("-").reverse().join("/")} a {recesso.fim.split("-").reverse().join("/")}
              </div>
            </div>
            {/* 🔥 FIREBASE: deletar /students/{uid}/breaks/{id} */}
            <Btn variant="danger" size="sm" icon={X} onClick={() => setRecesso({ ativo: false })}>Encerrar pausa</Btn>
          </div>
        ) : (
          <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr auto", gap: 10, alignItems: "end" }} className="stat-grid">
            <Field label="Início"><Input type="date" value={recesso?.ini || ""} onChange={(e) => setRecesso({ ...(recesso || {}), ini: e.target.value })} /></Field>
            <Field label="Fim"><Input type="date" value={recesso?.fim || ""} onChange={(e) => setRecesso({ ...(recesso || {}), fim: e.target.value })} /></Field>
            <Btn icon={Sun} onClick={() => { if (recesso?.ini && recesso?.fim) setRecesso({ ...recesso, ativo: true }); }} disabled={!recesso?.ini || !recesso?.fim}>Iniciar pausa</Btn>
          </div>
        )}
      </Card>
    </div>
  );
}

/* ---- 7. ANOTAÇÕES RÁPIDAS ------------------------------------------------ */
/* ---- 7b. CONQUISTAS (badges desbloqueáveis) ------------------------------ */
function AlunoConquistas({ store }) {
  const p = usePalette();
  // calcula stats agregados que servem de input para as regras
  const totalFeitas = (store.questoes || []).reduce((s, q) => s + (q.feitas || 0), 0);
  const totalAcertos = (store.questoes || []).reduce((s, q) => s + (q.acertos || 0), 0);
  const taxaAcerto = totalFeitas ? Math.round((totalAcertos / totalFeitas) * 100) : 0;
  const stats = {
    streak: store.streak || 0,
    totalFeitas,
    taxaAcerto,
    topicosConcluidos: store.topicosConcluidos || 0,
    revisoesFeitas: store.revisoesFeitas || 0,
    simuladosFeitos: store.simuladosFeitos || 0,
  };
  const desbloqueadas = CONQUISTAS_CATALOGO.filter((c) => c.regra(stats));
  const bloqueadas = CONQUISTAS_CATALOGO.filter((c) => !c.regra(stats));

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Trophy} title="Conquistas" subtitle={`${desbloqueadas.length} de ${CONQUISTAS_CATALOGO.length} badges desbloqueadas`} />

      {desbloqueadas.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: p.green, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 12 }}>Desbloqueadas</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14, marginBottom: 28 }}>
            {desbloqueadas.map((c) => (
              <Card key={c.id} pad={18} style={{ textAlign: "center", borderColor: p.green + "55", background: `linear-gradient(135deg, ${p.green}10, transparent)` }}>
                <div style={{ fontSize: 38, marginBottom: 6, lineHeight: 1 }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 800, color: p.text }}>{c.titulo}</div>
                <div style={{ fontSize: 11.5, color: p.textSoft, marginTop: 5, lineHeight: 1.4 }}>{c.desc}</div>
              </Card>
            ))}
          </div>
        </>
      )}

      {bloqueadas.length > 0 && (
        <>
          <div style={{ fontSize: 12, fontWeight: 800, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".04em", marginBottom: 12 }}>A conquistar</div>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))", gap: 14 }}>
            {bloqueadas.map((c) => (
              <Card key={c.id} pad={18} style={{ textAlign: "center", opacity: 0.55 }}>
                <div style={{ fontSize: 38, marginBottom: 6, lineHeight: 1, filter: "grayscale(1)" }}>{c.icon}</div>
                <div style={{ fontSize: 14, fontWeight: 700, color: p.textSoft }}>{c.titulo}</div>
                <div style={{ fontSize: 11.5, color: p.textFaint, marginTop: 5, lineHeight: 1.4 }}>{c.desc}</div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}


/* ---- 7. ANOTAÇÕES RÁPIDAS ------------------------------------------------ */
function AlunoAnotacoes({ notas, setNotas }) {
  const p = usePalette();
  const [areaSel, setAreaSel] = useState(AREAS[0].id);
  const [matSel, setMatSel] = useState(AREAS[0].materias[0].id);
  const [titulo, setTitulo] = useState(""); const [conteudo, setConteudo] = useState("");
  const area = AREAS.find((a) => a.id === areaSel);
  const lista = notas[matSel] || [];

  const addNota = () => {
    if (!titulo.trim()) return;
    // 🔥 FIREBASE: salvar em /students/{uid}/notes/{materiaId}
    setNotas({ ...notas, [matSel]: [{ id: Date.now() + "", titulo, conteudo, data: new Date().toLocaleDateString("pt-BR") }, ...lista] });
    setTitulo(""); setConteudo("");
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={NotebookPen} title="Anotações Rápidas" subtitle="Organize seus resumos por área e matéria" />
      {/* abas de área */}
      <div style={{ display: "flex", gap: 8, marginBottom: 14, flexWrap: "wrap" }}>
        {AREAS.map((a) => (
          <button key={a.id} onClick={() => { setAreaSel(a.id); setMatSel(a.materias[0].id); }}
            style={{ padding: "8px 16px", borderRadius: 10, border: "1px solid " + (areaSel === a.id ? a.cor : p.border), background: areaSel === a.id ? a.cor + "1f" : "transparent", color: areaSel === a.id ? a.cor : p.textSoft, fontWeight: 700, fontSize: 13, cursor: "pointer" }}>
            {a.nome}
          </button>
        ))}
      </div>
      {/* sub-abas de matéria */}
      <div style={{ display: "flex", gap: 6, marginBottom: 20, flexWrap: "wrap" }}>
        {area.materias.map((m) => (
          <button key={m.id} onClick={() => setMatSel(m.id)}
            style={{ padding: "6px 13px", borderRadius: 8, border: "none", background: matSel === m.id ? p.surface2 : "transparent", color: matSel === m.id ? p.text : p.textFaint, fontWeight: 600, fontSize: 12.5, cursor: "pointer", borderBottom: "2px solid " + (matSel === m.id ? area.cor : "transparent") }}>
            {m.nome}
          </button>
        ))}
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.3fr", gap: 16 }} className="chart-grid">
        <Card>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: p.text }}>Nova anotação</h4>
          <Field label="Título"><Input value={titulo} onChange={(e) => setTitulo(e.target.value)} placeholder="Ex: Resumo de Leis de Newton" /></Field>
          <Field label="Conteúdo"><Textarea rows={6} value={conteudo} onChange={(e) => setConteudo(e.target.value)} placeholder="Escreva livremente..." /></Field>
          <Btn onClick={addNota} icon={Plus} style={{ width: "100%" }}>Adicionar</Btn>
        </Card>
        <div>
          {lista.length === 0 && <Empty icon={NotebookPen} title="Sem anotações nesta matéria" sub="Crie a primeira ao lado." />}
          {lista.map((n) => (
            <Card key={n.id} pad={16} style={{ marginBottom: 12 }}>
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline" }}>
                <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>{n.titulo}</h4>
                <span style={{ fontSize: 11, color: p.textFaint }}>{n.data}</span>
              </div>
              <p style={{ margin: "8px 0 0", fontSize: 13.5, color: p.textSoft, lineHeight: 1.65, whiteSpace: "pre-wrap" }}>{n.conteudo}</p>
            </Card>
          ))}
        </div>
      </div>
    </div>
  );
}

/* ---- 8. SIMULADOS (aluno) ------------------------------------------------ */
function AlunoSimulados({ simulados, user, envios = [], setEnvios }) {
  const p = usePalette();
  const [ativo, setAtivo] = useState(null);   // simulado em resolução
  const [respostas, setRespostas] = useState({});
  const [resultado, setResultado] = useState(null);
  const [enviar, setEnviar] = useState(false); // modal de anexar simulado próprio
  const [envForm, setEnvForm] = useState({ nome: "", modelo: "enem", arquivo: "" });

  const meusEnvios = envios.filter((e) => e.alunoId === user?.uid);
  const submeter = () => {
    if (!envForm.nome.trim()) return;
    // 🔥 FIREBASE Storage: upload do PDF + 🔥 Firestore: /examSubmissions (status "pendente")
    setEnvios([{ id: Date.now() + "", alunoId: user.uid, alunoNome: user.name, ...envForm, arquivo: envForm.arquivo || "simulado.pdf", data: new Date().toISOString().slice(0, 10), status: "pendente" }, ...envios]);
    setEnvForm({ nome: "", modelo: "enem", arquivo: "" }); setEnviar(false);
  };

  const finalizar = () => {
    // 🔥 FIREBASE: comparar com gabarito de /exams/{id}/questions e salvar resultado
    let acertos = 0;
    ativo.questoes.forEach((q) => { if (respostas[q.num] === q.gabarito) acertos++; });
    setResultado({ acertos, total: ativo.questoes.length });
  };

  if (ativo) {
    return (
      <div style={{ animation: "fadeIn .3s ease" }}>
        <SectionTitle icon={FileText} title={ativo.nome} subtitle={`${ativo.vestibular} · ${ativo.ano} · ${ativo.area}`}
          right={<Btn variant="soft" onClick={() => { setAtivo(null); setRespostas({}); setResultado(null); }}>Voltar</Btn>} />
        <div style={{ display: "grid", gridTemplateColumns: "1.3fr 1fr", gap: 16 }} className="chart-grid">
          {/* visualizador de PDF — 🔥 FIREBASE Storage: getDownloadURL do PDF */}
          <Card style={{ minHeight: 460, display: "flex", alignItems: "center", justifyContent: "center", flexDirection: "column", color: p.textFaint, background: p.surface2 }}>
            <FileText size={48} style={{ opacity: .4, marginBottom: 12 }} />
            <p style={{ fontSize: 14, fontWeight: 600, color: p.textSoft }}>Visualizador de PDF da prova</p>
            <p style={{ fontSize: 12 }}>🔥 Embed do PDF do Firebase Storage aqui</p>
          </Card>
          {/* cartão-resposta */}
          <Card>
            <h4 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Cartão-resposta</h4>
            {ativo.questoes.map((q) => (
              <div key={q.num} style={{ marginBottom: 12 }}>
                <div style={{ fontSize: 12.5, color: p.textSoft, marginBottom: 5 }}>Q{q.num} · {q.materia}</div>
                <div style={{ display: "flex", gap: 6 }}>
                  {["A", "B", "C", "D", "E"].map((alt) => (
                    <button key={alt} onClick={() => setRespostas({ ...respostas, [q.num]: alt })}
                      style={{ flex: 1, padding: "8px 0", borderRadius: 8, fontWeight: 700, fontSize: 13, cursor: "pointer",
                        border: "1px solid " + (respostas[q.num] === alt ? p.accent : p.border),
                        background: respostas[q.num] === alt ? p.accent : "transparent",
                        color: respostas[q.num] === alt ? "#fff" : p.textSoft }}>{alt}</button>
                  ))}
                </div>
              </div>
            ))}
            {!resultado
              ? <Btn onClick={finalizar} style={{ width: "100%", marginTop: 8 }} icon={Check}>Finalizar e corrigir</Btn>
              : <div style={{ marginTop: 14, padding: 16, background: p.green + "15", border: "1px solid " + p.green + "44", borderRadius: 12, textAlign: "center" }}>
                  <div style={{ fontSize: 28, fontWeight: 900, color: p.green }}>{resultado.acertos}/{resultado.total}</div>
                  <div style={{ fontSize: 13, color: p.textSoft }}>{Math.round(resultado.acertos / resultado.total * 100)}% de acerto · adicionado ao Desempenho</div>
                </div>}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={FileText} title="Simulados" subtitle="Provas disponibilizadas pelo instrutor"
        right={
          <button onClick={() => setEnviar(true)} title="Anexar seu simulado para classificação"
            style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "8px 13px", borderRadius: 9, cursor: "pointer",
              background: "transparent", border: "1px dashed " + p.border, color: p.textSoft, fontSize: 12.5, fontWeight: 600, transition: "all .15s" }}
            onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.color = p.accent; }}
            onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.color = p.textSoft; }}>
            <FilePlus size={15} /> Anexar simulado para classificação
          </button>
        } />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {simulados.map((s) => (
          <Card key={s.id} hover onClick={() => setAtivo(s)} pad={18}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <Badge soft color={p.accent}>{s.vestibular}</Badge>
              <span style={{ fontSize: 12, color: p.textFaint }}>{s.ano}</span>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: p.text }}>{s.nome}</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: p.textSoft }}>{s.area} · {s.questoes.length} questões</p>
            <Btn size="sm" icon={Eye} style={{ marginTop: 14, width: "100%" }}>Resolver simulado</Btn>
          </Card>
        ))}
      </div>

      {/* meus envios aguardando classificação */}
      {meusEnvios.length > 0 && (
        <div style={{ marginTop: 28 }}>
          <h3 style={{ fontSize: 14, fontWeight: 700, color: p.textSoft, marginBottom: 12 }}>Seus envios</h3>
          {meusEnvios.map((e) => (
            <div key={e.id} style={{ display: "flex", alignItems: "center", gap: 12, padding: "12px 16px", marginBottom: 8, borderRadius: 11, background: p.surface, border: "1px solid " + p.border }}>
              <FileText size={18} color={p.textFaint} />
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14, fontWeight: 600, color: p.text }}>{e.nome}</div>
                <div style={{ fontSize: 12, color: p.textFaint }}>{e.arquivo} · enviado em {e.data}</div>
              </div>
              <VestBadge id={e.modelo} size="sm" />
              {e.status === "pendente"
                ? <Badge soft color={p.textSoft}><Clock4 size={11} /> Aguardando</Badge>
                : <Badge soft color={p.green}><Check size={11} /> Classificado</Badge>}
            </div>
          ))}
        </div>
      )}

      {/* MODAL anexar simulado próprio */}
      <Modal open={enviar} onClose={() => setEnviar(false)} title="Anexar simulado para classificação">
        <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0, lineHeight: 1.6 }}>
          Envie o PDF de um simulado que você fez. O instrutor classifica as questões e ele fica disponível para você resolver na plataforma.
        </p>
        <div style={{ border: "2px dashed " + p.border, borderRadius: 14, padding: 22, textAlign: "center", marginBottom: 16, cursor: "pointer" }}
          onClick={() => setEnvForm({ ...envForm, arquivo: "simulado_anexado.pdf" })}>
          <UploadCloud size={28} color={p.accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>{envForm.arquivo || "Clique para anexar o PDF"}</div>
          <div style={{ fontSize: 11.5, color: p.textFaint, marginTop: 2 }}>🔥 Upload para Firebase Storage</div>
        </div>
        <Field label="Nome da prova"><Input value={envForm.nome} onChange={(e) => setEnvForm({ ...envForm, nome: e.target.value })} placeholder="Ex: Simulado ProENEM 04" /></Field>
        <Field label="Modelo / vestibular">
          <Select value={envForm.modelo} onChange={(e) => setEnvForm({ ...envForm, modelo: e.target.value })}>
            {MODELOS_PROVA.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </Select>
        </Field>
        <Btn onClick={submeter} style={{ width: "100%" }} icon={UploadCloud}>Enviar para classificação</Btn>
      </Modal>
    </div>
  );
}

/* ---- 9. MATERIAIS (aluno) ------------------------------------------------ */
function AlunoMateriais({ materiais, user }) {
  const p = usePalette();
  const [vest, setVest] = useState("");
  // visíveis: materiais "para todos" + os individuais endereçados a este aluno
  const visiveis = materiais.filter((m) => m.para !== "especificos" || m.alunoId === user?.uid);
  const vestaveis = [...new Set(visiveis.map((m) => m.vestibular))];
  const filtrados = visiveis.filter((m) => !vest || m.vestibular === vest);
  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Library} title="Materiais" subtitle="Livros e apostilas — sub-tópico: Livros"
        right={<Select value={vest} onChange={(e) => setVest(e.target.value)} style={{ width: 160 }}><option value="">Todos</option>{vestaveis.map((vname) => <option key={vname}>{vname}</option>)}</Select>} />      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {filtrados.map((m) => (
          <Card key={m.id} hover pad={16}>
            <div style={{ height: 90, borderRadius: 10, background: `linear-gradient(135deg, ${m.cor}33, ${m.cor}11)`, display: "flex", alignItems: "center", justifyContent: "center", marginBottom: 12 }}>
              <BookMarked size={32} color={m.cor} />
            </div>
            <Badge soft color={m.cor}>{m.materia}</Badge>
            <h4 style={{ margin: "8px 0 4px", fontSize: 14.5, fontWeight: 700, color: p.text }}>{m.titulo}</h4>
            <p style={{ margin: 0, fontSize: 12, color: p.textFaint }}>{m.vestibular} · {m.area}</p>
            {/* 🔥 FIREBASE Storage: visualizar PDF via getDownloadURL */}
            <Btn size="sm" variant="soft" icon={Eye} style={{ marginTop: 12, width: "100%" }}>Abrir PDF</Btn>
          </Card>
        ))}
      </div>
    </div>
  );
}

/* ============================================================================
   PAINEL DO MODERADOR
   ========================================================================== */

/* ---- 1. GERENCIAMENTO DE ALUNOS ------------------------------------------ */
/* Visão comparativa entre alunos — três rankings discretos lado a lado */
function VisaoComparativa({ alunos, envios }) {
  const p = usePalette();
  const [aberto, setAberto] = useState(false);
  if (!alunos || alunos.length === 0) return null;

  // mock de taxa global e atrasos por aluno (na versão real, viria do Firestore)
  const enriched = alunos.map((a) => {
    const taxa = DESEMPENHO_SIMULADOS_INICIAL[a.id]?.porMateria
      ? Math.round(Object.values(DESEMPENHO_SIMULADOS_INICIAL[a.id].porMateria).reduce((s, v) => s + v, 0) / Object.values(DESEMPENHO_SIMULADOS_INICIAL[a.id].porMateria).length)
      : 0;
    // mock simples de "atrasos" — quanto menor o progresso, mais provável estar atrasado
    const atrasos = Math.max(0, Math.round((60 - a.progresso) / 5));
    return { ...a, taxa, atrasos };
  });
  const topProgresso = [...enriched].sort((a, b) => b.progresso - a.progresso).slice(0, 3);
  const topTaxa = [...enriched].sort((a, b) => b.taxa - a.taxa).slice(0, 3);
  const maisAtrasos = [...enriched].sort((a, b) => b.atrasos - a.atrasos).slice(0, 3);

  const Coluna = ({ titulo, icon: Icon, cor, dados, getValor, suffix }) => (
    <div>
      <div style={{ display: "flex", alignItems: "center", gap: 7, marginBottom: 10 }}>
        <Icon size={14} color={cor} />
        <span style={{ fontSize: 11, fontWeight: 800, color: p.textSoft, textTransform: "uppercase", letterSpacing: ".06em" }}>{titulo}</span>
      </div>
      {dados.map((a, i) => (
        <div key={a.id} style={{ display: "flex", alignItems: "center", gap: 9, padding: "6px 0", borderBottom: i < dados.length - 1 ? "1px solid " + p.border : "none" }}>
          <span style={{ fontSize: 11, fontWeight: 800, color: p.textFaint, width: 14 }}>{i + 1}</span>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: 13, fontWeight: 600, color: p.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</div>
          </div>
          <span style={{ fontSize: 13, fontWeight: 800, color: cor }}>{getValor(a)}{suffix}</span>
        </div>
      ))}
    </div>
  );

  return (
    <Card style={{ marginBottom: 16 }} pad={0}>
      <button onClick={() => setAberto(!aberto)} style={{ display: "flex", width: "100%", alignItems: "center", gap: 11, padding: "12px 16px", background: "transparent", border: "none", cursor: "pointer", textAlign: "left", color: "inherit", borderBottom: aberto ? "1px solid " + p.border : "none" }}>
        <TrendingUp size={16} color={p.accent} />
        <span style={{ flex: 1, fontSize: 13.5, fontWeight: 700, color: p.text }}>Visão comparativa da turma</span>
        <span style={{ fontSize: 12, color: p.textFaint, marginRight: 4 }}>{enriched.length} alunos</span>
        <ChevronDown size={16} color={p.textSoft} style={{ transform: aberto ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
      </button>
      {aberto && (
        <div style={{ padding: 18, display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 22 }} className="chart-grid">
          <Coluna titulo="Top progresso"      icon={Target}        cor={p.accent} dados={topProgresso} getValor={(a) => a.progresso} suffix="%" />
          <Coluna titulo="Top taxa de acerto" icon={Trophy}        cor={p.green}  dados={topTaxa}      getValor={(a) => a.taxa}      suffix="%" />
          <Coluna titulo="Atenção · atrasos" icon={AlertTriangle} cor={p.danger} dados={maisAtrasos}  getValor={(a) => a.atrasos}   suffix="" />
        </div>
      )}
    </Card>
  );
}

function ModAlunos({ alunos, setAlunos, envios, setEnvios, materiais, setMateriais, simulados, setSimulados, progressoAlunos, revisoes, setRevisoes, anotacoesMod, setAnotacoesMod, recadosPorAluno, setRecadosPorAluno, historicoReplan, ciclosPorAluno, setCiclosPorAluno, dispPorAluno }) {
  const p = usePalette();
  const [add, setAdd] = useState(false);
  const [sel, setSel] = useState(null); // aluno selecionado → abre o perfil
  const [form, setForm] = useState({ nome: "", email: "", senha: "", vestibular: "enem" });

  const criar = () => {
    if (!form.nome || !form.email) return;
    // 🔥 FIREBASE Authentication: createUserWithEmailAndPassword + doc em /users/{uid} (role:"aluno")
    setAlunos([...alunos, { id: Date.now() + "", ...form, metas: 0, questoes: 0, horas: 0, progresso: 0 }]);
    setForm({ nome: "", email: "", senha: "", vestibular: "enem" }); setAdd(false);
  };

  // perfil de um aluno selecionado
  if (sel) {
    const aluno = alunos.find((a) => a.id === sel.id) || sel;
    return <ModAlunoPerfil aluno={aluno} onBack={() => setSel(null)}
      alunos={alunos} setAlunos={setAlunos}
      envios={envios} setEnvios={setEnvios}
      materiais={materiais} setMateriais={setMateriais}
      simulados={simulados} setSimulados={setSimulados}
      progressoAlunos={progressoAlunos}
      revisoes={revisoes} setRevisoes={setRevisoes}
      anotacoesMod={anotacoesMod} setAnotacoesMod={setAnotacoesMod}
      recadosPorAluno={recadosPorAluno} setRecadosPorAluno={setRecadosPorAluno}
      historicoReplan={historicoReplan}
      ciclosPorAluno={ciclosPorAluno} setCiclosPorAluno={setCiclosPorAluno}
      dispPorAluno={dispPorAluno} />;
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Users} title="Alunos" subtitle={`${alunos.length} alunos · selecione um para ver o perfil completo`}
        right={<Btn icon={Plus} onClick={() => setAdd(true)}>Cadastrar aluno</Btn>} />

      {/* contador de envios pendentes (visão geral) */}
      {envios.filter((e) => e.status === "pendente").length > 0 && (
        <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "11px 15px", marginBottom: 16, borderRadius: 11, background: p.accent + "12", border: "1px solid " + p.accent + "33" }}>
          <UploadCloud size={17} color={p.accent} />
          <span style={{ fontSize: 13, color: p.text }}>
            <strong>{envios.filter((e) => e.status === "pendente").length}</strong> simulado(s) enviado(s) por alunos aguardando classificação.
          </span>
        </div>
      )}

      {/* Visão comparativa entre alunos — minimalista, três rankings */}
      <VisaoComparativa alunos={alunos} envios={envios} />

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(280px,1fr))", gap: 14 }}>
        {alunos.map((a) => {
          const pend = envios.filter((e) => e.alunoId === a.id && e.status === "pendente").length;
          return (
            <Card key={a.id} hover onClick={() => setSel(a)} pad={18}>
              <div style={{ display: "flex", alignItems: "center", gap: 13, marginBottom: 14 }}>
                <div style={{ width: 46, height: 46, borderRadius: 13, background: vestInfo(a.vestibular).cor + "22", display: "flex", alignItems: "center", justifyContent: "center", color: vestInfo(a.vestibular).cor, fontWeight: 800, fontSize: 18, flexShrink: 0 }}>{a.nome.charAt(0)}</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 15, fontWeight: 700, color: p.text, whiteSpace: "nowrap", overflow: "hidden", textOverflow: "ellipsis" }}>{a.nome}</div>
                  <div style={{ marginTop: 4 }}><VestBadge id={a.vestibular} size="sm" /></div>
                </div>
              </div>
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
                <MiniStat label="Questões" value={a.questoes} />
                <MiniStat label="Horas" value={a.horas + "h"} />
                <MiniStat label="Progresso" value={a.progresso + "%"} />
              </div>
              <ProgressBar value={a.progresso} color={vestInfo(a.vestibular).cor} />
              {pend > 0 && <div style={{ marginTop: 12, fontSize: 12, color: p.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}><UploadCloud size={13} /> {pend} envio(s) p/ classificar</div>}
            </Card>
          );
        })}
      </div>

      <Modal open={add} onClose={() => setAdd(false)} title="Cadastrar novo aluno">
        <Field label="Nome completo"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} /></Field>
        <Field label="E-mail"><Input type="email" value={form.email} onChange={(e) => setForm({ ...form, email: e.target.value })} /></Field>
        <Field label="Senha provisória"><Input type="text" value={form.senha} onChange={(e) => setForm({ ...form, senha: e.target.value })} /></Field>
        <Field label="Vestibular de interesse">
          <Select value={form.vestibular} onChange={(e) => setForm({ ...form, vestibular: e.target.value })}>
            {VESTIBULARES.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
          </Select>
        </Field>
        <Btn onClick={criar} style={{ width: "100%" }} icon={Save}>Criar aluno</Btn>
      </Modal>
    </div>
  );
}

/* Perfil completo do aluno (visão do moderador), com abas internas */
function ModAlunoPerfil({ aluno, onBack, alunos, setAlunos, envios, setEnvios, materiais, setMateriais, progressoAlunos, revisoes, setRevisoes, anotacoesMod, setAnotacoesMod, recadosPorAluno, setRecadosPorAluno, historicoReplan, ciclosPorAluno, setCiclosPorAluno, dispPorAluno }) {
  const p = usePalette();
  const [aba, setAba] = useState("desempenho");
  const v = vestInfo(aluno.vestibular);
  const meusEnvios = envios.filter((e) => e.alunoId === aluno.id);

  const setVestibular = (vid) => {
    // 🔥 FIREBASE: update do campo vestibular em /students/{uid}
    setAlunos(alunos.map((a) => a.id === aluno.id ? { ...a, vestibular: vid } : a));
  };

  // Gera e baixa um relatório do aluno em CSV (abre no Excel, Google Sheets, etc.)
  const exportarRelatorio = () => {
    const taxa = DESEMPENHO_SIMULADOS_INICIAL[aluno.id]?.geral
      ? Math.round(DESEMPENHO_SIMULADOS_INICIAL[aluno.id].geral.reduce((s, e) => s + e.taxa, 0) / DESEMPENHO_SIMULADOS_INICIAL[aluno.id].geral.length)
      : 0;
    const linhas = [
      ["Relatório do aluno", ""],
      ["Nome", aluno.nome],
      ["E-mail", aluno.email],
      ["Vestibular-alvo", vestInfo(aluno.vestibular).nome],
      ["Data do relatório", new Date().toLocaleDateString("pt-BR")],
      ["", ""],
      ["INDICADORES", ""],
      ["Metas concluídas", aluno.metas],
      ["Questões registradas", aluno.questoes],
      ["Horas estudadas", aluno.horas + "h"],
      ["Progresso geral", aluno.progresso + "%"],
      ["Taxa média em simulados", taxa + "%"],
      ["", ""],
      ["HISTÓRICO DE REPLANEJAMENTOS", ""],
      ["Data", "Minutos realocados", "Blocos fundidos", "Matérias com pendência"],
      ...(historicoReplan || []).map((h) => [h.data, h.totalRealocado, h.materiasFundidas, h.qtdPendencias]),
      ["", ""],
      ["SIMULADOS REALIZADOS", ""],
      ["Nome", "Data", "Acertos", "Total", "Taxa"],
      ...((DESEMPENHO_SIMULADOS_INICIAL[aluno.id]?.geral) || []).map((e) => [e.nome, e.data, e.acertos, e.total, e.taxa + "%"]),
    ];
    const csv = linhas.map((l) => l.map((c) => `"${String(c).replace(/"/g, '""')}"`).join(",")).join("\n");
    // BOM UTF-8 para abrir certinho no Excel
    const blob = new Blob(["\uFEFF" + csv], { type: "text/csv;charset=utf-8;" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url; a.download = `relatorio-${aluno.nome.toLowerCase().replace(/\s+/g, "-")}.csv`;
    document.body.appendChild(a); a.click(); document.body.removeChild(a);
    setTimeout(() => URL.revokeObjectURL(url), 1000);
    // 🔥 BACKEND: na versão real, este endpoint pode gerar um PDF mais elaborado
  };

  const abas = [
    { k: "desempenho", label: "Desempenho · Questões", icon: TrendingUp },
    { k: "simEmpenho", label: "Desempenho · Simulados", icon: Trophy },
    { k: "progresso", label: "Progresso no Plano", icon: Target },
    { k: "revisoes", label: "Revisões espaçadas", icon: RefreshCw },
    { k: "simulados", label: "Simulados p/ classificar", icon: FileText },
    { k: "ciclo", label: "Ciclo de matérias", icon: Repeat },
    { k: "material", label: "Material individual", icon: Library },
    { k: "historico", label: "Histórico de replanejamentos", icon: Clock4 },
    { k: "anotacoes", label: "Anotações privadas", icon: NotebookPen },
    { k: "recados", label: "Recados", icon: Mail },
  ];

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      {/* header do perfil com acento da cor do vestibular */}
      <div style={{ display: "flex", alignItems: "center", gap: 14, marginBottom: 4 }}>
        <Btn variant="ghost" size="sm" icon={ChevronRight} onClick={onBack} style={{ transform: "rotate(180deg)", padding: 8 }} />
        <div style={{ width: 52, height: 52, borderRadius: 14, background: v.cor + "22", display: "flex", alignItems: "center", justifyContent: "center", color: v.cor, fontWeight: 800, fontSize: 21, flexShrink: 0 }}>{aluno.nome.charAt(0)}</div>
        <div style={{ flex: 1 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
            <h2 style={{ margin: 0, fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: "-.02em" }}>{aluno.nome}</h2>
            <VestBadge id={aluno.vestibular} />
          </div>
          <p style={{ margin: "2px 0 0", fontSize: 13, color: p.textSoft }}>{aluno.email}</p>
        </div>
        {/* seletor de vestibular-alvo + botão de exportar relatório */}
        <Btn variant="soft" size="sm" icon={FileText} onClick={exportarRelatorio} title="Exportar relatório (CSV)">Relatório</Btn>
        <div style={{ minWidth: 170 }}>
          <Select value={aluno.vestibular} onChange={(e) => setVestibular(e.target.value)}>
            {VESTIBULARES.map((vv) => <option key={vv.id} value={vv.id}>Alvo: {vv.nome}</option>)}
          </Select>
        </div>
      </div>

      {/* faixa de acento do vestibular */}
      <div style={{ height: 3, borderRadius: 99, background: `linear-gradient(90deg, ${v.cor}, transparent)`, margin: "16px 0 20px" }} />

      {/* abas internas — rolam horizontalmente em telas pequenas */}
      <div style={{ display: "flex", gap: 6, marginBottom: 22, overflowX: "auto", paddingBottom: 4 }}>
        {abas.map((t) => {
          const badge = t.k === "simulados" ? meusEnvios.filter((e) => e.status === "pendente").length : 0;
          return (
            <button key={t.k} onClick={() => setAba(t.k)} style={{
              display: "inline-flex", alignItems: "center", gap: 7, padding: "9px 14px", borderRadius: 10, cursor: "pointer", flexShrink: 0,
              border: "1px solid " + (aba === t.k ? p.accent : p.border), background: aba === t.k ? p.accent + "1a" : "transparent",
              color: aba === t.k ? p.accent : p.textSoft, fontWeight: 600, fontSize: 12.5, transition: "all .15s", whiteSpace: "nowrap",
            }}>
              <t.icon size={14} />{t.label}
              {badge > 0 && <span style={{ background: p.accent, color: "#fff", borderRadius: 99, fontSize: 10.5, fontWeight: 800, padding: "1px 6px" }}>{badge}</span>}
            </button>
          );
        })}
      </div>

      {aba === "desempenho" && <PerfilDesempenhoQuestoes aluno={aluno} />}
      {aba === "simEmpenho" && <PerfilDesempenhoSimulados aluno={aluno} />}
      {aba === "progresso" && <PerfilProgresso aluno={aluno} progressoAlunos={progressoAlunos} />}
      {aba === "revisoes" && <PerfilRevisoes aluno={aluno} revisoes={revisoes} setRevisoes={setRevisoes} />}
      {aba === "simulados" && <PerfilSimulados aluno={aluno} envios={meusEnvios} setEnvios={setEnvios} todosEnvios={envios} />}
      {aba === "ciclo" && <PerfilCiclo aluno={aluno} ciclosPorAluno={ciclosPorAluno} setCiclosPorAluno={setCiclosPorAluno} dispPorAluno={dispPorAluno} />}
      {aba === "material" && <PerfilMaterial aluno={aluno} materiais={materiais} setMateriais={setMateriais} />}
      {aba === "historico" && <PerfilHistorico aluno={aluno} historicoReplan={historicoReplan} />}
      {aba === "anotacoes" && <PerfilAnotacoes aluno={aluno} anotacoesMod={anotacoesMod} setAnotacoesMod={setAnotacoesMod} />}
      {aba === "recados" && <PerfilRecados aluno={aluno} recadosPorAluno={recadosPorAluno} setRecadosPorAluno={setRecadosPorAluno} />}
    </div>
  );
}

/* aba Desempenho em QUESTÕES — filtros de matéria e período (data inicial/final) */
function PerfilDesempenhoQuestoes({ aluno }) {
  const p = usePalette();
  const [fMat, setFMat] = useState("");      // id da matéria
  const [fTop, setFTop] = useState("");      // id do tópico
  const [periodo, setPeriodo] = useState("mes"); // preset selecionado
  const [openPer, setOpenPer] = useState(false); // dropdown de período aberto
  const [custom, setCustom] = useState({ ini: "", fim: "" }); // datas personalizadas

  const PERIODOS = [
    { k: "semana", label: "Última semana" },
    { k: "15", label: "Últimos 15 dias" },
    { k: "mes", label: "Último mês" },
    { k: "3meses", label: "Últimos 3 meses" },
    { k: "tudo", label: "Período completo" },
    { k: "custom", label: "Personalizado…" },
  ];
  const periodoLabel = periodo === "custom" && custom.ini && custom.fim
    ? `${custom.ini.split("-").reverse().join("/")} a ${custom.fim.split("-").reverse().join("/")}`
    : (PERIODOS.find((x) => x.k === periodo)?.label || "Período");

  const topicosDisp = fMat ? topicosDaMateria(fMat) : [];

  // 🔥 FIREBASE: leitura de /students/{uid}/questions com filtros aplicados (matéria + tópico + período)
  const evolucaoBase = [
    { dia: "01/05", taxa: 55, materia: "Matemática" }, { dia: "08/05", taxa: 62, materia: "Matemática" },
    { dia: "15/05", taxa: 60, materia: "Física" }, { dia: "22/05", taxa: 70, materia: "Matemática" },
    { dia: "29/05", taxa: 76, materia: "Biologia" },
  ];
  const evolucao = fMat ? evolucaoBase.filter((e) => e.materia === MATERIAS_FLAT.find((m) => m.id === fMat)?.nome) : evolucaoBase;
  const porMateria = [
    { materia: "Mat", taxa: 72 }, { materia: "Port", taxa: 80 }, { materia: "Fís", taxa: 64 },
    { materia: "Quí", taxa: 58 }, { materia: "Bio", taxa: 75 }, { materia: "Hist", taxa: 68 },
  ];

  return (
    <>
      {/* cards-resumo */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(4,1fr)", gap: 12, marginBottom: 18 }} className="stat-grid">
        <StatCard icon={Target} label="Metas concluídas" value={aluno.metas} color={p.accent} />
        <StatCard icon={FileQuestion} label="Questões" value={aluno.questoes} color="#3b82f6" />
        <StatCard icon={Clock4} label="Horas" value={aluno.horas + "h"} color={p.green} />
        <StatCard icon={TrendingUp} label="Progresso" value={aluno.progresso + "%"} color="#a855f7" />
      </div>

      {/* filtros — matéria + tópico (cascata) + período (presets) */}
      <Card pad={16} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 11 }}>
          <Filter size={15} color={p.accent} />
          <span style={{ fontSize: 12.5, fontWeight: 700, color: p.text, textTransform: "uppercase", letterSpacing: ".04em" }}>Filtros</span>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr 1fr", gap: 10 }} className="stat-grid">
          <Select value={fMat} onChange={(e) => { setFMat(e.target.value); setFTop(""); }}>
            <option value="">Todas as matérias</option>
            {MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
          </Select>
          <Select value={fTop} onChange={(e) => setFTop(e.target.value)} disabled={!fMat} style={{ opacity: fMat ? 1 : 0.5 }}>
            <option value="">{fMat ? "Todos os tópicos" : "Escolha a matéria"}</option>
            {topicosDisp.map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}
          </Select>
          {/* Botão estilo dropdown de período */}
          <div style={{ position: "relative" }}>
            <button onClick={() => setOpenPer(!openPer)} style={{
              width: "100%", display: "flex", alignItems: "center", justifyContent: "space-between", gap: 8,
              padding: "11px 13px", borderRadius: 10, background: p.inputBg, border: "1px solid " + p.border,
              color: p.text, fontSize: 14, fontWeight: 500, cursor: "pointer", textAlign: "left",
            }}>
              <span style={{ display: "flex", alignItems: "center", gap: 8, minWidth: 0 }}>
                <CalendarDays size={14} color={p.textSoft} />
                <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{periodoLabel}</span>
              </span>
              <ChevronDown size={14} color={p.textSoft} style={{ flexShrink: 0, transform: openPer ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
            </button>
            {openPer && (
              <>
                <div onClick={() => setOpenPer(false)} style={{ position: "fixed", inset: 0, zIndex: 20 }} />
                <div style={{ position: "absolute", top: "calc(100% + 4px)", right: 0, left: 0, background: p.surface, border: "1px solid " + p.border, borderRadius: 11, boxShadow: "0 12px 28px rgba(0,0,0,.18)", zIndex: 21, overflow: "hidden" }}>
                  {PERIODOS.map((per) => (
                    <button key={per.k} onClick={() => { setPeriodo(per.k); if (per.k !== "custom") setOpenPer(false); }} style={{
                      display: "flex", alignItems: "center", justifyContent: "space-between", width: "100%",
                      padding: "10px 13px", background: periodo === per.k ? p.accent + "16" : "transparent",
                      border: "none", color: periodo === per.k ? p.accent : p.text, fontSize: 13, fontWeight: periodo === per.k ? 700 : 500,
                      cursor: "pointer", textAlign: "left", transition: "background .12s",
                    }}
                    onMouseEnter={(e) => { if (periodo !== per.k) e.currentTarget.style.background = p.surface2; }}
                    onMouseLeave={(e) => { if (periodo !== per.k) e.currentTarget.style.background = "transparent"; }}>
                      <span>{per.label}</span>
                      {periodo === per.k && <Check size={14} />}
                    </button>
                  ))}
                  {periodo === "custom" && (
                    <div style={{ padding: 10, borderTop: "1px solid " + p.border, display: "grid", gridTemplateColumns: "1fr 1fr", gap: 8 }}>
                      <Input type="date" value={custom.ini} onChange={(e) => setCustom({ ...custom, ini: e.target.value })} />
                      <Input type="date" value={custom.fim} onChange={(e) => setCustom({ ...custom, fim: e.target.value })} />
                      <Btn size="sm" onClick={() => setOpenPer(false)} style={{ gridColumn: "1 / -1" }}>Aplicar</Btn>
                    </div>
                  )}
                </div>
              </>
            )}
          </div>
        </div>
      </Card>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 16, marginBottom: 16 }} className="chart-grid">
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Evolução da taxa de acerto</h3>
          <ResponsiveContainer width="100%" height={230}>
            <LineChart data={evolucao}>
              <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
              <XAxis dataKey="dia" stroke={p.textSoft} fontSize={12} /><YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} />
              <Line type="monotone" dataKey="taxa" stroke={p.accent} strokeWidth={3} dot={{ fill: p.accent, r: 4 }} />
            </LineChart>
          </ResponsiveContainer>
        </Card>
        <Card>
          <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Acertos por matéria</h3>
          <ResponsiveContainer width="100%" height={230}>
            <BarChart data={porMateria}>
              <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
              <XAxis dataKey="materia" stroke={p.textSoft} fontSize={12} /><YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
              <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} cursor={{ fill: p.accent + "11" }} />
              <Bar dataKey="taxa" fill={p.accent} radius={[8, 8, 0, 0]} />
            </BarChart>
          </ResponsiveContainer>
        </Card>
      </div>
      {/* 🔥 FIREBASE: agregar /students/{uid}/questions com matéria + tópico + período */}
    </>
  );
}

/* aba de classificação dos simulados enviados pelo aluno */
function PerfilSimulados({ aluno, envios, setEnvios, todosEnvios }) {
  const p = usePalette();
  const [classificando, setClassificando] = useState(null);
  const [questao, setQuestao] = useState({ num: "", materiaId: "", topicoId: "", gabarito: "A" });
  const [tmp, setTmp] = useState([]);

  const addQ = () => {
    if (!questao.num) return;
    const mat = MATERIAS_FLAT.find((m) => m.id === questao.materiaId);
    const top = topicosDaMateria(questao.materiaId).find((t) => t.id === questao.topicoId);
    setTmp([...tmp, { num: +questao.num, materia: mat ? mat.nome : "", topico: top ? top.nome : "", gabarito: questao.gabarito }]);
    setQuestao({ num: "", materiaId: "", topicoId: "", gabarito: "A" });
  };
  const concluir = () => {
    // 🔥 FIREBASE: salvar questões classificadas + marcar envio como "classificado"
    setEnvios(todosEnvios.map((e) => e.id === classificando.id ? { ...e, status: "classificado", questoes: tmp } : e));
    setClassificando(null); setTmp([]);
  };

  if (envios.length === 0) return <Empty icon={FileText} title="Nenhum simulado enviado" sub={`${aluno.nome} ainda não enviou simulados para classificação.`} />;

  return (
    <>
      {envios.map((e) => (
        <Card key={e.id} pad={16} style={{ marginBottom: 12 }}>
          <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
            <FileText size={20} color={p.textFaint} />
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 15, fontWeight: 700, color: p.text }}>{e.nome}</div>
              <div style={{ fontSize: 12, color: p.textFaint }}>{e.arquivo} · {e.data}</div>
            </div>
            <VestBadge id={e.modelo} size="sm" />
            {e.status === "pendente"
              ? <Btn size="sm" icon={ListChecks} onClick={() => { setClassificando(e); setTmp(e.questoes || []); }}>Classificar</Btn>
              : <Badge soft color={p.green}><Check size={11} /> Classificado ({(e.questoes || []).length}q)</Badge>}
          </div>
        </Card>
      ))}

      {/* 🔥 FIREBASE Storage: visualizar o PDF enviado ao lado do classificador */}
      <Modal open={!!classificando} onClose={() => setClassificando(null)} title={"Classificar · " + (classificando?.nome || "")} width={560}>
        <div style={{ border: "2px dashed " + p.border, borderRadius: 12, padding: 18, textAlign: "center", marginBottom: 16, color: p.textFaint }}>
          <FileText size={26} style={{ opacity: .5, marginBottom: 6 }} />
          <div style={{ fontSize: 12.5 }}>Pré-visualização do PDF enviado pelo aluno</div>
        </div>
        <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: p.text }}>Classificar questões</h4>
        <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 62px auto", gap: 8, alignItems: "end" }}>
          <Field label="Nº"><Input value={questao.num} onChange={(ev) => setQuestao({ ...questao, num: ev.target.value })} /></Field>
          <Field label="Matéria"><Select value={questao.materiaId} onChange={(ev) => setQuestao({ ...questao, materiaId: ev.target.value, topicoId: "" })}><option value="">—</option>{MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</Select></Field>
          <Field label="Tópico"><Select value={questao.topicoId} onChange={(ev) => setQuestao({ ...questao, topicoId: ev.target.value })} disabled={!questao.materiaId} style={{ opacity: questao.materiaId ? 1 : .5 }}><option value="">—</option>{topicosDaMateria(questao.materiaId).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select></Field>
          <Field label="Gab."><Select value={questao.gabarito} onChange={(ev) => setQuestao({ ...questao, gabarito: ev.target.value })}>{["A", "B", "C", "D", "E"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
          <Btn size="sm" icon={Plus} onClick={addQ} style={{ marginBottom: 14 }}>Add</Btn>
        </div>
        {tmp.length > 0 && (
          <div style={{ background: p.surface2, borderRadius: 10, padding: 10, marginBottom: 14, maxHeight: 140, overflowY: "auto" }}>
            {tmp.map((q, i) => (
              <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", color: p.text }}>
                <span>Q{q.num} · {q.materia || "—"} · {q.topico || "—"}</span><span style={{ color: p.accent, fontWeight: 700 }}>Gab: {q.gabarito}</span>
              </div>
            ))}
          </div>
        )}
        <Btn onClick={concluir} style={{ width: "100%" }} icon={Check}>Concluir classificação ({tmp.length}q)</Btn>
      </Modal>
    </>
  );
}

/* aba Ciclo de matérias — editor de alocação semanal por matéria */
function PerfilCiclo({ aluno, ciclosPorAluno, setCiclosPorAluno, dispPorAluno }) {
  const p = usePalette();
  const cicloSalvo = getCicloAluno(ciclosPorAluno, aluno.id);
  const [alocacoes, setAlocacoes] = useState(cicloSalvo.alocacoes.map((a) => ({ ...a })));
  const [salvo, setSalvo] = useState(false);
  const [preview, setPreview] = useState(false);
  const [templateOpen, setTemplateOpen] = useState(false);

  const disp = getDispAluno(dispPorAluno, aluno.id);
  const totalDisp = Object.values(disp).reduce((s, v) => s + v, 0);
  const totalAloc = alocacoes.reduce((s, a) => s + (a.minutosSemanais || 0), 0);
  const overflow = totalAloc > totalDisp;

  const updAloc = (i, campo, val) => {
    const c = [...alocacoes];
    c[i] = { ...c[i], [campo]: campo === "materiaNome" ? val : Math.max(0, parseInt(val) || 0) };
    setAlocacoes(c);
  };
  const addAloc = () => setAlocacoes([...alocacoes, { materiaId: MATERIAS_FLAT[0].id, materiaNome: MATERIAS_FLAT[0].nome, minutosSemanais: 120, maxSessao: 60 }]);
  const remAloc = (i) => alocacoes.length > 1 && setAlocacoes(alocacoes.filter((_, idx) => idx !== i));
  const updMat = (i, id) => {
    const m = MATERIAS_FLAT.find((x) => x.id === id);
    const c = [...alocacoes]; c[i] = { ...c[i], materiaId: m.id, materiaNome: m.nome }; setAlocacoes(c);
  };
  const aplicarTemplate = (tplKey) => {
    const tpl = CICLO_TEMPLATES[tplKey];
    if (tpl) setAlocacoes(tpl.alocacoes.map((a) => ({ ...a })));
    setTemplateOpen(false);
  };
  const salvar = () => {
    setCiclosPorAluno((prev) => ({ ...prev, [aluno.id]: { alocacoes: alocacoes.map((a) => ({ ...a })) } }));
    setSalvo(true); setTimeout(() => setSalvo(false), 2200);
  };
  const aplicarParaTodos = () => {
    setCiclosPorAluno((prev) => {
      const novo = { ...prev };
      Object.keys(novo).forEach((uid) => { novo[uid] = { alocacoes: alocacoes.map((a) => ({ ...a })) }; });
      return novo;
    });
    setSalvo(true); setTimeout(() => setSalvo(false), 2200);
  };

  const previewSemana = useMemo(() => {
    if (!preview) return null;
    return distribuirSemana({ alocacoes }, disp);
  }, [preview, alocacoes, disp]);

  return (
    <div>
      {/* aviso de como o sistema funciona */}
      <div style={{ display: "flex", gap: 10, padding: "11px 14px", marginBottom: 18, borderRadius: 11, background: p.accent + "0e", border: "1px solid " + p.accent + "33", fontSize: 13, color: p.textSoft, lineHeight: 1.5 }}>
        <Sparkles size={15} color={p.accent} style={{ flexShrink: 0, marginTop: 1 }} />
        <span>Defina <strong style={{ color: p.text }}>quantos minutos por semana</strong> {aluno.nome.split(" ")[0]} dedica a cada matéria. A engine distribui automaticamente esses minutos nos dias da semana, respeitando a disponibilidade diária. O ciclo se repete sozinho toda semana.</span>
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1.7fr", gap: 16 }} className="chart-grid">

        {/* --- configurações + templates --- */}
        <div style={{ display: "flex", flexDirection: "column", gap: 14 }}>
          <Card>
            <p style={{ fontSize: 13, color: p.textSoft, margin: "0 0 14px", lineHeight: 1.6 }}>
              Ciclo de <strong style={{ color: p.text }}>{aluno.nome}</strong> <VestBadge id={aluno.vestibular} size="sm" />
            </p>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10, padding: 14, background: p.surface2, borderRadius: 12, marginBottom: 14 }}>
              <div>
                <div style={{ fontSize: 11, color: p.textFaint, marginBottom: 3 }}>Total alocado/semana</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: overflow ? p.danger : p.accent }}>{fmtMin(totalAloc)}</div>
              </div>
              <div>
                <div style={{ fontSize: 11, color: p.textFaint, marginBottom: 3 }}>Disponível/semana</div>
                <div style={{ fontSize: 20, fontWeight: 900, color: p.text }}>{fmtMin(totalDisp)}</div>
              </div>
            </div>
            {overflow && (
              <div style={{ display: "flex", gap: 8, padding: "9px 12px", borderRadius: 9, background: p.danger + "14", border: "1px solid " + p.danger + "33", fontSize: 12, color: p.textSoft, marginBottom: 14 }}>
                <AlertTriangle size={14} color={p.danger} style={{ flexShrink: 0, marginTop: 1 }} />
                O ciclo excede a disponibilidade em {fmtMin(totalAloc - totalDisp)}. A engine vai priorizar as matérias com mais horas.
              </div>
            )}
            <div style={{ display: "flex", flexDirection: "column", gap: 8 }}>
              <Btn icon={Save} onClick={salvar} style={{ width: "100%" }}>{salvo ? "Salvo ✓" : "Salvar ciclo"}</Btn>
              <Btn variant="soft" icon={Users} onClick={aplicarParaTodos} style={{ width: "100%" }}>Usar como base para todos</Btn>
              <Btn variant="outline" icon={Eye} onClick={() => setPreview(!preview)} style={{ width: "100%" }}>{preview ? "Ocultar pré-visualização" : "Ver semana gerada"}</Btn>
            </div>
          </Card>

          {/* Templates */}
          <Card>
            <div style={{ fontSize: 12, fontWeight: 800, color: p.textSoft, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 12 }}>Templates</div>
            <div style={{ display: "flex", flexDirection: "column", gap: 6 }}>
              {Object.entries(CICLO_TEMPLATES).map(([k, t]) => (
                <button key={k} onClick={() => aplicarTemplate(k)} style={{
                  display: "flex", alignItems: "center", gap: 10, padding: "8px 11px", borderRadius: 9,
                  background: "transparent", border: "1px solid " + p.border, cursor: "pointer", width: "100%", transition: "all .15s",
                }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = t.cor; e.currentTarget.style.background = t.cor + "0e"; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.background = "transparent"; }}>
                  <div style={{ width: 8, height: 8, borderRadius: 99, background: t.cor, flexShrink: 0 }} />
                  <div style={{ flex: 1, minWidth: 0, textAlign: "left" }}>
                    <div style={{ fontSize: 12.5, fontWeight: 700, color: p.text }}>{t.nome}</div>
                    <div style={{ fontSize: 11, color: p.textFaint, lineHeight: 1.3 }}>{t.desc}</div>
                  </div>
                  <ChevronRight size={13} color={p.textFaint} />
                </button>
              ))}
            </div>
            <p style={{ fontSize: 11, color: p.textFaint, margin: "10px 0 0", lineHeight: 1.5 }}>ⓘ Aplicar um template substitui as alocações atuais. Ajuste depois livremente.</p>
          </Card>
        </div>

        {/* --- editor de alocações --- */}
        <Card>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 14 }}>
            <h4 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>Horas semanais por matéria</h4>
            <Btn size="sm" variant="outline" icon={Plus} onClick={addAloc}>Matéria</Btn>
          </div>

          <div style={{ maxHeight: 380, overflowY: "auto", paddingRight: 4 }}>
            {alocacoes.map((a, i) => {
              const mat = MATERIAS_FLAT.find((m) => m.id === a.materiaId);
              const areaCor = mat?.areaCor || p.accent;
              const pct = totalAloc ? Math.round((a.minutosSemanais / totalAloc) * 100) : 0;
              return (
                <div key={i} style={{ display: "flex", alignItems: "center", gap: 9, marginBottom: 10 }}>
                  <div style={{ width: 24, height: 24, borderRadius: 7, background: areaCor + "22", color: areaCor, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11, fontWeight: 800, flexShrink: 0 }}>{i + 1}</div>
                  <Select value={a.materiaId} onChange={(e) => updMat(i, e.target.value)} style={{ flex: 1.5 }}>
                    {MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}
                  </Select>
                  <div style={{ display: "flex", alignItems: "center", gap: 5, flexShrink: 0 }}>
                    <Input type="number" value={Math.floor(a.minutosSemanais / 60)} min={0} max={30}
                      onChange={(e) => updAloc(i, "minutosSemanais", (+e.target.value) * 60 + (a.minutosSemanais % 60))}
                      style={{ width: 52 }} />
                    <span style={{ fontSize: 11, color: p.textFaint }}>h</span>
                    <Input type="number" value={a.minutosSemanais % 60} min={0} max={59} step={15}
                      onChange={(e) => updAloc(i, "minutosSemanais", Math.floor(a.minutosSemanais / 60) * 60 + (+e.target.value))}
                      style={{ width: 52 }} />
                    <span style={{ fontSize: 11, color: p.textFaint }}>min</span>
                  </div>
                  <span style={{ fontSize: 11, color: p.textFaint, width: 30, textAlign: "right", flexShrink: 0 }}>{pct}%</span>
                  <button onClick={() => remAloc(i)} style={{ background: "none", border: "none", color: alocacoes.length > 1 ? p.textFaint : p.border, cursor: alocacoes.length > 1 ? "pointer" : "not-allowed", padding: 3, display: "flex" }}><Trash2 size={14} /></button>
                </div>
              );
            })}
          </div>

          {/* barra de proporção */}
          <div style={{ marginTop: 16, paddingTop: 14, borderTop: "1px solid " + p.border }}>
            <div style={{ fontSize: 11, color: p.textFaint, marginBottom: 7 }}>Proporção de tempo semanal</div>
            <div style={{ display: "flex", height: 10, borderRadius: 99, overflow: "hidden", gap: 1 }}>
              {alocacoes.map((a, i) => {
                const mat = MATERIAS_FLAT.find((m) => m.id === a.materiaId);
                const pct = totalAloc ? (a.minutosSemanais / totalAloc) * 100 : 0;
                return <div key={i} style={{ width: pct + "%", background: mat?.areaCor || p.accent, transition: "width .3s", minWidth: pct > 0 ? 2 : 0 }} title={`${a.materiaNome}: ${fmtMin(a.minutosSemanais)}/semana`} />;
              })}
            </div>
            <div style={{ display: "flex", flexWrap: "wrap", gap: "4px 12px", marginTop: 8 }}>
              {alocacoes.filter((a) => a.minutosSemanais > 0).map((a, i) => {
                const mat = MATERIAS_FLAT.find((m) => m.id === a.materiaId);
                return (
                  <span key={i} style={{ fontSize: 11, color: p.textSoft, display: "flex", alignItems: "center", gap: 4 }}>
                    <span style={{ width: 7, height: 7, borderRadius: 99, background: mat?.areaCor || p.accent }} />
                    {a.materiaNome} {fmtMin(a.minutosSemanais)}
                  </span>
                );
              })}
            </div>
          </div>
        </Card>
      </div>

      {/* Pré-visualização da semana gerada */}
      {preview && previewSemana && (
        <Card style={{ marginTop: 16 }}>
          <h4 style={{ margin: "0 0 14px", fontSize: 14, fontWeight: 700, color: p.text }}>Como ficará a semana gerada automaticamente</h4>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(7, 1fr)", gap: 8 }} className="week-grid">
            {DIAS.map((d) => {
              const metas = previewSemana[d.k] || [];
              const total = metas.reduce((s, m) => s + m.minutos, 0);
              const teto = disp[d.k] || 0;
              return (
                <div key={d.k} style={{ padding: 9, borderRadius: 10, background: p.surface2, border: "1px solid " + p.border }}>
                  <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 6 }}>
                    <span style={{ fontSize: 11, fontWeight: 700, color: p.textSoft }}>{d.nome.slice(0, 3)}</span>
                    <span style={{ fontSize: 9.5, color: total > teto ? p.danger : p.textFaint }}>{fmtMin(total)}/{fmtMin(teto)}</span>
                  </div>
                  {metas.map((m, mi) => {
                    const mat = MATERIAS_FLAT.find((x) => x.id === m.materiaId);
                    return (
                      <div key={mi} style={{ fontSize: 10, padding: "3px 6px", marginBottom: 3, borderRadius: 5, background: (mat?.areaCor || p.accent) + "1f", color: mat?.areaCor || p.accent, fontWeight: 600 }}>
                        {m.materia} · {fmtMin(m.minutos)}
                      </div>
                    );
                  })}
                  {metas.length === 0 && <span style={{ fontSize: 9.5, color: p.textFaint }}>Livre</span>}
                </div>
              );
            })}
          </div>
        </Card>
      )}
    </div>
  );
}

/* aba Material individual do perfil */
function PerfilMaterial({ aluno, materiais, setMateriais }) {
  const p = usePalette();
  const [up, setUp] = useState(false);
  const [form, setForm] = useState({ titulo: "", area: "Matemática", materia: "Álgebra" });
  const doAluno = materiais.filter((m) => m.alunoId === aluno.id);
  const salvar = () => {
    if (!form.titulo.trim()) return;
    const cor = AREAS.find((a) => a.nome === form.area)?.cor || p.accent;
    // 🔥 FIREBASE Storage + Firestore: /materials com visibilidade individual (alunoId)
    setMateriais([{ id: Date.now() + "", ...form, vestibular: vestInfo(aluno.vestibular).nome, para: "especificos", alunoId: aluno.id, cor }, ...materiais]);
    setForm({ titulo: "", area: "Matemática", materia: "Álgebra" }); setUp(false);
  };
  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16 }}>
        <p style={{ fontSize: 13, color: p.textSoft, margin: 0 }}>Materiais enviados individualmente para {aluno.nome}.</p>
        <Btn icon={UploadCloud} size="sm" onClick={() => setUp(true)}>Enviar material</Btn>
      </div>
      {doAluno.length === 0
        ? <Empty icon={Library} title="Nenhum material individual" sub="Envie um PDF específico para este aluno." />
        : <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(200px,1fr))", gap: 14 }}>
            {doAluno.map((m) => (
              <Card key={m.id} pad={16}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
                  <Badge soft color={m.cor}>{m.materia}</Badge>
                  <button onClick={() => setMateriais(materiais.filter((x) => x.id !== m.id))} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
                </div>
                <h4 style={{ margin: "4px 0", fontSize: 14, fontWeight: 700, color: p.text }}>{m.titulo}</h4>
                <p style={{ margin: 0, fontSize: 12, color: p.textFaint }}>{m.area}</p>
              </Card>
            ))}
          </div>}
      <Modal open={up} onClose={() => setUp(false)} title={"Enviar material · " + aluno.nome}>
        <div style={{ border: "2px dashed " + p.border, borderRadius: 14, padding: 22, textAlign: "center", marginBottom: 16, cursor: "pointer" }}>
          <UploadCloud size={30} color={p.accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>Upload do PDF</div>
          <div style={{ fontSize: 11.5, color: p.textFaint }}>🔥 Firebase Storage</div>
        </div>
        <Field label="Título"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Lista de exercícios personalizada" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Área"><Select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map((a) => <option key={a.id}>{a.nome}</option>)}</Select></Field>
          <Field label="Matéria"><Input value={form.materia} onChange={(e) => setForm({ ...form, materia: e.target.value })} /></Field>
        </div>
        <Btn onClick={salvar} style={{ width: "100%" }} icon={Save}>Enviar para {aluno.nome}</Btn>
      </Modal>
    </>
  );
}

/* aba Desempenho em SIMULADOS — geral + drill-down por matéria */
function PerfilDesempenhoSimulados({ aluno }) {
  const p = usePalette();
  const dados = DESEMPENHO_SIMULADOS_INICIAL[aluno.id] || { geral: [], porMateria: {} };
  const [verMaterias, setVerMaterias] = useState(false);
  const taxaMedia = dados.geral.length ? Math.round(dados.geral.reduce((s, e) => s + e.taxa, 0) / dados.geral.length) : 0;
  const totalQ = dados.geral.reduce((s, e) => s + e.total, 0);
  const totalA = dados.geral.reduce((s, e) => s + e.acertos, 0);
  const porMatArr = Object.entries(dados.porMateria).map(([materia, taxa]) => ({ materia, taxa })).sort((a, b) => b.taxa - a.taxa);

  return (
    <>
      {/* resumo geral */}
      <div style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 18 }} className="stat-grid">
        <StatCard icon={Trophy} label="Taxa média" value={taxaMedia + "%"} color={p.accent} />
        <StatCard icon={FileText} label="Simulados feitos" value={dados.geral.length} color="#3b82f6" />
        <StatCard icon={CheckCircle2} label="Total de acertos" value={`${totalA}/${totalQ}`} color={p.green} />
      </div>

      {dados.geral.length === 0 ? (
        <Empty icon={Trophy} title="Nenhum simulado realizado" sub={`${aluno.nome} ainda não fez simulados.`} />
      ) : (
        <>
          <Card style={{ marginBottom: 16 }}>
            <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Desempenho geral nos simulados</h3>
            <ResponsiveContainer width="100%" height={240}>
              <BarChart data={dados.geral}>
                <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
                <XAxis dataKey="nome" stroke={p.textSoft} fontSize={12} />
                <YAxis stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
                <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} cursor={{ fill: p.accent + "11" }} />
                <Bar dataKey="taxa" fill="#3b82f6" radius={[8, 8, 0, 0]} />
              </BarChart>
            </ResponsiveContainer>
          </Card>

          {/* lista de simulados clicável para abrir o por matéria */}
          <Card pad={0} style={{ marginBottom: 16 }}>
            <div style={{ padding: "14px 18px", borderBottom: "1px solid " + p.border }}>
              <h3 style={{ margin: 0, fontSize: 14, fontWeight: 700, color: p.text }}>Histórico de simulados</h3>
              <p style={{ margin: "3px 0 0", fontSize: 12, color: p.textFaint }}>Clique para ver o detalhamento por matéria</p>
            </div>
            {dados.geral.map((e, i) => (
              <button key={i} onClick={() => setVerMaterias(!verMaterias)}
                style={{ display: "flex", alignItems: "center", gap: 14, padding: "13px 18px", width: "100%", background: "transparent", border: "none", borderBottom: i < dados.geral.length - 1 ? "1px solid " + p.border : "none", cursor: "pointer", textAlign: "left", color: "inherit" }}
                onMouseEnter={(ev) => ev.currentTarget.style.background = p.surface2}
                onMouseLeave={(ev) => ev.currentTarget.style.background = "transparent"}>
                <div style={{ width: 46, height: 46, borderRadius: 11, background: (e.taxa >= 70 ? p.green : e.taxa >= 50 ? p.accent : p.danger) + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0, color: e.taxa >= 70 ? p.green : e.taxa >= 50 ? p.accent : p.danger, fontWeight: 800, fontSize: 14 }}>{e.taxa}%</div>
                <div style={{ flex: 1, minWidth: 0 }}>
                  <div style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{e.nome}</div>
                  <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 2 }}>{e.acertos} acertos de {e.total} · {e.data}</div>
                </div>
                <ChevronDown size={16} color={p.textFaint} style={{ transform: verMaterias ? "rotate(180deg)" : "none", transition: "transform .2s" }} />
              </button>
            ))}
          </Card>

          {/* detalhamento por matéria — abre quando clica em um simulado */}
          {verMaterias && porMatArr.length > 0 && (
            <Card>
              <h3 style={{ margin: "0 0 14px", fontSize: 15, fontWeight: 700, color: p.text }}>Desempenho por matéria (consolidado)</h3>
              <ResponsiveContainer width="100%" height={Math.max(240, porMatArr.length * 32)}>
                <BarChart data={porMatArr} layout="vertical" margin={{ left: 70 }}>
                  <CartesianGrid strokeDasharray="3 3" stroke={p.chartGrid} />
                  <XAxis type="number" stroke={p.textSoft} fontSize={12} domain={[0, 100]} />
                  <YAxis type="category" dataKey="materia" stroke={p.textSoft} fontSize={12} width={70} />
                  <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} cursor={{ fill: p.accent + "11" }} />
                  <Bar dataKey="taxa" fill={p.accent} radius={[0, 8, 8, 0]} />
                </BarChart>
              </ResponsiveContainer>
            </Card>
          )}
        </>
      )}
      {/* 🔥 FIREBASE: agregar /students/{uid}/examResults (taxa global + por matéria) */}
    </>
  );
}

/* aba Progresso no Plano — avanço por área e matéria */
function PerfilProgresso({ aluno, progressoAlunos }) {
  const p = usePalette();
  const prog = progressoAlunos[aluno.id] || {};
  // calcula progresso de cada matéria = média dos tópicos dela
  const calcMateria = (m) => {
    const vals = m.topicos.map((t) => prog[t.id] || 0);
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  };
  const calcArea = (area) => {
    const vals = area.materias.map((m) => calcMateria(m));
    return vals.length ? Math.round(vals.reduce((s, v) => s + v, 0) / vals.length) : 0;
  };

  return (
    <>
      <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0, marginBottom: 16 }}>Avanço de {aluno.nome} tópico por tópico, agrupado por área e matéria.</p>
      {AREAS.map((area) => {
        const pctArea = calcArea(area);
        return (
          <Card key={area.id} style={{ marginBottom: 14 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 12 }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: area.cor }} />
              <h3 style={{ margin: 0, fontSize: 16, fontWeight: 800, color: p.text, flex: 1 }}>{area.nome}</h3>
              <span style={{ fontSize: 13, fontWeight: 700, color: area.cor }}>{pctArea}%</span>
            </div>
            <div style={{ marginBottom: 14 }}><ProgressBar value={pctArea} color={area.cor} /></div>
            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 12 }} className="chart-grid">
              {area.materias.map((m) => {
                const pctM = calcMateria(m);
                return (
                  <div key={m.id} style={{ padding: 13, borderRadius: 11, background: p.surface2 }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "baseline", marginBottom: 7 }}>
                      <span style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>{m.nome}</span>
                      <span style={{ fontSize: 12, color: p.textSoft, fontWeight: 600 }}>{pctM}%</span>
                    </div>
                    <ProgressBar value={pctM} color={area.cor} height={6} />
                    <div style={{ marginTop: 8, fontSize: 11, color: p.textFaint, lineHeight: 1.7 }}>
                      {m.topicos.map((t) => (
                        <div key={t.id} style={{ display: "flex", justifyContent: "space-between" }}>
                          <span>{t.nome}</span>
                          <span style={{ color: (prog[t.id] || 0) >= 80 ? p.green : (prog[t.id] || 0) >= 40 ? p.accent : p.textFaint, fontWeight: 600 }}>{prog[t.id] || 0}%</span>
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </Card>
        );
      })}
      {/* 🔥 FIREBASE: leitura de /students/{uid}/topicProgress */}
    </>
  );
}

/* aba Revisões espaçadas — moderador define intervalos e duração para tópicos concluídos */
function PerfilRevisoes({ aluno, revisoes, setRevisoes }) {
  const p = usePalette();
  const [criar, setCriar] = useState(false);
  const [form, setForm] = useState({ materiaId: "", topicoId: "", duracaoMin: 30, intervalos: "7,15,30" });
  const minhas = revisoes.filter((r) => r.alunoId === aluno.id);

  const salvar = () => {
    if (!form.topicoId) return;
    const mat = MATERIAS_FLAT.find((m) => m.id === form.materiaId);
    const top = topicosDaMateria(form.materiaId).find((t) => t.id === form.topicoId);
    const ints = form.intervalos.split(",").map((s) => parseInt(s.trim())).filter((n) => n > 0);
    const hoje = new Date();
    const sessoes = ints.map((d) => {
      const dt = new Date(hoje); dt.setDate(dt.getDate() + d);
      return { dia: dt.toISOString().slice(0, 10), status: "agendada" };
    });
    // 🔥 FIREBASE: addDoc em /students/{uid}/revisions
    setRevisoes([...revisoes, { id: "rv" + Date.now(), alunoId: aluno.id, topicoId: form.topicoId, materia: mat?.nome || "", topico: top?.nome || "", duracaoMin: +form.duracaoMin, intervalos: ints, concluidoEm: hoje.toISOString().slice(0, 10), sessoes }]);
    setForm({ materiaId: "", topicoId: "", duracaoMin: 30, intervalos: "7,15,30" });
    setCriar(false);
  };
  const excluir = (id) => setRevisoes(revisoes.filter((r) => r.id !== id));

  return (
    <>
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 16, flexWrap: "wrap", gap: 10 }}>
        <p style={{ fontSize: 13, color: p.textSoft, margin: 0, maxWidth: 540, lineHeight: 1.5 }}>
          Para cada tópico já dominado, defina <strong style={{ color: p.text }}>quanto tempo</strong> deve durar a revisão e <strong style={{ color: p.text }}>em quais dias</strong> ela deve voltar (intervalos em dias). O sistema agenda automaticamente.
        </p>
        <Btn icon={Plus} onClick={() => setCriar(true)}>Nova revisão</Btn>
      </div>

      {minhas.length === 0 ? (
        <Empty icon={RefreshCw} title="Nenhuma revisão agendada" sub="Crie a primeira revisão espaçada para este aluno." />
      ) : (
        minhas.map((r) => (
          <Card key={r.id} pad={16} style={{ marginBottom: 12 }}>
            <div style={{ display: "flex", alignItems: "center", gap: 12 }}>
              <div style={{ width: 42, height: 42, borderRadius: 11, background: p.accent + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
                <RefreshCw size={19} color={p.accent} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ fontSize: 14.5, fontWeight: 700, color: p.text }}>{r.materia} · {r.topico}</div>
                <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 2 }}>
                  {r.duracaoMin} min por sessão · intervalos de {r.intervalos.join(", ")} dias
                </div>
              </div>
              <button onClick={() => excluir(r.id)} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4 }}><Trash2 size={15} /></button>
            </div>
            <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 12, paddingTop: 12, borderTop: "1px solid " + p.border }}>
              {r.sessoes.map((s, i) => (
                <span key={i} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 7, background: s.status === "concluida" ? p.green + "1f" : p.surface2, color: s.status === "concluida" ? p.green : p.textSoft, border: "1px solid " + (s.status === "concluida" ? p.green + "44" : p.border), fontWeight: 600 }}>
                  {s.dia.split("-").reverse().slice(0, 2).join("/")} {s.status === "concluida" ? "✓" : ""}
                </span>
              ))}
            </div>
          </Card>
        ))
      )}

      <Modal open={criar} onClose={() => setCriar(false)} title="Nova revisão espaçada">
        <MateriaTopicoSelect value={{ materia: form.materiaId, topico: form.topicoId }} onChange={(v) => setForm({ ...form, materiaId: v.materia, topicoId: v.topico })} />
        <Field label="Duração de cada sessão (min)"><Input type="number" min={5} step={5} value={form.duracaoMin} onChange={(e) => setForm({ ...form, duracaoMin: e.target.value })} /></Field>
        <Field label="Intervalos em dias (separados por vírgula)">
          <Input value={form.intervalos} onChange={(e) => setForm({ ...form, intervalos: e.target.value })} placeholder="Ex: 7, 15, 30" />
        </Field>
        <p style={{ fontSize: 12, color: p.textFaint, lineHeight: 1.5, marginBottom: 14 }}>
          ⓘ Padrão recomendado: <code style={{ color: p.accent }}>7, 15, 30</code> — a primeira revisão acontece 7 dias após a conclusão, a segunda 15 e a terceira 30.
        </p>
        <Btn onClick={salvar} style={{ width: "100%" }} icon={Save} disabled={!form.topicoId}>Agendar revisões</Btn>
      </Modal>
      {/* 🔥 FIREBASE: salvar em /students/{uid}/revisions e gerar metas automáticas */}
    </>
  );
}

/* aba Histórico de Replanejamentos */
function PerfilHistorico({ aluno, historicoReplan }) {
  const p = usePalette();
  // No mock o histórico é global; na versão real virá filtrado por aluno.
  // 🔥 FIREBASE: /students/{uid}/replanLog
  if (!historicoReplan || historicoReplan.length === 0) {
    return <Empty icon={Clock4} title="Sem replanejamentos" sub="Quando o aluno usar o botão 🔄, os recálculos aparecem aqui." />;
  }
  return (
    <>
      <p style={{ fontSize: 13, color: p.textSoft, marginTop: 0, marginBottom: 16 }}>Cada vez que {aluno.nome} usa o botão de replanejamento, fica um registro aqui.</p>
      <Card pad={0}>
        {historicoReplan.map((h, i) => (
          <div key={h.id} style={{ display: "flex", alignItems: "center", gap: 14, padding: "14px 18px", borderBottom: i < historicoReplan.length - 1 ? "1px solid " + p.border : "none" }}>
            <div style={{ width: 40, height: 40, borderRadius: 11, background: p.accent + "1f", display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}>
              <RefreshCw size={18} color={p.accent} />
            </div>
            <div style={{ flex: 1, minWidth: 0 }}>
              <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>{fmtMin(h.totalRealocado)} replanejados</div>
              <div style={{ fontSize: 12, color: p.textSoft, marginTop: 2 }}>{h.materiasFundidas} blocos fundidos · {h.qtdPendencias} matérias com pendência</div>
            </div>
            <span style={{ fontSize: 12, color: p.textFaint }}>{h.data}</span>
          </div>
        ))}
      </Card>
    </>
  );
}

/* aba Anotações Privadas do Moderador (só ele vê) */
function PerfilAnotacoes({ aluno, anotacoesMod, setAnotacoesMod }) {
  const p = usePalette();
  const [texto, setTexto] = useState("");
  const lista = anotacoesMod[aluno.id] || [];

  const adicionar = () => {
    if (!texto.trim()) return;
    // 🔥 FIREBASE: addDoc em /students/{uid}/moderatorNotes (regras: só moderador)
    const nova = { id: "an" + Date.now(), texto: texto.trim(), data: new Date().toISOString().slice(0, 10) };
    setAnotacoesMod({ ...anotacoesMod, [aluno.id]: [nova, ...lista] });
    setTexto("");
  };
  const excluir = (id) => {
    setAnotacoesMod({ ...anotacoesMod, [aluno.id]: lista.filter((a) => a.id !== id) });
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", marginBottom: 16, borderRadius: 11, background: p.accent + "12", border: "1px solid " + p.accent + "33" }}>
        <Lock size={14} color={p.accent} />
        <span style={{ fontSize: 12.5, color: p.textSoft }}>Estas anotações são <strong style={{ color: p.text }}>visíveis apenas para você</strong>. {aluno.nome.split(" ")[0]} não tem acesso.</span>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Anote algo sobre ${aluno.nome}...`} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <Btn icon={Plus} onClick={adicionar} disabled={!texto.trim()}>Adicionar anotação</Btn>
        </div>
      </Card>
      {lista.length === 0 ? (
        <Empty icon={NotebookPen} title="Sem anotações" sub="Use este espaço como um diário privado sobre o aluno." />
      ) : (
        lista.map((a) => (
          <Card key={a.id} pad={14} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: p.text, lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 }}>{a.texto}</p>
              <button onClick={() => excluir(a.id)} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ fontSize: 11, color: p.textFaint, marginTop: 8 }}>{a.data}</div>
          </Card>
        ))
      )}
    </>
  );
}

/* aba Recados — moderador envia recados ao aluno (aparecem no Dashboard dele) */
function PerfilRecados({ aluno, recadosPorAluno, setRecadosPorAluno }) {
  const p = usePalette();
  const [texto, setTexto] = useState("");
  const lista = recadosPorAluno[aluno.id] || [];

  const enviar = () => {
    if (!texto.trim()) return;
    // 🔥 FIREBASE: addDoc em /students/{uid}/messages
    const novo = { id: "rec" + Date.now(), texto: texto.trim(), data: new Date().toISOString().slice(0, 10) };
    setRecadosPorAluno({ ...recadosPorAluno, [aluno.id]: [novo, ...lista] });
    setTexto("");
  };
  const excluir = (id) => {
    setRecadosPorAluno({ ...recadosPorAluno, [aluno.id]: lista.filter((r) => r.id !== id) });
  };

  return (
    <>
      <div style={{ display: "flex", alignItems: "center", gap: 9, padding: "10px 13px", marginBottom: 16, borderRadius: 11, background: "#3b82f6" + "12", border: "1px solid " + "#3b82f6" + "33" }}>
        <Mail size={14} color="#3b82f6" />
        <span style={{ fontSize: 12.5, color: p.textSoft }}>Os recados aparecem como notificação no Dashboard de {aluno.nome.split(" ")[0]}.</span>
      </div>
      <Card style={{ marginBottom: 16 }}>
        <Textarea rows={3} value={texto} onChange={(e) => setTexto(e.target.value)} placeholder={`Escreva um recado para ${aluno.nome}...`} />
        <div style={{ display: "flex", justifyContent: "flex-end", marginTop: 10 }}>
          <Btn icon={Mail} onClick={enviar} disabled={!texto.trim()}>Enviar recado</Btn>
        </div>
      </Card>
      {lista.length === 0 ? (
        <Empty icon={Mail} title="Sem recados enviados" sub="Envie um recado motivacional ou um aviso." />
      ) : (
        lista.map((r) => (
          <Card key={r.id} pad={14} style={{ marginBottom: 10 }}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", gap: 10 }}>
              <p style={{ margin: 0, fontSize: 13.5, color: p.text, lineHeight: 1.6, whiteSpace: "pre-wrap", flex: 1 }}>{r.texto}</p>
              <button onClick={() => excluir(r.id)} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4, flexShrink: 0 }}><Trash2 size={14} /></button>
            </div>
            <div style={{ fontSize: 11, color: p.textFaint, marginTop: 8 }}>Enviado em {r.data}</div>
          </Card>
        ))
      )}
    </>
  );
}

function MiniStat({ label, value }) {
  const p = usePalette();
  return <div style={{ textAlign: "center" }} className="mini-stat"><div style={{ fontSize: 16, fontWeight: 800, color: p.text }}>{value}</div><div style={{ fontSize: 10.5, color: p.textFaint }}>{label}</div></div>;
}

/* ---- 2. PLANO DE ESTUDOS (estrutura universal) --------------------------- */
function ModPlano({ plano, setPlano }) {
  const p = usePalette();
  const [openArea, setOpenArea] = useState(plano[0]?.id);
  const [editar, setEditar] = useState(null); // { areaId, materiaId, topico }

  // aplica uma mutação imutável num tópico específico
  const salvarTopico = (areaId, materiaId, topicoId, dados) => {
    // 🔥 FIREBASE: update em /studyPlan/.../topicos/{topicoId} (nome + carga + subs)
    setPlano(plano.map((a) => a.id !== areaId ? a : {
      ...a, materias: a.materias.map((m) => m.id !== materiaId ? m : {
        ...m, topicos: m.topicos.map((t) => t.id !== topicoId ? t : { ...t, ...dados })
      })
    }));
  };
  // adiciona um novo tópico vazio a uma matéria
  const addTopico = (areaId, materiaId, nome) => {
    const novo = { id: "t" + Date.now(), nome: nome || "Novo tópico", carga: 360, subs: [] };
    // 🔥 FIREBASE: addDoc em /studyPlan/{area}/materias/{materia}/topicos
    setPlano(plano.map((a) => a.id !== areaId ? a : {
      ...a, materias: a.materias.map((m) => m.id !== materiaId ? m : { ...m, topicos: [...m.topicos, novo] })
    }));
  };
  // remove um tópico
  const remTopico = (areaId, materiaId, topicoId) => {
    // 🔥 FIREBASE: deleteDoc do tópico
    setPlano(plano.map((a) => a.id !== areaId ? a : {
      ...a, materias: a.materias.map((m) => m.id !== materiaId ? m : { ...m, topicos: m.topicos.filter((t) => t.id !== topicoId) })
    }));
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={ListChecks} title="Plano de Estudos" subtitle="Estrutura universal — edite a carga horária e os subtópicos de cada tópico"
        right={<Btn icon={Plus} variant="soft">Nova matéria</Btn>} />
      {plano.map((area) => {
        const aberto = openArea === area.id;
        return (
          <Card key={area.id} pad={0} style={{ marginBottom: 12, overflow: "hidden" }}>
            <button onClick={() => setOpenArea(aberto ? null : area.id)} style={{ width: "100%", display: "flex", alignItems: "center", gap: 12, padding: "16px 18px", background: "transparent", border: "none", cursor: "pointer" }}>
              <div style={{ width: 10, height: 10, borderRadius: 3, background: area.cor }} />
              <span style={{ flex: 1, textAlign: "left", fontSize: 16, fontWeight: 800, color: p.text }}>{area.nome}</span>
              <span style={{ fontSize: 12, color: p.textFaint }}>{area.materias.length} matérias</span>
              {aberto ? <ChevronDown size={18} color={p.textSoft} /> : <ChevronRight size={18} color={p.textSoft} />}
            </button>
            {aberto && (
              <div style={{ padding: "0 18px 18px" }}>
                {area.materias.map((m) => (
                  <div key={m.id} style={{ marginBottom: 14, paddingLeft: 22, borderLeft: "2px solid " + area.cor + "44" }}>
                    <div style={{ fontSize: 14.5, fontWeight: 700, color: p.text, marginBottom: 8 }}>{m.nome}</div>
                    {m.topicos.map((t) => (
                      <div key={t.id} style={{ background: p.surface2, borderRadius: 10, padding: "10px 13px", marginBottom: 7 }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                          <span style={{ fontSize: 13.5, fontWeight: 600, color: p.text }}>{t.nome}</span>
                          <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
                            <Badge soft color={p.accent}>{Math.round(t.carga / 60)}h total</Badge>
                            <button onClick={() => setEditar({ areaId: area.id, materiaId: m.id, topico: t })} title="Editar tópico"
                              style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", padding: 3, display: "flex" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = p.accent}
                              onMouseLeave={(e) => e.currentTarget.style.color = p.textSoft}>
                              <Pencil size={14} />
                            </button>
                            <button onClick={() => remTopico(area.id, m.id, t.id)} title="Excluir tópico"
                              style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", padding: 3, display: "flex" }}
                              onMouseEnter={(e) => e.currentTarget.style.color = p.danger}
                              onMouseLeave={(e) => e.currentTarget.style.color = p.textSoft}>
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </div>
                        <div style={{ display: "flex", gap: 6, flexWrap: "wrap", marginTop: 8 }}>
                          {t.subs.map((s) => <span key={s} style={{ fontSize: 11.5, padding: "3px 9px", borderRadius: 7, background: p.surface, border: "1px solid " + p.border, color: p.textSoft }}>{s}</span>)}
                          {t.subs.length === 0 && <span style={{ fontSize: 11.5, color: p.textFaint, fontStyle: "italic" }}>sem subtópicos</span>}
                        </div>
                      </div>
                    ))}
                    <button onClick={() => addTopico(area.id, m.id)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: "transparent", border: "1px dashed " + p.border, color: p.textSoft, fontSize: 12.5, fontWeight: 600, cursor: "pointer", marginTop: 2 }}
                      onMouseEnter={(e) => { e.currentTarget.style.borderColor = area.cor; e.currentTarget.style.color = area.cor; }}
                      onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.color = p.textSoft; }}>
                      <Plus size={13} /> Adicionar tópico em {m.nome}
                    </button>
                  </div>
                ))}
              </div>
            )}
          </Card>
        );
      })}

      {/* MODAL editar tópico: carga horária + subtópicos */}
      <EditarTopicoModal
        edit={editar}
        onClose={() => setEditar(null)}
        onSave={(dados) => { salvarTopico(editar.areaId, editar.materiaId, editar.topico.id, dados); setEditar(null); }}
      />
    </div>
  );
}

/* Modal de edição de um tópico: ajusta horas totais e gerencia subtópicos */
function EditarTopicoModal({ edit, onClose, onSave }) {
  const p = usePalette();
  const [nome, setNome] = useState("");
  const [horas, setHoras] = useState(6);
  const [minutos, setMinutos] = useState(0);
  const [subs, setSubs] = useState([]);
  const [novoSub, setNovoSub] = useState("");

  // sincroniza ao abrir
  useEffect(() => {
    if (edit) {
      setNome(edit.topico.nome);
      setHoras(Math.floor(edit.topico.carga / 60));
      setMinutos(edit.topico.carga % 60);
      setSubs([...edit.topico.subs]); setNovoSub("");
    }
  }, [edit]);

  if (!edit) return null;
  const addSub = () => { const v = novoSub.trim(); if (!v) return; setSubs([...subs, v]); setNovoSub(""); };
  const remSub = (i) => setSubs(subs.filter((_, idx) => idx !== i));
  const editSub = (i, v) => setSubs(subs.map((s, idx) => idx === i ? v : s));
  const cargaTotal = Math.max(15, (parseInt(horas) || 0) * 60 + (parseInt(minutos) || 0));

  return (
    <Modal open={!!edit} onClose={onClose} title={"Editar · " + edit.topico.nome} width={500}>
      <Field label="Nome do tópico"><Input value={nome} onChange={(e) => setNome(e.target.value)} /></Field>
      <Field label="Carga horária total">
        <div style={{ display: "flex", alignItems: "center", gap: 8 }}>
          <Input type="number" min={0} value={horas} onChange={(e) => setHoras(+e.target.value)} style={{ width: 80 }} />
          <span style={{ fontSize: 13, color: p.textSoft, fontWeight: 600 }}>h</span>
          <Input type="number" min={0} max={59} step={15} value={minutos} onChange={(e) => setMinutos(+e.target.value)} style={{ width: 80 }} />
          <span style={{ fontSize: 13, color: p.textSoft, fontWeight: 600 }}>min</span>
          <span style={{ fontSize: 12.5, color: p.textFaint, marginLeft: "auto" }}>total: {fmtMin(cargaTotal)}</span>
        </div>
      </Field>
      <div style={{ fontSize: 12.5, fontWeight: 600, color: p.textSoft, marginBottom: 8 }}>Subtópicos (guia de estudos)</div>
      <div style={{ marginBottom: 12 }}>
        {subs.map((s, i) => (
          <div key={i} style={{ display: "flex", alignItems: "center", gap: 8, marginBottom: 7 }}>
            <span style={{ fontSize: 12, color: p.textFaint, width: 18, textAlign: "center" }}>{i + 1}</span>
            <Input value={s} onChange={(e) => editSub(i, e.target.value)} style={{ flex: 1 }} />
            <button onClick={() => remSub(i)} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4, display: "flex" }}><Trash2 size={15} /></button>
          </div>
        ))}
        {subs.length === 0 && <p style={{ fontSize: 12.5, color: p.textFaint, fontStyle: "italic", margin: "0 0 8px" }}>Nenhum subtópico ainda.</p>}
      </div>
      <div style={{ display: "flex", gap: 8, marginBottom: 18 }}>
        <Input value={novoSub} onChange={(e) => setNovoSub(e.target.value)} placeholder="Novo subtópico..." onKeyDown={(e) => e.key === "Enter" && addSub()} style={{ flex: 1 }} />
        <Btn variant="outline" icon={Plus} onClick={addSub}>Adicionar</Btn>
      </div>
      <Btn onClick={() => onSave({ nome: nome.trim() || edit.topico.nome, carga: cargaTotal, subs: subs.filter((s) => s.trim()) })} style={{ width: "100%" }} icon={Save}>Salvar tópico</Btn>
    </Modal>
  );
}


/* ---- 4. SIMULADOS (moderador) -------------------------------------------- */
function ModSimulados({ simulados, setSimulados }) {
  const p = usePalette();
  const [up, setUp] = useState(false);
  const [form, setForm] = useState({ nome: "", vestibular: "ENEM", ano: "2024", area: "Geral" });
  const [questao, setQuestao] = useState({ num: "", materiaId: "", topicoId: "", gabarito: "A" });
  const [questoesTmp, setQuestoesTmp] = useState([]);

  const addQ = () => {
    if (!questao.num) return;
    const mat = MATERIAS_FLAT.find((m) => m.id === questao.materiaId);
    const top = topicosDaMateria(questao.materiaId).find((t) => t.id === questao.topicoId);
    setQuestoesTmp([...questoesTmp, { num: +questao.num, materia: mat ? mat.nome : "", materiaId: questao.materiaId, topico: top ? top.nome : "", topicoId: questao.topicoId, gabarito: questao.gabarito }]);
    setQuestao({ num: "", materiaId: "", topicoId: "", gabarito: "A" });
  };
  const salvar = () => {
    // 🔥 FIREBASE Storage: upload do PDF + 🔥 Firestore: /exams com as questões classificadas
    setSimulados([{ id: Date.now() + "", ...form, questoes: questoesTmp }, ...simulados]);
    setForm({ nome: "", vestibular: "ENEM", ano: "2024", area: "Geral" }); setQuestoesTmp([]); setUp(false);
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={FileText} title="Simulados" subtitle="Upload de provas e classificação de questões"
        right={<Btn icon={UploadCloud} onClick={() => setUp(true)}>Novo simulado</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(260px,1fr))", gap: 14 }}>
        {simulados.map((s) => (
          <Card key={s.id} pad={18}>
            <div style={{ display: "flex", justifyContent: "space-between", marginBottom: 10 }}>
              <Badge soft color={p.accent}>{s.vestibular}</Badge>
              <div style={{ display: "flex", gap: 4 }}>
                <button style={{ background: "none", border: "none", color: p.textFaint, cursor: "pointer" }}><Pencil size={15} /></button>
                <button onClick={() => setSimulados(simulados.filter((x) => x.id !== s.id))} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
              </div>
            </div>
            <h4 style={{ margin: "0 0 6px", fontSize: 16, fontWeight: 700, color: p.text }}>{s.nome}</h4>
            <p style={{ margin: 0, fontSize: 12.5, color: p.textSoft }}>{s.ano} · {s.area} · {s.questoes.length} questões classificadas</p>
          </Card>
        ))}
      </div>

      <Modal open={up} onClose={() => setUp(false)} title="Novo simulado" width={560}>
        <div style={{ border: "2px dashed " + p.border, borderRadius: 14, padding: 24, textAlign: "center", marginBottom: 18, cursor: "pointer" }}>
          <UploadCloud size={32} color={p.accent} style={{ marginBottom: 8 }} />
          <div style={{ fontSize: 13.5, fontWeight: 600, color: p.text }}>Arraste o PDF da prova ou clique</div>
          <div style={{ fontSize: 12, color: p.textFaint, marginTop: 3 }}>🔥 Upload para Firebase Storage</div>
        </div>
        <div style={{ display: "grid", gridTemplateColumns: "2fr 1fr 1fr", gap: 10 }}>
          <Field label="Nome"><Input value={form.nome} onChange={(e) => setForm({ ...form, nome: e.target.value })} placeholder="ENEM 2024 - Dia 1" /></Field>
          <Field label="Vestibular"><Select value={form.vestibular} onChange={(e) => setForm({ ...form, vestibular: e.target.value })}><option>ENEM</option><option>FUVEST</option><option>UNICAMP</option></Select></Field>
          <Field label="Ano"><Input value={form.ano} onChange={(e) => setForm({ ...form, ano: e.target.value })} /></Field>
        </div>

        <div style={{ borderTop: "1px solid " + p.border, paddingTop: 16, marginTop: 6 }}>
          <h4 style={{ margin: "0 0 12px", fontSize: 14, fontWeight: 700, color: p.text }}>Classificar questões</h4>
          <div style={{ display: "grid", gridTemplateColumns: "54px 1fr 1fr 62px auto", gap: 8, alignItems: "end" }}>
            <Field label="Nº"><Input value={questao.num} onChange={(e) => setQuestao({ ...questao, num: e.target.value })} /></Field>
            <Field label="Matéria"><Select value={questao.materiaId} onChange={(e) => setQuestao({ ...questao, materiaId: e.target.value, topicoId: "" })}><option value="">—</option>{MATERIAS_FLAT.map((m) => <option key={m.id} value={m.id}>{m.nome}</option>)}</Select></Field>
            <Field label="Tópico"><Select value={questao.topicoId} onChange={(e) => setQuestao({ ...questao, topicoId: e.target.value })} disabled={!questao.materiaId} style={{ opacity: questao.materiaId ? 1 : .5 }}><option value="">—</option>{topicosDaMateria(questao.materiaId).map((t) => <option key={t.id} value={t.id}>{t.nome}</option>)}</Select></Field>
            <Field label="Gab."><Select value={questao.gabarito} onChange={(e) => setQuestao({ ...questao, gabarito: e.target.value })}>{["A", "B", "C", "D", "E"].map((x) => <option key={x}>{x}</option>)}</Select></Field>
            <Btn size="sm" icon={Plus} onClick={addQ} style={{ marginBottom: 14 }}>Add</Btn>
          </div>
          {questoesTmp.length > 0 && (
            <div style={{ background: p.surface2, borderRadius: 10, padding: 10, marginBottom: 14, maxHeight: 140, overflowY: "auto" }}>
              {questoesTmp.map((q, i) => (
                <div key={i} style={{ display: "flex", justifyContent: "space-between", fontSize: 12.5, padding: "4px 0", color: p.text }}>
                  <span>Q{q.num} · {q.materia || "—"} · {q.topico || "—"}</span>
                  <span style={{ color: p.accent, fontWeight: 700 }}>Gab: {q.gabarito}</span>
                </div>
              ))}
            </div>
          )}
        </div>
        <Btn onClick={salvar} style={{ width: "100%" }} icon={Save}>Salvar simulado ({questoesTmp.length} questões)</Btn>
      </Modal>
    </div>
  );
}

/* ---- 5. MATERIAIS (moderador) -------------------------------------------- */
function ModMateriais({ materiais, setMateriais, alunos }) {
  const p = usePalette();
  const [up, setUp] = useState(false);
  const [form, setForm] = useState({ titulo: "", vestibular: "FUVEST", area: "Matemática", materia: "Álgebra", para: "todos" });

  const salvar = () => {
    // 🔥 FIREBASE Storage: upload do PDF + 🔥 Firestore: /materials (com visibilidade)
    const cor = AREAS.find((a) => a.nome === form.area)?.cor || p.accent;
    setMateriais([{ id: Date.now() + "", ...form, cor }, ...materiais]);
    setForm({ titulo: "", vestibular: "FUVEST", area: "Matemática", materia: "Álgebra", para: "todos" }); setUp(false);
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Library} title="Materiais" subtitle="Livros e apostilas em PDF"
        right={<Btn icon={UploadCloud} onClick={() => setUp(true)}>Novo material</Btn>} />
      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(220px,1fr))", gap: 14 }}>
        {materiais.map((m) => (
          <Card key={m.id} pad={16}>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", marginBottom: 8 }}>
              <Badge soft color={m.cor}>{m.materia}</Badge>
              <button onClick={() => setMateriais(materiais.filter((x) => x.id !== m.id))} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
            </div>
            <h4 style={{ margin: "4px 0", fontSize: 14.5, fontWeight: 700, color: p.text }}>{m.titulo}</h4>
            <p style={{ margin: 0, fontSize: 12, color: p.textFaint }}>{m.vestibular} · {m.area}</p>
            <div style={{ marginTop: 8, fontSize: 11.5, color: p.textSoft }}>{m.para === "todos" ? "👥 Todos os alunos" : "👤 Alunos específicos"}</div>
          </Card>
        ))}
      </div>

      <Modal open={up} onClose={() => setUp(false)} title="Novo material">
        <div style={{ border: "2px dashed " + p.border, borderRadius: 14, padding: 22, textAlign: "center", marginBottom: 16, cursor: "pointer" }}>
          <UploadCloud size={30} color={p.accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>Upload do PDF</div>
          <div style={{ fontSize: 11.5, color: p.textFaint }}>🔥 Firebase Storage</div>
        </div>
        <Field label="Título"><Input value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Apostila de Funções" /></Field>
        <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
          <Field label="Vestibular"><Select value={form.vestibular} onChange={(e) => setForm({ ...form, vestibular: e.target.value })}><option>FUVEST</option><option>UNICAMP</option><option>ENEM</option></Select></Field>
          <Field label="Área"><Select value={form.area} onChange={(e) => setForm({ ...form, area: e.target.value })}>{AREAS.map((a) => <option key={a.id}>{a.nome}</option>)}</Select></Field>
        </div>
        <Field label="Matéria"><Input value={form.materia} onChange={(e) => setForm({ ...form, materia: e.target.value })} /></Field>
        <Field label="Disponibilizar para">
          <div style={{ display: "flex", gap: 10 }}>
            <button onClick={() => setForm({ ...form, para: "todos" })} style={{ flex: 1, padding: 11, borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, border: "1px solid " + (form.para === "todos" ? p.accent : p.border), background: form.para === "todos" ? p.accent + "1f" : "transparent", color: form.para === "todos" ? p.accent : p.textSoft }}>Todos os alunos</button>
            <button onClick={() => setForm({ ...form, para: "especificos" })} style={{ flex: 1, padding: 11, borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, border: "1px solid " + (form.para === "especificos" ? p.accent : p.border), background: form.para === "especificos" ? p.accent + "1f" : "transparent", color: form.para === "especificos" ? p.accent : p.textSoft }}>Específicos</button>
          </div>
        </Field>
        {form.para === "especificos" && (
          <div style={{ background: p.surface2, borderRadius: 10, padding: 10, marginBottom: 14 }}>
            {alunos.map((a) => <label key={a.id} style={{ display: "flex", alignItems: "center", gap: 8, padding: "5px 0", fontSize: 13, color: p.text, cursor: "pointer" }}><input type="checkbox" /> {a.nome}</label>)}
          </div>
        )}
        <Btn onClick={salvar} style={{ width: "100%" }} icon={Save}>Salvar material</Btn>
      </Modal>
    </div>
  );
}

/* ---- 6. EDITAR BOAS-VINDAS (moderador) ----------------------------------- */
function ModBoasVindas({ welcome, setWelcome }) {
  const p = usePalette();
  const [draft, setDraft] = useState(welcome);
  const [salvo, setSalvo] = useState(false);
  const dragItem = useRef(null);
  const dragOver = useRef(null);

  const salvar = () => { /* 🔥 FIREBASE: salvar /config/welcome + fotos no Storage */ setWelcome(draft); setSalvo(true); setTimeout(() => setSalvo(false), 2000); };

  const setHero = (campo, valor) => setDraft((prev) => ({ ...prev, hero: { ...prev.hero, [campo]: valor } }));
  const setBloco = (id, dados) => setDraft((prev) => ({ ...prev, blocos: prev.blocos.map((b) => b.id === id ? { ...b, ...dados } : b) }));
  const remBloco = (id) => setDraft((prev) => ({ ...prev, blocos: prev.blocos.filter((b) => b.id !== id) }));
  const addBloco = (tipo) => {
    const base = { id: "b" + Date.now(), tipo };
    if (tipo === "titulo") base.texto = "Novo título";
    if (tipo === "texto") base.texto = "Escreva aqui...";
    if (tipo === "foto") base.url = "";
    if (tipo === "destaque") base.itens = [{ valor: "100%", label: "destaque" }];
    setDraft((prev) => ({ ...prev, blocos: [...prev.blocos, base] }));
  };
  const onDrop = () => {
    const from = dragItem.current, to = dragOver.current;
    if (from == null || to == null || from === to) return;
    setDraft((prev) => {
      const list = [...prev.blocos];
      const [moved] = list.splice(from, 1);
      list.splice(to, 0, moved);
      return { ...prev, blocos: list };
    });
    dragItem.current = null; dragOver.current = null;
  };

  // upload local → dataURL (preview). 🔥 FIREBASE: trocar por upload no Storage.
  const lerArquivo = (file, cb) => { const r = new FileReader(); r.onload = () => cb(r.result); r.readAsDataURL(file); };

  const tiposBloco = [
    { tipo: "titulo", label: "Título", icon: Pencil },
    { tipo: "texto", label: "Texto", icon: NotebookPen },
    { tipo: "foto", label: "Foto", icon: ImageIcon },
    { tipo: "destaque", label: "Destaques", icon: Sparkles },
    { tipo: "divisor", label: "Divisor", icon: Minus },
  ];

  const pendente = JSON.stringify(draft) !== JSON.stringify(welcome);

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={Settings2} title="Página de Boas-Vindas" subtitle="Monte a página com blocos — arraste para reordenar"
        right={
          <div style={{ display: "flex", alignItems: "center", gap: 10 }}>
            {pendente && !salvo && (
              <span style={{ fontSize: 12, color: p.accent, fontWeight: 600, display: "flex", alignItems: "center", gap: 5 }}>
                <div style={{ width: 7, height: 7, borderRadius: 99, background: p.accent }} /> Alterações não salvas
              </span>
            )}
            <Btn icon={Save} onClick={salvar} variant={pendente && !salvo ? "primary" : "soft"}>
              {salvo ? "Publicado ✓" : "Salvar e publicar"}
            </Btn>
          </div>
        } />

      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 18 }} className="chart-grid">
        {/* COLUNA EDITOR */}
        <div>
          {/* editor do hero */}
          <Card style={{ marginBottom: 16 }}>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.textSoft, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 14 }}>Cabeçalho</div>
            <div style={{ display: "flex", gap: 14, marginBottom: 14, alignItems: "center" }}>
              <div style={{ width: 72, height: 72, borderRadius: 16, background: (draft.hero.cor || p.accent) + "22", display: "flex", alignItems: "center", justifyContent: "center", overflow: "hidden", flexShrink: 0 }}>
                {draft.hero.foto ? <img src={draft.hero.foto} alt="" style={{ width: "100%", height: "100%", objectFit: "cover" }} /> : <User size={32} color={draft.hero.cor || p.accent} />}
              </div>
              <div style={{ flex: 1 }}>
                <Field label="Foto (cole uma URL)"><Input value={typeof draft.hero.foto === "string" && draft.hero.foto?.startsWith("http") ? draft.hero.foto : ""} onChange={(e) => setHero("foto", e.target.value)} placeholder="https://..." /></Field>
                <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "7px 12px", borderRadius: 9, background: p.surface2, border: "1px solid " + p.border, color: p.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer" }}>
                  <UploadCloud size={14} /> Enviar do computador
                  <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && lerArquivo(e.target.files[0], (d) => setHero("foto", d))} />
                </label>
              </div>
            </div>
            <Field label="Nome do instrutor"><Input value={draft.hero.nome} onChange={(e) => setHero("nome", e.target.value)} /></Field>
            <Field label="Subtítulo"><Textarea rows={2} value={draft.hero.subtitulo} onChange={(e) => setHero("subtitulo", e.target.value)} /></Field>
            <Field label="Cor de destaque">
              <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
                {["#f97316", "#ef4444", "#3b82f6", "#22c55e", "#a855f7", "#14b8a6", "#eab308"].map((c) => (
                  <button key={c} onClick={() => setHero("cor", c)} style={{ width: 30, height: 30, borderRadius: 8, background: c, border: draft.hero.cor === c ? "3px solid " + p.text : "2px solid " + p.border, cursor: "pointer" }} />
                ))}
              </div>
            </Field>
          </Card>

          {/* blocos */}
          <div style={{ fontSize: 12, fontWeight: 700, color: p.textSoft, textTransform: "uppercase", letterSpacing: ".05em", marginBottom: 10 }}>Blocos de conteúdo</div>
          {draft.blocos.map((b, idx) => (
            <div key={b.id} draggable
              onDragStart={() => (dragItem.current = idx)}
              onDragEnter={() => (dragOver.current = idx)}
              onDragEnd={onDrop}
              onDragOver={(e) => e.preventDefault()}
              style={{ display: "flex", gap: 10, alignItems: "flex-start", padding: 12, marginBottom: 10, borderRadius: 12, background: p.surface, border: "1px solid " + p.border }}>
              <div style={{ cursor: "grab", color: p.textFaint, paddingTop: 4 }} title="Arraste para reordenar"><GripVertical size={16} /></div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <BlocoEditor bloco={b} setBloco={setBloco} lerArquivo={lerArquivo} />
              </div>
              <button onClick={() => remBloco(b.id)} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4, display: "flex" }} title="Remover bloco"><Trash2 size={15} /></button>
            </div>
          ))}

          {/* paleta adicionar bloco */}
          <div style={{ display: "flex", gap: 7, flexWrap: "wrap", marginTop: 6, padding: 12, borderRadius: 12, border: "1px dashed " + p.border }}>
            <span style={{ fontSize: 12.5, color: p.textFaint, alignSelf: "center", marginRight: 4 }}>Adicionar:</span>
            {tiposBloco.map((t) => (
              <button key={t.tipo} onClick={() => addBloco(t.tipo)} style={{ display: "inline-flex", alignItems: "center", gap: 6, padding: "7px 12px", borderRadius: 9, background: p.surface2, border: "1px solid " + p.border, color: p.text, fontSize: 12.5, fontWeight: 600, cursor: "pointer", transition: "all .15s" }}
                onMouseEnter={(e) => { e.currentTarget.style.borderColor = p.accent; e.currentTarget.style.color = p.accent; }}
                onMouseLeave={(e) => { e.currentTarget.style.borderColor = p.border; e.currentTarget.style.color = p.text; }}>
                <t.icon size={14} /> {t.label}
              </button>
            ))}
          </div>
        </div>

        {/* COLUNA PRÉ-VISUALIZAÇÃO */}
        <div>
          <div style={{ fontSize: 12, fontWeight: 700, color: p.textSoft, marginBottom: 10, textTransform: "uppercase", letterSpacing: ".05em" }}>Pré-visualização ao vivo</div>
          <div style={{ position: "sticky", top: 76, transform: "scale(.9)", transformOrigin: "top center" }}>
            <WelcomePage welcome={draft} isStandalone />
          </div>
        </div>
      </div>
    </div>
  );
}

/* Editor inline de um bloco, conforme o tipo */
function BlocoEditor({ bloco, setBloco, lerArquivo }) {
  const p = usePalette();
  const tag = (txt) => <div style={{ fontSize: 10.5, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".06em", marginBottom: 6 }}>{txt}</div>;

  if (bloco.tipo === "titulo") return (<>{tag("Título")}<Input value={bloco.texto} onChange={(e) => setBloco(bloco.id, { texto: e.target.value })} /></>);
  if (bloco.tipo === "texto") return (<>{tag("Texto")}<Textarea rows={3} value={bloco.texto} onChange={(e) => setBloco(bloco.id, { texto: e.target.value })} /></>);
  if (bloco.tipo === "divisor") return tag("Divisor — linha separadora");
  if (bloco.tipo === "foto") return (
    <>
      {tag("Foto")}
      <Input value={bloco.url?.startsWith("http") ? bloco.url : ""} onChange={(e) => setBloco(bloco.id, { url: e.target.value })} placeholder="Cole a URL da imagem..." style={{ marginBottom: 8 }} />
      <label style={{ display: "inline-flex", alignItems: "center", gap: 7, padding: "6px 11px", borderRadius: 8, background: p.surface2, border: "1px solid " + p.border, color: p.text, fontSize: 12, fontWeight: 600, cursor: "pointer" }}>
        <UploadCloud size={13} /> Enviar do computador
        <input type="file" accept="image/*" style={{ display: "none" }} onChange={(e) => e.target.files[0] && lerArquivo(e.target.files[0], (d) => setBloco(bloco.id, { url: d }))} />
      </label>
    </>
  );
  if (bloco.tipo === "destaque") return (
    <>
      {tag("Destaques (números)")}
      {(bloco.itens || []).map((it, i) => (
        <div key={i} style={{ display: "flex", gap: 6, marginBottom: 6 }}>
          <Input value={it.valor} onChange={(e) => { const itens = [...bloco.itens]; itens[i] = { ...it, valor: e.target.value }; setBloco(bloco.id, { itens }); }} placeholder="98%" style={{ width: 80 }} />
          <Input value={it.label} onChange={(e) => { const itens = [...bloco.itens]; itens[i] = { ...it, label: e.target.value }; setBloco(bloco.id, { itens }); }} placeholder="aprovação" style={{ flex: 1 }} />
          <button onClick={() => setBloco(bloco.id, { itens: bloco.itens.filter((_, idx) => idx !== i) })} style={{ background: "none", border: "none", color: p.danger, cursor: "pointer", padding: 4 }}><Trash2 size={14} /></button>
        </div>
      ))}
      <button onClick={() => setBloco(bloco.id, { itens: [...(bloco.itens || []), { valor: "", label: "" }] })} style={{ display: "inline-flex", alignItems: "center", gap: 5, background: "none", border: "none", color: p.accent, cursor: "pointer", fontSize: 12.5, fontWeight: 600, padding: "2px 0" }}><Plus size={13} /> Adicionar número</button>
    </>
  );
  return null;
}

/* ============================================================================
   APP RAIZ — estado global mock + roteamento
   ========================================================================== */
// Página de boas-vindas como modelo de BLOCOS editáveis.
// hero = cabeçalho fixo (foto + nome + subtítulo). blocos = conteúdo livre.
// Tipos de bloco: "titulo" | "texto" | "foto" | "destaque" | "divisor"
// 🔥 FIREBASE: /config/welcome  (blocos no Firestore + imagens no Storage)
const WELCOME_INICIAL = {
  hero: {
    foto: null,
    nome: "Joca & Rossini",
    subtitulo: "Texto de exemplo: edite em Boas-Vindas, no painel do moderador.",
    cor: "#f97316",
  },
  blocos: [
    { id: "b1", tipo: "destaque", itens: [
      { valor: "+15", label: "anos de experiência" },
      { valor: "98%", label: "aprovação" },
      { valor: "24/7", label: "acesso" },
    ]},
    { id: "b2", tipo: "titulo", texto: "O curso & metodologia" },
    { id: "b3", tipo: "texto", texto: "Um método baseado em ciclos de estudo personalizados, repetição espaçada e acompanhamento contínuo de desempenho. Você não estuda mais — você estuda melhor, com metas diárias inteligentes que se adaptam à sua rotina." },
    { id: "b4", tipo: "divisor" },
    { id: "b5", tipo: "titulo", texto: "Como usar a plataforma" },
    { id: "b6", tipo: "texto", texto: "1. Configure sua disponibilidade semanal em Organização Pessoal.\n2. Acompanhe suas metas diárias no Dashboard.\n3. Registre questões resolvidas no Banco de Questões.\n4. Acompanhe sua evolução em Desempenho.\n5. Use os Simulados e Materiais sempre que precisar." },
  ],
};

const ALUNOS_INICIAIS = [
  { id: "alu1", nome: "Ana Beatriz", email: "aluno@curso.com", senha: "123", vestibular: "fuvest", metas: 142, questoes: 380, horas: 86, progresso: 47 },
  { id: "alu2", nome: "Carlos Eduardo", email: "carlos@curso.com", senha: "123", vestibular: "enem_med", metas: 98, questoes: 210, horas: 54, progresso: 32 },
  { id: "alu3", nome: "Mariana Lopes", email: "mariana@curso.com", senha: "123", vestibular: "unicamp", metas: 205, questoes: 512, horas: 120, progresso: 68 },
];

const SIMULADOS_INICIAIS = [
  { id: "s1", nome: "ENEM 2024 - 1º dia", vestibular: "ENEM", ano: "2024", area: "Linguagens e Humanas", questoes: [
    { num: 1, materia: "História", topico: "Era Vargas", gabarito: "C" },
    { num: 2, materia: "Geografia", topico: "Geopolítica", gabarito: "A" },
    { num: 3, materia: "Português", topico: "Interpretação", gabarito: "D" },
  ]},
  { id: "s2", nome: "FUVEST 2023 - 1ª fase", vestibular: "FUVEST", ano: "2023", area: "Geral", questoes: [
    { num: 1, materia: "Matemática", topico: "Funções", gabarito: "B" },
    { num: 2, materia: "Física", topico: "Mecânica", gabarito: "E" },
  ]},
  { id: "s3", nome: "UNICAMP 2024", vestibular: "UNICAMP", ano: "2024", area: "Exatas", questoes: [
    { num: 1, materia: "Química", topico: "Termoquímica", gabarito: "A" },
  ]},
];

const MATERIAIS_INICIAIS = [
  { id: "m1", titulo: "Apostila de Funções", vestibular: "FUVEST", area: "Matemática", materia: "Álgebra", para: "todos", cor: "#f97316" },
  { id: "m2", titulo: "Resumo de Mecânica", vestibular: "UNICAMP", area: "Naturais", materia: "Física", para: "todos", cor: "#22c55e" },
  { id: "m3", titulo: "Modernismo Brasileiro", vestibular: "FUVEST", area: "Linguagens", materia: "Literatura", para: "especificos", cor: "#3b82f6" },
  { id: "m4", titulo: "Era Vargas Completa", vestibular: "UNICAMP", area: "Humanas", materia: "História", para: "todos", cor: "#a855f7" },
];

const QUESTOES_INICIAIS = [
  { id: "q1", materia: "Matemática", materiaId: "algebra", topico: "Função quadrática", feitas: 20, acertos: 16, erros: 4, obs: "Lembrar de completar o quadrado", data: "2026-05-24" },
  { id: "q2", materia: "Física", materiaId: "fisica", topico: "Cinemática", feitas: 15, acertos: 8, erros: 7, obs: "Confundi MRU com MRUV", data: "2026-05-24" },
  { id: "q3", materia: "Biologia", materiaId: "biologia", topico: "Citologia", feitas: 12, acertos: 10, erros: 2, obs: "", data: "2026-05-25" },
  { id: "q4", materia: "Português", materiaId: "portugues", topico: "Regência", feitas: 18, acertos: 15, erros: 3, obs: "", data: "2026-05-25" },
  { id: "q5", materia: "Química", materiaId: "quimica", topico: "Termoquímica", feitas: 10, acertos: 5, erros: 5, obs: "Revisar entalpia", data: "2026-05-25" },
];

// Simulados enviados pelos alunos, aguardando classificação do moderador.
// 🔥 FIREBASE: /examSubmissions  (PDF no Storage + metadados no Firestore)
const ENVIOS_INICIAIS = [
  { id: "env1", alunoId: "alu1", alunoNome: "Ana Beatriz", nome: "Simulado ProENEM 03", modelo: "enem", arquivo: "proenem_03.pdf", data: "2026-05-26", status: "pendente" },
  { id: "env2", alunoId: "alu3", alunoNome: "Mariana Lopes", nome: "Revisão FUVEST caderno 2", modelo: "fuvest", arquivo: "fuvest_rev2.pdf", data: "2026-05-25", status: "pendente" },
];

// Progresso por tópico (% concluído) — por aluno e por topicoId
// 🔥 FIREBASE: /students/{uid}/topicProgress/{topicoId}
const PROGRESSO_INICIAL = {
  alu1: { h1: 80, h2: 45, g1: 60, p1: 70, l1: 30, r1: 55, a1: 75, ge1: 50, t1: 40, fi1: 65, qu1: 35, bi1: 90 },
  alu2: { h1: 30, p1: 50, a1: 40, fi1: 20, bi1: 25 },
  alu3: { h1: 95, h2: 70, g1: 85, p1: 90, l1: 80, a1: 85, ge1: 75, fi1: 88, qu1: 65, bi1: 100 },
};

// Revisões espaçadas: o moderador define os intervalos (em dias) e a duração
// para tópicos concluídos pelo aluno. O sistema agenda as sessões.
// 🔥 FIREBASE: /students/{uid}/revisions
const REVISOES_INICIAIS = [
  // tópico bi1 (Citologia) — Ana concluiu, intervalos 7/15/30 dias com 30min cada
  { id: "rv1", alunoId: "alu1", topicoId: "bi1", materia: "Biologia", topico: "Citologia", duracaoMin: 30, intervalos: [7, 15, 30], concluidoEm: "2026-05-15", sessoes: [
    { dia: "2026-05-22", status: "concluida" },
    { dia: "2026-05-30", status: "agendada" },
    { dia: "2026-06-14", status: "agendada" },
  ]},
  { id: "rv2", alunoId: "alu1", topicoId: "p1", materia: "Português", topico: "Sintaxe", duracaoMin: 45, intervalos: [7, 15, 30], concluidoEm: "2026-05-20", sessoes: [
    { dia: "2026-05-27", status: "agendada" },
    { dia: "2026-06-04", status: "agendada" },
    { dia: "2026-06-19", status: "agendada" },
  ]},
];

// Anotações privadas do moderador sobre cada aluno
// 🔥 FIREBASE: /students/{uid}/moderatorNotes  (regra: só moderador lê/escreve)
const ANOTACOES_INICIAIS = {
  alu1: [
    { id: "an1", texto: "Aluna muito dedicada. Forte em Biologia e Português. Precisa reforçar Química — sugiro revisão extra de Termoquímica.", data: "2026-05-20" },
  ],
  alu2: [],
  alu3: [
    { id: "an2", texto: "Excelente desempenho geral. Pronto para simulados de Medicina nas próximas semanas.", data: "2026-05-18" },
  ],
};

// Desempenho em simulados (acertos por matéria), por aluno → mock detalhado
// 🔥 FIREBASE: agregado de /students/{uid}/examResults
const DESEMPENHO_SIMULADOS_INICIAL = {
  alu1: {
    geral: [
      { nome: "ENEM 24 - D1", data: "2026-05-10", taxa: 71, acertos: 32, total: 45 },
      { nome: "FUVEST 23", data: "2026-05-17", taxa: 64, acertos: 58, total: 90 },
      { nome: "UNICAMP 24", data: "2026-05-24", taxa: 69, acertos: 48, total: 70 },
    ],
    porMateria: {
      "Matemática": 72, "Português": 81, "Física": 66, "Química": 54, "Biologia": 78, "História": 70, "Geografia": 68, "Inglês": 85, "Literatura": 74, "Redação": 80,
    },
  },
  alu2: {
    geral: [{ nome: "ENEM 24 - D1", data: "2026-05-12", taxa: 52, acertos: 23, total: 45 }],
    porMateria: { "Matemática": 48, "Português": 65, "Física": 40, "Química": 38, "Biologia": 55 },
  },
  alu3: {
    geral: [
      { nome: "FUVEST 23", data: "2026-05-08", taxa: 82, acertos: 74, total: 90 },
      { nome: "UNICAMP 24", data: "2026-05-22", taxa: 78, acertos: 55, total: 70 },
    ],
    porMateria: { "Matemática": 88, "Português": 85, "Física": 82, "Química": 76, "Biologia": 90, "História": 80, "Geografia": 78 },
  },
};

// =========================================================================
// LOTE 3 — dados mock: conquistas, grid de consistência, recesso/férias
// =========================================================================

// Catálogo de conquistas (badges). Cada uma tem `unlocked(store)` que decide
// se está liberada com base nos dados do aluno. 🔥 FIREBASE: /students/{uid}/achievements
const CONQUISTAS_CATALOGO = [
  { id: "streak3",  icon: "🔥", titulo: "Pegando o ritmo", desc: "3 dias seguidos cumprindo as metas",   regra: (s) => (s.streak || 0) >= 3 },
  { id: "streak7",  icon: "⚡", titulo: "Uma semana firme", desc: "7 dias seguidos cumprindo as metas",   regra: (s) => (s.streak || 0) >= 7 },
  { id: "streak30", icon: "🏆", titulo: "Mês de ouro",      desc: "30 dias seguidos cumprindo as metas", regra: (s) => (s.streak || 0) >= 30 },
  { id: "q100",     icon: "🎯", titulo: "Centena",          desc: "100 questões resolvidas",             regra: (s) => (s.totalFeitas || 0) >= 100 },
  { id: "q500",     icon: "🚀", titulo: "Meio milhar",      desc: "500 questões resolvidas",             regra: (s) => (s.totalFeitas || 0) >= 500 },
  { id: "primTop",  icon: "📘", titulo: "Primeiro tópico",  desc: "Concluiu seu primeiro tópico",        regra: (s) => (s.topicosConcluidos || 0) >= 1 },
  { id: "primRev",  icon: "🔁", titulo: "Primeira revisão", desc: "Concluiu sua primeira revisão",       regra: (s) => (s.revisoesFeitas || 0) >= 1 },
  { id: "taxa80",   icon: "💎", titulo: "Precisão",         desc: "Taxa de acerto acima de 80%",         regra: (s) => (s.taxaAcerto || 0) >= 80 },
  { id: "sim5",     icon: "📝", titulo: "Maratonista",      desc: "Resolveu 5 simulados",                regra: (s) => (s.simuladosFeitos || 0) >= 5 },
];

// Grid de consistência mensal: para cada dia do mês corrente, status "cumprido" | "perdido" | "futuro"
// 🔥 FIREBASE: derivado de /students/{uid}/dailyGoals (todas metas done = cumprido)
function gerarConsistenciaMock(seed = 0) {
  // gera o mês corrente com padrão pseudo-aleatório por aluno
  const hoje = new Date();
  const ano = hoje.getFullYear(), mes = hoje.getMonth();
  const dias = new Date(ano, mes + 1, 0).getDate();
  const out = [];
  for (let d = 1; d <= dias; d++) {
    const dt = new Date(ano, mes, d);
    if (dt > hoje) out.push({ dia: d, status: "futuro" });
    else {
      // mock: aluno cumpre ~75% dos dias, varia pelo seed
      const r = ((d * 7 + seed * 13) % 100);
      out.push({ dia: d, status: r < 75 ? "cumprido" : "perdido" });
    }
  }
  return out;
}

// Recesso/Férias do aluno — período em que o sistema pausa as metas
// 🔥 FIREBASE: /students/{uid}/breaks
const RECESSO_INICIAL = {};

/* ============================================================================
   CURSOS EM VÍDEO + DEVOLUTIVAS DE REDAÇÃO (ambiente de teste)
   ----------------------------------------------------------------------------
   Playlists criadas pelo moderador. Cada playlist tem uma categoria
   (Introdução, Atualidades, Redação, Outros) e uma lista ordenada de vídeos.
   🔥 FIREBASE: /playlists/{id} { ..., videos: [...] }; arquivos de vídeo
      num provedor de vídeo (não no Storage). Ver docs/ARQUITETURA.md.
============================================================================ */

const CATEGORIAS_PLAYLIST = [
  { id: "introducao", nome: "Introdução ao curso" },
  { id: "atualidades", nome: "Atualidades" },
  { id: "redacao", nome: "Redação" },
  { id: "outro", nome: "Outros cursos" },
];
const CORES_PLAYLIST = ["#f97316", "#3b82f6", "#a855f7", "#22c55e", "#ef4444", "#14b8a6", "#eab308"];

const PLAYLISTS_INICIAIS = [
  { id: "pl1", titulo: "Introdução ao curso", categoria: "introducao", cor: "#f97316", publicada: true, para: "todos",
    descricao: "Comece por aqui: como o método funciona, como usar a plataforma e como montar o seu plano.",
    videos: [
      { id: "v1", titulo: "Boas-vindas: como o curso funciona", descricao: "Visão geral do método: ciclos de estudo, metas diárias e revisão espaçada.", duracao: "08:30", fonte: "exemplo" },
      { id: "v2", titulo: "Montando o seu plano de estudos", descricao: "Como escolher o vestibular-foco, os horários e a incidência de cada matéria.", duracao: "12:10", fonte: "exemplo" },
      { id: "v3", titulo: "Revisão espaçada na prática", descricao: "Por que revisar em 1, 7, 15 e 30 dias e como a plataforma agenda isso.", duracao: "09:45", fonte: "exemplo" },
    ] },
  { id: "pl2", titulo: "Atualidades · Outubro/2026", categoria: "atualidades", cor: "#3b82f6", publicada: true, para: "todos",
    descricao: "Os temas do mês com o gancho para a prova e para a redação.",
    videos: [
      { id: "v4", titulo: "Transição energética e o Brasil", descricao: "Como o tema aparece em Geografia e em propostas de redação.", duracao: "15:20", fonte: "exemplo" },
      { id: "v5", titulo: "Inteligência artificial e trabalho", descricao: "Repertórios e dados para usar na argumentação.", duracao: "11:05", fonte: "exemplo" },
    ] },
  { id: "pl3", titulo: "Redação · dissecando textos nota 1000", categoria: "redacao", cor: "#a855f7", publicada: true, para: "todos",
    descricao: "Leitura comentada de redações nota máxima, parágrafo por parágrafo.",
    videos: [
      { id: "v6", titulo: "Introdução: tese e repertório", descricao: "Como a tese é apresentada já no primeiro parágrafo.", duracao: "13:40", fonte: "exemplo" },
      { id: "v7", titulo: "Desenvolvimento: argumentação em camadas", descricao: "Tópico frasal, fundamentação e fechamento de cada parágrafo.", duracao: "16:25", fonte: "exemplo" },
    ] },
  { id: "pl4", titulo: "Aulão de véspera FUVEST", categoria: "outro", cor: "#ef4444", publicada: false, para: "fuvest",
    descricao: "Revisão final dos temas de maior incidência.",
    videos: [
      { id: "v8", titulo: "Os 10 temas que mais caem", descricao: "", duracao: "45:00", fonte: "exemplo" },
    ] },
];

const categoriaNome = (id) => (CATEGORIAS_PLAYLIST.find((c) => c.id === id) || {}).nome || "Outros cursos";

// Identifica o provedor de um link colado pelo moderador
function provedorDoLink(url = "") {
  if (/youtu\.?be/i.test(url)) return "YouTube";
  if (/vimeo\.com/i.test(url)) return "Vimeo";
  if (/pandavideo/i.test(url)) return "Panda Video";
  if (/drive\.google/i.test(url)) return "Google Drive";
  return "Link externo";
}

function VideoPlayer({ video, cor }) {
  const p = usePalette();
  const caixa = {
    width: "100%", aspectRatio: "16 / 9", maxWidth: "100%", borderRadius: 14, overflow: "hidden",
    background: "#07080a", border: "1px solid " + p.border, display: "flex", alignItems: "center",
    justifyContent: "center", flexDirection: "column", gap: 10, textAlign: "center", padding: 20, boxSizing: "border-box",
  };
  if (!video) return <div style={caixa}><span style={{ color: "#9aa0ac", fontSize: 13 }}>Esta playlist ainda não tem vídeos.</span></div>;
  if (video.fonte === "arquivo" && video.url) {
    return <video key={video.id} src={video.url} controls style={{ ...caixa, padding: 0, display: "block" }} />;
  }
  if (video.fonte === "link") {
    return (
      <div style={caixa}>
        <ExternalLink size={34} color={cor || p.accent} />
        <div style={{ color: "#e7e9ee", fontWeight: 700, fontSize: 15 }}>{provedorDoLink(video.url)}</div>
        <a href={video.url} target="_blank" rel="noreferrer" style={{ color: cor || p.accent, fontWeight: 700, fontSize: 14 }}>Abrir o vídeo em nova aba</a>
        <div style={{ color: "#5f6672", fontSize: 11.5, maxWidth: 380 }}>No ambiente de teste, links externos abrem fora da página. Na plataforma final o player fica embutido aqui.</div>
      </div>
    );
  }
  return (
    <div style={{ ...caixa, background: `linear-gradient(135deg, ${(cor || p.accent)}33, #07080a 70%)` }}>
      <PlayCircle size={52} color={cor || p.accent} />
      <div style={{ color: "#e7e9ee", fontWeight: 700, fontSize: 15 }}>{video.titulo}</div>
      <div style={{ color: "#9aa0ac", fontSize: 12 }}>Vídeo de exemplo. Anexe um arquivo ou link no painel do moderador para ver o player funcionando.</div>
    </div>
  );
}

/* ---- ALUNO: Cursos em vídeo -------------------------------------------- */
function AlunoCursos({ playlists, vestibular, assistidos, setAssistidos, aberta, setAberta }) {
  const p = usePalette();
  const [videoId, setVideoId] = useState(null);
  const visiveis = playlists.filter((pl) => pl.publicada && (pl.para === "todos" || pl.para === vestibular));
  const pl = visiveis.find((x) => x.id === aberta);
  const pct = (x) => x.videos.length ? Math.round(x.videos.filter((v) => assistidos[v.id]).length / x.videos.length * 100) : 0;

  if (pl) {
    const atual = pl.videos.find((v) => v.id === videoId) || pl.videos.find((v) => !assistidos[v.id]) || pl.videos[0];
    const idx = pl.videos.indexOf(atual);
    const marcar = () => {
      setAssistidos({ ...assistidos, [atual.id]: !assistidos[atual.id] });
      if (!assistidos[atual.id] && pl.videos[idx + 1]) setVideoId(pl.videos[idx + 1].id);
    };
    return (
      <div style={{ animation: "fadeIn .3s ease" }}>
        <button onClick={() => { setAberta(null); setVideoId(null); }} style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Todos os cursos
        </button>
        <div style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 4 }}>
          <Badge soft color={pl.cor}>{categoriaNome(pl.categoria)}</Badge>
          <span style={{ fontSize: 12.5, color: p.textFaint }}>{pl.videos.length} aulas · {pct(pl)}% concluído</span>
        </div>
        <h2 style={{ margin: "6px 0 18px", fontSize: 22, fontWeight: 800, color: p.text, letterSpacing: "-.02em" }}>{pl.titulo}</h2>
        <div className="curso-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 320px", gap: 18, alignItems: "start" }}>
          <div>
            <VideoPlayer video={atual} cor={pl.cor} />
            {atual && (
              <div style={{ marginTop: 14 }}>
                <div style={{ display: "flex", justifyContent: "space-between", alignItems: "start", gap: 12, flexWrap: "wrap" }}>
                  <div>
                    <div style={{ fontSize: 12, color: p.textFaint, fontWeight: 600 }}>Aula {idx + 1} de {pl.videos.length}{atual.duracao ? " · " + atual.duracao : ""}</div>
                    <h3 style={{ margin: "4px 0 0", fontSize: 17, fontWeight: 700, color: p.text }}>{atual.titulo}</h3>
                  </div>
                  <Btn size="sm" variant={assistidos[atual.id] ? "soft" : "primary"} icon={assistidos[atual.id] ? CheckCircle2 : Check} onClick={marcar}>
                    {assistidos[atual.id] ? "Assistida" : "Marcar como assistida"}
                  </Btn>
                </div>
                {atual.descricao && <p style={{ margin: "10px 0 0", fontSize: 14, lineHeight: 1.6, color: p.textSoft, maxWidth: "65ch" }}>{atual.descricao}</p>}
              </div>
            )}
          </div>
          <Card pad={8}>
            <div style={{ padding: "8px 10px 10px" }}><ProgressBar value={pct(pl)} color={pl.cor} height={6} /></div>
            {pl.videos.map((v, i) => {
              const ativo = atual && v.id === atual.id;
              return (
                <button key={v.id} onClick={() => setVideoId(v.id)} style={{ width: "100%", textAlign: "left", display: "flex", gap: 10, alignItems: "center", padding: "10px", borderRadius: 10, border: "none", cursor: "pointer", background: ativo ? pl.cor + "1f" : "transparent", color: p.text }}>
                  <span style={{ width: 24, height: 24, borderRadius: 999, flexShrink: 0, display: "flex", alignItems: "center", justifyContent: "center", fontSize: 11.5, fontWeight: 700, background: assistidos[v.id] ? p.green : p.surface2, color: assistidos[v.id] ? "#fff" : p.textSoft }}>
                    {assistidos[v.id] ? <Check size={13} /> : i + 1}
                  </span>
                  <span style={{ flex: 1, minWidth: 0 }}>
                    <span style={{ display: "block", fontSize: 13, fontWeight: ativo ? 700 : 600, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{v.titulo}</span>
                    {v.duracao && <span style={{ fontSize: 11.5, color: p.textFaint, fontVariantNumeric: "tabular-nums" }}>{v.duracao}</span>}
                  </span>
                </button>
              );
            })}
          </Card>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={PlayCircle} title="Cursos em vídeo" subtitle="Playlists de aulas organizadas pelo seu professor" />
      {visiveis.length === 0 && <Empty icon={Video} title="Nenhum curso publicado ainda" />}
      {CATEGORIAS_PLAYLIST.map((cat) => {
        const lista = visiveis.filter((x) => x.categoria === cat.id);
        if (!lista.length) return null;
        return (
          <div key={cat.id} style={{ marginBottom: 26 }}>
            <h3 style={{ margin: "0 0 12px", fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>{cat.nome}</h3>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 14 }}>
              {lista.map((x) => (
                <Card key={x.id} pad={0} hover onClick={() => setAberta(x.id)} style={{ overflow: "hidden" }}>
                  <div style={{ height: 88, background: `linear-gradient(135deg, ${x.cor}, ${x.cor}55)`, display: "flex", alignItems: "flex-end", padding: 12 }}>
                    <PlayCircle size={28} color="#fff" />
                  </div>
                  <div style={{ padding: 14 }}>
                    <h4 style={{ margin: 0, fontSize: 14.5, fontWeight: 700, color: p.text }}>{x.titulo}</h4>
                    <p style={{ margin: "4px 0 10px", fontSize: 12, color: p.textFaint }}>{x.videos.length} aulas · {pct(x)}% concluído</p>
                    <ProgressBar value={pct(x)} color={x.cor} height={5} />
                  </div>
                </Card>
              ))}
            </div>
          </div>
        );
      })}
    </div>
  );
}

/* ---- MODERADOR: Cursos em vídeo ---------------------------------------- */
function ModCursos({ playlists, setPlaylists }) {
  const p = usePalette();
  const [editId, setEditId] = useState(null);
  const [nova, setNova] = useState(false);
  const [excluir, setExcluir] = useState(null);
  const vazio = { titulo: "", descricao: "", categoria: "introducao", cor: CORES_PLAYLIST[0], para: "todos" };
  const [form, setForm] = useState(vazio);

  const criar = () => {
    if (!form.titulo.trim()) return;
    const id = "pl" + Date.now();
    // 🔥 FIREBASE: addDoc em /playlists
    setPlaylists([...playlists, { id, ...form, publicada: false, videos: [] }]);
    setNova(false); setForm(vazio); setEditId(id);
  };

  const editando = playlists.find((x) => x.id === editId);
  if (editando) return <ModPlaylistEditor playlist={editando} onBack={() => setEditId(null)}
    onChange={(nv) => setPlaylists(playlists.map((x) => (x.id === nv.id ? nv : x)))} />;

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={PlayCircle} title="Cursos em vídeo" subtitle="Crie playlists e anexe as videoaulas. Só playlists publicadas aparecem para os alunos."
        right={<Btn icon={Plus} onClick={() => setNova(true)}>Nova playlist</Btn>} />
      {CATEGORIAS_PLAYLIST.map((cat) => {
        const lista = playlists.filter((x) => x.categoria === cat.id);
        return (
          <div key={cat.id} style={{ marginBottom: 24 }}>
            <h3 style={{ margin: "0 0 10px", fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>{cat.nome}</h3>
            {lista.length === 0 && <div style={{ fontSize: 13, color: p.textFaint, padding: "4px 0 8px" }}>Nenhuma playlist nesta categoria.</div>}
            <div style={{ display: "grid", gap: 10 }}>
              {lista.map((x) => (
                <Card key={x.id} pad={14} style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
                  <div style={{ width: 44, height: 44, borderRadius: 12, background: x.cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PlayCircle size={22} color="#fff" /></div>
                  <div style={{ flex: 1, minWidth: 180 }}>
                    <div style={{ display: "flex", alignItems: "center", gap: 8, flexWrap: "wrap" }}>
                      <span style={{ fontSize: 14.5, fontWeight: 700, color: p.text }}>{x.titulo}</span>
                      <Badge soft color={x.publicada ? p.green : p.textFaint}>{x.publicada ? "Publicada" : "Rascunho"}</Badge>
                    </div>
                    <div style={{ fontSize: 12, color: p.textFaint, marginTop: 3 }}>{x.videos.length} vídeos · {x.para === "todos" ? "todos os alunos" : "só " + vestInfo(x.para).nome}</div>
                  </div>
                  {excluir === x.id ? (
                    <div style={{ display: "flex", gap: 6, alignItems: "center" }}>
                      <span style={{ fontSize: 12.5, color: p.danger, fontWeight: 600 }}>Excluir a playlist?</span>
                      <Btn size="sm" variant="danger" onClick={() => { setPlaylists(playlists.filter((y) => y.id !== x.id)); setExcluir(null); }}>Excluir</Btn>
                      <Btn size="sm" variant="ghost" onClick={() => setExcluir(null)}>Cancelar</Btn>
                    </div>
                  ) : (
                    <div style={{ display: "flex", gap: 6 }}>
                      <Btn size="sm" variant="soft" icon={Pencil} onClick={() => setEditId(x.id)}>Editar</Btn>
                      <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => setExcluir(x.id)} title="Excluir" />
                    </div>
                  )}
                </Card>
              ))}
            </div>
          </div>
        );
      })}

      <Modal open={nova} onClose={() => setNova(false)} title="Nova playlist">
        <PlaylistCampos form={form} setForm={setForm} />
        <Btn onClick={criar} disabled={!form.titulo.trim()} style={{ width: "100%" }} icon={Plus}>Criar e adicionar vídeos</Btn>
      </Modal>
    </div>
  );
}

function PlaylistCampos({ form, setForm }) {
  const p = usePalette();
  return (
    <>
      <Field label="Título"><Input id="pl-titulo" value={form.titulo} onChange={(e) => setForm({ ...form, titulo: e.target.value })} placeholder="Atualidades · Novembro/2026" /></Field>
      <Field label="Descrição"><Textarea id="pl-desc" rows={2} value={form.descricao} onChange={(e) => setForm({ ...form, descricao: e.target.value })} placeholder="O que o aluno vai aprender nesta playlist" /></Field>
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: 10 }}>
        <Field label="Categoria (aba)">
          <Select id="pl-cat" value={form.categoria} onChange={(e) => setForm({ ...form, categoria: e.target.value })}>
            {CATEGORIAS_PLAYLIST.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
          </Select>
        </Field>
        <Field label="Visível para">
          <Select id="pl-para" value={form.para} onChange={(e) => setForm({ ...form, para: e.target.value })}>
            <option value="todos">Todos os alunos</option>
            {VESTIBULARES.map((v) => <option key={v.id} value={v.id}>Só {v.nome}</option>)}
          </Select>
        </Field>
      </div>
      <Field label="Cor">
        <div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          {CORES_PLAYLIST.map((c) => (
            <button key={c} type="button" onClick={() => setForm({ ...form, cor: c })} aria-label={"Cor " + c}
              style={{ width: 28, height: 28, borderRadius: 999, background: c, cursor: "pointer", border: form.cor === c ? "3px solid " + p.text : "3px solid transparent" }} />
          ))}
        </div>
      </Field>
    </>
  );
}

function ModPlaylistEditor({ playlist, onChange, onBack }) {
  const p = usePalette();
  const [dados, setDados] = useState(false);
  const [form, setForm] = useState(playlist);
  const [videoModal, setVideoModal] = useState(null); // null | "novo" | video
  const [excluirV, setExcluirV] = useState(null);
  const videos = playlist.videos;

  const mover = (i, d) => {
    const arr = [...videos];
    const j = i + d;
    if (j < 0 || j >= arr.length) return;
    [arr[i], arr[j]] = [arr[j], arr[i]];
    onChange({ ...playlist, videos: arr });
  };
  const salvarVideo = (v) => {
    const existe = videos.some((x) => x.id === v.id);
    onChange({ ...playlist, videos: existe ? videos.map((x) => (x.id === v.id ? v : x)) : [...videos, v] });
    setVideoModal(null);
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <button onClick={onBack} style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
        <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Todas as playlists
      </button>
      <Card pad={18} style={{ marginBottom: 16 }}>
        <div style={{ display: "flex", alignItems: "center", gap: 14, flexWrap: "wrap" }}>
          <div style={{ width: 48, height: 48, borderRadius: 12, background: playlist.cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PlayCircle size={24} color="#fff" /></div>
          <div style={{ flex: 1, minWidth: 200 }}>
            <h2 style={{ margin: 0, fontSize: 19, fontWeight: 800, color: p.text }}>{playlist.titulo}</h2>
            <div style={{ fontSize: 12.5, color: p.textFaint, marginTop: 3 }}>{categoriaNome(playlist.categoria)} · {playlist.para === "todos" ? "todos os alunos" : "só " + vestInfo(playlist.para).nome}</div>
          </div>
          <Btn size="sm" variant="soft" icon={Settings2} onClick={() => { setForm(playlist); setDados(true); }}>Dados da playlist</Btn>
          <Btn size="sm" variant={playlist.publicada ? "soft" : "primary"} icon={playlist.publicada ? EyeOff : Eye}
            onClick={() => onChange({ ...playlist, publicada: !playlist.publicada })}>
            {playlist.publicada ? "Voltar para rascunho" : "Publicar para os alunos"}
          </Btn>
        </div>
      </Card>

      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 10, gap: 10, flexWrap: "wrap" }}>
        <h3 style={{ margin: 0, fontSize: 15, fontWeight: 700, color: p.text }}>Vídeos ({videos.length})</h3>
        <Btn size="sm" icon={Plus} onClick={() => setVideoModal("novo")}>Adicionar vídeo</Btn>
      </div>
      {videos.length === 0 && <Card><Empty icon={Video} title="Nenhum vídeo ainda" sub="Adicione o primeiro vídeo desta playlist." /></Card>}
      <div style={{ display: "grid", gap: 8 }}>
        {videos.map((v, i) => (
          <Card key={v.id} pad={12} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ display: "flex", flexDirection: "column" }}>
              <button onClick={() => mover(i, -1)} disabled={i === 0} aria-label="Subir" style={{ background: "none", border: "none", cursor: i === 0 ? "default" : "pointer", color: i === 0 ? p.border : p.textSoft, padding: 2 }}><ArrowUp size={15} /></button>
              <button onClick={() => mover(i, 1)} disabled={i === videos.length - 1} aria-label="Descer" style={{ background: "none", border: "none", cursor: i === videos.length - 1 ? "default" : "pointer", color: i === videos.length - 1 ? p.border : p.textSoft, padding: 2 }}><ArrowDown size={15} /></button>
            </div>
            <span style={{ fontSize: 13, fontWeight: 700, color: p.textFaint, width: 20, fontVariantNumeric: "tabular-nums" }}>{i + 1}</span>
            <div style={{ flex: 1, minWidth: 180 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{v.titulo}</div>
              <div style={{ fontSize: 12, color: p.textFaint, marginTop: 2, display: "flex", gap: 6, alignItems: "center", flexWrap: "wrap" }}>
                {v.fonte === "arquivo" && <><Paperclip size={12} /> {v.arquivoNome}</>}
                {v.fonte === "link" && <><Link2 size={12} /> {provedorDoLink(v.url)}</>}
                {v.fonte === "exemplo" && <>vídeo de exemplo, sem arquivo</>}
                {v.duracao && <span>· {v.duracao}</span>}
              </div>
            </div>
            {excluirV === v.id ? (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="danger" onClick={() => { onChange({ ...playlist, videos: videos.filter((x) => x.id !== v.id) }); setExcluirV(null); }}>Remover</Btn>
                <Btn size="sm" variant="ghost" onClick={() => setExcluirV(null)}>Cancelar</Btn>
              </div>
            ) : (
              <div style={{ display: "flex", gap: 6 }}>
                <Btn size="sm" variant="soft" icon={Pencil} onClick={() => setVideoModal(v)}>Editar</Btn>
                <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => setExcluirV(v.id)} title="Remover" />
              </div>
            )}
          </Card>
        ))}
      </div>

      <Modal open={dados} onClose={() => setDados(false)} title="Dados da playlist">
        <PlaylistCampos form={form} setForm={setForm} />
        <Btn icon={Save} style={{ width: "100%" }} disabled={!form.titulo.trim()} onClick={() => { onChange({ ...playlist, ...form, videos: playlist.videos, publicada: playlist.publicada }); setDados(false); }}>Salvar</Btn>
      </Modal>
      {videoModal && <VideoForm inicial={videoModal === "novo" ? null : videoModal} onClose={() => setVideoModal(null)} onSave={salvarVideo} />}
    </div>
  );
}

function VideoForm({ inicial, onClose, onSave }) {
  const p = usePalette();
  const [v, setV] = useState(inicial || { id: "v" + Date.now(), titulo: "", descricao: "", duracao: "", fonte: "arquivo", url: "", arquivoNome: "" });
  const aba = v.fonte === "link" ? "link" : "arquivo";
  const escolherArquivo = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // 🔥 Na plataforma real: upload para o provedor de vídeo. Aqui: URL local do navegador.
    setV((prev) => ({ ...prev, fonte: "arquivo", url: URL.createObjectURL(f), arquivoNome: f.name, titulo: prev.titulo || f.name.replace(/\.[^.]+$/, "") }));
  };
  const valido = v.titulo.trim() && ((v.fonte === "arquivo" && v.url) || (v.fonte === "link" && /^https?:\/\//.test(v.url)) || v.fonte === "exemplo");
  const abaBtn = (k, label, Icon) => (
    <button type="button" onClick={() => setV({ ...v, fonte: k, url: k === v.fonte ? v.url : "", arquivoNome: k === v.fonte ? v.arquivoNome : "" })}
      style={{ flex: 1, padding: 10, borderRadius: 10, cursor: "pointer", fontWeight: 600, fontSize: 13, display: "flex", gap: 6, alignItems: "center", justifyContent: "center",
        border: "1px solid " + (aba === k ? p.accent : p.border), background: aba === k ? p.accent + "1f" : "transparent", color: aba === k ? p.accent : p.textSoft }}>
      <Icon size={15} /> {label}
    </button>
  );
  return (
    <Modal open onClose={onClose} title={inicial ? "Editar vídeo" : "Adicionar vídeo"} width={520}>
      <div style={{ display: "flex", gap: 8, marginBottom: 14 }}>
        {abaBtn("arquivo", "Enviar arquivo", UploadCloud)}
        {abaBtn("link", "Colar link", Link2)}
      </div>
      {aba === "arquivo" ? (
        <label htmlFor="video-arquivo" style={{ display: "block", border: "2px dashed " + p.border, borderRadius: 14, padding: 20, textAlign: "center", marginBottom: 14, cursor: "pointer" }}>
          <UploadCloud size={28} color={p.accent} style={{ marginBottom: 6 }} />
          <div style={{ fontSize: 13, fontWeight: 600, color: p.text }}>{v.arquivoNome || "Escolher arquivo de vídeo (.mp4, .mov, .webm)"}</div>
          <div style={{ fontSize: 11.5, color: p.textFaint, marginTop: 3 }}>No teste o vídeo fica só neste navegador e some ao recarregar.</div>
          <input id="video-arquivo" type="file" accept="video/*" onChange={escolherArquivo} style={{ display: "none" }} />
        </label>
      ) : (
        <Field label="Link do vídeo (YouTube, Vimeo, Panda...)">
          <Input id="video-url" value={v.url} onChange={(e) => setV({ ...v, url: e.target.value })} placeholder="https://..." />
        </Field>
      )}
      <Field label="Título da aula"><Input id="video-titulo" value={v.titulo} onChange={(e) => setV({ ...v, titulo: e.target.value })} placeholder="Ex.: Tese e repertório na introdução" /></Field>
      <Field label="Descrição (opcional)"><Textarea id="video-desc" rows={3} value={v.descricao} onChange={(e) => setV({ ...v, descricao: e.target.value })} /></Field>
      <Field label="Duração (opcional)"><Input id="video-dur" value={v.duracao} onChange={(e) => setV({ ...v, duracao: e.target.value })} placeholder="12:30" style={{ maxWidth: 140 }} /></Field>
      <Btn icon={Save} style={{ width: "100%" }} disabled={!valido} onClick={() => onSave(v)}>Salvar vídeo</Btn>
    </Modal>
  );
}

/* ============================================================================
   REDAÇÃO — o aluno envia o texto por fora (WhatsApp, e-mail...) e o
   moderador registra a devolutiva aqui. 🔥 FIREBASE: /essayFeedback/{id}
   (arquivo corrigido no Storage: essays/{uid}/{id}.pdf)
============================================================================ */
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
const hojeISO = () => new Date().toISOString().slice(0, 10);
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

const DEVOLUTIVAS_INICIAIS = [
  { id: "dv1", alunoId: "alu1", tema: "Desafios para a valorização de comunidades e povos tradicionais", vestibular: "enem", rubrica: "enem",
    notas: { c1: 160, c2: 120, c3: 120, c4: 160, c5: 160 }, recebidaEm: "2026-08-28", canal: "whatsapp",
    comentario: "Boa estrutura geral. A tese aparece, mas o repertório da introdução está solto: ele não se liga ao argumento do D1.",
    pontosFortes: "Proposta de intervenção completa, com os cinco elementos.", aMelhorar: "Amarrar o repertório à tese. Evitar repetir \"nesse sentido\" como único conectivo.",
    arquivo: null, status: "enviada", enviadaEm: "2026-09-02", lida: true },
  { id: "dv2", alunoId: "alu1", tema: "Os impactos da inteligência artificial no mercado de trabalho", vestibular: "enem", rubrica: "enem",
    notas: { c1: 160, c2: 160, c3: 160, c4: 160, c5: 200 }, recebidaEm: "2026-09-16", canal: "email",
    comentario: "Evolução clara em relação à última redação. O D2 ainda está mais descritivo que argumentativo.",
    pontosFortes: "Repertório pertinente e bem articulado. Conclusão retoma a tese.", aMelhorar: "No D2, explique por que o dado sustenta a tese em vez de só apresentá-lo.",
    arquivo: null, status: "enviada", enviadaEm: "2026-09-20", lida: false },
  { id: "dv3", alunoId: "alu3", tema: "Tema livre: o papel da universidade pública", vestibular: "unicamp", rubrica: "livre",
    notas: {}, notaLivre: 9, escalaLivre: 12, recebidaEm: "2026-09-22", canal: "presencial",
    comentario: "", pontosFortes: "", aMelhorar: "", arquivo: null, status: "rascunho", enviadaEm: null, lida: false },
];

function ArquivoCorrigido({ arquivo }) {
  const p = usePalette();
  if (!arquivo) return <div style={{ fontSize: 13, color: p.textFaint }}>Nenhum arquivo corrigido anexado.</div>;
  if (arquivo.tipo.startsWith("image/")) return <img src={arquivo.url} alt={"Redação corrigida: " + arquivo.nome} style={{ maxWidth: "100%", borderRadius: 12, border: "1px solid " + p.border }} />;
  return (
    <a href={arquivo.url} target="_blank" rel="noreferrer" style={{ display: "inline-flex", alignItems: "center", gap: 8, color: p.accent, fontWeight: 700, fontSize: 14 }}>
      <FileText size={18} /> {arquivo.nome}
    </a>
  );
}

/* ---- ALUNO: Redação ------------------------------------------------------ */
function AlunoRedacao({ user, devolutivas, setDevolutivas, instrucoes, playlists, abrirPlaylist }) {
  const p = usePalette();
  const [aberta, setAberta] = useState(null);
  const minhas = devolutivas.filter((d) => d.alunoId === user.uid && d.status === "enviada").sort((a, b) => (b.enviadaEm || "").localeCompare(a.enviadaEm || ""));
  const aulas = playlists.filter((x) => x.publicada && x.categoria === "redacao");
  const serie = [...minhas].reverse().map((d) => ({ data: fmtData(d.enviadaEm).slice(0, 5), pct: Math.round(notaDevolutiva(d).pct), nota: notaDevolutiva(d).texto }));
  const ultima = minhas[0];
  const media = minhas.length ? Math.round(minhas.reduce((s, d) => s + notaDevolutiva(d).pct, 0) / minhas.length) : 0;

  const abrir = (d) => {
    setAberta(d.id);
    if (!d.lida) setDevolutivas(devolutivas.map((x) => (x.id === d.id ? { ...x, lida: true } : x)));
  };
  const det = minhas.find((d) => d.id === aberta);

  if (det) {
    const n = notaDevolutiva(det);
    return (
      <div style={{ animation: "fadeIn .3s ease" }}>
        <button onClick={() => setAberta(null)} style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
          <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Minhas redações
        </button>
        <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
          <VestBadge id={det.vestibular} size="sm" />
          <span style={{ fontSize: 12.5, color: p.textFaint }}>Enviada em {fmtData(det.recebidaEm)} · devolutiva em {fmtData(det.enviadaEm)}</span>
        </div>
        <h2 style={{ margin: "8px 0 18px", fontSize: 20, fontWeight: 800, color: p.text, textWrap: "balance" }}>{det.tema}</h2>
        <div className="curso-grid" style={{ display: "grid", gridTemplateColumns: "280px minmax(0,1fr)", gap: 16, alignItems: "start" }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>Nota</div>
            <div style={{ fontSize: 40, fontWeight: 900, color: p.accent, letterSpacing: "-.03em", fontVariantNumeric: "tabular-nums" }}>{n.texto}</div>
            {det.rubrica === "enem" && (
              <div style={{ display: "grid", gap: 10, marginTop: 10 }}>
                {COMPETENCIAS_ENEM.map((c) => (
                  <div key={c.id}>
                    <div style={{ display: "flex", justifyContent: "space-between", fontSize: 12, color: p.textSoft, marginBottom: 4, gap: 8 }}>
                      <span>{c.nome}</span><b style={{ color: p.text, fontVariantNumeric: "tabular-nums" }}>{det.notas[c.id]}</b>
                    </div>
                    <ProgressBar value={(det.notas[c.id] / 200) * 100} height={6} color={det.notas[c.id] >= 160 ? p.green : det.notas[c.id] >= 120 ? p.accent : p.danger} />
                  </div>
                ))}
              </div>
            )}
          </Card>
          <div style={{ display: "grid", gap: 14 }}>
            {[["Comentário do professor", det.comentario], ["Pontos fortes", det.pontosFortes], ["O que melhorar", det.aMelhorar]].filter(([, t]) => t).map(([t, txt]) => (
              <Card key={t}>
                <div style={{ fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 6 }}>{t}</div>
                <p style={{ margin: 0, fontSize: 14, lineHeight: 1.65, color: p.text, whiteSpace: "pre-wrap", maxWidth: "65ch" }}>{txt}</p>
              </Card>
            ))}
            <Card>
              <div style={{ fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em", marginBottom: 8 }}>Redação corrigida</div>
              <ArquivoCorrigido arquivo={det.arquivo} />
            </Card>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={PenLine} title="Redação" subtitle="Suas devolutivas e as aulas de redação" />
      <Card pad={16} style={{ marginBottom: 16, display: "flex", gap: 12, alignItems: "flex-start", borderColor: p.accent + "55" }}>
        <Send size={20} color={p.accent} style={{ flexShrink: 0, marginTop: 2 }} />
        <div>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>Como enviar sua redação</div>
          <p style={{ margin: "4px 0 0", fontSize: 13.5, lineHeight: 1.6, color: p.textSoft, whiteSpace: "pre-wrap" }}>{instrucoes}</p>
        </div>
      </Card>

      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard icon={FileText} label="Redações corrigidas" value={minhas.length} color={p.accent} />
        <StatCard icon={Target} label="Última nota" value={ultima ? notaDevolutiva(ultima).texto : "—"} color={p.green} />
        <StatCard icon={TrendingUp} label="Média (% da nota máx.)" value={minhas.length ? media + "%" : "—"} color="#3b82f6" />
      </div>

      {serie.length >= 2 && (
        <Card style={{ marginBottom: 16 }}>
          <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text, marginBottom: 10 }}>Evolução (% da nota máxima)</div>
          <div style={{ width: "100%", height: 200 }}>
            <ResponsiveContainer>
              <LineChart data={serie} margin={{ top: 8, right: 16, left: -16, bottom: 0 }}>
                <CartesianGrid stroke={p.chartGrid} vertical={false} />
                <XAxis dataKey="data" tick={{ fill: p.textFaint, fontSize: 12 }} axisLine={false} tickLine={false} />
                <YAxis domain={[0, 100]} tick={{ fill: p.textFaint, fontSize: 12 }} axisLine={false} tickLine={false} />
                <Tooltip contentStyle={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, color: p.text }} formatter={(v, k, item) => [item.payload.nota, "Nota"]} />
                <Line type="monotone" dataKey="pct" stroke={p.accent} strokeWidth={2.5} dot={{ r: 4, fill: p.accent }} />
              </LineChart>
            </ResponsiveContainer>
          </div>
        </Card>
      )}

      <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: p.text }}>Minhas redações</h3>
      {minhas.length === 0 && <Card><Empty icon={PenLine} title="Nenhuma devolutiva ainda" sub="Quando o professor corrigir uma redação sua, ela aparece aqui." /></Card>}
      <div style={{ display: "grid", gap: 8, marginBottom: 24 }}>
        {minhas.map((d) => (
          <Card key={d.id} pad={14} hover onClick={() => abrir(d)} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{d.tema}</span>
                {!d.lida && <Badge color={p.accent}>Nova</Badge>}
              </div>
              <div style={{ fontSize: 12, color: p.textFaint, marginTop: 3 }}>{vestInfo(d.vestibular).nome} · devolutiva em {fmtData(d.enviadaEm)}</div>
            </div>
            <div style={{ fontSize: 20, fontWeight: 800, color: p.accent, fontVariantNumeric: "tabular-nums" }}>{notaDevolutiva(d).texto}</div>
            <ChevronRight size={18} color={p.textFaint} />
          </Card>
        ))}
      </div>

      {aulas.length > 0 && (
        <>
          <h3 style={{ margin: "0 0 10px", fontSize: 15, fontWeight: 700, color: p.text }}>Aulas de redação</h3>
          <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fill,minmax(240px,1fr))", gap: 12 }}>
            {aulas.map((x) => (
              <Card key={x.id} pad={14} hover onClick={() => abrirPlaylist(x.id)} style={{ display: "flex", gap: 12, alignItems: "center" }}>
                <div style={{ width: 40, height: 40, borderRadius: 10, background: x.cor, display: "flex", alignItems: "center", justifyContent: "center", flexShrink: 0 }}><PlayCircle size={20} color="#fff" /></div>
                <div>
                  <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text }}>{x.titulo}</div>
                  <div style={{ fontSize: 12, color: p.textFaint }}>{x.videos.length} aulas</div>
                </div>
              </Card>
            ))}
          </div>
        </>
      )}
    </div>
  );
}

/* ---- MODERADOR: Redação (devolutivas) ------------------------------------ */
function ModRedacao({ alunos, devolutivas, setDevolutivas, instrucoes, setInstrucoes }) {
  const p = usePalette();
  const [editando, setEditando] = useState(null); // devolutiva (nova ou existente)
  const [filtroAluno, setFiltroAluno] = useState("");
  const [filtroStatus, setFiltroStatus] = useState("");
  const [instrOpen, setInstrOpen] = useState(false);
  const [instrDraft, setInstrDraft] = useState(instrucoes);
  const nomeAluno = (id) => (alunos.find((a) => a.id === id) || {}).nome || "Aluno removido";

  const lista = devolutivas
    .filter((d) => (!filtroAluno || d.alunoId === filtroAluno) && (!filtroStatus || d.status === filtroStatus))
    .sort((a, b) => (b.recebidaEm || "").localeCompare(a.recebidaEm || ""));
  const rascunhos = devolutivas.filter((d) => d.status === "rascunho").length;
  const naoLidas = devolutivas.filter((d) => d.status === "enviada" && !d.lida).length;

  const nova = () => setEditando({
    id: "dv" + Date.now(), alunoId: alunos[0]?.id || "", tema: "", vestibular: alunos[0]?.vestibular || "enem", rubrica: rubricaPadrao(alunos[0]?.vestibular),
    notas: { c1: 120, c2: 120, c3: 120, c4: 120, c5: 120 }, notaLivre: "", escalaLivre: 10,
    recebidaEm: hojeISO(), canal: "whatsapp", comentario: "", pontosFortes: "", aMelhorar: "",
    arquivo: null, status: "rascunho", enviadaEm: null, lida: false, _nova: true,
  });
  const salvar = (d, enviar) => {
    const { _nova, ...limpo } = d;
    const final = enviar ? { ...limpo, status: "enviada", enviadaEm: limpo.enviadaEm || hojeISO(), lida: false } : limpo;
    // 🔥 FIREBASE: setDoc em /essayFeedback/{id}; ao enviar, notificar o aluno
    setDevolutivas(devolutivas.some((x) => x.id === d.id) ? devolutivas.map((x) => (x.id === d.id ? final : x)) : [final, ...devolutivas]);
    setEditando(null);
  };

  if (editando) return <DevolutivaEditor inicial={editando} alunos={alunos} onCancel={() => setEditando(null)} onSave={salvar}
    onDelete={editando._nova ? null : () => { setDevolutivas(devolutivas.filter((x) => x.id !== editando.id)); setEditando(null); }} />;

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <SectionTitle icon={PenLine} title="Redação" subtitle="Registre a correção das redações que os alunos te enviaram e mande a devolutiva."
        right={<div style={{ display: "flex", gap: 8, flexWrap: "wrap" }}>
          <Btn variant="soft" icon={Settings2} onClick={() => { setInstrDraft(instrucoes); setInstrOpen(true); }}>Instruções de envio</Btn>
          <Btn icon={Plus} onClick={nova}>Nova devolutiva</Btn>
        </div>} />

      <div className="stat-grid" style={{ display: "grid", gridTemplateColumns: "repeat(3,1fr)", gap: 12, marginBottom: 16 }}>
        <StatCard icon={Send} label="Devolutivas enviadas" value={devolutivas.filter((d) => d.status === "enviada").length} color={p.green} />
        <StatCard icon={Pencil} label="Rascunhos" value={rascunhos} color={p.accent} />
        <StatCard icon={EyeOff} label="Ainda não lidas pelo aluno" value={naoLidas} color="#3b82f6" />
      </div>

      <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(180px,1fr))", gap: 10, marginBottom: 12 }}>
        <Select id="filtro-aluno" value={filtroAluno} onChange={(e) => setFiltroAluno(e.target.value)}>
          <option value="">Todos os alunos</option>
          {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
        </Select>
        <Select id="filtro-status" value={filtroStatus} onChange={(e) => setFiltroStatus(e.target.value)}>
          <option value="">Todos os status</option>
          <option value="rascunho">Rascunhos</option>
          <option value="enviada">Enviadas</option>
        </Select>
      </div>

      {lista.length === 0 && <Card><Empty icon={PenLine} title="Nenhuma devolutiva encontrada" /></Card>}
      <div style={{ display: "grid", gap: 8 }}>
        {lista.map((d) => (
          <Card key={d.id} pad={14} hover onClick={() => setEditando(d)} style={{ display: "flex", alignItems: "center", gap: 12, flexWrap: "wrap" }}>
            <div style={{ flex: 1, minWidth: 200 }}>
              <div style={{ display: "flex", gap: 8, alignItems: "center", flexWrap: "wrap" }}>
                <span style={{ fontSize: 14, fontWeight: 700, color: p.text }}>{nomeAluno(d.alunoId)}</span>
                <Badge soft color={d.status === "enviada" ? p.green : p.accent}>{d.status === "enviada" ? "Enviada" : "Rascunho"}</Badge>
                {d.status === "enviada" && <Badge soft color={d.lida ? p.textFaint : "#3b82f6"}>{d.lida ? "Lida" : "Não lida"}</Badge>}
              </div>
              <div style={{ fontSize: 12.5, color: p.textSoft, marginTop: 3 }}>{d.tema || "Sem tema"}</div>
              <div style={{ fontSize: 11.5, color: p.textFaint, marginTop: 2 }}>{vestInfo(d.vestibular).nome} · recebida em {fmtData(d.recebidaEm)} por {(CANAIS_ENVIO.find((c) => c.id === d.canal) || {}).nome}</div>
            </div>
            <div style={{ fontSize: 19, fontWeight: 800, color: p.text, fontVariantNumeric: "tabular-nums" }}>{notaDevolutiva(d).texto}</div>
            <ChevronRight size={18} color={p.textFaint} />
          </Card>
        ))}
      </div>

      <Modal open={instrOpen} onClose={() => setInstrOpen(false)} title="Instruções de envio">
        <p style={{ margin: "0 0 12px", fontSize: 13, color: p.textSoft }}>Este texto aparece no topo da aba Redação do aluno.</p>
        <Textarea id="instr-envio" rows={5} value={instrDraft} onChange={(e) => setInstrDraft(e.target.value)} />
        <Btn icon={Save} style={{ width: "100%", marginTop: 12 }} onClick={() => { setInstrucoes(instrDraft); setInstrOpen(false); }}>Salvar</Btn>
      </Modal>
    </div>
  );
}

function DevolutivaEditor({ inicial, alunos, onCancel, onSave, onDelete }) {
  const p = usePalette();
  const [d, setD] = useState(inicial);
  const [confirmaExcluir, setConfirmaExcluir] = useState(false);
  const n = notaDevolutiva(d);
  const set = (k, v) => setD((prev) => ({ ...prev, [k]: v }));
  const valido = d.alunoId && d.tema.trim() && (d.rubrica === "enem" || String(d.notaLivre) !== "");

  const escolherArquivo = (e) => {
    const f = e.target.files && e.target.files[0];
    if (!f) return;
    // 🔥 FIREBASE Storage: essays/{uid}/{id}. Aqui: URL local do navegador.
    set("arquivo", { nome: f.name, tipo: f.type || "", url: URL.createObjectURL(f) });
  };

  return (
    <div style={{ animation: "fadeIn .3s ease" }}>
      <button onClick={onCancel} style={{ background: "none", border: "none", color: p.textSoft, cursor: "pointer", fontSize: 13, fontWeight: 600, padding: 0, marginBottom: 14, display: "flex", alignItems: "center", gap: 4 }}>
        <ChevronRight size={15} style={{ transform: "rotate(180deg)" }} /> Todas as devolutivas
      </button>
      <div style={{ display: "flex", alignItems: "center", gap: 10, marginBottom: 18, flexWrap: "wrap" }}>
        <h2 style={{ margin: 0, fontSize: 21, fontWeight: 800, color: p.text }}>{inicial._nova ? "Nova devolutiva" : "Editar devolutiva"}</h2>
        {!inicial._nova && <Badge soft color={d.status === "enviada" ? p.green : p.accent}>{d.status === "enviada" ? "Já enviada ao aluno" : "Rascunho"}</Badge>}
      </div>

      <div className="curso-grid" style={{ display: "grid", gridTemplateColumns: "minmax(0,1fr) 300px", gap: 16, alignItems: "start" }}>
        <div style={{ display: "grid", gap: 14 }}>
          <Card>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 12px" }}>
              <Field label="Aluno">
                <Select id="dv-aluno" value={d.alunoId} onChange={(e) => {
                  const a = alunos.find((x) => x.id === e.target.value);
                  const vest = a?.vestibular || d.vestibular;
                  setD({ ...d, alunoId: e.target.value, vestibular: vest, rubrica: rubricaPadrao(vest) });
                }}>
                  {alunos.map((a) => <option key={a.id} value={a.id}>{a.nome}</option>)}
                </Select>
              </Field>
              <Field label="Vestibular">
                <Select id="dv-vest" value={d.vestibular} onChange={(e) => setD({ ...d, vestibular: e.target.value, rubrica: rubricaPadrao(e.target.value) })}>
                  {VESTIBULARES.map((v) => <option key={v.id} value={v.id}>{v.nome}</option>)}
                </Select>
              </Field>
            </div>
            <Field label="Tema da redação"><Input id="dv-tema" value={d.tema} onChange={(e) => set("tema", e.target.value)} placeholder="Ex.: Desafios da mobilidade urbana no Brasil" /></Field>
            <div style={{ display: "grid", gridTemplateColumns: "repeat(auto-fit,minmax(200px,1fr))", gap: "0 12px" }}>
              <Field label="Recebida em"><Input id="dv-data" type="date" value={d.recebidaEm} onChange={(e) => set("recebidaEm", e.target.value)} /></Field>
              <Field label="Recebida por">
                <Select id="dv-canal" value={d.canal} onChange={(e) => set("canal", e.target.value)}>
                  {CANAIS_ENVIO.map((c) => <option key={c.id} value={c.id}>{c.nome}</option>)}
                </Select>
              </Field>
            </div>
          </Card>

          <Card>
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 10, flexWrap: "wrap", marginBottom: 14 }}>
              <div style={{ fontSize: 14, fontWeight: 700, color: p.text }}>Nota</div>
              <div style={{ display: "flex", gap: 6 }}>
                {[["enem", "Competências ENEM"], ["livre", "Nota livre"]].map(([k, l]) => (
                  <button key={k} type="button" onClick={() => set("rubrica", k)} style={{ padding: "7px 12px", borderRadius: 999, cursor: "pointer", fontWeight: 600, fontSize: 12.5,
                    border: "1px solid " + (d.rubrica === k ? p.accent : p.border), background: d.rubrica === k ? p.accent + "1f" : "transparent", color: d.rubrica === k ? p.accent : p.textSoft }}>{l}</button>
                ))}
              </div>
            </div>
            {d.rubrica === "enem" ? (
              <div style={{ display: "grid", gap: 10 }}>
                {COMPETENCIAS_ENEM.map((c) => (
                  <div key={c.id} style={{ display: "flex", alignItems: "center", gap: 10, flexWrap: "wrap" }}>
                    <span style={{ flex: 1, minWidth: 200, fontSize: 13, color: p.textSoft }}>{c.nome}</span>
                    <div style={{ display: "flex", gap: 4 }}>
                      {[0, 40, 80, 120, 160, 200].map((v) => (
                        <button key={v} type="button" onClick={() => set("notas", { ...d.notas, [c.id]: v })}
                          style={{ width: 42, padding: "6px 0", borderRadius: 8, cursor: "pointer", fontSize: 12.5, fontWeight: 700, fontVariantNumeric: "tabular-nums",
                            border: "1px solid " + (d.notas[c.id] === v ? p.accent : p.border), background: d.notas[c.id] === v ? p.accent : "transparent", color: d.notas[c.id] === v ? "#fff" : p.textSoft }}>{v}</button>
                      ))}
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div style={{ display: "flex", gap: 10, alignItems: "flex-end" }}>
                <Field label="Nota"><Input id="dv-nota" type="number" min="0" value={d.notaLivre} onChange={(e) => set("notaLivre", e.target.value)} style={{ maxWidth: 120 }} /></Field>
                <span style={{ paddingBottom: 26, color: p.textFaint }}>de</span>
                <Field label="Nota máxima"><Input id="dv-escala" type="number" min="1" value={d.escalaLivre} onChange={(e) => set("escalaLivre", e.target.value)} style={{ maxWidth: 120 }} /></Field>
              </div>
            )}
          </Card>

          <Card>
            <Field label="Comentário geral"><Textarea id="dv-coment" rows={4} value={d.comentario} onChange={(e) => set("comentario", e.target.value)} placeholder="Visão geral do texto" /></Field>
            <Field label="Pontos fortes"><Textarea id="dv-fortes" rows={2} value={d.pontosFortes} onChange={(e) => set("pontosFortes", e.target.value)} /></Field>
            <Field label="O que melhorar"><Textarea id="dv-melhorar" rows={2} value={d.aMelhorar} onChange={(e) => set("aMelhorar", e.target.value)} /></Field>
          </Card>
        </div>

        <div style={{ display: "grid", gap: 14 }}>
          <Card>
            <div style={{ fontSize: 12, fontWeight: 700, color: p.textFaint, textTransform: "uppercase", letterSpacing: ".08em" }}>Nota final</div>
            <div style={{ fontSize: 38, fontWeight: 900, color: p.accent, fontVariantNumeric: "tabular-nums", letterSpacing: "-.03em" }}>{n.texto}</div>
            {d.rubrica === "enem" && <div style={{ fontSize: 12, color: p.textFaint }}>de 1000</div>}
          </Card>
          <Card>
            <div style={{ fontSize: 13.5, fontWeight: 700, color: p.text, marginBottom: 8 }}>Redação corrigida</div>
            <label htmlFor="dv-arquivo" style={{ display: "block", border: "2px dashed " + p.border, borderRadius: 12, padding: 14, textAlign: "center", cursor: "pointer", marginBottom: 10 }}>
              <Paperclip size={20} color={p.accent} />
              <div style={{ fontSize: 12.5, fontWeight: 600, color: p.text, marginTop: 4 }}>{d.arquivo ? "Trocar arquivo" : "Anexar PDF ou foto"}</div>
              <input id="dv-arquivo" type="file" accept="application/pdf,image/*" onChange={escolherArquivo} style={{ display: "none" }} />
            </label>
            {d.arquivo && (
              <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", gap: 8 }}>
                <span style={{ fontSize: 12.5, color: p.textSoft, overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>{d.arquivo.nome}</span>
                <button type="button" onClick={() => set("arquivo", null)} aria-label="Remover arquivo" style={{ background: "none", border: "none", color: p.danger, cursor: "pointer" }}><Trash2 size={15} /></button>
              </div>
            )}
          </Card>
          <Btn icon={Send} disabled={!valido} onClick={() => onSave(d, true)} style={{ width: "100%" }}>{d.status === "enviada" ? "Salvar e reenviar" : "Enviar ao aluno"}</Btn>
          {d.status !== "enviada" && <Btn variant="soft" icon={Save} disabled={!valido} onClick={() => onSave(d, false)} style={{ width: "100%" }}>Salvar rascunho</Btn>}
          {!valido && <div style={{ fontSize: 12, color: p.textFaint }}>Preencha aluno, tema e nota para salvar.</div>}
          {onDelete && (confirmaExcluir ? (
            <div style={{ display: "flex", gap: 6 }}>
              <Btn size="sm" variant="danger" onClick={onDelete} style={{ flex: 1 }}>Confirmar exclusão</Btn>
              <Btn size="sm" variant="ghost" onClick={() => setConfirmaExcluir(false)}>Cancelar</Btn>
            </div>
          ) : <Btn size="sm" variant="ghost" icon={Trash2} onClick={() => setConfirmaExcluir(true)}>Excluir devolutiva</Btn>)}
        </div>
      </div>
    </div>
  );
}

function App() {
  const [user, setUser] = useState(null);
  const [verBoasVindas, setVerBoasVindas] = useState(false); // gate pós-login
  const [active, setActive] = useState("dashboard");

  // estado global (mock) — 🔥 FIREBASE: tudo isto viria do Firestore
  const [welcome, setWelcome] = useState(WELCOME_INICIAL);
  const [alunos, setAlunos] = useState(ALUNOS_INICIAIS);
  const [simulados, setSimulados] = useState(SIMULADOS_INICIAIS);
  const [materiais, setMateriais] = useState(MATERIAIS_INICIAIS);
  const [envios, setEnvios] = useState(ENVIOS_INICIAIS); // simulados enviados por alunos p/ classificação
  // Lote 2: progresso por aluno, revisões espaçadas, anotações privadas
  const [progressoAlunos, setProgressoAlunos] = useState(PROGRESSO_INICIAL);
  const [revisoes, setRevisoes] = useState(REVISOES_INICIAIS);
  const [anotacoesMod, setAnotacoesMod] = useState(ANOTACOES_INICIAIS);
  // estrutura universal de matérias (editável pelo moderador)
  // 🔥 FIREBASE: /studyPlan — lida por todos, escrita só pelo moderador
  const [plano, setPlano] = useState(() => JSON.parse(JSON.stringify(AREAS)));

  // Ciclos e disponibilidade por aluno — conectados à engine
  // 🔥 FIREBASE: /students/{uid}/cycle e /students/{uid}/availability
  const [ciclosPorAluno, setCiclosPorAluno] = useState(CICLOS_POR_ALUNO_INICIAL);
  const [dispPorAluno, setDispPorAluno] = useState(DISP_POR_ALUNO_INICIAL);

  // estado específico do aluno logado (disp e ciclo são derivados do aluno)
  const disp = user ? getDispAluno(dispPorAluno, user.uid) : DISP_PADRAO;
  const setDisp = (novaDisp) => {
    if (!user) return;
    setDispPorAluno((prev) => ({ ...prev, [user.uid]: novaDisp }));
  };
  const cicloAtual = user ? getCicloAluno(ciclosPorAluno, user.uid) : CICLO_PADRAO;

  const [semana, setSemana] = useState(() => gerarSemana(CICLO_PADRAO, DISP_PADRAO));
  const [semanaEditada, setSemanaEditada] = useState(null); // edição manual do aluno (drag entre dias)
  const [ordemSubs, setOrdemSubs] = useState({});
  const [notas, setNotas] = useState({
    historia: [{ id: "n1", titulo: "Era Vargas", conteudo: "Estado Novo (1937-1945): regime ditatorial, centralização do poder, propaganda via DIP.", data: "24/05/2026" }],
  });
  const [alunoStore, setAlunoStore] = useState({
    metasHoje: semana.seg || [],
    atrasadas: [
      { id: "atr1", materia: "Química", materiaId: "quimica", topico: "Termoquímica", topicoId: "qu1", minutos: 60, done: false, origem: "ontem" },
    ],
    questoes: QUESTOES_INICIAIS,
    questoesHoje: 12,
    progressoGeral: 47,
    streak: 5,
  });
  const [historicoReplan, setHistoricoReplan] = useState([
    { id: "rp1", data: "2026-05-20", totalRealocado: 90, materiasFundidas: 1, qtdPendencias: 2 },
  ]);
  // recados do moderador → aluno (por aluno) e proporção de questões por hora
  // 🔥 FIREBASE: /students/{uid}/messages e /students/{uid}/config
  const [recadosPorAluno, setRecadosPorAluno] = useState({
    alu1: [
      { id: "rec1", texto: "Ótimo ritmo essa semana! Foca em revisar Termoquímica antes do simulado de sábado. 💪", data: "2026-05-26" },
    ],
  });
  const [questoesPorHora] = useState(10);

  // Cursos em vídeo e devolutivas de redação — 🔥 FIREBASE: /playlists, /essayFeedback
  const [playlists, setPlaylists] = useState(PLAYLISTS_INICIAIS);
  const [playlistAberta, setPlaylistAberta] = useState(null);
  const [assistidosPorAluno, setAssistidosPorAluno] = useState({ alu1: { v1: true } }); // 🔥 /students/{uid}/contentProgress
  const [devolutivas, setDevolutivas] = useState(DEVOLUTIVAS_INICIAIS);
  const [instrucoesRedacao, setInstrucoesRedacao] = useState(INSTRUCOES_REDACAO_INICIAL);
  // Lote 3: recesso/férias por aluno
  const [recessoPorAluno, setRecessoPorAluno] = useState(RECESSO_INICIAL);

  // regenera a semana sempre que ciclo/disp/revisões/user mudarem
  useEffect(() => {
    if (!user || user.role !== "aluno") return;
    const ciclo = getCicloAluno(ciclosPorAluno, user.uid);
    const disp_ = getDispAluno(dispPorAluno, user.uid);
    const minhasRev = revisoes.filter((r) => r.alunoId === user.uid);
    const s = gerarSemana(ciclo, disp_, minhasRev);
    setSemana(s);
    setSemanaEditada(null); // reset da edição manual quando o ciclo muda
    setAlunoStore((prev) => ({ ...prev, metasHoje: s.seg || [] }));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user, ciclosPorAluno, dispPorAluno, revisoes]);

  const login = (u) => { setUser(u); setVerBoasVindas(true); setActive(u.role === "moderador" ? "alunos" : "dashboard"); };
  const logout = () => { setUser(null); setVerBoasVindas(false); };
  const recalc = () => {
    if (!user) return;
    const ciclo = getCicloAluno(ciclosPorAluno, user.uid);
    const disp_ = getDispAluno(dispPorAluno, user.uid);
    const minhasRev = revisoes.filter((r) => r.alunoId === user.uid);
    const s = gerarSemana(ciclo, disp_, minhasRev);
    setSemana(s);
    setSemanaEditada(null);
    setAlunoStore((prev) => ({ ...prev, metasHoje: s.seg || [] }));
  };
  // registra um replanejamento no histórico
  const registrarReplan = (resumo) => {
    setHistoricoReplan((prev) => [{ id: "rp" + Date.now(), data: new Date().toISOString().slice(0, 10), ...resumo }, ...prev]);
  };

  if (!user) return <ThemeShell><LoginScreen onLogin={login} /></ThemeShell>;

  // gate da página de boas-vindas (primeira tela após login)
  if (verBoasVindas) {
    // calcula estatísticas resumo para o painel minimalista do aluno na boas-vindas
    let alunoStats = null;
    if (user.role === "aluno") {
      const cumpridos = gerarConsistenciaMock(1).filter((d) => d.status === "cumprido").length;
      const totalAteHoje = gerarConsistenciaMock(1).filter((d) => d.status !== "futuro").length;
      const aderencia = totalAteHoje ? Math.round((cumpridos / totalAteHoje) * 100) : 0;
      // próxima conquista ainda não desbloqueada
      const totalFeitas = (alunoStore.questoes || []).reduce((s, q) => s + (q.feitas || 0), 0);
      const acertos = (alunoStore.questoes || []).reduce((s, q) => s + (q.acertos || 0), 0);
      const stats = { streak: alunoStore.streak || 0, totalFeitas, taxaAcerto: totalFeitas ? Math.round(acertos / totalFeitas * 100) : 0, topicosConcluidos: 0, revisoesFeitas: 0, simuladosFeitos: 0 };
      const proxima = CONQUISTAS_CATALOGO.find((c) => !c.regra(stats));
      alunoStats = {
        streak: alunoStore.streak || 0,
        progresso: alunoStore.progressoGeral || 0,
        aderencia,
        proximaConquista: proxima || null,
        materiaRisco: null, // mock: pode vir de "Matérias em risco" futuramente
      };
    }
    return (
      <ThemeShell>
        <BoasVindasGate welcome={welcome} onEnter={() => setVerBoasVindas(false)} onLogout={logout} alunoStats={alunoStats} />
      </ThemeShell>
    );
  }

  // menus por perfil
  const menuAluno = [
    { k: "dashboard", label: "Dashboard", icon: LayoutDashboard },
    { k: "semana", label: "Semana", icon: CalendarDays },
    { k: "cursos", label: "Cursos em vídeo", icon: PlayCircle },
    { k: "redacao", label: "Redação", icon: PenLine },
    { k: "questoes", label: "Banco de Questões", icon: FileQuestion },
    { k: "desempenho", label: "Desempenho", icon: TrendingUp },
    { k: "conquistas", label: "Conquistas", icon: Trophy },
    { k: "plano", label: "Plano de Estudos", icon: ListChecks },
    { k: "organizacao", label: "Organização Pessoal", icon: Clock4 },
    { k: "anotacoes", label: "Anotações Rápidas", icon: NotebookPen },
    { k: "simulados", label: "Simulados", icon: FileText },
    { k: "materiais", label: "Materiais", icon: Library },
    { k: "boasvindas", label: "Boas-Vindas", icon: GraduationCap },
  ];
  const menuMod = [
    { k: "alunos", label: "Alunos", icon: Users },
    { k: "cursosmod", label: "Cursos em vídeo", icon: PlayCircle },
    { k: "redacaomod", label: "Redação", icon: PenLine },
    { k: "planomod", label: "Plano de Estudos", icon: ListChecks },
    { k: "simuladosmod", label: "Simulados", icon: FileText },
    { k: "materiaismod", label: "Materiais", icon: Library },
    { k: "boasvindasmod", label: "Boas-Vindas", icon: Settings2 },
  ];

  const menu = user.role === "moderador" ? menuMod : menuAluno;

  return (
    <ThemeShell>
      <Shell user={user} menu={menu} active={active} setActive={setActive} onLogout={logout}>
        {/* ----- ALUNO ----- */}
        {active === "dashboard" && <AlunoDashboard store={alunoStore} setStore={setAlunoStore} vestibular={(alunos.find((a) => a.id === user.uid) || {}).vestibular} disp={disp} semana={semanaEditada || semana} setSemana={setSemana} ciclo={cicloAtual} onReplan={registrarReplan} questoesPorHora={questoesPorHora} recados={recadosPorAluno[user.uid] || []} revisoes={revisoes.filter((r) => r.alunoId === user.uid)} />}
        {active === "semana" && <AlunoSemana semana={semana} ciclo={cicloAtual} semanaEditada={semanaEditada} setSemanaEditada={(novaEd) => { setSemanaEditada(novaEd); if (novaEd) setAlunoStore((prev) => ({ ...prev, metasHoje: novaEd.seg || prev.metasHoje })); }} />}
        {active === "cursos" && <AlunoCursos playlists={playlists} vestibular={(alunos.find((a) => a.id === user.uid) || {}).vestibular}
          assistidos={assistidosPorAluno[user.uid] || {}} setAssistidos={(a) => setAssistidosPorAluno({ ...assistidosPorAluno, [user.uid]: a })}
          aberta={playlistAberta} setAberta={setPlaylistAberta} />}
        {active === "redacao" && <AlunoRedacao user={user} devolutivas={devolutivas} setDevolutivas={setDevolutivas} instrucoes={instrucoesRedacao}
          playlists={playlists} abrirPlaylist={(id) => { setPlaylistAberta(id); setActive("cursos"); }} />}
        {active === "questoes" && <AlunoQuestoes store={alunoStore} setStore={setAlunoStore} />}
        {active === "desempenho" && <AlunoDesempenho store={alunoStore} />}
        {active === "conquistas" && <AlunoConquistas store={alunoStore} />}
        {active === "plano" && <AlunoPlano ordemSubs={ordemSubs} setOrdemSubs={setOrdemSubs} />}
        {active === "organizacao" && <AlunoOrganizacao disp={disp} setDisp={setDisp} onRecalc={recalc} recesso={recessoPorAluno[user.uid]} setRecesso={(r) => setRecessoPorAluno({ ...recessoPorAluno, [user.uid]: r })} />}
        {active === "anotacoes" && <AlunoAnotacoes notas={notas} setNotas={setNotas} />}
        {active === "simulados" && <AlunoSimulados simulados={simulados} user={user} envios={envios} setEnvios={setEnvios} />}
        {active === "materiais" && <AlunoMateriais materiais={materiais} user={user} />}
        {active === "boasvindas" && <WelcomePage welcome={welcome} isStandalone />}

        {/* ----- MODERADOR ----- */}
        {active === "alunos" && <ModAlunos alunos={alunos} setAlunos={setAlunos} envios={envios} setEnvios={setEnvios} materiais={materiais} setMateriais={setMateriais} simulados={simulados} setSimulados={setSimulados} progressoAlunos={progressoAlunos} revisoes={revisoes} setRevisoes={setRevisoes} anotacoesMod={anotacoesMod} setAnotacoesMod={setAnotacoesMod} recadosPorAluno={recadosPorAluno} setRecadosPorAluno={setRecadosPorAluno} historicoReplan={historicoReplan} ciclosPorAluno={ciclosPorAluno} setCiclosPorAluno={setCiclosPorAluno} dispPorAluno={dispPorAluno} />}
        {active === "cursosmod" && <ModCursos playlists={playlists} setPlaylists={setPlaylists} />}
        {active === "redacaomod" && <ModRedacao alunos={alunos} devolutivas={devolutivas} setDevolutivas={setDevolutivas} instrucoes={instrucoesRedacao} setInstrucoes={setInstrucoesRedacao} />}
        {active === "planomod" && <ModPlano plano={plano} setPlano={setPlano} />}
        {active === "simuladosmod" && <ModSimulados simulados={simulados} setSimulados={setSimulados} />}
        {active === "materiaismod" && <ModMateriais materiais={materiais} setMateriais={setMateriais} alunos={alunos} />}
        {active === "boasvindasmod" && <ModBoasVindas welcome={welcome} setWelcome={setWelcome} />}
      </Shell>
    </ThemeShell>
  );
}

// Tela de boas-vindas em tela cheia (gate pós-login), com seu próprio fundo
function BoasVindasGate({ welcome, onEnter, onLogout, alunoStats }) {
  const p = usePalette();
  const { dark, toggle } = useTheme();
  return (
    <div style={{ minHeight: "100vh", background: p.bg, padding: "40px 24px" }}>
      <div style={{ position: "fixed", top: 20, right: 20, display: "flex", gap: 10, zIndex: 5 }}>
        <button onClick={toggle} style={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, padding: 9, cursor: "pointer", color: p.text }}>{dark ? <Sun size={17} /> : <Moon size={17} />}</button>
        <button onClick={onLogout} style={{ background: p.surface, border: "1px solid " + p.border, borderRadius: 10, padding: "9px 14px", cursor: "pointer", color: p.textSoft, fontSize: 13, fontWeight: 600, display: "flex", alignItems: "center", gap: 6 }}><LogOut size={15} /> Sair</button>
      </div>
      <WelcomePage welcome={welcome} onEnter={onEnter} alunoStats={alunoStats} />
    </div>
  );
}

// Provider de tema + injeção de estilos globais e classe no root para o bg
function ThemeShell({ children }) {
  return (
    <ThemeProvider>
      <GlobalStyles />
      <Root>{children}</Root>
    </ThemeProvider>
  );
}
function Root({ children }) {
  const p = usePalette();
  return <div style={{ background: p.bg, color: p.text, minHeight: "100vh", fontFamily: "'Plus Jakarta Sans', -apple-system, system-ui, sans-serif" }}>{children}</div>;
}

function GlobalStyles() {
  const { dark } = useTheme();
  return (
    <style>{`
      @import url('https://fonts.googleapis.com/css2?family=Plus+Jakarta+Sans:wght@400;500;600;700;800;900&display=swap');
      * { box-sizing: border-box; }
      body { margin: 0; }
      @keyframes fadeIn { from { opacity: 0; transform: translateY(6px); } to { opacity: 1; transform: none; } }
      @keyframes popIn { from { opacity: 0; transform: scale(.94); } to { opacity: 1; transform: scale(1); } }
      @keyframes slideIn { from { transform: translateX(-100%); } to { transform: none; } }
      ::-webkit-scrollbar { width: 9px; height: 9px; }
      ::-webkit-scrollbar-track { background: transparent; }
      ::-webkit-scrollbar-thumb { background: ${dark ? "#2a2e37" : "#d4d8de"}; border-radius: 99px; }
      ::-webkit-scrollbar-thumb:hover { background: #f97316; }
      input[type=number]::-webkit-inner-spin-button { opacity: .4; }

      @media (max-width: 900px) {
        .sidebar-desktop { display: none !important; }
        .menu-btn { display: block !important; }
        .welcome-grid { grid-template-columns: 1fr !important; }
        .chart-grid { grid-template-columns: 1fr !important; }
        .plano-grid { grid-template-columns: 1fr !important; }
        .week-grid { grid-template-columns: repeat(2,1fr) !important; }
        .stat-grid { grid-template-columns: 1fr !important; }
        .curso-grid { grid-template-columns: 1fr !important; }
        .aluno-stats { display: none !important; }
      }
      @media (min-width: 901px) { .sidebar-mobile, .sidebar-overlay { display: none; } }
      @media (max-width: 560px) {
        .week-grid { grid-template-columns: 1fr !important; }
      }
    `}</style>
  );
}

export default App;
