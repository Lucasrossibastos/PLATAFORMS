# Arquitetura: plataforma de vestibular (proposta v1)

> Status: **proposta para discussão**. Nenhum código foi escrito ainda.
> Base analisada: `PlataformaVestibular_1.jsx` (4.257 linhas, protótipo com dados mock).

---

## 0. Diagnóstico do protótipo (leia antes do resto)

Estes pontos mudam a ordem de implementação:

| # | Problema | Evidência no código | Consequência |
|---|---|---|---|
| 1 | **Ainda não há Firebase.** Tudo é `useState` com dados mock. | Cabeçalho do arquivo + ~40 marcadores `🔥 FIREBASE` | "Conteúdo editável sem deploy" ainda não existe; hoje, recarregar a página apaga tudo. |
| 2 | **Taxonomia inconsistente.** Os templates de ciclo usam `materiaId: "matematica"`, que é id de **área**; as matérias são `algebra`, `geometria`... | `CICLO_TEMPLATES` × `AREAS`; `gerarSemana` faz `MATERIAS_FLAT.find(m => m.id === sessao.materiaId)` → `undefined` | Metas de Matemática saem sem tópico. Qualquer métrica "% por tópico" nasce quebrada. |
| 3 | A engine sempre usa `topicos[0]`. | `const topico = mat?.topicos?.[0]` | O aluno nunca avança de tópico nas metas. |
| 4 | Simulados e questões usam **nome** (string) em vez de id. | `SIMULADOS_INICIAIS`: `materia: "Matemática", topico: "Interpretação"` (tópico que não existe na taxonomia) | Não dá para cruzar com progresso/plano. |
| 5 | Vestibulares duplicados com ids diferentes. | `VESTIBULARES` (`fgv_insper`) × `MODELOS_PROVA` (`fgv`, `insper`) | Uma mesma prova ganha dois ids. |
| 6 | Navegação feita por estado (`active`), sem URL. | `setActive("dashboard")` | Sem deep link, sem botão voltar, sem link direto para uma aula. |
| 7 | Um único arquivo com 4.257 linhas. | — | Com mais oito módulos, fica impossível de manter. |

**Conclusão:** a **taxonomia canônica** (área → matéria → tópico, com ids estáveis) é a espinha de tudo o que você pediu. Banco de questões, simulados, caderno de erros, "conteúdo alinhado ao programa" e metas diárias dependem dela.

---

## 1. Princípios de design

1. **Tudo referencia a taxonomia por id.** Aula, questão, repertório e vídeo de atualidades carregam `topicIds[]`. É isso que permite "conteúdo 100% alinhado ao programa do aluno": o filtro é `topicIds ∈ plano do aluno`.
2. **Três motores genéricos; os módulos são configurações deles:**
   - **Motor de Conteúdo** (seções + blocos): Aulas, Atualidades, Análises de redação, Quem somos, Página de boas-vindas.
   - **Motor de Avaliação** (itens + avaliações + tentativas + correção): Banco de questões, Simulados, Envios externos, Caderno de erros.
   - **Motor de Submissão** (fila com status + devolutiva): Redação, Simulado externo para classificar, Questões resolvidas anexadas.
3. **Navegação interna editável.** Cada módulo tem uma árvore de `sections` que você cria e reordena no painel. O código só conhece o módulo (`aulas`, `atualidades`...); as subdivisões são dados.
4. **Agregados pré-calculados.** "% de acerto por tópico" não pode ler todas as tentativas a cada abertura do painel (custo e latência). Mantenha um documento de estatísticas por aluno, atualizado de forma incremental.
5. **Vídeo fora do Firebase Storage.** Guarde só a referência (`provider` + `videoId`). O egress do Storage é caro para vídeo e não oferece streaming adaptativo.

---

## 2. Modelo de dados (Firestore)

### 2.1 Configuração global (leitura: todos; escrita: moderador)

