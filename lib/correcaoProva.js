// Correção de prova feita pelo aluno: o professor envia fotos/PDF da prova respondida
// (e, se quiser, o gabarito) e a IA corrige questão a questão. A nota é recalculada aqui,
// sem IA, a partir dos pontos de cada questão. Sem acesso a rede: testável.
import { limparTexto } from "./validacao.js";

export const LIMITES_CORRECAO_PROVA = { gabarito: 4000, observacoes: 600, disciplina: 60, nivel: 60, ano: 6 };
export const VALORES_PROVA = [1, 2, 5, 10, 20, 100];
export const MAX_QUESTOES = 40;
export const MAX_FOTOS = 6;
export const PDF_MAX_BYTES = 3 * 1024 * 1024; // o pedido inteiro precisa caber no limite da Vercel
export const SITUACOES = ["certa", "parcial", "errada", "em_branco", "ilegivel"];
export const ROTULO_SITUACAO = { certa: "Certa", parcial: "Parcial", errada: "Errada", em_branco: "Em branco", ilegivel: "Ilegível" };

const txt = (v, max) => limparTexto(typeof v === "string" ? v : "").slice(0, max);
const num = (v) => (typeof v === "number" ? v : typeof v === "string" ? Number(v.replace(",", ".")) : NaN);
const arred = (x, casas = 2) => Math.round(x * 10 ** casas) / 10 ** casas;
const anoLegivel = (ano = "") => (!ano ? "" : ano.startsWith("EM") ? `${ano.slice(2)}ª série` : `${ano}º ano`);

export function validarPedidoCorrecaoProva(body = {}) {
  const d = {};
  for (const [campo, max] of Object.entries(LIMITES_CORRECAO_PROVA)) {
    const v = limparTexto(typeof body[campo] === "string" ? body[campo] : "");
    if (v.length > max) return { ok: false, erro: `O campo "${campo}" passou do limite de ${max} caracteres.` };
    d[campo] = v;
  }
  d.valorTotal = VALORES_PROVA.includes(Number(body.valorTotal)) ? Number(body.valorTotal) : 10;
  if (!d.disciplina) return { ok: false, erro: "Escolha a disciplina da prova." };
  return { ok: true, dados: d };
}

export function montarPromptCorrecaoProva(d) {
  const publico = [d.nivel, anoLegivel(d.ano)].filter(Boolean).join(", ");
  return [
    `Corrija a PROVA DE UM ALUNO de ${d.disciplina}${publico ? ` (${publico})` : ""}. O arquivo anexo tem as páginas da prova já respondida pelo aluno (fotos ou PDF).`,
    "",
    d.gabarito
      ? `GABARITO DO PROFESSOR (use como referência principal; se algo dele parecer errado, siga o gabarito mesmo assim e avise no comentário):\n${d.gabarito}`
      : "O professor NÃO enviou gabarito: resolva cada questão você mesmo, com cuidado, antes de corrigir.",
    d.observacoes ? `Orientações do professor: ${d.observacoes}` : "",
    "",
    "Como corrigir:",
    "- Identifique cada questão na ordem da prova (inclusive itens a, b, c como questões separadas quando valem pontos separados).",
    "- Transcreva a resposta do aluno como ele escreveu (letra marcada, número, frase ou cálculo resumido).",
    "- situacao: certa, parcial, errada, em_branco ou ilegivel. Use parcial só em questão aberta com parte do raciocínio correto.",
    `- Valor de cada questão: o que estiver escrito na prova; se não estiver, divida ${d.valorTotal} igualmente entre as questões.`,
    "- pontos: certa = valor; errada, em_branco e ilegivel = 0; parcial = parte do valor proporcional ao acerto.",
    "- comentario: 1 frase para o professor dizendo o erro ou o acerto (ex.: \"Somou os denominadores\").",
    "- Não invente respostas que não estão na folha. Se não conseguir ler, use ilegivel.",
    "- NÃO escreva o nome do aluno nem dados pessoais que aparecerem na folha.",
    "- devolutiva: 2 ou 3 frases para o aluno, encorajadoras e concretas, sem nome.",
    "",
    'Responda só com JSON: {"correcao_prova": {"legivel": true, "observacao_leitura": "", "questoes": [{"numero": "1", "assunto": "resumo do que a questão pede", "resposta_aluno": "", "resposta_esperada": "", "situacao": "certa", "valor": 1, "pontos": 1, "comentario": ""}], "pontos_fortes": [""], "a_melhorar": [""], "devolutiva": ""}}',
  ]
    .filter((l) => l !== "")
    .join("\n");
}

