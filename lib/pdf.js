// Exportação da folha A4 em PDF (sem diálogo de impressão).
//
// Como funciona (relatório de defeitos de layout do PDF):
//  1. A folha é clonada num "palco" fora da tela, em tamanho real (210 mm).
//  2. Paginação por blocos: cabeçalho, cartão BNCC, cada exercício e o gabarito
//     são indivisíveis; se um bloco não cabe no que resta da página, ele começa
//     na página seguinte (mesma regra da prévia e da impressão).
//  3. Cada página é uma imagem A4 de tamanho FIXO (área útil de 267 mm entre
//     margens de 15 mm), nunca uma faixa de altura variável.
//  4. Por cima da imagem vai uma camada de TEXTO REAL invisível, na posição de
//     cada linha: o PDF fica pesquisável, copiável e legível por leitores de
//     tela (pdftotext extrai o conteúdo). Fonte DejaVu Sans embutida, com
//     acentos e símbolos matemáticos (², ³, ×, ÷, →, ≤, π...).
//  5. Numeração de página e metadados (título, assunto, autor, idioma pt-BR).
// A capa, quando existe, entra como página 1 sangrada, também com texto real.

const MM = 793.7 / 210; // px por mm (96 dpi)
const LARGURA_PX = 793.7;
const MARGEM_MM = 15;
const UTIL_MM = 297 - 2 * MARGEM_MM; // 267 mm
const UTIL_PX = UTIL_MM * MM;
const ESCALA = 2.5;
const SELETOR_BLOCOS = ".cabecalho-escola, .cartao-bncc, .bloco-exercicio, .quebra-antes";
const FONTE = "DejaVu";

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

// Palco fora da tela, sem o transform: scale do live preview
function montarPalco(elemento) {
  const palco = document.createElement("div");
  palco.setAttribute("aria-hidden", "true");
  palco.style.cssText = `position:fixed;left:-10000px;top:0;width:${LARGURA_PX}px;z-index:-1;background:#fff;`;
  const clone = elemento.cloneNode(true);
  palco.appendChild(clone);
  document.body.appendChild(palco);
  return { palco, clone };
}

// ---------- Paginação por blocos ----------
const topoRel = (el, raiz) => el.getBoundingClientRect().top - raiz.getBoundingClientRect().top;

// Sobe até um elemento cujo pai seja fluxo de bloco (inserir espaçador dentro
// de grid/flex criaria uma célula nova e quebraria o layout)
function alvoMovel(bloco, raiz) {
  let alvo = bloco;
  while (alvo.parentElement && alvo.parentElement !== raiz) {
    const d = getComputedStyle(alvo.parentElement).display;
    if (!/grid|flex/.test(d)) break;
    alvo = alvo.parentElement;
  }
  return alvo;
}

export function paginar(raiz) {
  const blocos = [...raiz.querySelectorAll(SELETOR_BLOCOS)].filter((el) => !el.parentElement.closest(".bloco-exercicio"));
  const vistos = new Set();
  let inicioPagina = 0;
  for (const bloco of blocos) {
    const alvo = alvoMovel(bloco, raiz);
    if (vistos.has(alvo)) continue;
    vistos.add(alvo);
    const topo = topoRel(alvo, raiz);
    const alt = alvo.getBoundingClientRect().height;
    while (topo >= inicioPagina + UTIL_PX) inicioPagina += UTIL_PX;
    const forcada = bloco.classList.contains("quebra-antes");
    const naoCabe = topo + alt > inicioPagina + UTIL_PX + 0.5 && alt <= UTIL_PX;
    if ((forcada || naoCabe) && topo > inicioPagina + 1) {
      const proxima = inicioPagina + UTIL_PX;
      const esp = document.createElement("div");
      esp.className = "espacador-pdf";
      esp.style.cssText = `height:${proxima - topo}px;margin:0;padding:0;`;
      alvo.style.marginTop = "0px";
      alvo.parentElement.insertBefore(esp, alvo);
      // corrige colapso de margens: o bloco precisa começar exatamente no topo da página
      const ajuste = proxima - topoRel(alvo, raiz);
      if (Math.abs(ajuste) > 0.5) esp.style.height = `${Math.max(0, proxima - topo + ajuste)}px`;
      inicioPagina = proxima;
    }
  }
  const total = raiz.scrollHeight;
  return Math.max(1, Math.ceil((total - 1) / UTIL_PX));
}