```
areas/{areaId}                 { nome, cor, ordem }
subjects/{subjectId}           { areaId, nome, cor, ordem }
topics/{topicId}               { subjectId, nome, ordem, cargaMin, subtopicos: [{id, nome}],
                                 incidencia: { fuvest: 0.08, unicamp: 0.05, ... } }   // opcional; alimenta priorização
exams/{examId}                 { nome, cor, tipo: ["alvo","modelo"], fases: [...],
                                 rubricaRedacaoId, pesosPorSubject: {...} }            // unifica VESTIBULARES + MODELOS_PROVA
courses/{courseId}             { nome, notasCorte: { fuvest: 0.0, ... } }             // "curso escolhido"
planTemplates/{examId}         { alocacoes: [{ subjectId, minutosSemanais, maxSessao }] }  // hoje: CICLO_TEMPLATES
```

Regras dos ids: slug estável (`fisica`, `mecanica-cinematica`). **Nunca renomeie um id**; renomeie só o campo `nome`. Uma coleção plana (`topics`) em vez de árvore aninhada permite fazer consultas como `where("subjectId","==","fisica")`.

### 2.2 Motor de Conteúdo

```
sections/{sectionId}
  { module: "aulas" | "atualidades" | "redacao" | "institucional",
    parentId: null | sectionId,          // árvore de subdivisões, editável
    titulo, slug, ordem, capa?, visivelPara: "todos" | { examIds: [...] } }

contents/{contentId}
  { module, sectionId, tipo: "aula" | "atualidade" | "analise_redacao" | "pagina",
    titulo, slug, resumo, status: "rascunho" | "publicado", publicarEm,
    topicIds: [], subjectIds: [], examIds: [], tags: [],
    media?: { provider: "youtube" | "vimeo" | "panda" | "bunny", videoId, duracaoSeg },
    blocks: [ Block ],                   // reaproveita o BlocoEditor atual, ampliado
    relacionados: { itemIds: [], assessmentIds: [], repertoireIds: [] },
    ordem, autorId, updatedAt }

// Block = { id, tipo, ...props }
//   titulo | texto (markdown) | video | pdf | imagem | destaque | divisor | callout
//   | questao { itemId } | lista { assessmentId } | repertorio { repertoireId }
//   | link_externo { url, fonte }

repertoires/{id}                          // estruturado de propósito, porque precisa de filtro
  { titulo, tipo: "filosofia" | "dado" | "obra" | "evento_historico" | "conceito",
    autorObra, resumo, fonte,
    eixos: ["tecnologia", "saude", "educacao", ...],
    aplicacoes: [{ tema, comoUsar, trechoExemplo }],
    examIds: [], contentIds: [] }         // vídeos de redação que o utilizam

pages/{slug}                              // Quem somos, Boas-vindas: { blocks: [...] } (hoje WELCOME_INICIAL)
```

**Por que `blocks` fica embutido no documento e não numa subcoleção:** uma leitura por aula, e o limite de 1 MB por documento é folgado para texto. Imagens e PDFs vão para o Storage; o bloco guarda apenas o caminho.

### 2.3 Motor de Avaliação (compartilhado por Questões e Simulados)

