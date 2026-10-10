// Testes visuais da capa "História que Ensina" (e das capas atuais) num navegador de verdade.
// Rodar contra um servidor (local ou preview):
//   BASE_URL=http://localhost:3000 npm run test:capas
// Confere: textos dentro da página e da margem de segurança, nada sobreposto, título
// centralizado e sem corte, desenho inteiro no quadro, ilustração carregada, sem rolagem
// lateral no computador e no celular, PDF do aluno e do professor em A4 e capa do PDF
// igual à da prévia.
import { test, before, after } from "node:test";
import assert from "node:assert/strict";
import { execFileSync } from "node:child_process";
import { mkdtempSync, writeFileSync } from "node:fs";
import { tmpdir } from "node:os";
import { join } from "node:path";

const BASE = (process.env.BASE_URL || "http://localhost:3000").replace(/\/$/, "");
const URL_CAPAS = `${BASE}/capas-teste`;
const PASTA = mkdtempSync(join(tmpdir(), "capas-"));
let chromium, navegador;

before(async () => {
  ({ chromium } = await import("playwright-core"));
  navegador = await chromium.launch(process.env.CHROMIUM_PATH ? { executablePath: process.env.CHROMIUM_PATH } : {});
});
after(async () => navegador?.close());

async function abrir(viewport, extra = {}) {
  const ctx = await navegador.newContext({ viewport, deviceScaleFactor: 1, acceptDownloads: true, ...extra });
  const pg = await ctx.newPage();
  const erros = [];
  pg.on("pageerror", (e) => erros.push(e.message));
  pg.on("console", (m) => m.type() === "error" && !/next-auth|status of 500/.test(m.text()) && erros.push(m.text()));
  await pg.goto(URL_CAPAS, { waitUntil: "networkidle" });
  await pg.evaluate(() => document.fonts.ready);
  await pg.waitForTimeout(500);
  return { ctx, pg, erros };
}

// Medidas de cada capa, em px da própria capa (desfaz a escala da prévia)
const medir = () =>
  [...document.querySelectorAll("figure.caso-capa")].map((fig) => {
    const capa = fig.querySelector(".capa-a4");
    const r = capa.getBoundingClientRect();
    const k = capa.offsetWidth / r.width;
    const rel = (el) => {
      const b = el.getBoundingClientRect();
      return { x: (b.left - r.left) * k, y: (b.top - r.top) * k, w: b.width * k, h: b.height * k };
    };
    const bloco = (n) => {
      const el = capa.querySelector(`[data-capa="${n}"]`);
      return el ? rel(el) : null;
    };
    // cada linha de texto visível
    const linhas = [];
    const andar = document.createTreeWalker(capa, NodeFilter.SHOW_TEXT);
    while (andar.nextNode()) {
      const t = andar.currentNode;
      if (!t.textContent.trim() || t.parentElement.closest("svg")) continue;
      const rg = document.createRange();
      rg.selectNodeContents(t);
      for (const b of rg.getClientRects()) if (b.width > 0.5) linhas.push({ texto: t.textContent.trim().slice(0, 40), x: (b.left - r.left) * k, y: (b.top - r.top) * k, w: b.width * k, h: b.height * k });
    }
    const titulo = capa.querySelector('[data-capa="titulo"]');
    const linhasTitulo = [];
    if (titulo) {
      const rg = document.createRange();
      rg.selectNodeContents(titulo);
      const porLinha = new Map();
      for (const b of rg.getClientRects()) {
        const y = Math.round((b.top - r.top) * k);
        const atual = porLinha.get(y) || { esq: Infinity, dir: -Infinity };
        porLinha.set(y, { esq: Math.min(atual.esq, (b.left - r.left) * k), dir: Math.max(atual.dir, (b.right - r.left) * k) });
      }
      linhasTitulo.push(...porLinha.values());
    }
    const caixa = capa.querySelector('[data-capa="caixa-titulo"]');
    const des = capa.querySelector('[data-capa="desenho"]');
    let desenho = null;
    if (des) {
      const vb = des.viewBox.baseVal;
      const bb = des.querySelector("g").getBBox();
      desenho = { vb: [vb.x, vb.y, vb.x + vb.width, vb.y + vb.height], bb: [bb.x, bb.y, bb.x + bb.width, bb.y + bb.height] };
    }
    const img = capa.querySelector('[data-capa="imagem"]');
    return {
      caso: fig.dataset.caso,
      variante: fig.dataset.variante,
      W: capa.offsetWidth,
      H: capa.offsetHeight,
      blocos: Object.fromEntries(["logo", "selo", "exemplo", "disciplina", "caixa-titulo", "descricao", "ilustracao", "personagens", "fala", "identificacao", "rodape"].map((n) => [n, bloco(n)])),
      linhas,
      linhasTitulo,
      tituloCabe: caixa ? caixa.scrollWidth <= caixa.clientWidth + 1 && caixa.scrollHeight <= caixa.clientHeight + 4 : true,
      fonteTitulo: titulo ? parseFloat(titulo.style.fontSize) : 0,
      desenho,
      imagem: img ? getComputedStyle(img).backgroundImage : null,
      textoCapa: capa.innerText,
    };
  });

