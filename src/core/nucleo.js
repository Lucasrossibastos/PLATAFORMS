/* ============================================================================
   NÚCLEO DA PLATAFORMA DE VESTIBULAR — tudo que NÃO é visual
   ----------------------------------------------------------------------------
   Extraído do protótipo (src/App.jsx). Sem React, sem estilos: pode ser usado
   com qualquer layout/arte. Dados são mock em memória; os comentários
   "FIREBASE" marcam onde entra a persistência real.

   Conteúdo:
   · Usuários e papéis (aluno / moderador)
   · Taxonomia: áreas → matérias → tópicos → subtópicos
   · Vestibulares e templates de ciclo de estudo por vestibular
   · Motor de metas: distribui minutos semanais por matéria nos dias,
     respeitando a disponibilidade diária; integra revisões espaçadas;
     replaneja metas atrasadas; recálculo inteligente do plano
   · Conquistas (regras), consistência mensal, recesso/férias
   · Questões, simulados (gabarito por questão), envios de simulados externos
   · Cursos em vídeo (playlists) e devolutivas de redação (competências ENEM)

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
============================================================================ */

const MOCK_USERS = [
  { uid: "mod1", name: "Prof. Moderador", email: "moderador@curso.com", password: "123", role: "moderador" },
  { uid: "alu1", name: "Ana Beatriz", email: "aluno@curso.com", password: "123", role: "aluno" },
];

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

// Modelos de prova para CLASSIFICAR um simulado (lista do aluno ao anexar).
// Diferente da lista de vestibular-alvo: aqui o aluno indica de qual prova é o
// simulado que está enviando.

const MODELOS_PROVA = [
  { id: "enem", nome: "ENEM", cor: "#C9793A" },
  { id: "fuvest", nome: "FUVEST", cor: "#D0555F" },
  { id: "unicamp", nome: "UNICAMP", cor: "#4B8FC4" },
  { id: "unesp", nome: "UNESP", cor: "#C9A13A" },
  { id: "bahiana", nome: "BAHIANA", cor: "#3FA99B" },
  { id: "insper", nome: "INSPER", cor: "#8A8FD6" },
  { id: "fgv", nome: "FGV", cor: "#9A84C9" },
];

const modeloInfo = (id) => MODELOS_PROVA.find((v) => v.id === id) || VESTIBULARES.find((v) => v.id === id) || MODELOS_PROVA[0];

// Ciclo de estudos do aluno (mock) — 🔥 FIREBASE: /students/{uid}/cycle

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

// CORREÇÃO 4: data local no formato YYYY-MM-DD (toISOString converte para UTC).
const isoLocal = (dt = new Date()) =>
  `${dt.getFullYear()}-${String(dt.getMonth() + 1).padStart(2, "0")}-${String(dt.getDate()).padStart(2, "0")}`;

function semanaKey(dt = new Date()) {
  const d = new Date(dt); d.setHours(0, 0, 0, 0);
  const dow = d.getDay(); // 0=dom
  const seg = new Date(d); seg.setDate(d.getDate() - (dow === 0 ? 6 : dow - 1));
  return isoLocal(seg);
}

// CORREÇÃO 1: uma alocação cujo materiaId é o id de uma ÁREA vira uma alocação
// por matéria da área. Os minutos são repartidos pela carga horária dos tópicos,
// em múltiplos de 15 min; o que sobrar fica com a matéria de maior carga.
function expandirAlocacoes(alocacoes = []) {
  return alocacoes.flatMap((aloc) => {
    const area = AREAS.find((a) => a.id === aloc.materiaId);
    if (!area) return [aloc];
    const total = aloc.minutosSemanais || 0;
    const partes = area.materias.map((m) => ({
      m, carga: m.topicos.reduce((s, t) => s + (t.carga || 0), 0) || 1, min: 0,
    }));
    const cargaTotal = partes.reduce((s, x) => s + x.carga, 0);
    partes.forEach((x) => { x.min = Math.floor((total * x.carga) / cargaTotal / 15) * 15; });
    const porCarga = [...partes].sort((a, b) => b.carga - a.carga);
    let resto = total - partes.reduce((s, x) => s + x.min, 0);
    for (let i = 0; resto >= 15; i = (i + 1) % porCarga.length) { porCarga[i].min += 15; resto -= 15; }
    porCarga[0].min += resto;
    return partes.filter((x) => x.min > 0).map((x) => ({
      materiaId: x.m.id, materiaNome: x.m.nome, minutosSemanais: x.min,
      maxSessao: aloc.maxSessao, areaOrigem: area.id,
    }));
  });
}