```
items/{itemId}                            // uma questão
  { examId, ano, fase, numero, formato: "objetiva" | "discursiva",
    subjectId, topicId, subtopicoId?, dificuldade?,
    enunciado: { blocks } | { imagemPath },   // v1 pode ser recorte do PDF
    alternativas: ["...", ...] | null,
    resolucao?: { blocks, media },
    origem: { assessmentId, paginaPdf } }

answerKeys/{assessmentId}                 // gabarito SEPARADO (ver "Segurança")
  { respostas: { "1": "B", "2": "E", ... } }

assessments/{assessmentId}
  { tipo: "lista" | "simulado" | "prova_oficial",
    titulo, examId, ano, fase, pdfPath?,
    questoes: [{ n, itemId, subjectId, topicId }],   // denormalizado: correção sem N leituras
    duracaoMin?, janela?: { de, ate }, rankeado: bool,
    visibilidade: "todos" | { turmaIds } | { uids } }

attempts/{attemptId}                      // coleção raiz: o moderador consulta todas
  { uid, assessmentId | null,
    origem: "plataforma" | "envio_externo" | "registro_rapido",
    status: "em_andamento" | "aguardando_classificacao" | "corrigida",
    respostas: { n: "C" }, tempoPorQuestao?: { n: seg },
    correcao: { n: { correta: bool, subjectId, topicId } },
    placar: { acertos, total }, porSubject: {...}, porTopic: {...},
    arquivoPath?,                          // PDF anexado pelo aluno (simulado de outro cursinho)
    startedAt, submittedAt, corrigidaEm }

students/{uid}/stats/performance          // AGREGADO — o painel lê só este documento
  { bySubject: { fisica: { feitas, acertos } },
    byTopic:   { "mecanica-cinematica": { feitas, acertos, ultimaEm } },
    byExam:    { fuvest: { ... } },
    serieSimulados: [{ attemptId, data, taxa }] }   // limitar aos últimos ~50

students/{uid}/errorNotebook/{itemId}     // Caderno de erros
  { itemId | null, attemptId, subjectId, topicId,
    respostaDada, correta,
    causa: "conceito" | "interpretacao" | "atencao" | "tempo" | "chute",
    nota, status: "aberto" | "revisado" | "dominado",
    proximaRevisao, revisoes: [{ data, acertou }] }
```

**Um só motor para três fluxos:**
- *Lista do banco de questões* → `attempt` com `origem: "plataforma"`, corrigida na hora.
- *Simulado na plataforma* → o mesmo fluxo, com `duracaoMin` e, se `rankeado`, correção no servidor.
- *Simulado externo em PDF* (fluxo atual de `ENVIOS_INICIAIS` / `PerfilSimulados`) → `attempt` com `origem: "envio_externo"`, `status: "aguardando_classificacao"`. O moderador preenche `correcao` questão por questão e o agregado se atualiza.
- *"Fiz 20 questões e acertei 16"* (fluxo atual de `AlunoQuestoes`) → `attempt` com `origem: "registro_rapido"`, contribuindo só em `byTopic`. **Atenção:** esse dado é agregado e não entra no caderno de erros nem na análise questão a questão. O painel deve deixar essa diferença de granularidade visível.

A função de correção é pura e compartilhada: `grade(assessment.questoes, answerKey, respostas) → { correcao, placar, porSubject, porTopic }`.

Erros viram entradas do caderno de erros automaticamente. Ao marcar a causa do erro, o item entra na **revisão espaçada que já existe**: o caderno de erros vira a fonte das revisões, em vez de ser uma lista morta.

### 2.4 Motor de Submissão: Redação

```
rubrics/{rubricId}          { examId, criterios: [{ id, nome, max, descritores: [...] }] }
                            // ENEM: C1–C5 (0–200). FUVEST e UNICAMP têm critérios próprios → não fixar no código
essayPrompts/{promptId}     { examId, titulo, textosMotivadores: { blocks }, genero?, publicadoEm }
essays/{essayId}
  { uid, promptId | null, temaLivre?, examId, rubricId,
    entrega: { tipo: "texto" | "arquivo", texto?, arquivoPath? },
    status: "enviada" | "em_correcao" | "corrigida" | "devolvida_para_reescrita",
    corretorId?, notas: { criterioId: valor }, total,
    comentarioGeral, anotacoes: [{ trecho | pagina+coords, comentario, criterioId }],
    devolutivaMedia?: { provider, videoId },
    versaoAnterior?: essayId,
    enviadaEm, corrigidaEm }
students/{uid}/quotas/redacao  { mes: "2026-10", usadas, limite }
```

A cota existe porque a correção é o gargalo humano (ver seção 5).

### 2.5 Aluno