// Ajusta os valores para somar o total da prova (proporcionalmente ou por igual)
function distribuirValores(valores, total) {
  const n = valores.length;
  if (!n) return [];
  const validos = valores.every((v) => Number.isFinite(v) && v > 0);
  const soma = validos ? valores.reduce((a, b) => a + b, 0) : 0;
  if (validos && Math.abs(soma - total) < 0.01) return valores.map((v) => arred(v));
  if (validos && soma > 0) return valores.map((v) => arred((v / soma) * total));
  return valores.map(() => arred(total / n));
}

export function pontosPorSituacao(situacao, valor, pontos) {
  if (situacao === "certa") return valor;
  if (situacao === "parcial") {
    const p = Number.isFinite(pontos) ? pontos : valor / 2;
    return arred(Math.min(Math.max(p, 0), valor));
  }
  return 0;
}

export function normalizarCorrecaoProva(json, d) {
  const c = json?.correcao_prova && typeof json.correcao_prova === "object" ? json.correcao_prova : json || {};
  const brutas = (Array.isArray(c.questoes) ? c.questoes : []).slice(0, MAX_QUESTOES);
  const valores = distribuirValores(brutas.map((q) => num(q?.valor)), d.valorTotal);
  const questoes = brutas.map((q, i) => {
    const situacao = SITUACOES.includes(q?.situacao) ? q.situacao : "ilegivel";
    const valor = valores[i];
    return {
      numero: txt(String(q?.numero ?? i + 1), 8) || String(i + 1),
      assunto: txt(q?.assunto, 200),
      respostaAluno: txt(q?.resposta_aluno, 400),
      respostaEsperada: txt(q?.resposta_esperada, 400),
      situacao,
      valor,
      pontos: pontosPorSituacao(situacao, valor, num(q?.pontos)),
      comentario: txt(q?.comentario, 300),
    };
  });
  const lista = (v) => (Array.isArray(v) ? v : []).map((x) => txt(x, 200)).filter(Boolean).slice(0, 4);
  return recalcular({
    legivel: c.legivel !== false && questoes.length > 0,
    observacaoLeitura: txt(c.observacao_leitura, 300),
    questoes,
    pontosFortes: lista(c.pontos_fortes),
    aMelhorar: lista(c.a_melhorar),
    devolutiva: txt(c.devolutiva, 600),
    valorTotal: d.valorTotal,
    comGabarito: !!d.gabarito,
  });
}

// Nota e contagens a partir das questões (também usado quando o professor muda um ponto na tela)
export function recalcular(cp) {
  const nota = arred(cp.questoes.reduce((a, q) => a + (Number(q.pontos) || 0), 0), 1);
  const conta = Object.fromEntries(SITUACOES.map((s) => [s, cp.questoes.filter((q) => q.situacao === s).length]));
  const pct = cp.valorTotal ? Math.round((nota / cp.valorTotal) * 100) : 0;
  return { ...cp, nota: Math.min(nota, cp.valorTotal), percentual: Math.min(pct, 100), conta };
}

// Professor ajusta uma questão: a situação muda os pontos; pontos digitados ficam entre 0 e o valor
export function ajustarQuestao(cp, i, mudanca = {}) {
  const questoes = cp.questoes.map((q, k) => {
    if (k !== i) return q;
    const situacao = SITUACOES.includes(mudanca.situacao) ? mudanca.situacao : q.situacao;
    const pontos = mudanca.pontos !== undefined ? num(mudanca.pontos) : mudanca.situacao ? (situacao === "parcial" ? q.valor / 2 : undefined) : q.pontos;
    return { ...q, situacao, pontos: pontosPorSituacao(situacao, q.valor, pontos), ajustada: true };
  });
  return recalcular({ ...cp, questoes });
}

