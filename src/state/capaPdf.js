/* Capa da prova: o alto da primeira página do PDF, desenhado com o pdf.js.
   A biblioteca só é baixada aqui, quando o moderador escolhe o arquivo; o
   aluno recebe só a imagem pronta. */

export async function capaDoPdf(arquivo, { largura = 960, altura = 0.62 } = {}) {
  // build "legacy": a padrão do pdf.js 6 usa recursos de JavaScript que muitos navegadores ainda não têm
  const [pdfjs, { default: trabalhador }] = await Promise.all([
    import("pdfjs-dist/legacy/build/pdf.mjs"),
    import("pdfjs-dist/legacy/build/pdf.worker.min.mjs?url"),
  ]);
  pdfjs.GlobalWorkerOptions.workerSrc = trabalhador;
  // cópia dos bytes: o pdf.js entrega o buffer ao worker e o arquivo original segue inteiro para o envio
  const tarefa = pdfjs.getDocument({ data: new Uint8Array(await arquivo.arrayBuffer()) });
  const doc = await tarefa.promise;
  try {
    const pagina = await doc.getPage(1);
    const base = pagina.getViewport({ scale: 1 });
    const viewport = pagina.getViewport({ scale: largura / base.width });
    const canvas = document.createElement("canvas");
    canvas.width = Math.round(viewport.width);
    // só o alto da página (a parte de cima da capa do caderno)
    canvas.height = Math.round(Math.min(viewport.height, viewport.width * altura));
    const g = canvas.getContext("2d");
    g.fillStyle = "#ffffff";
    g.fillRect(0, 0, canvas.width, canvas.height);
    await pagina.render({ canvasContext: g, canvas, viewport }).promise;
    return await new Promise((ok, falha) => canvas.toBlob((b) => (b ? ok(b) : falha(new Error("Não foi possível gerar a capa."))), "image/jpeg", 0.86));
  } finally {
    tarefa.destroy(); // libera o worker e a memória do documento
  }
}