// ---------- Camada de texto ----------
// Agrupa as palavras por linha visual; devolve { pagina, texto, x, y, larg, alt, fonte } em px
function linhasDeTexto(raiz, alturaPagina) {
  const base = raiz.getBoundingClientRect();
  const walker = document.createTreeWalker(raiz, NodeFilter.SHOW_TEXT, {
    acceptNode: (n) => (n.nodeValue.trim() ? NodeFilter.FILTER_ACCEPT : NodeFilter.FILTER_REJECT),
  });
  const palavras = [];
  const range = document.createRange();
  for (let n = walker.nextNode(); n; n = walker.nextNode()) {
    const pai = n.parentElement;
    const est = getComputedStyle(pai);
    if (est.visibility === "hidden" || est.display === "none") continue;
    const fonte = parseFloat(est.fontSize) || 12;
    const upper = est.textTransform === "uppercase";
    for (const m of n.nodeValue.matchAll(/\S+/g)) {
      range.setStart(n, m.index);
      range.setEnd(n, m.index + m[0].length);
      const r = range.getBoundingClientRect();
      if (r.width < 1 || r.height < 1) continue; // sr-only e afins
      palavras.push({
        texto: upper ? m[0].toLocaleUpperCase("pt-BR") : m[0],
        x: r.left - base.left,
        y: r.top - base.top,
        larg: r.width,
        alt: r.height,
        fonte,
      });
    }
  }
  const linhas = [];
  for (const p of palavras) {
    const ult = linhas[linhas.length - 1];
    const mesma =
      ult &&
      Math.abs(p.y + p.alt / 2 - (ult.y + ult.alt / 2)) < Math.min(p.alt, ult.alt) * 0.5 &&
      p.x >= ult.x + ult.larg - 2 &&
      p.x - (ult.x + ult.larg) < p.fonte * 1.5;
    if (mesma) {
      ult.texto += " " + p.texto;
      ult.larg = p.x + p.larg - ult.x;
      ult.alt = Math.max(ult.alt, p.alt);
    } else {
      linhas.push({ ...p });
    }
  }
  return linhas.map((l) => {
    const pagina = Math.max(0, Math.floor((l.y + l.alt / 2) / alturaPagina));
    return { ...l, pagina, y: l.y - pagina * alturaPagina };
  });
}

let fonteCache = null;
async function carregarFonte() {
  if (!fonteCache) {
    fonteCache = fetch("/fonts/DejaVuSans-texto.ttf")
      .then((r) => {
        if (!r.ok) throw new Error("fonte");
        return r.arrayBuffer();
      })
      .then((buf) => {
        let bin = "";
        const bytes = new Uint8Array(buf);
        for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
        return btoa(bin);
      })
      .catch((e) => {
        fonteCache = null;
        throw e;
      });
  }
  return fonteCache;
}

// Escreve as linhas como texto invisível (selecionável/pesquisável) na página atual
function escreverCamada(pdf, linhas, deslocYmm) {
  for (const l of linhas) {
    const fontePt = (l.fonte * 72) / 96;
    pdf.setFontSize(fontePt);
    const largMm = l.larg / MM;
    const natural = pdf.getTextWidth(l.texto);
    const escala = natural > 0 ? Math.min(3, Math.max(0.3, largMm / natural)) : 1;
    const alturaFonteMm = l.fonte / MM;
    const y = deslocYmm + (l.y + (l.alt - l.fonte) / 2) / MM + alturaFonteMm * 1.28; // linha de base (calibrada contra a imagem do html2canvas)
    // depuração: window.__edugeraPdfDebug = true desenha a camada em vermelho
    const depurar = typeof window !== "undefined" && window.__edugeraPdfDebug;
    if (depurar) pdf.setTextColor(220, 0, 0);
    pdf.text(l.texto, l.x / MM, y, { renderingMode: depurar ? "fill" : "invisible", horizontalScale: escala });
  }
}

async function renderizar(el, fundo) {
  const html2canvas = (await import("html2canvas")).default;
  return html2canvas(el, { scale: ESCALA, useCORS: true, backgroundColor: fundo, windowWidth: 794, scrollX: 0, scrollY: 0 });
}