```
users/{uid}                     { nome, email, role }   // espelho; a fonte de verdade do papel é o CUSTOM CLAIM
students/{uid}                  { examAlvoId, examIdsSecundarios, courseId, dataProva, turmaId, fotoUrl }
students/{uid}/plan/current     { disponibilidade: { seg: 240, ... },
                                  alocacoes: [{ subjectId, minutosSemanais, maxSessao }],   // "incidência"
                                  origemTemplate: examId, editadoPor: "aluno" | "moderador",
                                  bloqueadoPeloModerador: bool,
                                  revisao: { intervalosPadrao: [1,7,15,30], sobDemanda: bool },
                                  recessos: [{ de, ate }] }
students/{uid}/days/{yyyy-mm-dd} { metas: [...], concluidas: n, total: n, cumprido: bool }  // snapshot do dia
students/{uid}/topicProgress/{topicId}   { pct, concluidoEm? }
students/{uid}/contentProgress/{contentId} { assistidoPct, concluido }
students/{uid}/revisions/{id}   (existe no mock)
students/{uid}/notes/{id}       (anotações do aluno)
students/{uid}/messages/{id}    (recados do moderador)
students/{uid}/moderatorNotes/{id}  (privado do moderador)
students/{uid}/achievements/{id}
```

**Por que gravar `days/{data}` como snapshot:** se as metas forem recalculadas a partir do plano atual, o histórico muda quando o plano muda. O grid de consistência e o streak ficariam mentindo. Grave as metas geradas no dia e marque as concluídas.

### 2.6 Storage

```
content/{contentId}/...            imagens e PDFs de aulas (leitura: autenticado)
assessments/{assessmentId}/prova.pdf
items/{itemId}/enunciado.png
submissions/{uid}/{attemptId}.pdf  (leitura: dono + moderador)
essays/{uid}/{essayId}.{pdf|jpg}   (leitura: dono + moderador)
public/...                         Quem somos, imagens da landing
```

### 2.7 Segurança: decisões reais

- **O papel fica em custom claim** (`request.auth.token.role`), definido por Cloud Function ou script admin. Um campo `role` em `/users/{uid}` que o próprio aluno possa escrever permite que ele se promova a moderador com uma linha de console.
- **As regras do Firestore são por documento, não por campo.** Se o gabarito estiver dentro de `items/{id}`, o aluno o lê antes de responder. Opções:
  - *Listas de prática:* gabarito legível no cliente. Quem consulta a resposta antes só prejudica a si mesmo. **Aceitável.**
  - *Simulados rankeados:* `answerKeys/` sem leitura para aluno; correção por Cloud Function no `submit`. **Exige o plano Blaze** (pago por uso). Sem Blaze, simulado com ranking fica sem proteção.
- O agregado `stats/performance` **não deve ser gravável pelo aluno** se houver ranking. Nesse caso, ele é atualizado pela mesma Cloud Function.

---

## 3. Rotas e navegação

Adotar `react-router` (URLs reais). Hoje o menu do aluno tem 11 itens. Somar oito módulos sem consolidar daria cerca de 19 itens, o que é inutilizável. Proposta de menu do aluno com nove itens:

