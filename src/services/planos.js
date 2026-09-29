/* studyPlanService: jornadas (planos gerais, "modelos"), plano individual e progresso.

   planos/{alunoId}      cópia editável do modelo (materias, ritmo, datas, cronograma),
                         com horarios (versões do horário semanal) e sobrescritos
                         (o que o moderador mudou só para este aluno)
   progresso/{alunoId}   { itens: { [itemId]: { minutos, ciclos } } } (ver core/ciclos.js)
   revisoes/{id}         revisões automáticas antigas (não nascem mais; as agendadas terminam como metas)
   planosAnteriores/{id} plano substituído, guardado inteiro
   logs/{id}             quem mudou o quê, quando, antes e depois

   Toda alteração do plano recalcula só o que falta (recalcularPlano preserva
   o cronograma dos itens concluídos), nunca mexe nas sessões de estudo e
   refaz as metas das próximas duas semanas (services/metas.js). */

import { apagarCampo, carimbo, ErroDados, novoId } from "../data/contrato.js";
import {
  alterarPlano, idItem, impactoAlteracao, itensDoPlano, modeloVazio, planoDoModelo,
  recalcularPlano, sugerirModelo,
} from "../core/plano.js";
import { DISP_PADRAO } from "../core/nucleo.js";
import { estadoDoTopico, marcarTopicoVisto, reabrirTopico, tirarDoFimDaFila } from "../core/ciclos.js";
import { novaVersaoHorario } from "../core/horario.js";
import { limparSobrescrito, registrarSobrescritos, sobrescritosDoPlano } from "../core/jornada.js";
import { ErroValidacao, opsDeLog, porNome } from "./base.js";

/* Qual permissão do aluno cada alteração exige (null = só o moderador). */
export function permissaoDaOperacao(op) {
  if (op.tipo === "moverTopico") return "reordenar"; // grava só ordemTopicos
  if (op.tipo === "definirDuracaoMeta" || op.tipo === "definirTempoTopico") return "tempos"; // gravam só duracaoMeta / tempoTopico
  if (op.tipo === "definirPlano") {
    const campos = Object.keys(op.campos || {});
    if (campos.length && campos.every((c) => c === "disponibilidade")) return "disponibilidade";
    if (campos.length && campos.every((c) => c === "ritmo")) return "ritmo";
  }
  return null;
}

/* Versão de uma alteração da jornada para o plano de um aluno (null = não levar). */
const PADRAO_MATERIA = { prioridade: 2, ritmo: 1, ativa: true };
const valorMateria = (m, k) => (k === "ativa" ? m?.ativa !== false : m?.[k] ?? PADRAO_MATERIA[k] ?? null);
export function opParaAluno(op, modeloAntes, plano) {
  if (["moverMateria", "moverTopico", "moverSubtopico"].includes(op.tipo)) return null;
  const igual = (a, b) => JSON.stringify(a ?? null) === JSON.stringify(b ?? null);
  if (op.tipo === "definirMateria") {
    const naJornada = modeloAntes.materias?.find((m) => m.materiaId === op.materiaId);
    const noAluno = plano.materias?.find((m) => m.materiaId === op.materiaId);
    if (!noAluno) return null;
    const campos = Object.fromEntries(Object.entries(op.campos || {}).filter(([k]) => igual(valorMateria(noAluno, k), valorMateria(naJornada, k))));
    return Object.keys(campos).length ? { ...op, campos } : null;
  }
  if (op.tipo === "definirPlano") {
    const soDaJornada = ["nome", "descricao", "versao", "periodo"];
    const campos = Object.fromEntries(Object.entries(op.campos || {}).filter(([k]) => !soDaJornada.includes(k) && igual(plano[k], modeloAntes[k])));
    return Object.keys(campos).length ? { ...op, campos } : null;
  }
  if (op.tipo === "definirCarga") {
    const alvo = (p) => {
      const t = p.materias?.find((m) => m.materiaId === op.materiaId)?.topicos?.find((x) => x.topicoId === op.topicoId);
      return op.subtopicoId ? t?.subtopicos?.find((x) => x.subtopicoId === op.subtopicoId) : t;
    };
    return igual(alvo(plano)?.cargaMin, alvo(modeloAntes)?.cargaMin) ? op : null;
  }
  return op;
}

