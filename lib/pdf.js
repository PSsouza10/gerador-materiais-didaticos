// Task 2.2 — Exportação direta da folha A4 em PDF (sem diálogo de impressão).
// Com capa: a capa entra como página 1, sangrada (sem margens); as páginas
// de conteúdo mantêm as margens de 15 mm.

const esperarImagens = (el) =>
  Promise.all(
    [...el.querySelectorAll("img")].map((img) =>
      img.complete ? null : new Promise((ok) => ((img.onload = ok), (img.onerror = ok)))
    )
  );

// Pré-carrega imagens usadas como background-image (a capa usa assim)
const esperarFundos = (el) => {
  const urls = new Set();
  for (const n of [el, ...el.querySelectorAll("*")]) {
    const m = /url\(["']?([^"')]+)["']?\)/.exec(n.style?.backgroundImage || "");
    if (m) urls.add(m[1]);
  }
  return Promise.all(
    [...urls].map(
      (u) =>
        new Promise((ok) => {
          const i = new Image();
          i.crossOrigin = "anonymous";
          i.onload = i.onerror = ok;
          i.src = u;
        })
    )
  );
};

// Renderiza a capa fora da área escalada do preview (o transform: scale do
// live preview atrapalharia o html2canvas).
async function capaParaImagem(capa) {
  const html2canvas = (await import("html2canvas")).default;
  await esperarFundos(capa);
  const palco = document.createElement("div");
  palco.style.cssText = "position:fixed;left:-10000px;top:0;width:794px;z-index:-1;";
  const clone = capa.cloneNode(true);
  palco.appendChild(clone);
  document.body.appendChild(palco);
  try {
    const canvas = await html2canvas(clone, {
      scale: 2.5,
      useCORS: true,
      backgroundColor: "#161618",
      windowWidth: 794,
      scrollX: 0,
      scrollY: 0,
    });
    return canvas.toDataURL("image/jpeg", 0.93);
  } finally {
    palco.remove();
  }
}

export async function exportarPdf(elemento, nomeArquivo = "apostila.pdf", { capa } = {}) {
  // Import dinâmico: html2pdf só roda no navegador (evita erro de SSR)
  const html2pdf = (await import("html2pdf.js")).default;

  await esperarImagens(elemento);

  elemento.classList.add("exportando");
  let pdf;
  try {
    pdf = await html2pdf()
      .set({
        // [topo, esquerda, base, direita] em mm — as laterais já estão no padding da folha
        margin: [15, 0, 15, 0],
        filename: nomeArquivo,
        image: { type: "jpeg", quality: 0.96 },
        html2canvas: {
          scale: 2.5,
          useCORS: true,
          backgroundColor: "#ffffff",
          windowWidth: 794,
          scrollX: 0,
          scrollY: 0,
        },
        jsPDF: { unit: "mm", format: "a4", orientation: "portrait", compress: true },
        // mesmas regras do CSS de impressão: não corta blocos ao meio
        pagebreak: {
          mode: ["css", "legacy"],
          avoid: [".cabecalho-escola", ".cartao-bncc", ".bloco-exercicio"],
        },
      })
      .from(elemento)
      .toPdf()
      .get("pdf");
  } finally {
    elemento.classList.remove("exportando");
  }

  if (capa) {
    const img = await capaParaImagem(capa);
    pdf.insertPage(1);
    pdf.setPage(1);
    pdf.addImage(img, "JPEG", 0, 0, 210, 297);
  }

  pdf.save(nomeArquivo);
}