```
/login
/quem-somos                                  ← PÚBLICA (serve de captação; não a esconda atrás do login)

/app                                         Início (hero "3D": curso, progresso, desempenho)
/app/dashboard                               Metas do dia + semana (absorve "Semana") + recados + conquistas (widget)
/app/plano                                   Meu plano de estudos
   ?aba=objetivo | horarios | incidencia | revisoes      (absorve "Organização Pessoal")
/app/aulas                                   Árvore de seções (dados)
/app/aulas/:secao/:conteudo                  Player + blocos + questões relacionadas
/app/aulas/caderno-de-erros
/app/questoes                                Explorador: filtros vestibular × matéria × tópico × ano
/app/questoes/lista/:assessmentId            Resolver lista        ─┐
/app/questoes/desempenho                     % por matéria → tópico │ mesmo <PerformanceBreakdown>
/app/questoes/registrar                      Registro rápido / anexar resolvidas
/app/simulados                               Disponíveis + histórico
/app/simulados/:id/resolver                  <AssessmentRunner> (o mesmo das listas, em modo cronometrado)
/app/simulados/resultado/:attemptId          Análise questão a questão
/app/simulados/enviar                        Anexar simulado externo
/app/redacao                                 ?aba=analises | repertorios | minhas
/app/redacao/enviar
/app/redacao/:essayId                        Devolutiva
/app/atualidades                             Feed por semana/eixo
/app/atualidades/:slug

/admin/alunos                                (existe)
/admin/alunos/:uid/:aba                      (existe como ModAlunoPerfil)
/admin/conteudo/:modulo                      Árvore de seções + lista de conteúdos (serve Aulas, Atualidades, Redação e Institucional)
/admin/conteudo/editar/:contentId            Editor de blocos genérico
/admin/questoes                              Importar prova, recortar e taguear itens
/admin/avaliacoes/:id                        Montar lista ou simulado + gabarito
/admin/filas                                 ?tipo=redacoes | simulados-externos   (uma fila, dois tipos)
/admin/filas/redacao/:essayId                Tela de correção com rubrica
/admin/taxonomia                             (existe como ModPlano; passa a gravar em areas/subjects/topics)
/admin/vestibulares                          exams + templates de plano + rubricas
/admin/paginas/:slug                         Quem somos, Boas-vindas
```

Itens atuais que saem do menu principal: *Semana* vai para o Dashboard; *Organização* vai para o Plano; *Desempenho* se divide entre Questões e Simulados; *Materiais* vira blocos `pdf` dentro de Aulas; *Anotações* vira aba de Aulas ou atalho global; *Conquistas* vira widget e perfil.

---

## 4. Componentes reaproveitáveis

| Componente | Usado em |
|---|---|
| `<BlockRenderer>` / `<BlockEditor>` (evolução de `BlocoView` / `BlocoEditor`) | Aulas, Atualidades, Análises de redação, Quem somos, Boas-vindas, enunciados e resoluções |
| `<SectionTree>` + `<ContentList>` | Aulas, Atualidades, Redação/Análises (aluno e admin) |
| `<MediaPlayer provider videoId onProgress>` | Qualquer vídeo; grava `contentProgress` |
| `<TaxonomyPicker>` (evolução de `MateriaTopicoSelect`) | Todo formulário de tagueamento |
| `grade()` (função pura) + `<AssessmentRunner>` | Listas, simulados, revisão do caderno de erros |
| `<PerformanceBreakdown data drill="subject→topic">` | Questões, Simulados, perfil do aluno no admin, Início |
| `<SubmissionQueue>` + `<StatusTimeline>` | Redação, simulado externo, questões anexadas |
| `<RubricScorer rubric>` | Correção de redação (qualquer vestibular) |

---

## 5. Pontos cegos e decisões pendentes

1. **Formato dos "arquivos que vou anexar" do banco de questões.** Isto define o modelo:
   - *PDF de prova inteira + gabarito:* rápido de subir, mas "% por tópico" **exige** que cada número de questão seja tagueado com `topicId`. É o mesmo formulário que já existe em `ModSimulados` e é trabalho manual: cerca de 90 questões por prova da 1ª fase da FUVEST, multiplicadas pelos anos.
   - *Questão por questão (recorte de imagem ou texto):* permite o explorador por tópico e o caderno de erros com enunciado, mas custa muito mais no cadastro.
   - **Recomendação:** v1 com PDF + gabarito tagueado (o dado de desempenho já funciona); v2 recortando imagens por questão para as provas mais usadas. Um LLM pode sugerir o tópico de cada questão para você só revisar, o que reduz o tagueamento a conferência.
