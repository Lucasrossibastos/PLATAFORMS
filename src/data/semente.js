/* Instalação de demonstração (só no modo local, com o banco vazio).
   Cria contas de teste, a estrutura acadêmica, planos gerais por vestibular e
   o plano de cada aluno de teste. NÃO cria histórico: questões, simulados,
   sessões, redações e notificações começam vazios e só existem se alguém
   registrar de verdade. */

import { CICLO_TEMPLATES, DISP_PADRAO, INSTRUCOES_REDACAO_INICIAL, expandirAlocacoes, isoLocal } from "../core/nucleo.js";
import { estruturaInicial, indiceEstrutura } from "../core/estrutura.js";
import { REVISAO_PADRAO, PERMISSOES_PADRAO, planoDoModelo, recalcularPlano } from "../core/plano.js";
import { COR_DESTAQUE_PADRAO } from "../textos.js";
import { carimbo } from "./contrato.js";

export const SENHA_DEMO = "123456";

export const CONTAS_DEMO = [
  { email: "moderador@curso.com", nome: "Prof. Moderador", role: "moderador" },
  { email: "aluno@curso.com", nome: "Ana Beatriz", role: "aluno", vestibularId: "fuvest", cursoId: "medicina", turma: "Extensivo manhã" },
  { email: "carlos@curso.com", nome: "Carlos Eduardo", role: "aluno", vestibularId: "enem_med", cursoId: "medicina", turma: "Extensivo noite" },
  { email: "mariana@curso.com", nome: "Mariana Lopes", role: "aluno", vestibularId: "unicamp", cursoId: "engenharia", turma: "Extensivo manhã" },
];

export const BOAS_VINDAS_PADRAO = {
  hero: { foto: null, nome: "Seu curso", subtitulo: "Edite esta página em Textos, no painel do moderador.", cor: "#C9793A" },
  blocos: [
    { id: "b1", tipo: "titulo", texto: "Como usar a plataforma" },
    { id: "b2", tipo: "texto", texto: "1. Confira as metas de hoje no início e marque cada uma ao terminar.\n2. Em Meu plano, veja a sequência de conteúdos, o que está atrasado e a previsão de término.\n3. Registre as questões que resolver e os simulados que fizer.\n4. Acompanhe a sua evolução em Desempenho.\n5. Materiais, cursos em vídeo e devolutivas de redação ficam no menu." },
  ],
};

// planos gerais a partir dos ciclos do núcleo (uma área vira as suas matérias)
export function modelosIniciais(ind) {
  return Object.entries(CICLO_TEMPLATES).map(([vestibularId, t], i) => ({
    id: `modelo-${vestibularId}`,
    nome: `${t.nome} · Extensivo`,
    descricao: t.desc || "",
    vestibularId, cursoId: "", modalidade: "extensivo", periodo: "", versao: 1, dataAlvo: null, ritmo: 1,
    revisao: { ...REVISAO_PADRAO }, permissoesAluno: { ...PERMISSOES_PADRAO }, ordem: i,
    materias: expandirAlocacoes(t.alocacoes)
      .filter((a) => ind.materia(a.materiaId))
      .map((a) => ({
        materiaId: a.materiaId, minutosSemanais: a.minutosSemanais, maxSessao: a.maxSessao || 60, prioridade: 2, ritmo: 1,
        topicos: ind.topicosDaMateria(a.materiaId).map((tp) => ({ topicoId: tp.id, subtopicos: ind.subtopicosDoTopico(tp.id).map((s) => ({ subtopicoId: s.id })) })),
      })),
  }));
}

export async function semearDemonstracao(repo, { agora = new Date() } = {}) {
  if (!repo.vazio?.()) return false;
  const hojeIso = isoLocal(agora);
  const e = estruturaInicial();
  const ind = indiceEstrutura(e);
  const ops = [];
  Object.entries({ areas: e.areas, materias: e.materias, topicos: e.topicos, subtopicos: e.subtopicos, vestibulares: e.vestibulares, cursos: e.cursos })
    .forEach(([colecao, lista]) => lista.forEach(({ id, ...dados }) => ops.push({ tipo: "definir", colecao, id, dados: { ...dados, arquivado: false } })));

  const modelos = modelosIniciais(ind);
  modelos.forEach(({ id, ...dados }) => ops.push({ tipo: "definir", colecao: "modelosPlano", id, dados: { ...dados, arquivado: false, criadoEm: carimbo() } }));

  let moderadorId = null;
  for (const c of CONTAS_DEMO) {
    const uid = await repo.criarConta(c.email, SENHA_DEMO);
    const { email, nome, role, ...resto } = c;
    ops.push({ tipo: "definir", colecao: "usuarios", id: uid, dados: { role, nome, email, ativo: true, criadoEm: carimbo(), ...resto, ...(role === "aluno" ? { telefone: "", dataProva: null } : {}) } });
    if (role === "moderador") { moderadorId = uid; continue; }
    const modelo = modelos.find((m) => m.vestibularId === c.vestibularId);
    const plano = planoDoModelo(modelo, { id: uid }, { hojeIso, disponibilidade: DISP_PADRAO });
    const { plano: calculado } = recalcularPlano(plano, ind, {}, hojeIso);
    const { id: _i, ...dadosPlano } = calculado;
    ops.push({ tipo: "definir", colecao: "planos", id: uid, dados: { ...dadosPlano, alunoId: uid, atualizadoEm: carimbo() } });
    ops.push({ tipo: "definir", colecao: "progresso", id: uid, dados: { alunoId: uid, itens: {} } });
  }

  ops.push(
    { tipo: "definir", colecao: "config", id: "instalacao", dados: { moderadorId, em: carimbo(), demonstracao: true } },
    { tipo: "definir", colecao: "config", id: "textos", dados: { geral: {}, porGrupo: {}, corDestaque: COR_DESTAQUE_PADRAO } },
    { tipo: "definir", colecao: "config", id: "boasVindas", dados: structuredClone(BOAS_VINDAS_PADRAO) },
    { tipo: "definir", colecao: "config", id: "redacao", dados: { instrucoes: INSTRUCOES_REDACAO_INICIAL } },
  );
  await repo.lote(ops);
  return true;
}