let medidas;
test("prévias: todas as capas montam sem erro de página", async () => {
  const { ctx, pg, erros } = await abrir({ width: 1280, height: 900 });
  medidas = await pg.evaluate(medir);
  await ctx.close();
  assert.deepEqual(erros, []);
  const hist = medidas.filter((m) => m.variante === "historia");
  assert.equal(new Set(hist.map((m) => m.caso)).size, 6, "6 casos da capa nova");
  for (const v of ["infografico", "escolar", "comfy"]) assert.ok(medidas.some((m) => m.variante === v), `capa atual ${v} continua montando`);
  for (const m of medidas) assert.deepEqual([Math.round(m.W), Math.round(m.H)], [794, 1123], `${m.variante}/${m.caso} em A4 (210 × 297 mm)`);
});

const hist = () => medidas.filter((m) => m.variante === "historia");
const MARGEM = 38; // 10 mm: nenhum texto ou bloco encosta na borda (corte da gráfica)

test("nenhum texto fora da página nem da margem de segurança", () => {
  for (const m of hist()) {
    for (const l of m.linhas) {
      assert.ok(l.x >= MARGEM - 0.5 && l.x + l.w <= m.W - MARGEM + 0.5, `${m.caso}: "${l.texto}" fora da margem lateral (${l.x.toFixed(1)}…${(l.x + l.w).toFixed(1)})`);
      assert.ok(l.y >= MARGEM - 0.5 && l.y + l.h <= m.H - MARGEM + 0.5, `${m.caso}: "${l.texto}" fora da margem vertical (${l.y.toFixed(1)})`);
    }
  }
});

test("nenhum bloco se sobrepõe a outro", () => {
  const sobrepoe = (a, b) => a.x < b.x + b.w - 0.5 && b.x < a.x + a.w - 0.5 && a.y < b.y + b.h - 0.5 && b.y < a.y + a.h - 0.5;
  const pilha = ["disciplina", "caixa-titulo", "descricao", "ilustracao", "identificacao", "rodape"];
  for (const m of hist()) {
    const presentes = pilha.filter((n) => m.blocos[n]);
    for (let i = 0; i < presentes.length; i++)
      for (let j = i + 1; j < presentes.length; j++) assert.ok(!sobrepoe(m.blocos[presentes[i]], m.blocos[presentes[j]]), `${m.caso}: ${presentes[i]} × ${presentes[j]}`);
    for (const n of presentes) if (m.blocos.selo) assert.ok(!sobrepoe(m.blocos.selo, m.blocos[n]), `${m.caso}: selo × ${n}`);
    if (m.blocos.selo) assert.ok(!sobrepoe(m.blocos.selo, m.blocos.logo), `${m.caso}: selo × logo`);
    // fala e personagens ficam dentro do quadro da ilustração
    for (const n of ["personagens", "fala"]) {
      const b = m.blocos[n];
      if (!b) continue;
      const q = m.blocos.ilustracao;
      assert.ok(b.x >= q.x - 0.5 && b.x + b.w <= q.x + q.w + 0.5 && b.y >= q.y - 0.5 && b.y + b.h <= q.y + q.h + 0.5, `${m.caso}: ${n} sai da ilustração`);
    }
  }
});