export function avisosDaCorrecao(cp) {
  const a = [];
  if (!cp.comGabarito) a.push("corrigida sem gabarito: a IA resolveu as questões; confira as respostas esperadas");
  if (cp.conta?.ilegivel) a.push(`${cp.conta.ilegivel} questão(ões) ilegível(is): corrija à mão`);
  if (cp.conta?.parcial) a.push(`${cp.conta.parcial} questão(ões) com nota parcial: confira os pontos`);
  if (cp.observacaoLeitura) a.push(cp.observacaoLeitura);
  return a;
}

// ---------- Impressão ----------
const esc = (s = "") => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const br = (x) => String(x).replace(".", ",");

export function correcaoProvaParaHtml(cp, { aluno = "", turma = "", disciplina = "", professor = "" } = {}) {
  const linhas = cp.questoes
    .map((q) => `<tr class="${q.situacao}"><td>${esc(q.numero)}</td><td>${esc(q.respostaAluno || "—")}</td><td>${esc(q.respostaEsperada || "—")}</td><td>${ROTULO_SITUACAO[q.situacao]}</td><td class="n">${br(q.pontos)} / ${br(q.valor)}</td><td>${esc(q.comentario)}</td></tr>`)
    .join("");
  const lista = (t, xs) => (xs.length ? `<h2>${t}</h2><ul>${xs.map((x) => `<li>${esc(x)}</li>`).join("")}</ul>` : "");
  return `<!doctype html><html lang="pt-BR"><head><meta charset="utf-8"><title>Correção da prova${aluno ? ` — ${esc(aluno)}` : ""}</title>
<style>@page{size:A4;margin:14mm}body{font-family:Arial,Helvetica,sans-serif;font-size:10.5pt;color:#111}
h1{font-size:15pt;margin:0 0 4px}h2{font-size:11.5pt;margin:12px 0 4px}.cab{color:#444;margin:0 0 8px}
.nota{font-size:20pt;font-weight:bold;margin:6px 0}table{width:100%;border-collapse:collapse}th,td{border:1px solid #999;padding:4px 5px;text-align:left;vertical-align:top}
th{background:#f2f2f2}.n{white-space:nowrap;text-align:center}tr.certa td:nth-child(4){color:#166534;font-weight:bold}tr.errada td:nth-child(4),tr.em_branco td:nth-child(4){color:#b91c1c;font-weight:bold}tr.parcial td:nth-child(4){color:#a16207;font-weight:bold}
ul{margin:2px 0 2px 18px;padding:0}.dev{border:1px solid #bbb;padding:6px 8px;border-radius:4px}.rodape{margin-top:14px;font-size:8.5pt;color:#666}</style></head><body>
<h1>Correção da prova</h1><p class="cab">${[aluno && `Aluno(a): ${esc(aluno)}`, turma && `Turma: ${esc(turma)}`, disciplina && esc(disciplina), professor && `Professor(a): ${esc(professor)}`].filter(Boolean).join(" · ")}</p>
<p class="nota">Nota: ${br(cp.nota)} / ${br(cp.valorTotal)} (${cp.percentual}%)</p>
<table><tr><th>Questão</th><th>Resposta do aluno</th><th>Esperada</th><th>Situação</th><th>Pontos</th><th>Comentário</th></tr>${linhas}</table>
${lista("Pontos fortes", cp.pontosFortes)}${lista("A melhorar", cp.aMelhorar)}${cp.devolutiva ? `<h2>Devolutiva para o aluno</h2><p class="dev">${esc(cp.devolutiva)}</p>` : ""}
<p class="rodape">Correção feita com apoio de IA no EduGera e revisada pelo professor.</p></body></html>`;
}
