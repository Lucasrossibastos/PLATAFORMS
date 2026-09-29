# aprova+ · plataforma de estudos para vestibular

React 19 + Vite. Dois papéis, **aluno** e **moderador**, sobre dados reais.

- **Aluno**: Dashboard (metas de hoje, com a % de cada tópico, ou as
  próximas duas semanas, com arrastar para outro dia e o resumo da semana),
  Edital (matérias em blocos → fila de estudo de cada matéria; marca o que
  já viu, toca no riscado para ver de novo, arrasta para mudar a ordem,
  ajusta a duração das metas e o tempo de cada tópico), Meus cursos (aulas em vídeo), Redação, Desempenho e, em Extra,
  Questões, Simulados e Materiais. Materiais abre em blocos coloridos por
  área (Listas de Física…); dentro, cada lista mostra matéria, tópico e
  número de questões, e "Registrar acertos" já vem preenchido. Simulados
  mostra a galeria de provas (capa do caderno em cima, nome embaixo): abrir
  o PDF, resolver e registrar o resultado ligado à prova.
- **Moderador**: quase tudo fica dentro de cada aluno (edital com peso de
  cada matéria, o que foi mudado só para ele × herdado da jornada, matérias
  visíveis, revisões recorrentes por tópico, conflitos, redações, registros,
  histórico).
  No geral: Jornadas (o conteúdo programático de cada vestibular/curso),
  Materiais (cria as áreas, com um clique cria uma por matéria, e anexa as
  listas dentro delas), Simulados (anexa o PDF de cada prova; a capa sai
  sozinha do alto da primeira página, com pdf.js, ou de uma imagem enviada)
  e Aulas em vídeo, tudo filtrável por programa.
- **Entrada**: login num cartão branco sobre ondas lisas e paradas em SVG
  (azul, anil e um toque de água; `assets/fundo-ondas.svg` e `fundo-fios.svg`); quem
  entra vai direto para o Dashboard (aluno) ou para Alunos (moderador). A
  frase, o texto e a foto do professor do lado direito se editam em Textos.
  Uma fonte só (Inter); tema claro por padrão, com o escuro no botão de tema.

## Rodar

```bash
npm install
npm run dev               # http://localhost:5173
npm test                  # testes de núcleo, serviços e adaptador local (98)
npm run test:emuladores   # regras de segurança e fluxo completo no Firebase emulado (23)
npm run build             # gera o site em docs/ (é o que o GitHub Pages publica)
```

`npm run test:emuladores` precisa de Java 11+ (os emuladores do Firebase rodam
na JVM). Se o ambiente definir `JAVA_TOOL_OPTIONS`, rode com
`env -u JAVA_TOOL_OPTIONS npm run test:emuladores`.

## Dois modos de dados

| Modo | Quando | Onde ficam os dados |
|---|---|---|
| **Local (demonstração)** | sem as variáveis `VITE_FIREBASE_*` | `localStorage` (dados) e IndexedDB (arquivos) deste navegador |
| **Firebase** | com as variáveis `VITE_FIREBASE_*` no build | Authentication, Firestore e Storage do seu projeto |

No modo local, a primeira carga instala uma demonstração: as 9 matérias do
curso com tópicos de exemplo, 7 jornadas (uma por vestibular), o moderador e
3 alunos com a jornada aplicada. **Nenhum histórico é inventado**: questões, simulados,
estudo, redações e avisos começam vazios. Contas (senha `123456`):
`moderador@curso.com`, `aluno@curso.com` (FUVEST · Medicina),
`carlos@curso.com` (ENEM MED · Medicina), `mariana@curso.com` (UNICAMP ·
Engenharia). No menu da conta há **Recomeçar a demonstração**.

## Configurar o Firebase (uso real)

1. Crie um projeto em <https://console.firebase.google.com>.
2. **Authentication** → Método de login → ative **E-mail/senha**.
3. **Firestore Database** → criar banco (modo produção; `southamerica-east1`,
   São Paulo, dá a menor latência para alunos no Brasil).
