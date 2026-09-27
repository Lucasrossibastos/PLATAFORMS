# aprova+ · plataforma de estudos para vestibular

React + Vite. Toda a lógica (motor de metas, dados de exemplo) está em
`src/core/nucleo.js`; as telas só leem e chamam o núcleo.

## Rodar

```bash
npm install
npm run dev      # desenvolvimento em http://localhost:5173
npm test         # testes do núcleo e do estado de estudo
npm run build    # gera o site em docs/ (é o que o GitHub Pages publica)
```

Contas de teste (senha `123`): `aluno@curso.com`, `moderador@curso.com`,
`carlos@curso.com` (ENEM Med), `mariana@curso.com` (UNICAMP).
No menu da conta há **Restaurar dados de exemplo**.

## Publicar no GitHub Pages

Settings → Pages → *Deploy from a branch* → escolha a branch e a pasta
**`/docs`**. O site fica em `https://lucasrossibastos.github.io/PLATAFORMS/`.

`docs/` é gerada pelo `npm run build` e apagada a cada build: não guarde
documentação lá. Rode o build antes de cada push, senão o site fica
desatualizado.

## Estrutura

| Pasta | O que tem |
|---|---|
| `src/core/nucleo.js` | Núcleo original, com as correções listadas no topo do arquivo |
| `src/state/` | Estado de estudo do aluno (semana, atrasadas, sequência), persistência e sessão |
| `src/screens/` | Login, boas-vindas, shell e telas do aluno |
| `src/ui/` | Componentes (botões, diálogos, moldura de cinema com vídeo) |
| `src/styles/` | Tokens de tema (escuro/claro) e estilos |

## Estado atual

Prontas: login, boas-vindas (aluno e moderador), dashboard do aluno, semana,
página de boas-vindas, **Cursos em vídeo** (moderador cria playlists e anexa
vídeos por link ou arquivo; aluno assiste e marca aulas), **Redação**
(moderador registra a devolutiva com foto, marcações no texto e notas por
competência; aluno vê a lista, a evolução e a correção) e, no moderador, **Textos**: edita as frases da página
inicial, das boas-vindas e do painel do aluno, para todos ou só para um aluno
(`*palavra*` destaca, Enter quebra a linha, `{nome}`, `{saudacao}` e
`{vestibular}` são preenchidos). As demais telas mostram o que vão fazer
(texto da especificação).

O vídeo de fundo toca sempre, mesmo com "reduzir movimento" ligado no
sistema. Para testar com outro vídeo: `VITE_VIDEO_FUNDO=./video.webm npm run build`.

Arquivos (fotos de redação, vídeos enviados, capas) ficam no IndexedDB do
navegador, com a foto comprimida para ~300 KB. Vídeo por link (YouTube, Vimeo,
Drive, Panda) funciona em qualquer aparelho; arquivo enviado só toca no
navegador onde foi anexado, até existir servidor.

Os dados ficam no `localStorage` do navegador: recarregar não perde nada, mas
cada aparelho tem a sua cópia. Os pontos de troca pelo Firebase estão marcados
com 🔥 no código.
