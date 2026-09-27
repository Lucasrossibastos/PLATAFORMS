import {
  CalendarDays, FileQuestion, FileText, GraduationCap, LayoutDashboard, Library, ListChecks,
  NotebookPen, PenLine, PlayCircle, Settings2, Clock4, TrendingUp, Trophy, Type, Users,
} from "lucide-react";

/* Menus por papel. `pronto: false` mostra a tela "próxima etapa" com o que
   ela vai fazer (texto tirado da especificação funcional). */

export const MENU_ALUNO = [
  { k: "dashboard", label: "Dashboard", icone: LayoutDashboard, pronto: true },
  { k: "semana", label: "Semana", icone: CalendarDays, pronto: true },
  { k: "cursos", label: "Cursos em vídeo", icone: PlayCircle, pronto: true },
  { k: "redacao", label: "Redação", icone: PenLine, pronto: true },
  { k: "questoes", label: "Banco de Questões", icone: FileQuestion,
    resumo: "Registro de blocos de questões por matéria e tópico. O registro rápido já funciona no Dashboard.",
    itens: ["Lista com filtros por matéria, tópico e período", "Totais e taxa de acerto"] },
  { k: "desempenho", label: "Desempenho", icone: TrendingUp,
    resumo: "Quatro abas: Questões, Simulados, Calendário e Perspectiva.",
    itens: ["Acertos × erros, evolução e comparação por matéria", "Resultados dos simulados", "Calendário de consistência do mês", "Previsão de conclusão e matérias em risco"] },
  { k: "conquistas", label: "Conquistas", icone: Trophy,
    resumo: "Catálogo de conquistas com a regra de cada uma.",
    itens: ["Sequência de dias, questões, tópicos, revisões, acerto e simulados", "Conquistadas e a conquistar"] },
  { k: "plano", label: "Plano de Estudos", icone: ListChecks,
    resumo: "Áreas, matérias e tópicos com o percentual concluído.",
    itens: ["Reordenar subtópicos arrastando"] },
  { k: "organizacao", label: "Organização Pessoal", icone: Clock4,
    resumo: "Horas livres por dia da semana: é o limite diário que o motor de metas respeita.",
    itens: ["Total semanal", "Salvar e recalcular a semana", "Modo férias/pausa: período sem metas, sem gerar atraso"] },
  { k: "anotacoes", label: "Anotações Rápidas", icone: NotebookPen,
    resumo: "Notas rápidas por área e matéria.", itens: [] },
  { k: "simulados", label: "Simulados", icone: FileText,
    resumo: "Resolver os simulados cadastrados e enviar simulados externos.",
    itens: ["Gabarito por questão e resultado por matéria e tópico", "Envio de PDF + modelo de prova para o professor classificar"] },
  { k: "materiais", label: "Materiais", icone: Library,
    resumo: "PDFs por vestibular e matéria.", itens: ["Visíveis para todos ou só para alunos específicos"] },
  { k: "boas-vindas", label: "Boas-Vindas", icone: GraduationCap, pronto: true },
];

export const MENU_MODERADOR = [
  { k: "alunos", label: "Alunos", icone: Users,
    resumo: "A turma com métricas e o perfil completo de cada aluno.",
    itens: ["Questões, horas e progresso por aluno", "Aviso de simulados enviados para classificar", "Visão comparativa da turma e cadastro de aluno", "Perfil com desempenho, plano, revisões espaçadas, ciclo de estudos, materiais, histórico de replanejamentos, anotações privadas e recados"] },
  { k: "textos", label: "Textos", icone: Type, pronto: true },
  { k: "cursos", label: "Cursos em vídeo", icone: PlayCircle, pronto: true },
  { k: "redacao", label: "Redação", icone: PenLine, pronto: true },
  { k: "plano", label: "Plano de Estudos", icone: ListChecks,
    resumo: "Editar a taxonomia: tópicos, carga horária e subtópicos.", itens: [] },
  { k: "simulados", label: "Simulados", icone: FileText,
    resumo: "Cadastrar simulados: PDF e gabarito por questão, com matéria e tópico.", itens: [] },
  { k: "materiais", label: "Materiais", icone: Library,
    resumo: "Upload de PDFs e controle de visibilidade.", itens: [] },
  { k: "boas-vindas", label: "Boas-Vindas", icone: Settings2,
    resumo: "Editor de blocos da página de boas-vindas, com pré-visualização.",
    itens: ["Blocos de título, texto, foto, destaque e divisor"] },
];

export const baseDoPapel = (role) => (role === "moderador" ? "/moderador" : "/aluno");