// CORREÇÃO 2: o tópico da vez é o primeiro (na ordem do plano) que o aluno
// ainda não concluiu. Sem progresso informado, vale o comportamento antigo.
function topicoDaVez(materiaId, progresso) {
  const topicos = MATERIAS_FLAT.find((m) => m.id === materiaId)?.topicos || [];
  if (!progresso) return topicos[0];
  return topicos.find((t) => (progresso[t.id] || 0) < 100) || topicos[0];
}

function distribuirSemana(cicloConfig, disp, revisoes = [], opcoes = {}) {
  // normaliza: aceita tanto { alocacoes } quanto o formato legado { blocos }
  const alocacoes = expandirAlocacoes(cicloConfig?.alocacoes
    || (cicloConfig?.blocos || []).map((b) => ({ ...b, minutosSemanais: b.minutos * 5, maxSessao: b.minutos }))
    || []);

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
    const topico = topicoDaVez(sessao.materiaId, opcoes.progresso);
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

function gerarSemana(cicloConfig, disp, revisoes = [], opcoes = {}) {
  return distribuirSemana(cicloConfig, disp, revisoes, opcoes);
}

function resumoCicloSemanal(cicloConfig, disp) {
  const totalDisp = Object.values(disp || {}).reduce((s, v) => s + v, 0);
  const alocacoes = cicloConfig?.alocacoes || [];
  const totalAloc = alocacoes.reduce((s, a) => s + (a.minutosSemanais || 0), 0);
  return { totalDisp, totalAloc, overflow: totalAloc > totalDisp };
}

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

function recalcularPlanoInteligente(cicloConfig, disp, semanaAtual, atrasadas, revisoes = [], opcoes = {}) {
  // extrai alocações no novo formato ou converte do antigo
  const alocacoes = expandirAlocacoes(cicloConfig?.alocacoes
    || (cicloConfig?.blocos || []).map((b) => ({ ...b, minutosSemanais: b.minutos * 5, maxSessao: b.minutos }))
    || []);
  // CORREÇÃO 3: dias anteriores a opcoes.hoje não recebem metas novas
  const idxHoje = opcoes.hoje ? DIAS.findIndex((d) => d.k === opcoes.hoje) : 0;
  const jaPassou = (k) => DIAS.findIndex((d) => d.k === k) < idxHoje;
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
    capacidade[d.k] = jaPassou(d.k) ? 0 : Math.max(0, (disp[d.k] || 0) - feitoMin);
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

  // 6) duas filas, nesta ordem:
  //    a) PENDÊNCIAS de cada matéria (CORREÇÃO 6: antes elas disputavam espaço
  //       com as sessões típicas, na ordem das alocações, e podiam ficar de fora);
  //    b) o que ainda FALTA da cota semanal de matérias sem pendência
  //       (CORREÇÃO 7: antes entrava uma "sessão típica" = semanal/5 para toda
  //       matéria sem pendência, mesmo com a cota da semana já cumprida).
  let totalRealocado = 0, materiasFundidas = 0;
  const feitoPorMat = {};
  DIAS.forEach((d) => (semanaAtual[d.k] || []).forEach((m) => {
    if (m.done && m.tipo !== "revisao") feitoPorMat[m.materiaId] = (feitoPorMat[m.materiaId] || 0) + m.minutos;
  }));
  const filaPendencias = [], filaCota = [];
  alocacoes.forEach((aloc) => {
    const sessaoTipica = Math.min(aloc.maxSessao || 90, Math.round((aloc.minutosSemanais || 0) / 5));
    const pend = pendentePorMat[aloc.materiaId];
    if (pend && pend.minutos > 0) {
      filaPendencias.push({ ...pend, fundida: pend.minutos > sessaoTipica });
      if (pend.minutos > sessaoTipica) materiasFundidas++;
    } else {
      const falta = (aloc.minutosSemanais || 0) - (feitoPorMat[aloc.materiaId] || 0);
      if (falta >= 15) filaCota.push({ materiaId: aloc.materiaId, materia: aloc.materiaNome, minutos: falta, fundida: false });
    }
  });
  // CORREÇÃO 5: pendências de matérias fora do ciclo (ex.: tempo extra pedido
  // pelo aluno) também voltam para a fila, em vez de sumirem no recálculo.
  Object.values(pendentePorMat).forEach((pend) => {
    if (pend.minutos > 0 && !filaPendencias.some((f) => f.materiaId === pend.materiaId)) filaPendencias.push({ ...pend, fundida: false });
  });

  // 7) distribui cada fila pelos dias, em rodadas, respeitando o teto (já
  //    descontadas as revisões). CORREÇÃO 8: pendência que não couber não é
  //    descartada; volta em resumo.naoCouberam para continuar como atrasada.
  const naoCouberam = [];
  let seq = 0;
  const distribuir = (fila, guardarSobra) => {
    let guard = 0, idx = 0;
    while (fila.some((f) => f.minutos > 0) && guard < 200) {
      const item = fila[idx % fila.length];
      if (item.minutos > 0) {
        const dk = DIAS.map((d) => d.k).find((k) => capacidade[k] >= Math.min(15, item.minutos));
        if (dk) {
          const aloca = Math.min(capacidade[dk], item.minutos);
          const topico = topicoDaVez(item.materiaId, opcoes.progresso);
          novaSemana[dk].push({
            id: `r${Date.now()}-${seq++}`, materiaId: item.materiaId, materia: item.materia,
            topicoId: topico?.id, topico: topico ? topico.nome : item.materia,
            minutos: aloca, done: false, replanejada: true, tipo: "ciclo",
          });
          capacidade[dk] -= aloca; item.minutos -= aloca; totalRealocado += aloca;
        } else {
          if (guardarSobra) naoCouberam.push({ materiaId: item.materiaId, materia: item.materia, minutos: item.minutos });
          item.minutos = 0; // sem folga em lugar nenhum
        }
      }
      idx++; guard++;
    }
    if (guardarSobra) fila.filter((f) => f.minutos > 0).forEach((f) => naoCouberam.push({ materiaId: f.materiaId, materia: f.materia, minutos: f.minutos }));
  };
  distribuir(filaPendencias, true);
  distribuir(filaCota, false);

  return {
    semana: novaSemana,
    resumo: {
      totalRealocado, materiasFundidas, qtdPendencias: Object.keys(pendentePorMat).length, totalRevisoes,
      naoCouberam, minutosSemEspaco: naoCouberam.reduce((s, x) => s + x.minutos, 0),
    },
  };
}

const WELCOME_INICIAL = {
  hero: {
    foto: null,
    nome: "Joca & Rossini",
    subtitulo: "Texto de exemplo: edite em Boas-Vindas, no painel do moderador.",
    cor: "#C9793A",
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
  { id: "m1", titulo: "Apostila de Funções", vestibular: "FUVEST", area: "Matemática", materia: "Álgebra", para: "todos", cor: "#C9793A" },
  { id: "m2", titulo: "Resumo de Mecânica", vestibular: "UNICAMP", area: "Naturais", materia: "Física", para: "todos", cor: "#5AA555" },
  { id: "m3", titulo: "Modernismo Brasileiro", vestibular: "FUVEST", area: "Linguagens", materia: "Literatura", para: "especificos", cor: "#4B8FC4" },
  { id: "m4", titulo: "Era Vargas Completa", vestibular: "UNICAMP", area: "Humanas", materia: "História", para: "todos", cor: "#8FB3FF" },
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

const CATEGORIAS_PLAYLIST = [
  { id: "introducao", nome: "Introdução ao curso" },
  { id: "atualidades", nome: "Atualidades" },
  { id: "redacao", nome: "Redação" },
  { id: "outro", nome: "Outros cursos" },
];

const CORES_PLAYLIST = ["#C9793A", "#4B8FC4", "#8FB3FF", "#5AA555", "#FF6B5E", "#3FA99B", "#C9A13A"];

const PLAYLISTS_INICIAIS = [
  { id: "pl1", titulo: "Introdução ao curso", categoria: "introducao", cor: "#C9793A", publicada: true, para: "todos",
    descricao: "Comece por aqui: como o método funciona, como usar a plataforma e como montar o seu plano.",
    videos: [
      { id: "v1", titulo: "Boas-vindas: como o curso funciona", descricao: "Visão geral do método: ciclos de estudo, metas diárias e revisão espaçada.", duracao: "08:30", fonte: "exemplo" },
      { id: "v2", titulo: "Montando o seu plano de estudos", descricao: "Como escolher o vestibular-foco, os horários e a incidência de cada matéria.", duracao: "12:10", fonte: "exemplo" },
      { id: "v3", titulo: "Revisão espaçada na prática", descricao: "Por que revisar em 1, 7, 15 e 30 dias e como a plataforma agenda isso.", duracao: "09:45", fonte: "exemplo" },
    ] },
  { id: "pl2", titulo: "Atualidades · Outubro/2026", categoria: "atualidades", cor: "#4B8FC4", publicada: true, para: "todos",
    descricao: "Os temas do mês com o gancho para a prova e para a redação.",
    videos: [
      { id: "v4", titulo: "Transição energética e o Brasil", descricao: "Como o tema aparece em Geografia e em propostas de redação.", duracao: "15:20", fonte: "exemplo" },
      { id: "v5", titulo: "Inteligência artificial e trabalho", descricao: "Repertórios e dados para usar na argumentação.", duracao: "11:05", fonte: "exemplo" },
    ] },
  { id: "pl3", titulo: "Redação · dissecando textos nota 1000", categoria: "redacao", cor: "#8FB3FF", publicada: true, para: "todos",
    descricao: "Leitura comentada de redações nota máxima, parágrafo por parágrafo.",
    videos: [
      { id: "v6", titulo: "Introdução: tese e repertório", descricao: "Como a tese é apresentada já no primeiro parágrafo.", duracao: "13:40", fonte: "exemplo" },
      { id: "v7", titulo: "Desenvolvimento: argumentação em camadas", descricao: "Tópico frasal, fundamentação e fechamento de cada parágrafo.", duracao: "16:25", fonte: "exemplo" },
    ] },
  { id: "pl4", titulo: "Aulão de véspera FUVEST", categoria: "outro", cor: "#FF6B5E", publicada: false, para: "fuvest",
    descricao: "Revisão final dos temas de maior incidência.",
    videos: [
      { id: "v8", titulo: "Os 10 temas que mais caem", descricao: "", duracao: "45:00", fonte: "exemplo" },
    ] },
];

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

export {
  MOCK_USERS,
  AREAS,
  MATERIAS_FLAT,
  TOPICOS_FLAT,
  topicosDaMateria,
  VESTIBULARES,
  vestInfo,
  MODELOS_PROVA,
  modeloInfo,
  CICLO_TEMPLATES,
  CICLOS_POR_ALUNO_INICIAL,
  CICLO_PADRAO,
  getCicloAluno,
  DISP_POR_ALUNO_INICIAL,
  DISP_PADRAO,
  getDispAluno,
  DIAS,
  fmtMin,
  dataParaDiaSemana,
  revisoesPorDiaSemana,
  isoLocal,
  semanaKey,
  expandirAlocacoes,
  topicoDaVez,
  distribuirSemana,
  gerarSemana,
  resumoCicloSemanal,
  replanejarAtrasadas,
  recalcularPlanoInteligente,
  WELCOME_INICIAL,
  ALUNOS_INICIAIS,
  SIMULADOS_INICIAIS,
  MATERIAIS_INICIAIS,
  QUESTOES_INICIAIS,
  ENVIOS_INICIAIS,
  PROGRESSO_INICIAL,
  REVISOES_INICIAIS,
  ANOTACOES_INICIAIS,
  DESEMPENHO_SIMULADOS_INICIAL,
  CONQUISTAS_CATALOGO,
  gerarConsistenciaMock,
  RECESSO_INICIAL,
  CATEGORIAS_PLAYLIST,
  CORES_PLAYLIST,
  PLAYLISTS_INICIAIS,
  provedorDoLink,
  COMPETENCIAS_ENEM,
  CANAIS_ENVIO,
  INSTRUCOES_REDACAO_INICIAL,
  rubricaPadrao,
  hojeISO,
  fmtData,
  notaDevolutiva,
  DEVOLUTIVAS_INICIAIS,
};
