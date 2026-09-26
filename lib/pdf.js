// Task 2.2 — Exportação direta da folha A4 em PDF (sem diálogo de impressão).

export async function exportarPdf(elemento, nomeArquivo = "apostila.pdf") {
  // Import dinâmico: html2pdf só roda no navegador (evita erro de SSR)
  const html2pdf = (await import("html2pdf.js")).default;

  // Garante que a ilustração terminou de carregar antes de "fotografar" a folha
  await Promise.all(
    [...elemento.querySelectorAll("img")].map((img) =>
      img.complete ? null : new Promise((ok) => ((img.onload = ok), (img.onerror = ok)))
    )
  );

  elemento.classList.add("exportando");
  try {
    await html2pdf()
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
      .save();
  } finally {
    elemento.classList.remove("exportando");
  }
}