4. **Storage** → começar. Desde 30/10/2024, criar o bucket exige o plano
   **Blaze** (paga pelo uso). A cota gratuita do Storage só vale para buckets
   em `us-central1`, `us-east1` ou `us-west1`: para PDFs e fotos, prefira uma
   delas (fonte: [FAQ do Firebase](https://firebase.google.com/docs/storage/faqs-storage-changes-announced-sept-2024)).
   Vídeos longos custam banda: para aulas, links do YouTube/Vimeo/Drive
   saem mais baratos que enviar o arquivo.
5. Configurações do projeto → Seus apps → **Web** → registre o app e copie o
   objeto de configuração.
6. Copie `.env.example` para `.env.local` e preencha:

   ```bash
   VITE_FIREBASE_API_KEY=...
   VITE_FIREBASE_AUTH_DOMAIN=seu-projeto.firebaseapp.com
   VITE_FIREBASE_PROJECT_ID=seu-projeto
   VITE_FIREBASE_STORAGE_BUCKET=seu-projeto.firebasestorage.app
   VITE_FIREBASE_MESSAGING_SENDER_ID=...
   VITE_FIREBASE_APP_ID=...
   ```

   Essas chaves identificam o app e vão no código do site (é assim no
   Firebase); a proteção está nas regras. **Não** coloque chaves de serviço
   (`service account`) em lugar nenhum do front.
7. Publique as regras e os índices:

   ```bash
   npx firebase login
   npx firebase use seu-projeto
   npx firebase deploy --only firestore:rules,firestore:indexes,storage
   ```

8. `npm run build` e publique `docs/`. Abra o site: a tela de login mostra
   **Primeiro acesso: criar a conta do moderador**. Isso só funciona uma vez
   (a regra de `config/instalacao` impede um segundo).
9. No painel do moderador: **Mais → Matérias e vestibulares → Importar
   estrutura base** (ou monte a sua), crie as **Jornadas** e cadastre os alunos. A conta do aluno é
   criada pelo moderador, sem trocar a sessão dele.

Para desenvolver contra os emuladores: `npm run emuladores` num terminal e,
no `.env.local`, `VITE_FIREBASE_EMULADORES=1` com qualquer `projectId` que
comece com `demo-`.

Qualquer pessoa pode criar uma conta pela API do Firebase Auth, mas sem
documento em `usuarios/{uid}` ela não lê nem grava nada. Se quiser, restrinja
cadastros públicos no Google Cloud (Identity Platform).

## Arquitetura

```
src/core/       regras puras (sem React, sem banco): plano, ciclos, motor de metas,
                desempenho, validação, permissões, datas; nucleo.js tem os catálogos
src/data/       repositório: contrato.js, local.js (demo), firebase.js, semente.js
src/services/   serviços de domínio: única porta da interface para os dados
src/state/      provedor React e hooks de leitura em tempo real
src/screens/    telas (aluno/, moderador/, comum/ para o que os dois usam)
src/ui/         componentes: filtros, gráficos SVG, seletor de conteúdo, diálogos
firestore.rules, storage.rules   controle de acesso real
```

- A interface nunca acessa o banco: lê pelos hooks (`state/hooks.js`) e
  escreve pelos serviços (`services/`), que checam permissão antes de gravar.
  No Firebase, as mesmas regras valem no servidor.
- **Uma fonte de verdade**: desempenho, consistência e atrasos são sempre
  calculados dos registros (questões, simulados, sessões de estudo); nada
  disso é guardado pronto.
- **Edital**: a unidade de estudo (a que vira meta) é o tópico; os
  subtópicos são orientação dentro dele. Matéria oculta para um aluno fica no
  edital dele, com o histórico, mas não gera metas.
- **Jornada → aluno**: o aluno recebe uma cópia da jornada. Mudanças na
  jornada só chegam aos alunos com "levar aos alunos" marcado, e mesmo assim
  o que foi ajustado individualmente no aluno continua como está.
- **Histórico não se perde**: mudar ou trocar o plano recalcula só o que
  falta; sessões, questões, simulados e conteúdos concluídos ficam. Toda
  correção ou exclusão de histórico grava um log (quem, quando, antes,
  depois, motivo) no mesmo lote; as regras do servidor recusam a gravação sem
  o log.
- **IDs, não nomes**: tudo é ligado por id; arquivar um item da estrutura
  tira das listas, mas o histórico continua mostrando o nome.
- **Datas locais**: nada de `toISOString()` para datas do dia; ver
  `core/datas.js`.
- **Tempo**: a jornada não tem horas por semana. O tempo vem das horas-base
  de cada tópico e se encaixa no horário de cada aluno, dividido pelo peso
  das matérias. A duração de cada meta e o tempo de cada tópico são minutos
  livres (5 a 720), definidos na jornada e ajustáveis por aluno. A duração
  da meta e as horas do dia são TETO: o motor encurta a meta para fechar o
  tópico quando ele cabe, divide tópico grande em partes iguais, segue no
  próximo tópico quando sobra um pedacinho e deixa o dia com folga em vez
  de criar metas picadas (nenhuma meta menor que metade da duração, a não
  ser o fim do conteúdo).
- **Metas diárias**: `core/motorMetas.js` planeja as próximas duas semanas
  (roda na virada do dia e depois de toda mudança que afeta o plano, sempre
  com registro de antes/depois). Em cada dia, as revisões entram primeiro
  (se passarem do horário, o dia fica em conflito, à vista do moderador;
  nada é cortado); o resto vai para a progressão, dividido pelo peso das
  matérias semana a semana. A meta de progressão é tempo de uma matéria e
  segue a fila dela (termina um tópico e continua no próximo); ao concluir,
  grava a % vista de cada tópico, que forma a % da matéria e do plano. Meta
  concluída nunca muda; a que passou do dia leva o dia perdido; a que sobra
  com histórico é dispensada, não apagada. Peças: `core/jornada.js` (peso e
  herdado × sobrescrito em `plano.sobrescritos`), `core/horario.js`
  (horário em versões, `plano.horarios`), `core/ciclos.js` (cada estudo de
  um tópico é um ciclo; ver de novo abre outro, o tópico volta a contar
  como não visto e a conclusão anterior fica gravada;
  fila com um tópico atual por matéria), `core/metas.js`,
  `core/revisaoRecorrente.js`. Dados antigos são lidos no formato novo sem
  regravação; a semana do sistema antigo vira um resumo parcial.

### Coleções

| Coleção | Conteúdo |
|---|---|
| `usuarios/{uid}` | papel (`aluno`/`moderador`), nome, e-mail, vestibular, curso, turma, acesso |
| `areas`, `materias`, `topicos`, `subtopicos`, `vestibulares`, `cursos` | estrutura acadêmica (id, nome, ordem, pai, carga, arquivado) |
| `modelosPlano` | jornadas (vestibular, curso, modalidade, matérias em ordem com peso, duração de cada meta, prioridade, velocidade e visibilidade, tópicos, permissões do aluno) |
| `planos/{alunoId}` | edital do aluno (cópia editável da jornada) + cronograma recalculado; `duracaoMeta` e `tempoTopico` guardam os tempos ajustados só para ele (aluno ou moderador) |
| `planosAnteriores` | edital substituído, guardado inteiro |
| `vistos/{alunoId}` | subtópicos que o aluno marcou como vistos |
| `progresso/{alunoId}` | minutos e ciclos por tópico (somados junto com cada sessão) |
| `semanas/{alunoId}`, `resumosSemana` | sistema antigo de metas semanais (só leitura; o fechamento das semanas antigas continua contando) |
| `sessoesEstudo` | cada estudo feito (data, conteúdo, minutos, origem, meta) |
| `revisoes` | revisões automáticas antigas (7/15/30 dias): não são mais criadas; as agendadas terminam como metas |
| `questoes`, `simulados` | registros do aluno (simulado com PDF opcional no Storage e `provaId` quando veio da galeria) |
| `areasMateriais` | as áreas de Materiais (nome, linha de cima, cor, ícone, matéria sugerida, ordem) |
| `materiais` | metadados do PDF (título, área, matéria/tópico/subtópico, tipo, número de questões, programas, data, tags, referência do arquivo) |
| `provas` | provas para simulado (nome, exame, ano, programas, publicada, referência do PDF e da capa no Storage) |
| `playlists`, `progressoVideos` | aulas em vídeo (com os programas que veem) e aulas assistidas |
| `devolutivas` | correções de redação (foto marcada, textos anexados, notas, observações) |
| `notificacoes` | um documento por aluno e aviso (`lidaEm` por aluno) |
| `metas` | cada meta, com categoria (`progressao`, `rever_do_zero`, `revisao_recorrente`, `revisao_automatica`), dia planejado, duração planejada e real, dias em que não foi feita, fixada pelo aluno e, ao concluir, a % vista de cada tópico |
| `agendas/{alunoId}` | quando o motor de metas rodou e os dias em conflito do horizonte |
| `revisoesRecorrentes/{alunoId__itemId}` | revisão recorrente de um tópico visto, ativada pelo moderador (intervalo, duração, data-base, modo de atraso; parâmetros só acrescentam versão; nunca apagada) |
| `logs` | histórico de alterações |
| `config/{instalacao, textos, boasVindas, redacao}`, `textosAluno/{uid}` | configuração e textos |

Nomes pedidos na especificação: `authService`, `studentService`,
`studyPlanService`, `questionService`, `mockExamService`, `materialService`,
`notificationService` são apelidos em `services/index.js`;
`performanceService` é `services/desempenho.js`.

## Publicar no GitHub Pages

Settings → Pages → *Deploy from a branch* → escolha a branch e a pasta
**`/docs`**. `docs/` é gerada pelo `npm run build` e apagada a cada build.
Sem as variáveis do Firebase, o site publicado roda no modo local.