export function servicoPlanos(ctx, servicos) {
  const { repo } = ctx;

  async function carregar(alunoId) {
    const [plano, progresso, ind] = await Promise.all([repo.obter("planos", alunoId), repo.obter("progresso", alunoId), ctx.indice()]);
    return { plano, prog: progresso?.itens || {}, ind };
  }

  function validarModelo(m, ind) {
    const erros = {};
    if (!String(m.nome || "").trim()) erros.nome = "Dê um nome à jornada.";
    if (!m.vestibularId || !ind.vestibular(m.vestibularId)) erros.vestibularId = "Escolha o vestibular.";
    if (m.cursoId && !ind.curso(m.cursoId)) erros.cursoId = "Curso inválido.";
    if (m.dataAlvo && !/^\d{4}-\d{2}-\d{2}$/.test(m.dataAlvo)) erros.dataAlvo = "Data inválida.";
    if (Object.keys(erros).length) throw new ErroValidacao(erros);
  }

  // o mapa de sobrescritos de hoje (plano antigo: deduzido da jornada, sem a ordem, que vive em ordemTopicos)
  async function sobrescritosAtuais(plano) {
    if (plano.sobrescritos) return plano.sobrescritos;
    const modelo = plano.modeloId ? await repo.obter("modelosPlano", plano.modeloId) : null;
    const { mapa } = sobrescritosDoPlano(plano, modelo);
    return Object.fromEntries(Object.entries(mapa)
      .map(([id, x]) => { const { ordem: _o, ...resto } = x; return [id, resto]; })
      .filter(([, x]) => Object.keys(x).length));
  }

  // grava o plano recalculado + histórico; depois refaz as metas do aluno
  async function gravarPlano(alunoId, plano, prog, ind, entradas, { motivo, extra = [] } = {}) {
    const { plano: calculado, resumo } = recalcularPlano(plano, ind, prog, ctx.hoje());
    const { id: _id, ...dados } = calculado;
    const logId = novoId();
    await repo.lote([
      ...opsDeLog(ctx, { alunoId, entidade: "plano", entidadeId: alunoId, motivo, logId }, entradas),
      { tipo: "definir", colecao: "planos", id: alunoId, dados: { ...dados, alunoId, ultimoLogId: logId, atualizadoEm: carimbo() } },
      ...extra,
    ]);
    await refazerMetas(alunoId, motivo || entradas[0]?.descricao || "plano alterado", "plano");
    return resumo;
  }

  // as metas acompanham o plano; se o motor falhar, a virada do dia refaz
  const refazerMetas = (alunoId, motivo, gatilho) => servicos.metas?.recalcular(alunoId, { motivo, gatilho }).catch(() => {});

  // grava os ciclos de um tópico com o registro no mesmo lote
  async function gravarProgresso(alunoId, itemId, ciclos, entrada, motivo) {
    const logId = novoId();
    await repo.lote([
      ...opsDeLog(ctx, { alunoId, entidade: "plano", entidadeId: alunoId, motivo, logId }, [entrada]),
      { tipo: "mesclar", colecao: "progresso", id: alunoId, dados: { alunoId, ultimaOperacao: { tipo: "log", id: logId }, itens: { [itemId]: { ciclos } } } },
    ]);
  }

  return {
    permissaoDaOperacao,

    /* ---------- Jornadas (planos gerais) ---------- */

    observarModelos(cb) {
      ctx.exigir("gerenciar:modelos");
      return repo.observar("modelosPlano", [], (lista) => cb([...lista].sort(porNome)));
    },

    async salvarModelo(dados) {
      ctx.exigir("gerenciar:modelos");
      const ind = await ctx.indice();
      const base = dados.id ? await repo.obter("modelosPlano", dados.id) : modeloVazio();
      const modelo = { ...base, ...dados };
      validarModelo(modelo, ind);
      const id = dados.id || novoId();
      const { id: _i, ...doc } = modelo;
      await repo.lote([
        { tipo: "definir", colecao: "modelosPlano", id, dados: { ...doc, nome: doc.nome.trim(), arquivado: !!doc.arquivado, atualizadoEm: carimbo(), ...(dados.id ? {} : { criadoEm: carimbo() }) } },
        ...opsDeLog(ctx, { entidade: "modelo", entidadeId: id }, [{ tipo: dados.id ? "editar" : "criar", descricao: `${dados.id ? "Editou" : "Criou"} a jornada ${doc.nome.trim()}` }]),
      ]);
      return id;
    },

    async alterarModelo(id, ops) {
      ctx.exigir("gerenciar:modelos");
      const ind = await ctx.indice();
      let modelo = await repo.obter("modelosPlano", id);
      if (!modelo) throw new ErroDados("Jornada não encontrada.", "nao-encontrado");
      const entradas = [];
      (Array.isArray(ops) ? ops : [ops]).forEach((op) => {
        const r = alterarPlano(modelo, ind, op);
        modelo = r.plano;
        entradas.push(...r.log);
      });
      if (!entradas.length) return false;
      const { id: _i, ...doc } = modelo;
      await repo.lote([
        { tipo: "definir", colecao: "modelosPlano", id, dados: { ...doc, atualizadoEm: carimbo() } },
        ...opsDeLog(ctx, { entidade: "modelo", entidadeId: id }, entradas),
      ]);
      return true;
    },

    async duplicarModelo(id) {
      ctx.exigir("gerenciar:modelos");
      const m = await repo.obter("modelosPlano", id);
      if (!m) throw new ErroDados("Jornada não encontrada.", "nao-encontrado");
      const { id: _i, ...doc } = m;
      return this.salvarModelo({ ...doc, nome: `${m.nome} (cópia)`, versao: 1, arquivado: false });
    },

    async arquivarModelo(id, arquivado = true) {
      ctx.exigir("gerenciar:modelos");
      await repo.atualizar("modelosPlano", id, { arquivado, atualizadoEm: carimbo() });
    },

    sugerir: (modelos, aluno) => sugerirModelo(modelos.filter((m) => !m.arquivado), aluno),

    /* Jornada em um passo: todas as matérias do curso, com todos os tópicos,
       o mesmo peso para todas e metas de 1 h (depois é só ajustar). Não há
       horas por semana na jornada: cada aluno encaixa o tempo dos tópicos no
       horário dele. */
    async criarJornada({ nome, vestibularId, cursoId = "", dataAlvo = null, modalidade = "extensivo" }) {
      ctx.exigir("gerenciar:modelos");
      const ind = await ctx.indice();
      const nomePadrao = [ind.nomeVestibular(vestibularId), ind.nomeCurso(cursoId)].filter(Boolean).join(" · ");
      return this.salvarModelo({
        ...modeloVazio(),
        nome: String(nome || "").trim() || nomePadrao, vestibularId, cursoId, dataAlvo, modalidade,
        materias: ind.materias.map((m) => ({
          materiaId: m.id, peso: 5, maxSessao: 60, prioridade: 2, ritmo: 1,
          topicos: ind.topicosDaMateria(m.id).map((t) => ({ topicoId: t.id, subtopicos: ind.subtopicosDoTopico(t.id).map((x) => ({ subtopicoId: x.id })) })),
        })),
      });
    },

    /* Tópico novo criado direto na jornada (ou no plano de um aluno): entra na
       estrutura, na jornada e, com propagar, no plano de cada aluno dela. */
    async novoTopico({ materiaId, nome, cargaMin = 60, modeloId, alunoId, propagar = false, motivo = "" }) {
      ctx.exigir("gerenciar:estrutura");
      const topicoId = await servicos.estrutura.salvar("topico", { materiaId, nome, cargaMin });
      const op = { tipo: "adicionarTopico", materiaId, topicoId };
      await this.aplicarNaJornada({ modeloId, alunoId, op, propagar, motivo });
      return topicoId;
    },

    async novoSubtopico({ materiaId, topicoId, nome, modeloId, alunoId, propagar = false, motivo = "" }) {
      ctx.exigir("gerenciar:estrutura");
      const subtopicoId = await servicos.estrutura.salvar("subtopico", { topicoId, nome });
      const op = { tipo: "adicionarSubtopico", materiaId, topicoId, subtopicoId };
      await this.aplicarNaJornada({ modeloId, alunoId, op, propagar, motivo });
      return subtopicoId;
    },

    /* Alteração na jornada e, com propagar, nos planos dos alunos dela. O
       ajuste individual de cada aluno é mantido: um campo de matéria ou de
       regra só muda no aluno se ainda estiver igual ao da jornada; mudanças
       de ordem não são levadas (cada aluno pode ter a sua). */
    async alterarJornada(modeloId, ops, { propagar = false, motivo = "" } = {}) {
      const lista = Array.isArray(ops) ? ops : [ops];
      const antes = await repo.obter("modelosPlano", modeloId);
      const mudou = await this.alterarModelo(modeloId, lista);
      if (!propagar || !antes) return { mudou, alunos: 0 };
      const planos = await repo.listar("planos", [["modeloId", "==", modeloId]]);
      let alunos = 0;
      for (const p of planos) {
        const doAluno = lista.map((op) => opParaAluno(op, antes, p)).filter(Boolean);
        if (!doAluno.length) continue;
        const r = await this.alterar(p.id, doAluno, { motivo: motivo || "Levado pela jornada", daJornada: true });
        if (r.mudou) alunos++;
      }
      return { mudou, alunos };
    },

    // aplica uma alteração na jornada (com os alunos dela, se pedido) ou no plano de um aluno
    async aplicarNaJornada({ modeloId, alunoId, op, propagar = false, motivo = "" }) {
      if (modeloId) await this.alterarJornada(modeloId, op, { propagar, motivo: motivo || "Incluído pela jornada" });
      if (alunoId) await this.alterar(alunoId, op, { motivo });
    },

    alunosDaJornada: async (modeloId) => (await repo.listar("planos", [["modeloId", "==", modeloId]])).map((p) => p.id),

    /* Subtópicos que o aluno já viu (orientação dentro do tópico). */
    observarVistos(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observarDoc("vistos", alunoId, (d) => cb(d?.subtopicos || {}));
    },
    async marcarSubtopico(alunoId, subtopicoId, visto) {
      const plano = await repo.obter("planos", alunoId);
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "concluirItens" });
      await repo.mesclar("vistos", alunoId, { alunoId, subtopicos: { [subtopicoId]: visto ? true : apagarCampo() } });
    },

    /* ---------- Plano individual ---------- */

    observarPlano(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observarDoc("planos", alunoId, cb);
    },

    observarProgresso(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observarDoc("progresso", alunoId, (doc) => cb(doc?.itens || {}));
    },

    observarTodosPlanos(cb) {
      ctx.exigir("gerenciar:alunos");
      return repo.observar("planos", [], cb);
    },

    observarTodoProgresso(cb) {
      ctx.exigir("gerenciar:alunos");
      return repo.observar("progresso", [], (lista) => cb(Object.fromEntries(lista.map((p) => [p.id, p.itens || {}]))));
    },

    /* Cria o plano individual a partir de uma jornada. Se o aluno já tem
       plano, só substitui com { substituir: true }; o anterior fica guardado
       em planosAnteriores e o progresso/histórico continuam. */
    async aplicarModelo(alunoId, modeloId, { substituir = false, motivo = "" } = {}) {
      ctx.exigir("gerenciar:alunos");
      const [modelo, aluno, { plano: atual, prog, ind }] = await Promise.all([
        repo.obter("modelosPlano", modeloId), repo.obter("usuarios", alunoId), carregar(alunoId),
      ]);
      if (!modelo) throw new ErroDados("Jornada não encontrada.", "nao-encontrado");
      if (!aluno) throw new ErroDados("Aluno não encontrado.", "nao-encontrado");
      if (atual && !substituir) {
        throw new ErroDados(`${aluno.nome} já tem um plano (${atual.nome}). Confirme para substituir; o progresso e o histórico são mantidos.`, "plano-existente");
      }
      const plano = planoDoModelo({ ...modelo, id: modeloId }, { id: alunoId }, {
        hojeIso: ctx.hoje(), disponibilidade: atual?.disponibilidade || DISP_PADRAO,
      });
      if (!plano.dataAlvo && aluno.dataProva) plano.dataAlvo = aluno.dataProva;
      const extra = [{ tipo: "mesclar", colecao: "progresso", id: alunoId, dados: { alunoId } }];
      if (atual) extra.push({ tipo: "criar", colecao: "planosAnteriores", id: novoId(), dados: { alunoId, plano: atual, substituidoEm: carimbo(), substituidoPor: ctx.usuario.uid } });
      return gravarPlano(alunoId, plano, prog, ind, [{
        tipo: atual ? "substituirPlano" : "aplicarPlano",
        descricao: atual ? `Trocou a jornada pela ${modelo.nome}` : `Aplicou a jornada ${modelo.nome}`,
        antes: atual?.nome || null, depois: modelo.nome,
      }], { motivo, extra });
    },

    /* Prévia para a confirmação: quantos conteúdos futuros mudam de data e
       quantos concluídos ficam preservados. Não grava nada. */
    async previa(alunoId, ops) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      let novo = plano;
      const log = [];
      (Array.isArray(ops) ? ops : [ops]).forEach((op) => {
        ctx.exigir("alterar:plano", { alunoId, plano, permissao: permissaoDaOperacao(op) });
        const r = alterarPlano(novo, ind, op);
        novo = r.plano;
        log.push(...r.log);
      });
      return { ...impactoAlteracao(plano, novo, ind, prog, ctx.hoje()), alteracoes: log };
    },

    /* daJornada: a mudança veio da jornada geral (continua herdada). Mudança
       do moderador só neste aluno fica marcada como sobrescrita. Mudar as
       horas da semana acrescenta uma versão do horário (vale de hoje em
       diante; as metas passadas continuam explicadas pela versão antiga). */
    async alterar(alunoId, ops, { motivo = "", daJornada = false } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      const lista = Array.isArray(ops) ? ops : [ops];
      let novo = plano;
      const entradas = [];
      lista.forEach((op) => {
        ctx.exigir("alterar:plano", { alunoId, plano, permissao: permissaoDaOperacao(op) });
        const r = alterarPlano(novo, ind, op);
        novo = r.plano;
        entradas.push(...r.log);
      });
      if (!entradas.length) return { mudou: false };
      if (JSON.stringify(novo.disponibilidade) !== JSON.stringify(plano.disponibilidade)) {
        const hoje = ctx.hoje();
        const v = novaVersaoHorario(plano, novo.disponibilidade, { desde: hoje, hojeIso: hoje, por: ctx.usuario.uid });
        if (!v.ok) throw new ErroValidacao(v.erros);
        novo = { ...novo, horarios: v.horarios, disponibilidade: v.disponibilidade };
      }
      if (ctx.usuario?.role === "moderador" && !daJornada) {
        let sob = await sobrescritosAtuais(plano);
        lista.forEach((op) => { sob = registrarSobrescritos(sob, op); });
        novo = { ...novo, sobrescritos: sob };
      }
      const resumo = await gravarPlano(alunoId, novo, prog, ind, entradas, { motivo });
      return { mudou: true, resumo, alteracoes: entradas };
    },

    /* Horário da semana a partir de uma data (hoje ou à frente): nova versão,
       as anteriores ficam. */
    async definirHorario(alunoId, dias, { desde, motivo = "" } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "disponibilidade" });
      const hoje = ctx.hoje();
      const v = novaVersaoHorario(plano, dias, { desde: desde || hoje, hojeIso: hoje, por: ctx.usuario.uid });
      if (!v.ok) throw new ErroValidacao(v.erros);
      const total = (d) => Object.values(d || {}).reduce((s, x) => s + (Number(x) || 0), 0);
      return gravarPlano(alunoId, { ...plano, horarios: v.horarios, disponibilidade: v.disponibilidade }, prog, ind, [{
        tipo: "definirHorario",
        descricao: `Horário da semana a partir de ${(desde || hoje).split("-").reverse().join("/")}: ${Math.round(total(dias) / 6) / 10} h`,
        antes: plano.disponibilidade || null, depois: dias,
      }], { motivo });
    },

    /* "Voltar ao padrão da jornada" num campo sobrescrito de uma matéria. */
    async voltarAoPadrao(alunoId, materiaId, campo, { motivo = "" } = {}) {
      ctx.exigir("gerenciar:alunos");
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      const modelo = plano.modeloId ? await repo.obter("modelosPlano", plano.modeloId) : null;
      const naJornada = modelo?.materias?.find((m) => m.materiaId === materiaId);
      if (!naJornada) throw new ErroDados("Esta matéria não está na jornada geral.", "nao-encontrado");
      let novo = structuredClone(plano);
      const m = novo.materias.find((x) => x.materiaId === materiaId);
      const antes = campo === "ordem" ? novo.ordemTopicos?.[materiaId] ?? null : campo === "topicos" ? m?.topicos?.length ?? 0
        : campo === "maxSessao" ? novo.duracaoMeta?.[materiaId] ?? m?.maxSessao ?? null : m?.[campo] ?? null;
      if (campo === "ordem") {
        const { [materiaId]: _x, ...resto } = novo.ordemTopicos || {};
        novo.ordemTopicos = resto;
      }
      if (campo === "maxSessao" && novo.duracaoMeta?.[materiaId] != null) {
        const { [materiaId]: _d, ...resto } = novo.duracaoMeta;
        novo.duracaoMeta = resto;
      } else if (m && campo === "topicos") m.topicos = structuredClone(naJornada.topicos || []);
      else if (m) {
        if (naJornada[campo] === undefined) delete m[campo];
        else m[campo] = naJornada[campo];
      }
      novo.sobrescritos = limparSobrescrito(await sobrescritosAtuais(plano), materiaId, campo);
      return gravarPlano(alunoId, novo, prog, ind, [{
        tipo: "voltarAoPadrao", descricao: `${ind.nomeMateria(materiaId)}: ${campo} voltou ao da jornada`, antes, depois: campo === "topicos" ? naJornada.topicos?.length ?? 0 : naJornada[campo] ?? null,
      }], { motivo });
    },

    async recalcular(alunoId, { motivo = "" } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "recalcular" });
      const previa = recalcularPlano(plano, ind, prog, ctx.hoje()).resumo;
      // o recálculo remarca as datas: o atraso que havia fica registrado aqui
      const atrasados = previa.atrasadosAntes;
      return gravarPlano(alunoId, plano, prog, ind, [{
        tipo: "recalcular",
        descricao: `Recalculou o plano${atrasados ? ` (${atrasados} ${atrasados === 1 ? "conteúdo estava atrasado" : "conteúdos estavam atrasados"})` : ""}`,
        antes: plano.fimPrevisto || null, depois: previa.fimPrevisto || null,
      }], { motivo });
    },

    /* Marcar um tópico como visto à mão (fecha o ciclo atual) e "rever do
       zero" (abre um ciclo novo; o anterior fica com a data dele). O tópico
       revisto vai para o fim da fila da matéria; arrastar para a frente no
       edital o torna o atual. Tudo com registro; as metas se refazem. */
    async concluirItem(alunoId, itemId, { motivo = "" } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "concluirItens" });
      const item = itensDoPlano(plano, ind).find((it) => it.itemId === itemId);
      if (!item) throw new ErroDados("Conteúdo não está no plano.", "nao-encontrado");
      const r = marcarTopicoVisto(item, prog[itemId], { hojeIso: ctx.hoje(), por: ctx.usuario.uid });
      if (!r.ok) return false;
      await gravarProgresso(alunoId, itemId, r.ciclos, { tipo: "concluirItem", descricao: `Marcou como visto: ${nomeItem(ind, item)}`, antes: "aberto", depois: "concluído" }, motivo);
      await refazerMetas(alunoId, "tópico marcado como visto", "progresso");
      return true;
    },

    async reverDoZero(alunoId, itemId, { motivo = "" } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "concluirItens" });
      const item = itensDoPlano(plano, ind).find((it) => it.itemId === itemId);
      if (!item) throw new ErroDados("Conteúdo não está no plano.", "nao-encontrado");
      const r = reabrirTopico(item, prog[itemId], { hojeIso: ctx.hoje(), por: ctx.usuario.uid });
      if (!r.ok) throw new ErroDados(r.erro, "estado");
      const n = r.ciclos.length;
      await gravarProgresso(alunoId, itemId, r.ciclos, {
        tipo: "reverDoZero", descricao: `Voltou para não visto: ${nomeItem(ind, item)}`,
        antes: { ciclo: n - 1, concluido: true }, depois: { ciclo: n, concluido: false, naFila: true },
      }, motivo);
      await refazerMetas(alunoId, "tópico voltou para não visto", "reverDoZero");
      return true;
    },
    // nome antigo ("Ver de novo")
    reabrirItem(alunoId, itemId, opcoes) { return this.reverDoZero(alunoId, itemId, opcoes); },

    /* Ordem dos tópicos de uma matéria (arrastar no edital, que mostra a
       fila de estudo). A ordem gravada passa a ser a fila: o tópico revisto do
       zero que esperava no fim vale pela posição em que está na lista (puxado
       para o topo, vira o atual; o que era atual fica pausado, com a %). */
    async ordenarTopicos(alunoId, materiaId, ordem, { motivo = "" } = {}) {
      const { plano, prog, ind } = await carregar(alunoId);
      if (!plano) throw new ErroDados("Este aluno ainda não tem plano.", "sem-plano");
      ctx.exigir("alterar:plano", { alunoId, plano, permissao: "reordenar" });
      const m = plano.materias.find((x) => x.materiaId === materiaId);
      if (!m) throw new ErroDados("Matéria fora do plano.", "nao-encontrado");
      const ids = new Set((m.topicos || []).map((t) => t.topicoId));
      if (ordem.length !== ids.size || !ordem.every((id) => ids.has(id))) throw new ErroDados("A ordem precisa ter todos os tópicos da matéria.", "invalido");
      const itens = itensDoPlano(plano, ind).filter((it) => it.materiaId === materiaId);
      const antes = itens.map((it) => it.topicoId);
      // os que esperavam no fim da fila passam a valer pela posição na lista
      const soltos = itens.filter((it) => estadoDoTopico(it, prog[it.itemId]).naFila);
      if (JSON.stringify(antes) === JSON.stringify(ordem) && !soltos.length) return false;
      const logId = novoId();
      const novo = { ...plano, ordemTopicos: { ...(plano.ordemTopicos || {}), [materiaId]: ordem } };
      const { plano: calculado } = recalcularPlano(novo, ind, prog, ctx.hoje());
      const { id: _id, ...dados } = calculado;
      const ops = [
        ...opsDeLog(ctx, { alunoId, entidade: "plano", entidadeId: alunoId, motivo, logId }, [{
          tipo: "ordenarTopicos", descricao: `Nova ordem em ${ind.nomeMateria(materiaId)}${soltos.length ? ` (a rever: ${soltos.map((it) => ind.nomeTopico(it.topicoId)).join(", ")})` : ""}`,
          antes, depois: ordem,
        }]),
        { tipo: "definir", colecao: "planos", id: alunoId, dados: { ...dados, alunoId, ultimoLogId: logId, atualizadoEm: carimbo() } },
      ];
      if (soltos.length) {
        ops.push({
          tipo: "mesclar", colecao: "progresso", id: alunoId,
          dados: { alunoId, ultimaOperacao: { tipo: "log", id: logId }, itens: Object.fromEntries(soltos.map((it) => [it.itemId, { ciclos: tirarDoFimDaFila(it, prog[it.itemId]) }])) },
        });
      }
      await repo.lote(ops);
      await refazerMetas(alunoId, "ordem dos tópicos", "ordem");
      return true;
    },

    observarPlanosAnteriores(alunoId, cb) {
      ctx.exigir("ver:aluno", { alunoId });
      return repo.observar("planosAnteriores", [["alunoId", "==", alunoId]], cb);
    },
  };
}

export const nomeItem = (ind, item) => (item.subtopicoId ? `${ind.nomeTopico(item.topicoId)} · ${ind.nomeSubtopico(item.subtopicoId)}` : ind.nomeTopico(item.topicoId));
export { idItem };
