import {
  Bell, CalendarDays, FileQuestion, FileText, GraduationCap, House, Library, ListChecks, Megaphone,
  Network, PenLine, PlayCircle, TrendingUp, Type, Users,
} from "lucide-react";

/* Menus por papel. As quatro primeiras entradas viram pílulas no topo; o
   resto fica em "Mais". Toda entrada leva a uma tela que funciona. */

export const MENU_ALUNO = [
  { k: "inicio", label: "Hoje", icone: House },
  { k: "plano", label: "Meu plano", icone: ListChecks },
  { k: "questoes", label: "Questões", icone: FileQuestion },
  { k: "desempenho", label: "Desempenho", icone: TrendingUp },
  { k: "semana", label: "Semana", icone: CalendarDays },
  { k: "simulados", label: "Simulados", icone: FileText },
  { k: "materiais", label: "Materiais", icone: Library },
  { k: "cursos", label: "Cursos em vídeo", icone: PlayCircle },
  { k: "redacao", label: "Redação", icone: PenLine },
  { k: "avisos", label: "Avisos", icone: Bell },
  { k: "boas-vindas", label: "Boas-vindas", icone: GraduationCap },
];

export const MENU_MODERADOR = [
  { k: "alunos", label: "Alunos", icone: Users },
  { k: "planos", label: "Planos gerais", icone: ListChecks },
  { k: "estrutura", label: "Estrutura", icone: Network },
  { k: "materiais", label: "Materiais", icone: Library },
  { k: "avisos", label: "Avisos", icone: Megaphone },
  { k: "cursos", label: "Cursos em vídeo", icone: PlayCircle },
  { k: "redacao", label: "Redação", icone: PenLine },
  { k: "textos", label: "Textos e boas-vindas", icone: Type },
];

export const baseDoPapel = (role) => (role === "moderador" ? "/moderador" : "/aluno");