test("título centralizado, inteiro e com fonte proporcional ao tamanho", () => {
  for (const m of hist()) {
    assert.ok(m.tituloCabe, `${m.caso}: título cortado`);
    assert.ok(m.linhasTitulo.length >= 1);
    for (const l of m.linhasTitulo) {
      const centro = (l.esq + l.dir) / 2;
      assert.ok(Math.abs(centro - m.W / 2) <= 3, `${m.caso}: linha do título fora do centro (${centro.toFixed(1)} × ${m.W / 2})`);
    }
    for (const n of ["logo", "disciplina"]) {
      const b = m.blocos[n];
      if (b) assert.ok(Math.abs(b.x + b.w / 2 - m.W / 2) <= 3, `${m.caso}: ${n} fora do centro`);
    }
  }
  const f = Object.fromEntries(hist().map((m) => [m.caso, m.fonteTitulo]));
  assert.ok(f.matematica > f.portugues && f.portugues > f.ciencias && f.ciencias > f.completo, JSON.stringify(f));
  assert.ok(f.vazio >= f.matematica, "título de 1 palavra é o maior");
  assert.ok(Math.min(...Object.values(f)) >= 30, "nada pequeno demais");
});

test("desenho inteiro dentro do quadro; ilustração da IA carregada", () => {
  for (const m of hist()) {
    if (m.desenho) {
      const [x0, y0, x1, y1] = m.desenho.vb;
      const [a0, b0, a1, b1] = m.desenho.bb;
      assert.ok(a0 >= x0 && b0 >= y0 && a1 <= x1 && b1 <= y1, `${m.caso}: desenho cortado (${m.desenho.bb.map((v) => v.toFixed(0))} fora de ${m.desenho.vb})`);
    }
    if (m.caso === "ciencias-ia") assert.match(m.imagem || "", /ilustracao-exemplo-ciencias\.webp/);
    assert.ok(m.blocos.ilustracao.h >= 280, `${m.caso}: ilustração pequena demais (${m.blocos.ilustracao.h.toFixed(0)} px)`);
  }
});

test("conteúdo: só o que foi informado (acentos preservados; selo só com BNCC conferida)", () => {
  const por = Object.fromEntries(hist().map((m) => [m.caso, m]));
  assert.match(por.portugues.textoCapa, /Verbos e suas variações no dia a dia/);
  assert.match(por.ciencias.textoCapa, /CIÊNCIAS|Ciências/);
  assert.match(por.completo.textoCapa, /Escola Municipal de Ensino Fundamental Professora Maria José da Conceição/);
  assert.match(por.completo.textoCapa, /Prof\.ª Ana Beatriz Nascimento Ferreira/);
  assert.match(por.completo.textoCapa, /7º ano B — período da tarde/);
  assert.ok(por.completo.blocos.descricao, "descrição longa aparece inteira quando cabe");
  for (const c of ["matematica", "portugues", "ciencias", "vazio"]) assert.equal(por[c].blocos.identificacao, null, `${c}: sem caixa de escola/professor vazia`);
  for (const c of ["matematica", "portugues", "ciencias", "completo"]) assert.ok(por[c].blocos.selo, `${c}: selo com BNCC conferida`);
  assert.equal(por.vazio.blocos.selo, null, "sem BNCC, sem selo");
  assert.doesNotMatch(por.vazio.textoCapa, /BNCC ALINHADA|alinhado à habilidade/);
  assert.match(por.vazio.textoCapa, /ARTE|Arte/);
});

for (const [nome, viewport, extra] of [
  ["computador", { width: 1440, height: 900 }, {}],
  ["celular", { width: 390, height: 844 }, { isMobile: true, hasTouch: true }],
]) {
  test(`${nome}: sem rolagem lateral e capa inteira na prévia`, async () => {
    const { ctx, pg, erros } = await abrir(viewport, extra);
    const r = await pg.evaluate(() => ({
      lateral: document.documentElement.scrollWidth - innerWidth,
      fora: [...document.querySelectorAll(".capa-a4")].filter((c) => { const b = c.getBoundingClientRect(); return b.left < -0.5 || b.right > innerWidth + 0.5; }).length,
    }));
    await ctx.close();
    assert.deepEqual(erros, []);
    assert.equal(r.lateral, 0, "rolagem lateral");
    assert.equal(r.fora, 0, "capa saindo da tela");
  });
}

// PDF: página 1 = capa em A4; aluno sem gabarito, professor com; capa do PDF igual à prévia
const paginas = (arq) => {
  const info = execFileSync("pdfinfo", ["-f", "1", "-l", "99", arq]).toString();
  return { n: Number(/Pages:\s+(\d+)/.exec(info)[1]), tamanhos: [...info.matchAll(/Page\s+\d+ size:\s+([\d.]+) x ([\d.]+)/g)].map((m) => [Number(m[1]), Number(m[2])]) };
};
const texto = (arq, p) => execFileSync("pdftotext", ["-f", String(p), "-l", String(p), "-layout", arq, "-"]).toString();

