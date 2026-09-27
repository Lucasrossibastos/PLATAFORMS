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
página de boas-vindas. As demais telas mostram o que vão fazer (texto da
especificação).

Os dados ficam no `localStorage` do navegador: recarregar não perde nada, mas
cada aparelho tem a sua cópia. Os pontos de troca pelo Firebase estão marcados
com 🔥 no código.