export async function exportarPdf(elemento, nomeArquivo = "apostila.pdf", { capa, titulo, assunto, autor } = {}) {
  const { jsPDF } = await import("jspdf");
  await esperarImagens(elemento);
  if (document.fonts?.ready) await document.fonts.ready;

  const pdf = new jsPDF({ unit: "mm", format: "a4", orientation: "portrait", compress: true });
  let temFonte = true;
  try {
    pdf.addFileToVFS("DejaVuSans-texto.ttf", await carregarFonte());
    pdf.addFont("DejaVuSans-texto.ttf", FONTE, "normal");
    pdf.setFont(FONTE, "normal");
  } catch {
    temFonte = false; // sem a fonte, o PDF sai só com a imagem (como antes)
  }

  // ----- conteúdo -----
  const { palco, clone } = montarPalco(elemento);
  let paginas = [];
  try {
    clone.classList.add("exportando");
    const total = paginar(clone);
    const linhas = temFonte ? linhasDeTexto(clone, UTIL_PX) : [];
    const canvas = await renderizar(clone, "#ffffff");
    const k = canvas.width / clone.offsetWidth;
    const altFatia = Math.round(UTIL_PX * k);
    for (let i = 0; i < total; i++) {
      // página de tamanho fixo: a última também tem a área útil inteira (fundo branco)
      const fatia = document.createElement("canvas");
      fatia.width = canvas.width;
      fatia.height = altFatia;
      const ctx = fatia.getContext("2d");
      ctx.fillStyle = "#ffffff";
      ctx.fillRect(0, 0, fatia.width, fatia.height);
      const sy = i * altFatia;
      const sh = Math.min(altFatia, canvas.height - sy);
      if (sh > 0) ctx.drawImage(canvas, 0, sy, canvas.width, sh, 0, 0, canvas.width, sh);
      paginas.push({ img: fatia.toDataURL("image/jpeg", 0.92), linhas: linhas.filter((l) => l.pagina === i) });
    }
  } finally {
    palco.remove();
  }

  // ----- capa (página 1, sangrada) -----
  let paginaCapa = null;
  if (capa) {
    await esperarFundos(capa);
    const { palco: palcoCapa, clone: cloneCapa } = montarPalco(capa);
    try {
      const alturaCapa = cloneCapa.offsetHeight || 297 * MM;
      const linhas = temFonte ? linhasDeTexto(cloneCapa, alturaCapa).filter((l) => l.pagina === 0) : [];
      const canvas = await renderizar(cloneCapa, "#161618");
      paginaCapa = { img: canvas.toDataURL("image/jpeg", 0.93), linhas };
    } finally {
      palcoCapa.remove();
    }
  }

  const totalPaginas = paginas.length + (paginaCapa ? 1 : 0);
  let n = 0;
  const novaPagina = () => {
    if (n > 0) pdf.addPage("a4", "portrait");
    n += 1;
  };

  if (paginaCapa) {
    novaPagina();
    pdf.addImage(paginaCapa.img, "JPEG", 0, 0, 210, 297, undefined, "FAST");
    if (temFonte) escreverCamada(pdf, paginaCapa.linhas, 0);
  }
  for (const p of paginas) {
    novaPagina();
    pdf.addImage(p.img, "JPEG", 0, MARGEM_MM, 210, UTIL_MM, undefined, "FAST");
    if (temFonte) {
      escreverCamada(pdf, p.linhas, MARGEM_MM);
      // numeração visível na margem inferior (área segura)
      pdf.setFontSize(8);
      pdf.setTextColor(100, 116, 139);
      pdf.text(`${n} / ${totalPaginas}`, 210 - MARGEM_MM, 297 - 7, { align: "right" });
      pdf.setTextColor(0, 0, 0);
    }
  }

  pdf.setProperties({
    title: titulo || nomeArquivo.replace(/\.pdf$/, ""),
    subject: assunto || "Material didático alinhado à BNCC",
    author: autor || "",
    keywords: "BNCC, apostila, EduGera",
    creator: "EduGera (edugera.vercel.app)",
  });
  pdf.setLanguage("pt-BR");
  pdf.save(nomeArquivo);
}
