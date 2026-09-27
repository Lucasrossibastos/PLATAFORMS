# Plataforma de estudos para vestibular: especificação funcional

> Cole este documento na conversa nova junto com `nucleo.js`. Ele descreve **o que** a
> plataforma faz. O **visual** fica livre para a arte nova.
> Stack usada até aqui: React + Vite (Firebase planejado, ainda não ligado).

## Como usar na conversa nova (sugestão de prompt)

> "Estou construindo uma plataforma de estudos para vestibular. Em anexo, `nucleo.js` tem
> toda a lógica e os dados de exemplo, e `FUNCIONALIDADES.md` descreve cada tela. Monte o
> front-end em React + Vite usando o núcleo **sem alterar a lógica**, com esta direção de
> arte: [descreva ou anexe a arte]. Comece pelo login, pela tela de boas-vindas e pelo
> dashboard do aluno; depois as demais telas."

---

## 1. Acesso e papéis
- **Login** por e-mail e senha (`MOCK_USERS`). Contas de teste: `aluno@curso.com` / `123`
  e `moderador@curso.com` / `123`. (Firebase: `signInWithEmailAndPassword` + `/users/{uid}.role`.)
- Dois papéis com menus diferentes: **aluno** e **moderador**.
- Depois do login aparece a **tela de boas-vindas** (gate). O botão "Acessar a plataforma" entra
  no app; atalhos levam direto a uma tela.
- Tema claro/escuro alternável.

## 2. Boas-vindas (editável pelo moderador, `WELCOME_INICIAL`)
- Cabeçalho com nome/foto/subtítulo do professor.
- Blocos livres: `titulo`, `texto`, `foto`, `destaque` (números com rótulo), `divisor`.
- Para o aluno, mostra um resumo: sequência de dias, % do programa, aderência do mês,
  próxima conquista, próxima meta do dia e o recado mais recente do instrutor.

## 3. Área do aluno
| Tela | O que faz |
|---|---|
| **Dashboard** | Metas de hoje (geradas pelo motor), metas atrasadas destacadas, recado do instrutor, sequência de dias, meta de questões do dia (`questoesPorHora` × horas planejadas), resumo (questões, horas, progresso). Concluir uma meta; ao terminar o tempo de um tópico, pergunta "domino o conteúdo" ou "preciso de mais tempo" (minutos extras). Botão **Replanejar**: `recalcularPlanoInteligente` refaz a semana reincorporando pendências (pré-visualização por dia antes de confirmar). **Registrar progresso** (estudo fora do plano / progresso rápido). |
| **Semana** | Grade de 7 dias com as metas; arrastar metas entre dias (edição manual só desta semana). |
| **Cursos em vídeo** | Playlists por categoria (Introdução, Atualidades, Redação, Outros), só as publicadas e visíveis ao vestibular do aluno. Player, lista de aulas, marcar como assistida, progresso por playlist. |
| **Redação** | Instruções de envio (o texto é enviado por fora, ex.: WhatsApp). Lista de devolutivas recebidas (etiqueta "Nova" até abrir), nota (competências ENEM C1–C5 ou nota livre), comentário, pontos fortes, o que melhorar, arquivo corrigido; gráfico de evolução (% da nota máxima); atalho para as aulas de redação. |
| **Banco de Questões** | Registrar blocos de questões (matéria → tópico, feitas, acertos, observação); filtros; totais e taxa de acerto. |
| **Desempenho** | Abas: Questões (acertos × erros, evolução, comparativo por matéria), Simulados, Calendário (consistência mensal), Perspectiva (previsão de conclusão, matérias em risco). |
| **Conquistas** | Catálogo `CONQUISTAS_CATALOGO` com regras (sequência, questões, tópicos, revisões, acerto, simulados); conquistadas × a conquistar. |
| **Plano de Estudos** | Taxonomia por área/matéria/tópico com % concluído; reordenar subtópicos por arrastar. |
| **Organização Pessoal** | Horas livres por dia da semana (limite diário do motor), total semanal, "salvar e recalcular", modo férias/pausa (período sem metas, reagenda sem gerar atraso). |
| **Anotações Rápidas** | Notas por área/matéria. |
| **Simulados** | Resolver simulados cadastrados (gabarito por questão → resultado por matéria/tópico); enviar simulado externo (PDF + modelo de prova) para o moderador classificar. |
| **Materiais** | PDFs por vestibular/matéria, visíveis para todos ou para alunos específicos. |

