// Correção de REDAÇÃO (modo da "Corrigir Prova"): por critérios.
//   ENEM: 5 competências, 0 a 200 cada (múltiplos de 40), total 1000.
//   Rubrica escolar: 5 critérios que dividem o valor escolhido pelo professor.
// Grátis: até 1 lauda (página); 2 ou mais laudas só no Pro (pedido do Paulo, 23/10/2026).
// Sem acesso a rede: testável.
import { limparTexto } from "./validacao.js";

export const LAUDAS_GRATIS = 1;
export const MODELOS_REDACAO = { enem: "ENEM (5 competências)", rubrica: "Rubrica escolar" };

export const CRITERIOS_ENEM = [
  { id: "c1", nome: "Competência 1", descricao: "Domínio da norma padrão da língua escrita" },
  { id: "c2", nome: "Competência 2", descricao: "Compreensão da proposta e do tipo dissertativo-argumentativo" },
  { id: "c3", nome: "Competência 3", descricao: "Seleção e organização de informações e argumentos" },
  { id: "c4", nome: "Competência 4", descricao: "Mecanismos linguísticos de coesão" },
  { id: "c5", nome: "Competência 5", descricao: "Proposta de intervenção que respeita os direitos humanos" },
];
export const CRITERIOS_RUBRICA = [
  { id: "r1", nome: "Tema e proposta", descricao: "Atende ao tema e ao gênero pedidos" },
  { id: "r2", nome: "Organização das ideias", descricao: "Começo, meio e fim; parágrafos" },
  { id: "r3", nome: "Coesão", descricao: "Ligação entre frases e parágrafos" },
  { id: "r4", nome: "Ortografia e gramática", descricao: "Grafia, pontuação, concordância" },
  { id: "r5", nome: "Autoria e argumentos", descricao: "Ideias próprias e bem defendidas" },
];

