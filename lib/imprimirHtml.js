// Impressão e download de uma página HTML pronta, sem pop-up (só no navegador).
// Imprime por um quadro escondido na própria página: funciona mesmo com pop-ups bloqueados.
export function imprimirHtml(html, aoFalhar) {
  const antigo = document.getElementById("edugera-impressao");
  if (antigo) antigo.remove();
  const q = document.createElement("iframe");
  q.id = "edugera-impressao";
  q.setAttribute("aria-hidden", "true");
  q.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0;visibility:hidden";
  document.body.appendChild(q);
  const doc = q.contentWindow.document;
  doc.open();
  doc.write(html);
  doc.close();
  setTimeout(() => {
    try {
      q.contentWindow.focus();
      q.contentWindow.print();
    } catch {
      aoFalhar?.();
    }
  }, 400);
}

export const nomeDeArquivo = (s = "edugera") =>
  String(s).toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "").slice(0, 50) || "edugera";

export function baixarHtml(html, nome) {
  const blob = new Blob([html], { type: "text/html;charset=utf-8" });
  const a = document.createElement("a");
  a.href = URL.createObjectURL(blob);
  a.download = `${nomeDeArquivo(nome)}.html`;
  document.body.appendChild(a);
  a.click();
  a.remove();
  setTimeout(() => URL.revokeObjectURL(a.href), 5000);
}
