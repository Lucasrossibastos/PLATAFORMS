# Módulo de flashcards

Flashcards com repetição espaçada (FSRS), isolado do resto da plataforma.
Tudo do módulo mora nesta pasta; o que ele toca fora dela está listado
abaixo, para dar para remover ou reverter por partes.

## Dados

Cada aluno tem a própria árvore; nada é compartilhado entre alunos.

```
flashcards_alunos/{uid}                      configurações (retenção, limites por dia, passos…)
  flashcards_materias/{id}                   { nome, ordem }
  flashcards_topicos/{id}                    { materiaId, nome, ordem }
  flashcards_notas/{id}                      texto-fonte: { tipo, materiaId, topicoId, campos, tags, imagens }
  flashcards_cartoes/{notaId}__{ordinal}     cartão de revisão: { estado FSRS, fila, ordemNovo, suspenso, enterradoAte, … }
  flashcards_revisoes/{id}                   cada resposta: { cartaoId, avaliacao, antes, depois, feitaEm, dia }
  flashcards_dias/{AAAA-MM-DD}               resumo do dia: { revisoes: { idDaRevisao: {…} } }
```

- **Nota × cartão** (como no Anki): básico gera 1 cartão; cloze, um por
  lacuna (`{{c1::…}}`, `{{c2::…}}`); oclusão de imagem, um por forma.
  Editar a nota mantém o progresso dos cartões que continuam.
- **Fila sem índice composto:** `fila` é a data em que um cartão já estudado
  volta (null se novo ou suspenso) e `ordemNovo` é a posição na fila de
  novos (null se já estudado ou suspenso). "Pendentes hoje" é
  `fila <= fim do dia`, que usa o índice automático de um campo.
- **Índices compostos** (`firestore.indexes.json`): novos por matéria, por
  tópico e por tag; histórico de um cartão.
- **Dias** começam às 4h (configurável), no fuso do aparelho.
- **Resumo do dia** guarda cada revisão por id: regravar a mesma revisão
  (ao reenviar depois de uma queda) não conta duas vezes.

## Onde fica gravado

- **Com Firebase configurado:** no Firestore, na árvore do aluno. As regras
  (bloco "Flashcards" em `firestore.rules`) só deixam o próprio aluno ler e
  gravar ali; outro aluno e o moderador não têm acesso. Imagens no Storage
  em `flashcards/{uid}/` (só o dono; imagem até 3 MB).
- **Sem Firebase (demonstração):** no IndexedDB deste navegador, num banco
  só do módulo (`aprova-flashcards`), separado por aluno. A tela avisa.
- **Sem conexão:** o cache persistente do Firestore guarda o que foi feito e
  envia quando a conexão volta, mesmo depois de fechar a aba.

## Arquivos

```
dados/contrato.js          nomes das coleções e interface dos adaptadores
dados/modelo.js            validação, geração de cartões e campos de fila
dados/datas.js             dias de estudo no fuso do aparelho
dados/consultas.js         consultas em memória com a semântica do Firestore
dados/repoMemoria.js       adaptador em memória (base da demonstração e dos testes)
dados/repoDemonstracao.js  demonstração no IndexedDB
dados/repoFirestore.js     adaptador Firestore + Storage
dados/sessao.js            quem é o aluno logado (único ponto que lê algo da plataforma)
dados/index.js             abre o repositório certo
```

Testes: `modelo.test.js`, `repoMemoria.test.js`, `repoDemonstracao.test.js`
(`npm test`) e `flashcards.emu.test.js` (`npm run test:emuladores`: regras e
o adaptador Firestore na mesma bateria de contrato dos outros adaptadores).

## O que o módulo toca fora desta pasta

| Arquivo | O quê |
|---|---|
| `firestore.rules` | bloco "Flashcards" no fim (só adição) |
| `storage.rules` | bloco "Flashcards" no fim (só adição) |
| `firestore.indexes.json` | índices das coleções `flashcards_*` |
| `package.json` | `ts-fsrs` (motor FSRS); `fake-indexeddb` só nos testes |

Ainda por vir (etapas seguintes): uma rota em `src/App.jsx` e um item no
menu do aluno em `src/navegacao.js`.

Dependência da plataforma: a sessão (Firebase Auth, ou a chave
`aprova:sessao:v3` no modo demonstração, em `dados/sessao.js`) e, nas
regras, o perfil ativo em `usuarios/{uid}` (`fcPerfilAtivo()`).
