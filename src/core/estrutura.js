/* Estrutura acadêmica: ÁREA → MATÉRIA → TÓPICO → SUBTÓPICO, cada um com id.
   As coleções vêm do banco (o moderador cadastra); aqui só há leitura e a
   estrutura inicial opcional, que o moderador importa se quiser. */

import { AREAS, VESTIBULARES } from "./nucleo.js";

const porOrdem = (a, b) => (a.ordem ?? 0) - (b.ordem ?? 0) || String(a.nome).localeCompare(String(b.nome), "pt-BR");

/* Índice de consulta rápida sobre as coleções normalizadas. */
export function indiceEstrutura({ areas = [], materias = [], topicos = [], subtopicos = [], vestibulares = [], cursos = [] } = {}) {
  const mapa = (lista) => new Map(lista.map((x) => [x.id, x]));
  const A = mapa(areas), M = mapa(materias), T = mapa(topicos), S = mapa(subtopicos);
  const V = mapa(vestibulares), C = mapa(cursos);
  const agrupar = (lista, campo) => {
    const g = new Map();
    lista.forEach((x) => { if (!g.has(x[campo])) g.set(x[campo], []); g.get(x[campo]).push(x); });
    g.forEach((l) => l.sort(porOrdem));
    return g;
  };
  const materiasPorArea = agrupar(materias, "areaId");
  const topicosPorMateria = agrupar(topicos, "materiaId");
  const subtopicosPorTopico = agrupar(subtopicos, "topicoId");

  return {
    areas: [...areas].sort(porOrdem),
    materias: [...materias].sort((a, b) => String(a.nome).localeCompare(String(b.nome), "pt-BR")),
    vestibulares: [...vestibulares].sort(porOrdem),
    cursos: [...cursos].sort(porOrdem),
    area: (id) => A.get(id),
    materia: (id) => M.get(id),
    topico: (id) => T.get(id),
    subtopico: (id) => S.get(id),
    vestibular: (id) => V.get(id),
    curso: (id) => C.get(id),
    materiasDaArea: (id) => materiasPorArea.get(id) || [],
    topicosDaMateria: (id) => topicosPorMateria.get(id) || [],
    subtopicosDoTopico: (id) => subtopicosPorTopico.get(id) || [],
    corDaMateria: (id) => A.get(M.get(id)?.areaId)?.cor,
    nomeMateria: (id) => M.get(id)?.nome || "Matéria removida",
    nomeTopico: (id) => T.get(id)?.nome || "Tópico removido",
    nomeSubtopico: (id) => S.get(id)?.nome || "",
    nomeVestibular: (id) => V.get(id)?.nome || "",
    nomeCurso: (id) => C.get(id)?.nome || "",
  };
}

const slug = (s) => s.normalize("NFD").replace(/[̀-ͯ]/g, "").toLowerCase().replace(/[^a-z0-9]+/g, "-").replace(/(^-|-$)/g, "");

/* Estrutura inicial (a do protótipo) em formato normalizado, com ids
   estáveis também para os subtópicos, que antes eram só texto. */
export function estruturaInicial() {
  const areas = [], materias = [], topicos = [], subtopicos = [];
  AREAS.forEach((a, ia) => {
    areas.push({ id: a.id, nome: a.nome, cor: a.cor, ordem: ia });
    a.materias.forEach((m, im) => {
      materias.push({ id: m.id, areaId: a.id, nome: m.nome, ordem: im });
      m.topicos.forEach((t, it) => {
        topicos.push({ id: t.id, materiaId: m.id, nome: t.nome, ordem: it, cargaMin: t.carga });
        const cargaSub = Math.max(15, Math.round(t.carga / Math.max(1, t.subs.length) / 5) * 5);
        t.subs.forEach((s, is) => {
          subtopicos.push({ id: `${t.id}-${slug(s)}`, topicoId: t.id, nome: s, ordem: is, cargaMin: cargaSub });
        });
      });
    });
  });
  const vestibulares = VESTIBULARES.map((v, i) => ({ id: v.id, nome: v.nome, cor: v.cor, ordem: i }));
  const cursos = [
    { id: "medicina", nome: "Medicina", ordem: 0 },
    { id: "direito", nome: "Direito", ordem: 1 },
    { id: "engenharia", nome: "Engenharia", ordem: 2 },
    { id: "economia", nome: "Economia", ordem: 3 },
  ];
  return { areas, materias, topicos, subtopicos, vestibulares, cursos };
}