for (const caso of ["matematica", "completo", "ciencias-ia"]) {
  test(`PDF do aluno e do professor (${caso}): A4, capa igual à prévia, gabarito só no do professor`, async () => {
    const { ctx, pg } = await abrir({ width: 1280, height: 900 });
    const fig = pg.locator(`figure.caso-capa[data-caso="${caso}"][data-variante="historia"]`);
    const arqs = {};
    for (const tipo of ["aluno", "professor"]) {
      const [dl] = await Promise.all([pg.waitForEvent("download", { timeout: 60000 }), fig.locator(`[data-pdf="${tipo}"]`).click()]);
      arqs[tipo] = join(PASTA, `${caso}-${tipo}.pdf`);
      await dl.saveAs(arqs[tipo]);
    }
    // prévia da capa em tamanho real, para comparar com a página 1 do PDF
    const previa = join(PASTA, `${caso}-previa.png`);
    await pg.evaluate((c) => {
      const el = document.querySelector(`figure.caso-capa[data-caso="${c}"][data-variante="historia"] .capa-a4`).cloneNode(true);
      el.id = "capa-real";
      Object.assign(el.style, { position: "fixed", left: "0", top: "0", zIndex: 99999, transform: "none" });
      document.body.appendChild(el);
    }, caso);
    await pg.setViewportSize({ width: 794, height: 1123 });
    await pg.waitForTimeout(400);
    await pg.locator("#capa-real").screenshot({ path: previa });
    await ctx.close();

    for (const tipo of ["aluno", "professor"]) {
      const { n, tamanhos } = paginas(arqs[tipo]);
      assert.ok(n >= 2, `${tipo}: capa + conteúdo`);
      for (const [w, h] of tamanhos) assert.ok(Math.abs(w - 595.28) < 1.5 && Math.abs(h - 841.89) < 1.5, `${tipo}: página fora do A4 (${w} × ${h})`);
    }
    const capaTxt = texto(arqs.aluno, 1).replace(/\s+/g, " ");
    assert.ok(capaTxt.length > 20, "capa do PDF tem texto real (pesquisável)");
    const todosAluno = execFileSync("pdftotext", [arqs.aluno, "-"]).toString();
    const todosProf = execFileSync("pdftotext", [arqs.professor, "-"]).toString();
    assert.doesNotMatch(todosAluno, /GABARITO/i, "PDF do aluno sem gabarito");
    assert.match(todosProf, /GABARITO/i, "PDF do professor com gabarito");

    // página 1 do PDF × prévia: diferença média pequena (mesmo desenho)
    const pre = join(PASTA, `${caso}-pdf1`);
    execFileSync("pdftoppm", ["-f", "1", "-l", "1", "-r", "96", "-png", "-singlefile", arqs.aluno, pre]);
    const py = `
import sys
from PIL import Image, ImageChops, ImageStat
# Compara a página em 12 faixas horizontais, no miolo (sem a moldura de 6 mm que o PDF
# desenha em toda capa). Em cada faixa aceita um deslocamento vertical de até 10 px (o PDF
# compensa a fonte com app/globals.css; aqui sobra no máximo ~1 px) e mede o resto:
# bloco faltando, trocado ou cortado continua aparecendo.
a=Image.open(sys.argv[1]).convert('L').resize((794,1123)); b=Image.open(sys.argv[2]).convert('L').resize((794,1123))
x0,x1,y0,y1=40,754,52,1071; n=12; h=(y1-y0)//n
pior=0; desl=0; soma=0
for i in range(n):
    t=y0+i*h; pb=b.crop((x0,t,x1,t+h))
    best=min((round(ImageStat.Stat(ImageChops.difference(a.crop((x0,t+d,x1,t+h+d)),pb)).mean[0],2),abs(d),d) for d in range(-10,11))
    soma+=best[0]
    if best[0]>pior: pior=best[0]
    if abs(best[2])>abs(desl): desl=best[2]
print(f"{soma/n:.2f} {desl}")`;
    writeFileSync(join(PASTA, "dif.py"), py);
    const [dif, desloc] = execFileSync("python3", ["-I", join(PASTA, "dif.py"), `${pre}.png`, previa]).toString().trim().split(" ").map(Number);
    assert.ok(Math.abs(desloc) <= 3, `capa do PDF deslocada ${desloc} px (> 1 mm)`);
    assert.ok(dif < 4, `capa do PDF diferente da prévia (diferença média ${dif.toFixed(1)} de 255, deslocamento ${desloc} px)`);
  });
}
