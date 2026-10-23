// Cruzadinha (palavras cruzadas) a partir de tema/habilidade.
// A IA só escreve PALAVRAS + DICAS. A grade é montada aqui, sem IA: assim a grade
// sempre fecha (cruzamentos conferidos letra a letra) e "Nova disposição" não gasta geração.
// Sem acesso a rede: testável.
import { limparTexto } from "./validacao.js";

export const QUANTIDADES = [6, 8, 10, 12, 15];
export const LIMITES_CRUZADINHA = { professor: 120, escola: 120, turma: 60, tema: 200, bncc: 20, habilidade: 2000, observacoes: 600 };
export const TAM_MIN = 3;
export const TAM_MAX = 14;
export const GRADE_MAX = 19; // cabe numa folha A4 em pé com quadradinhos legíveis

const txt = (v, max) => limparTexto(typeof v === "string" ? v : "").slice(0, max);
const etapaDoCodigo = (c = "") => (/^EF/i.test(c) ? "Ensino Fundamental" : /^EM/i.test(c) ? "Ensino Médio" : null);
const etapaDoNivel = (n = "") => (/m[eé]dio/i.test(n) ? "Ensino Médio" : /fundamental/i.test(n) ? "Ensino Fundamental" : null);
const anoLegivel = (ano = "") => (!ano ? "" : ano.startsWith("EM") ? `${ano.slice(2)}ª série` : `${ano}º ano`);

export function validarPedidoCruzadinha(body = {}) {
  const d = {};
  for (const [campo, max] of Object.entries(LIMITES_CRUZADINHA)) {
    const v = limparTexto(typeof body[campo] === "string" ? body[campo] : "");
    if (v.length > max) return { ok: false, erro: `O campo "${campo}" passou do limite de ${max} caracteres.` };
    d[campo] = v;
  }
  d.disciplina = txt(body.disciplina, 60);
  d.nivel = txt(body.nivel, 60);
  d.ano = txt(body.ano, 6);
  d.quantidade = QUANTIDADES.includes(Number(body.quantidade)) ? Number(body.quantidade) : 10;
  if (!d.tema && d.habilidade) d.tema = d.habilidade.slice(0, 200);
  if (!d.disciplina || !d.nivel || !d.tema) return { ok: false, erro: "Preencha Disciplina, Etapa e Tema (ou escolha uma habilidade)." };
  const doCodigo = etapaDoCodigo(d.bncc);
  const doNivel = etapaDoNivel(d.nivel);
  if (d.bncc && doCodigo && doNivel && doCodigo !== doNivel)
    return { ok: false, erro: `O código ${d.bncc} é do ${doCodigo}, mas a etapa escolhida é ${doNivel}. Escolha uma habilidade da etapa certa.` };
  return { ok: true, dados: d };
}

// A IA manda algumas palavras a mais: as que não cruzarem ficam de fora.
export const pedidoDePalavras = (quantidade) => quantidade + Math.max(4, Math.ceil(quantidade / 2));