const txt = (v, max) => limparTexto(typeof v === "string" ? v : "").slice(0, max);
const num = (v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN);
const arred = (x, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;

export const modeloPadrao = (nivel = "") => (/m[eé]dio/i.test(nivel) ? "enem" : "rubrica");
export const criteriosDo = (modelo) => (modelo === "enem" ? CRITERIOS_ENEM : CRITERIOS_RUBRICA);
export const maximoDoCriterio = (modelo, valorTotal) => (modelo === "enem" ? 200 : arred(valorTotal / 5));
export const totalDoModelo = (modelo, valorTotal) => (modelo === "enem" ? 1000 : valorTotal);

// Nota de um critério: ENEM só aceita 0, 40, 80, 120, 160, 200
export function notaDoCriterio(modelo, nota, maximo) {
  const n = Number.isFinite(nota) ? nota : 0;
  if (modelo === "enem") return Math.min(200, Math.max(0, Math.round(n / 40) * 40));
  return arred(Math.min(Math.max(n, 0), maximo));
}

// Páginas de um PDF (conta objetos /Type /Page). 0 = não deu para contar.
export function contarPaginasPdf(bytes) {
  const s = typeof Buffer !== "undefined" && Buffer.isBuffer(bytes) ? bytes.toString("latin1") : String(bytes || "");
  return (s.match(/\/Type\s*\/Page(?![a-zA-Z])/g) || []).length;
}

// Grátis passa de 1 lauda? (páginas do arquivo ou páginas que a IA disse ter lido)
export const passaDoGratis = (paginas) => Number(paginas) > LAUDAS_GRATIS;
export const MENSAGEM_LAUDAS =
  "No plano Grátis a correção de redação vai até 1 lauda (1 página). Para redações com 2 laudas ou mais, assine o Pro em /planos.";

export function montarPromptRedacao(d) {
  const crit = criteriosDo(d.modelo);
  const max = maximoDoCriterio(d.modelo, d.valorTotal);
  return [
    `Corrija a REDAÇÃO de um aluno${d.ano ? ` (${d.ano.startsWith("EM") ? `${d.ano.slice(2)}ª série` : `${d.ano}º ano`})` : ""}. O arquivo anexo tem as páginas manuscritas (fotos ou PDF).`,
    d.proposta ? `Proposta/tema dado pelo professor: ${d.proposta}` : "O professor não informou o tema: identifique-o pelo texto.",
    d.observacoes ? `Orientações do professor: ${d.observacoes}` : "",
    "",
    d.modelo === "enem"
      ? "Use a matriz do ENEM. Cada competência recebe 0, 40, 80, 120, 160 ou 200. Seja fiel aos critérios oficiais e justo com a idade do aluno."
      : `Use a rubrica escolar abaixo. Cada critério vale de 0 a ${String(max).replace(".", ",")}. Considere a idade do aluno.`,
    ...crit.map((c) => `- ${c.id} ${c.nome}: ${c.descricao}`),
    "",
    "Regras:",
    "- Leia todo o texto antes de dar notas. Não invente trechos: cite só o que está escrito.",
    "- trechos: até 6 trechos curtos do texto com problema, o problema e uma sugestão de reescrita.",
    "- comentario de cada critério: 1 ou 2 frases concretas para o professor.",
    "- devolutiva: 3 ou 4 frases para o aluno, encorajadoras e concretas, sem nome.",
    "- paginas_lidas: quantas páginas com texto do aluno você leu.",
    "- Se a letra estiver ilegível em boa parte, use legivel false.",
    "- NÃO escreva o nome do aluno nem dados pessoais.",
    "",
    `Responda só com JSON: {"correcao_redacao": {"legivel": true, "paginas_lidas": 1, "tema_identificado": "", "titulo": "", "criterios": [${crit.map((c) => `{"id": "${c.id}", "nota": 0, "comentario": ""}`).join(", ")}], "trechos": [{"trecho": "", "problema": "", "sugestao": ""}], "pontos_fortes": [""], "a_melhorar": [""], "devolutiva": ""}}`,
  ]
    .filter((l) => l !== "")
    .join("\n");
}

export function recalcularRedacao(r) {
  const nota = arred(r.criterios.reduce((a, c) => a + (Number(c.nota) || 0), 0), 1);
  return { ...r, nota, percentual: r.total ? Math.round((nota / r.total) * 100) : 0 };
}

export function normalizarRedacao(json, d) {
  const c = json?.correcao_redacao && typeof json.correcao_redacao === "object" ? json.correcao_redacao : json || {};
  const max = maximoDoCriterio(d.modelo, d.valorTotal);
  const vindos = Array.isArray(c.criterios) ? c.criterios : [];
  const criterios = criteriosDo(d.modelo).map((base, i) => {
    const v = vindos.find((x) => x?.id === base.id) || vindos[i] || {};
    return { ...base, maximo: max, nota: notaDoCriterio(d.modelo, num(v.nota), max), comentario: txt(v.comentario, 400) };
  });
  const lista = (v) => (Array.isArray(v) ? v : []).map((x) => txt(x, 200)).filter(Boolean).slice(0, 4);
  return recalcularRedacao({
    tipo: "redacao",
    modelo: d.modelo,
    legivel: c.legivel !== false && vindos.length > 0,
    paginasLidas: Math.max(0, Math.floor(num(c.paginas_lidas)) || 0),
    tema: txt(c.tema_identificado, 200) || d.proposta || "",
    titulo: txt(c.titulo, 120),
    criterios,
    trechos: (Array.isArray(c.trechos) ? c.trechos : [])
      .map((t) => ({ trecho: txt(t?.trecho, 240), problema: txt(t?.problema, 200), sugestao: txt(t?.sugestao, 240) }))
      .filter((t) => t.trecho)
      .slice(0, 6),
    pontosFortes: lista(c.pontos_fortes),
    aMelhorar: lista(c.a_melhorar),
    devolutiva: txt(c.devolutiva, 800),
    total: totalDoModelo(d.modelo, d.valorTotal),
  });
}

export function ajustarCriterio(r, i, nota) {
  const criterios = r.criterios.map((c, k) => (k === i ? { ...c, nota: notaDoCriterio(r.modelo, num(nota), c.maximo), ajustado: true } : c));
  return recalcularRedacao({ ...r, criterios });
}

// ---------- Impressão ----------
const esc = (s = "") => String(s).replace(/[&<>"]/g, (x) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[x]);
const br = (x) => String(x).replace(".", ",");

export function redacaoParaHtml(r, { aluno = "", turma = "", professor = "" } = {}) {
  const lista = (t, xs) => (xs.length ? `<h2>${t}</h2><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Correção da redação${aluno ? ` — ${esc(aluno)}` : ""}</title>
<style>@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111}
h1{font-size:15pt;margin:0 0 4px}h2{font-size:11.5pt;margin:12px 0 4px}.cab{color:#444;margin:0 0 6px}.nota{font-size:20pt;font-weight:bold;margin:6px 0}
table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 6px;text-align:left;vertical-align:top}th{background:#f2f2f2}.n{white-space:nowrap;text-align:center;width:70px}
ul{margin:2px 0 2px 18px;padding:0}.dev{border:1px solid #bbb;padding:6px 8px;border-radius:4px}.rodape{margin-top:14px;font-size:8.5pt;color:#666}</style></head><body>
<h1>Correção da redação${r.titulo ? ` — “${esc(r.titulo)}”` : ""}</h1><p class="cab">${[aluno && `Aluno(a): ${esc(aluno)}`, turma && `Turma: ${esc(turma)}`, professor && `Professor(a): ${esc(professor)}`, MODELOS_REDACAO[r.modelo]].filter(Boolean).join(" · ")}</p>
${r.tema ? `<p><b>Tema:</b> ${esc(r.tema)}</p>` : ""}<p class="nota">Nota: ${br(r.nota)} / ${br(r.total)}</p>
<table><tr><th>Critério</th><th class="n">Nota</th><th>Comentário</th></tr>${r.criterios.map((c) => `<tr><td><b>${esc(c.nome)}</b><br><small>${esc(c.descricao)}</small></td><td class="n">${br(c.nota)} / ${br(c.maximo)}</td><td>${esc(c.comentario)}</td></tr>`).join("")}</table>
${r.trechos.length ? `<h2>Trechos para revisar</h2><table><tr><th>Trecho</th><th>Problema</th><th>Sugestão</th></tr>${r.trechos.map((t) => `<tr><td>“${esc(t.trecho)}”</td><td>${esc(t.problema)}</td><td>${esc(t.sugestao)}</td></tr>`).join("")}</table>` : ""}
${lista("Pontos fortes", r.pontosFortes)}${lista("A melhorar", r.aMelhorar)}${r.devolutiva ? `<h2>Devolutiva para o aluno</h2><p class="dev">${esc(r.devolutiva)}</p>` : ""}
<p class="rodape">Correção feita com apoio de IA no EduGera e revisada pelo professor.</p></body></html>`;
}