2. **Quem é dono do plano: o aluno ou o moderador?** Hoje o ciclo é editado pelo moderador (`PerfilCiclo`). Você quer que o aluno edite incidência e horários. Sem regra, um sobrescreve o outro. Proposta: o template vem do vestibular, o aluno ajusta, e o moderador pode travar (`bloqueadoPeloModerador`).
3. **Correção de redação não escala.** Se Joca e Rossini corrigem pessoalmente, cada aluno novo adiciona horas de trabalho. Defina antes: cota mensal, prazo de devolutiva (SLA) e se haverá corretores contratados (o papel `corretor` já está previsto em `corretorId`).
4. **"Visual 3D" na página inicial.** Three.js pesa algumas centenas de KB e consome bateria de celular, e o aluno abre essa tela todo dia. O que gera impacto é o dado estar certo e ser pessoal. Faça por último e comece com CSS 3D, parallax e profundidade, que dão cerca de 80% do efeito com cerca de 5% do custo. Além disso, sem dados reais (fase 2), ela não tem o que mostrar.
5. **Atualidades com poucas fontes.** Não tente produzir tudo. O modelo sustentável é **curadoria com camada própria**: vídeo externo (YouTube embed) + um bloco seu de "por que isso cai" + ligação com repertórios e eixos de redação + 2–3 questões relacionadas. O valor está na ponte com a prova, não no vídeo. Uma cadência fixa (um resumo semanal) vale mais que volume.
6. **Hospedagem de vídeo pago.** YouTube "não listado" vaza: qualquer link repassado funciona. Se o conteúdo for o produto, use um player com proteção de domínio (Panda Video, Vimeo, Bunny Stream). Verifique preços atuais; não os confirmei.
7. **Direitos autorais.** Redações nota 1000 são obras dos autores: obtenha autorização para dissecá-las. Questões de vestibular são amplamente usadas por cursinhos, mas não tenho certeza do enquadramento jurídico para uso comercial. Vale uma consulta rápida.

---

## 6. Ordem de implementação

A lógica é construir primeiro o que os outros módulos consomem e deixar por último o que só exibe.

| Fase | Entrega | Por quê |
|---|---|---|
| **0. Fundação** | Projeto Vite, arquivo quebrado em módulos, `react-router`, Firebase Auth + custom claims, regras de segurança; **taxonomia canônica no Firestore** (corrige os problemas 2, 4 e 5); `exams` unificado; migração dos mocks | Sem isto, nada persiste e as métricas por tópico nascem erradas |
| **1. Motor de Conteúdo** | `sections` + `contents` + `<BlockEditor>` genérico + `<MediaPlayer>`; entregas: **Quem somos**, **Boas-vindas** e **Aula de introdução** | Valida o requisito "edito sem deploy" com o menor risco possível |
| **2. Motor de Avaliação** | `items` / `assessments` / `answerKeys` / `attempts` + `grade()` + `stats` agregado; **Banco de questões** (listas + desempenho), **Simulados** (plataforma + envio externo), **Caderno de erros** ligado às revisões | É o núcleo pedagógico e a fonte de dados do Dashboard e do Início |
| **3. Plano + Dashboard reais** | Portar a engine para `plan/current` + `days/{data}`; corrigir a seleção de tópico (hoje sempre `topicos[0]`) para seguir o `topicProgress`; resolver quem é dono do plano | A engine já existe no mock; falta persistir e corrigir |
| **4. Redação** | Rubricas, envio, fila, tela de correção, cota; depois repertórios e análises (estas reaproveitam a fase 1) | Precisa das decisões operacionais do ponto 5.3 |
| **5. Atualidades** | Configurar o módulo `atualidades` no motor de conteúdo + feed | Sai quase de graça depois da fase 1 |
| **6. Página inicial "3D"** | Hero com dados reais | Só faz sentido com dados das fases 2 e 3 |

Paralelizável: a fase 1 e a modelagem da fase 2 podem andar juntas depois da fase 0.