export function montarPromptCruzadinha(d, habilidadeOficial = "") {
  const n = pedidoDePalavras(d.quantidade);
  const publico = [d.nivel, anoLegivel(d.ano)].filter(Boolean).join(", ");
  return [
    `Crie as palavras e as dicas de uma CRUZADINHA (palavras cruzadas) escolar de ${d.disciplina}.`,
    `Público: ${publico}.`,
    `Tema: ${d.tema}`,
    habilidadeOficial ? `Habilidade da BNCC: ${habilidadeOficial}` : d.bncc ? `Código BNCC informado: ${d.bncc}` : "",
    d.observacoes ? `Orientações do professor: ${d.observacoes}` : "",
    "",
    "Regras:",
    `- Escreva exatamente ${n} palavras diferentes, todas do conteúdo do tema (termos, conceitos, nomes de figuras, unidades, personagens ou fatos estudados).`,
    `- Cada resposta é UMA palavra só, sem espaço nem hífen, com ${TAM_MIN} a 12 letras. Nada de siglas, números ou fórmulas.`,
    "- Varie o tamanho das palavras (curtas e longas) e prefira palavras com letras comuns (A, E, O, R, S), que cruzam com facilidade.",
    "- A dica é uma frase curta (até 120 caracteres), clara para a idade, que leva a UMA única resposta. Pode ser definição, pergunta, exemplo do cotidiano ou cálculo simples com resultado escrito por extenso.",
    "- A dica NÃO pode conter a própria resposta nem uma palavra da mesma família.",
    "- Tudo conceitualmente correto. Escreva a resposta com a grafia correta (acentos serão retirados na grade).",
    "- Não use nomes de alunos nem dados pessoais.",
    "",
    'Responda só com JSON: {"cruzadinha": {"titulo": "título curto e atraente", "orientacao": "frase de instrução para o aluno", "palavras": [{"resposta": "PALAVRA", "dica": "..."}]}}',
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// "Ângulo" → "ANGULO"; "Ç" → "C"; recusa espaço/hífen no meio (vira null).
export function letrasDaPalavra(p = "") {
  const s = String(p).trim();
  if (!s || /[\s\-]/.test(s)) return null;
  const l = s.normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase().replace(/[^A-Z]/g, "");
  return l.length >= TAM_MIN && l.length <= TAM_MAX ? l : null;
}

const semAcento = (s = "") => String(s).normalize("NFD").replace(/[̀-ͯ]/g, "").toUpperCase();

// Dica que entrega a resposta (a palavra ou o seu radical de 5+ letras aparece na dica)
export function dicaEntregaResposta(dica = "", resposta = "") {
  const d = semAcento(dica).replace(/[^A-Z]+/g, " ");
  const palavras = d.split(" ").filter(Boolean);
  const raiz = resposta.length >= 7 ? resposta.slice(0, resposta.length - 2) : resposta;
  return palavras.some((w) => w === resposta || (raiz.length >= 5 && w.startsWith(raiz)));
}

export function normalizarCruzadinha(json, d) {
  const c = json?.cruzadinha && typeof json.cruzadinha === "object" ? json.cruzadinha : json || {};
  const vistas = new Set();
  const palavras = [];
  const descartadas = [];
  for (const it of Array.isArray(c.palavras) ? c.palavras : []) {
    const original = txt(it?.resposta, 40);
    const dica = txt(it?.dica, 200);
    const resposta = letrasDaPalavra(original);
    if (!resposta || !dica) {
      if (original) descartadas.push({ palavra: original, motivo: "formato" });
      continue;
    }
    if (vistas.has(resposta)) continue;
    if (dicaEntregaResposta(dica, resposta)) {
      descartadas.push({ palavra: original, motivo: "dica entrega a resposta" });
      continue;
    }
    vistas.add(resposta);
    palavras.push({ resposta, original, dica });
  }
  return {
    titulo: txt(c.titulo, 90) || `Cruzadinha: ${d.tema}`.slice(0, 90),
    orientacao: txt(c.orientacao, 200) || "Leia as dicas e complete a cruzadinha.",
    palavras,
    descartadas,
  };
}

// ---------- Montagem da grade ----------

// Sorteio com semente (mesma semente → mesma grade; facilita testes e "nova disposição")
function sorteador(semente = 1) {
  let s = (Math.abs(Math.floor(semente)) % 2147483646) + 1;
  return () => (s = (s * 16807) % 2147483647) / 2147483647;
}

const chave = (r, c) => `${r},${c}`;

function tentarMontar(lista, rnd, alvo = Infinity) {
  const cel = new Map(); // "r,c" → { letra, h: bool, v: bool }
  const postas = [];
  let minR = 0, maxR = 0, minC = 0, maxC = 0;

  const cabe = (palavra, r, c, dir) => {
    const dr = dir === "v" ? 1 : 0;
    const dc = dir === "h" ? 1 : 0;
    const L = palavra.length;
    // limite de tamanho da grade
    const nMinR = Math.min(minR, r), nMaxR = Math.max(maxR, r + dr * (L - 1));
    const nMinC = Math.min(minC, c), nMaxC = Math.max(maxC, c + dc * (L - 1));
    if (postas.length && (nMaxR - nMinR + 1 > GRADE_MAX || nMaxC - nMinC + 1 > GRADE_MAX)) return -1;
    // antes do início e depois do fim: vazios
    if (cel.has(chave(r - dr, c - dc)) || cel.has(chave(r + dr * L, c + dc * L))) return -1;
    let cruz = 0;
    for (let i = 0; i < L; i++) {
      const rr = r + dr * i, cc = c + dc * i;
      const x = cel.get(chave(rr, cc));
      if (x) {
        if (x.letra !== palavra[i] || x[dir]) return -1;
        cruz++;
      } else {
        // vizinhos laterais vazios (senão formaria palavra que não existe)
        if (cel.has(chave(rr + dc, cc + dr)) || cel.has(chave(rr - dc, cc - dr))) return -1;
      }
    }
    if (postas.length && (cruz === 0 || cruz === L)) return -1;
    return cruz;
  };

  const por = (p, r, c, dir) => {
    const dr = dir === "v" ? 1 : 0, dc = dir === "h" ? 1 : 0;
    for (let i = 0; i < p.resposta.length; i++) {
      const k = chave(r + dr * i, c + dc * i);
      const x = cel.get(k) || { letra: p.resposta[i], h: false, v: false };
      x[dir] = true;
      cel.set(k, x);
    }
    minR = Math.min(minR, r); maxR = Math.max(maxR, r + dr * (p.resposta.length - 1));
    minC = Math.min(minC, c); maxC = Math.max(maxC, c + dc * (p.resposta.length - 1));
    postas.push({ ...p, linha: r, coluna: c, direcao: dir });
  };

  const fora = [];
  for (const p of lista) {
    if (postas.length >= alvo) break;
    if (!postas.length) {
      por(p, 0, 0, "h");
      continue;
    }
    const opcoes = [];
    for (const [k, x] of cel) {
      const [r0, c0] = k.split(",").map(Number);
      for (let i = 0; i < p.resposta.length; i++) {
        if (p.resposta[i] !== x.letra) continue;
        for (const dir of ["h", "v"]) {
          if (x[dir]) continue;
          const r = dir === "v" ? r0 - i : r0;
          const c = dir === "h" ? c0 - i : c0;
          const cruz = cabe(p.resposta, r, c, dir);
          if (cruz > 0) opcoes.push({ r, c, dir, nota: cruz * 10 + rnd() * 3 });
        }
      }
    }
    if (!opcoes.length) {
      fora.push(p);
      continue;
    }
    // equilíbrio: prefere a direção menos usada (grade mais "quadrada")
    const nh = postas.filter((x) => x.direcao === "h").length;
    const nv = postas.length - nh;
    for (const o of opcoes) o.nota += (o.dir === "h" ? nv - nh : nh - nv) * 1.5;
    opcoes.sort((a, b) => b.nota - a.nota);
    const o = opcoes[0];
    por(p, o.r, o.c, o.dir);
  }
  return { postas, fora, minR, maxR, minC, maxC };
}

// Monta a grade com até `alvo` palavras. Tenta várias ordens e fica com a melhor:
// mais palavras postas, depois mais cruzamentos por área (grade compacta).
export function montarGrade(palavras = [], { alvo = palavras.length, semente = 1, tentativas = 60 } = {}) {
  const base = palavras.filter((p) => p?.resposta);
  let melhor = null;
  const rnd = sorteador(semente);
  for (let t = 0; t < tentativas; t++) {
    // 1ª tentativa: maiores primeiro; depois, ordens sorteadas mantendo as longas no começo
    const ordem = [...base].sort((a, b) => b.resposta.length - a.resposta.length + (t ? (rnd() - 0.5) * 8 : 0));
    const r = tentarMontar(ordem, rnd, alvo);
    const postas = r.postas;
    const area = (r.maxR - r.minR + 1) * (r.maxC - r.minC + 1);
    const nota = postas.length * 1000 - area * 0.5;
    if (!melhor || nota > melhor.nota) melhor = { ...r, nota };
    if (postas.length >= alvo && t >= 12) break;
  }
  if (!melhor || !melhor.postas.length) return null;
  return numerarGrade(melhor);
}

function numerarGrade({ postas, minR, maxR, minC, maxC }) {
  const linhas = maxR - minR + 1;
  const colunas = maxC - minC + 1;
  const letras = Array.from({ length: linhas }, () => Array(colunas).fill(null));
  const ps = postas.map((p) => ({ ...p, linha: p.linha - minR, coluna: p.coluna - minC }));
  for (const p of ps)
    for (let i = 0; i < p.resposta.length; i++) {
      const r = p.linha + (p.direcao === "v" ? i : 0);
      const c = p.coluna + (p.direcao === "h" ? i : 0);
      letras[r][c] = p.resposta[i];
    }
  // números na ordem de leitura (linha a linha); h e v que começam na mesma casa dividem o número
  const inicios = [...new Set(ps.map((p) => p.linha * 1000 + p.coluna))].sort((a, b) => a - b);
  const numeros = Array.from({ length: linhas }, () => Array(colunas).fill(null));
  inicios.forEach((k, i) => (numeros[Math.floor(k / 1000)][k % 1000] = i + 1));
  const item = (p) => ({ numero: numeros[p.linha][p.coluna], resposta: p.resposta, original: p.original, dica: p.dica, linha: p.linha, coluna: p.coluna, tamanho: p.resposta.length });
  const porNumero = (a, b) => a.numero - b.numero;
  return {
    linhas,
    colunas,
    letras,
    numeros,
    horizontais: ps.filter((p) => p.direcao === "h").map(item).sort(porNumero),
    verticais: ps.filter((p) => p.direcao === "v").map(item).sort(porNumero),
  };
}

// Confere uma grade pronta: toda sequência de 2+ letras na grade é uma palavra da lista.
export function gradeConsistente(g) {
  if (!g) return false;
  const lidas = [];
  const varrer = (get, n, m) => {
    for (let a = 0; a < n; a++) {
      let s = "";
      for (let b = 0; b <= m; b++) {
        const ch = b < m ? get(a, b) : null;
        if (ch) s += ch;
        else {
          if (s.length >= 2) lidas.push(s);
          s = "";
        }
      }
    }
  };
  varrer((r, c) => g.letras[r][c], g.linhas, g.colunas);
  varrer((c, r) => g.letras[r][c], g.colunas, g.linhas);
  const esperadas = [...g.horizontais, ...g.verticais].map((p) => p.resposta).sort();
  return JSON.stringify(lidas.sort()) === JSON.stringify(esperadas);
}

export function problemasDaCruzadinha(cz, quantidade) {
  const p = [];
  const n = cz.grade ? cz.grade.horizontais.length + cz.grade.verticais.length : 0;
  if (n < quantidade) p.push(`entraram ${n} de ${quantidade} palavras (as outras não cruzaram na grade)`);
  return p;
}

export function mensagemFalhaCruzadinha(falhas = []) {
  if (falhas.some((f) => f.status === 429)) return "A IA está com muitos pedidos agora. Espere um minuto e tente de novo.";
  return "Não foi possível gerar a cruzadinha agora. Tente de novo em instantes.";
}

// ---------- Impressão (folha do aluno + gabarito) ----------

const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);

function tabelaGrade(g, comLetras, lado) {
  let h = `<table class="grade" style="--lado:${lado}mm">`;
  for (let r = 0; r < g.linhas; r++) {
    h += "<tr>";
    for (let c = 0; c < g.colunas; c++) {
      const l = g.letras[r][c];
      if (!l) h += '<td class="vazia"></td>';
      else h += `<td class="casa">${g.numeros[r][c] ? `<span class="n">${g.numeros[r][c]}</span>` : ""}${comLetras ? `<span class="l">${l}</span>` : ""}</td>`;
    }
    h += "</tr>";
  }
  return h + "</table>";
}

const listaDicas = (titulo, xs) =>
  xs.length ? `<div class="dicas"><h3>${titulo}</h3><ol>${xs.map((p) => `<li><b class="num">${p.numero}.</b>${esc(p.dica)} <span class="tam">(${p.tamanho})</span></li>`).join("")}</ol></div>` : "";

export function cruzadinhaParaHtml(cz) {
  const g = cz.grade;
  const lado = Math.max(6, Math.min(10, Math.floor(175 / Math.max(g.colunas, g.linhas * 0.8))));
  const i = cz.identificacao || {};
  const cab = `<table class="cab"><tr><td colspan="2"><b>Escola:</b> ${esc(i.escola || "")}</td></tr><tr><td><b>Aluno(a):</b></td><td style="width:32%"><b>Turma:</b> ${esc(i.turma || "")}</td></tr><tr><td><b>Professor(a):</b> ${esc(i.professor || "")}</td><td><b>Data:</b> ____/____/______</td></tr></table>`;
  const meta = [i.componente, i.etapa, i.bncc].filter(Boolean).join(" · ");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>${esc(cz.titulo)}</title>
<style>@page{size:A4;margin:13mm}body{font-family:Arial,Helvetica,sans-serif;font-size:11pt;color:#111}
h1{font-size:16pt;text-align:center;margin:8px 0 2px}.meta{text-align:center;font-size:9pt;color:#555;margin:0 0 6px}.ori{margin:6px 0 10px}
.cab{width:100%;border-collapse:collapse;font-size:10pt}.cab td{border:1px solid #999;padding:4px 6px}
.grade{border-collapse:collapse;margin:8px auto 12px}.grade td{width:var(--lado);height:var(--lado);padding:0;position:relative;text-align:center;vertical-align:middle}
.grade td.casa{border:1.2px solid #222;background:#fff}.grade td.vazia{border:none}
.n{position:absolute;top:0.3mm;left:0.6mm;font-size:6.5pt;line-height:1;color:#333}.l{font-weight:bold;font-size:calc(var(--lado) * 0.62);line-height:1}
.duas{display:flex;gap:18px}.dicas{flex:1}.dicas h3{font-size:11pt;margin:4px 0;border-bottom:1px solid #999}.dicas ol{margin:0;padding:0;list-style:none}.dicas li{margin:3px 0;padding-left:24px;text-indent:-24px}.dicas li b.num{display:inline-block;width:24px;text-indent:0}.tam{color:#666;font-size:9pt}
.quebra{page-break-before:always}.rodape{margin-top:12px;font-size:8.5pt;color:#666;text-align:center}.gab{color:#a11}</style></head><body>
${cab}<h1>${esc(cz.titulo)}</h1>${meta ? `<p class="meta">${esc(meta)}</p>` : ""}<p class="ori">${esc(cz.orientacao)}</p>
${tabelaGrade(g, false, lado)}<div class="duas">${listaDicas("Horizontais", g.horizontais)}${listaDicas("Verticais", g.verticais)}</div>
<p class="rodape">EduGera · edugera.app</p>
<div class="quebra"></div><h1>Gabarito <span class="gab">(professor)</span> — ${esc(cz.titulo)}</h1>${meta ? `<p class="meta">${esc(meta)}</p>` : ""}
${tabelaGrade(g, true, lado)}<div class="duas"><div class="dicas"><h3>Horizontais</h3><ol>${g.horizontais.map((p) => `<li><b class="num">${p.numero}.</b><b>${esc(p.original || p.resposta)}</b></li>`).join("")}</ol></div><div class="dicas"><h3>Verticais</h3><ol>${g.verticais.map((p) => `<li><b class="num">${p.numero}.</b><b>${esc(p.original || p.resposta)}</b></li>`).join("")}</ol></div></div>
<p class="rodape">Cruzadinha gerada com apoio de IA no EduGera — confira as dicas antes de aplicar.</p></body></html>`;
}