## 4. Painel do moderador
| Tela | O que faz |
|---|---|
| **Alunos** | Lista com métricas (questões, horas, progresso), aviso de simulados enviados para classificar, visão comparativa da turma, cadastrar aluno. |
| **Perfil do aluno** (abas) | Desempenho em questões (filtros matéria/tópico/período), desempenho em simulados, progresso no plano, **revisões espaçadas** (criar para tópico concluído: intervalos em dias + duração; o motor encaixa nas metas), simulados enviados para classificar (gabarito por questão), **ciclo de estudos** do aluno (minutos semanais por matéria, a partir dos templates por vestibular), materiais do aluno, histórico de replanejamentos, anotações privadas, recados (aparecem no dashboard do aluno). |
| **Cursos em vídeo** | Criar/editar playlists (título, descrição, categoria, cor, visível para todos ou um vestibular), publicar/rascunho, adicionar vídeo por arquivo ou link, ordenar, excluir. |
| **Redação** | Registrar devolutivas: aluno, tema, vestibular, data e canal de recebimento, nota (competências ENEM ou nota livre com escala), comentários, arquivo corrigido; salvar rascunho ou enviar; ver se o aluno leu; editar as instruções de envio. |
| **Plano de Estudos** | Editar a taxonomia (tópicos, carga horária, subtópicos). |
| **Simulados** | Cadastrar simulado (PDF + gabarito por questão com matéria/tópico). |
| **Materiais** | Upload de PDFs e visibilidade. |
| **Boas-Vindas** | Editor de blocos com pré-visualização. |

## 5. Motor de metas (em `nucleo.js`)
- `gerarSemana(ciclo, disponibilidade, revisoes)`: cada matéria tem `minutosSemanais` e
  `maxSessao`. O motor quebra em sessões, intercala matérias e distribui nos dias pelo
  maior espaço livre (best-fit), sem passar do limite diário. Revisões agendadas para a
  semana entram primeiro.
- `replanejarAtrasadas` / `recalcularPlanoInteligente`: refazem a semana reincorporando
  pendências com prioridade, podendo fundir blocos da mesma matéria.
- `revisoesPorDiaSemana`: agrupa sessões de revisão dos próximos 7 dias.
- Templates de ciclo por vestibular: `CICLO_TEMPLATES` (ENEM, ENEM Med, FUVEST, UNICAMP,
  UNESP, Bahiana, FGV/Insper).

## 6. Problemas conhecidos (corrigir na versão nova)
1. `CICLO_TEMPLATES` usa `materiaId: "matematica"`, que é id de **área**; as matérias são
   `algebra`, `geometria`… As metas de Matemática saem sem tópico.
2. `distribuirSemana` sempre usa o primeiro tópico da matéria (`topicos[0]`); deveria
   seguir o progresso do aluno.
3. Simulados e questões guardam matéria/tópico por **nome**; migrar para ids.
4. `VESTIBULARES` e `MODELOS_PROVA` repetem vestibulares com ids diferentes.
5. Tudo em memória: recarregar perde os dados (falta Firebase).
6. Navegação por estado (sem URLs); considerar `react-router`.

## 7. Modelo de dados planejado (Firestore)
Resumo; o detalhe está em `docs/ARQUITETURA.md` no repositório.
`users/{uid}` · `students/{uid}` (+ `plan`, `days/{data}`, `topicProgress`, `revisions`,
`notes`, `messages`, `moderatorNotes`, `achievements`) · `areas`, `subjects`, `topics` ·
`exams` · `playlists` · `essayFeedback` · `assessments` + `answerKeys` + `attempts` ·
`materials` · `config/welcome`.
