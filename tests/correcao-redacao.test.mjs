// Correção de redação: critérios ENEM/rubrica, notas válidas e limite de laudas do Grátis
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedidoCorrecaoProva } from "../lib/correcaoProva.js";
import { montarPromptRedacao, normalizarRedacao, ajustarCriterio, notaDoCriterio, contarPaginasPdf, passaDoGratis, redacaoParaHtml, modeloPadrao } from "../lib/correcaoRedacao.js";
import { REDACAO_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";

const enem = validarPedidoCorrecaoProva({ tipo: "redacao", nivel: "Ensino Médio", ano: "EM3", proposta: "Celular na escola" }).dados;
const rub = validarPedidoCorrecaoProva({ tipo: "redacao", nivel: "Ensino Fundamental", ano: "8", valorTotal: 10 }).dados;

test("pedido de redação: modelo pela etapa, disciplina Português, sem exigir disciplina", () => {
  assert.equal(enem.modelo, "enem");
  assert.equal(rub.modelo, "rubrica");
  assert.equal(rub.disciplina, "Português");
  assert.equal(modeloPadrao("Ensino Médio"), "enem");
  assert.equal(validarPedidoCorrecaoProva({ tipo: "redacao", nivel: "Ensino Médio", modelo: "rubrica" }).dados.modelo, "rubrica");
});

test("prompt ENEM e rubrica; IA simulada responde", () => {
  const p = montarPromptRedacao(enem);
  assert.match(p, /0, 40, 80, 120, 160 ou 200/);
  assert.match(p, /Celular na escola/);
  assert.match(p, /paginas_lidas/);
  assert.equal(respostaSimulada(p), REDACAO_SIMULADA);
  assert.match(montarPromptRedacao(rub), /de 0 a 2\./);
});

test("ENEM: notas viram múltiplos de 40 entre 0 e 200; total até 1000", () => {
  assert.equal(notaDoCriterio("enem", 130, 200), 120);
  assert.equal(notaDoCriterio("enem", 999, 200), 200);
  assert.equal(notaDoCriterio("enem", -5, 200), 0);
  const r = normalizarRedacao(REDACAO_SIMULADA, enem);
  assert.equal(r.nota, 640);
  assert.equal(r.total, 1000);
  assert.equal(r.criterios.length, 5);
  assert.equal(r.paginasLidas, 1);
  const r2 = ajustarCriterio(r, 4, 170);
  assert.equal(r2.criterios[4].nota, 160);
  assert.equal(r2.nota, 720);
});

test("rubrica: 5 critérios dividem o valor; nota limitada ao máximo de cada um", () => {
  const r = normalizarRedacao({ correcao_redacao: { criterios: [{ id: "r1", nota: 5 }, { id: "r2", nota: 1.5 }, { id: "r3", nota: "1,5" }, { id: "r4", nota: 2 }, { id: "r5", nota: -1 }] } }, rub);
  assert.deepEqual(r.criterios.map((c) => c.nota), [2, 1.5, 1.5, 2, 0]);
  assert.equal(r.nota, 7);
  assert.equal(r.total, 10);
  assert.equal(normalizarRedacao({ correcao_redacao: { legivel: false, criterios: [] } }, rub).legivel, false);
});

test("laudas: Grátis só até 1 página; contagem de páginas do PDF", () => {
  assert.equal(passaDoGratis(1), false);
  assert.equal(passaDoGratis(2), true);
  assert.equal(passaDoGratis(0), false, "sem contagem: a IA confere depois");
  const pdf2 = Buffer.from("%PDF-1.3\n1 0 obj<</Type /Pages /Kids[2 0 R 3 0 R]>>\n2 0 obj<</Type /Page>>\n3 0 obj<</Type/Page>>");
  assert.equal(contarPaginasPdf(pdf2), 2);
});

test("impressão da redação: critérios, trechos e escape", () => {
  const r = normalizarRedacao(REDACAO_SIMULADA, enem);
  const html = redacaoParaHtml(r, { aluno: "Lia <i>" });
  assert.match(html, /Nota: 640 \/ 1000/);
  assert.match(html, /Competência 5/);
  assert.match(html, /os alunos usam o celular/);
  assert.match(html, /Lia &lt;i&gt;/);
});
