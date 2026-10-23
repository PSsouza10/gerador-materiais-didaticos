// Correção de prova feita pelo aluno: pedido, prompt, nota recalculada e ajustes do professor
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedidoCorrecaoProva, montarPromptCorrecaoProva, normalizarCorrecaoProva, ajustarQuestao, avisosDaCorrecao, correcaoProvaParaHtml } from "../lib/correcaoProva.js";
import { CORRECAO_PROVA_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", valorTotal: 10 };

test("pedido: disciplina obrigatória, valor fora da lista vira 10, gabarito com limite", () => {
  assert.equal(validarPedidoCorrecaoProva({ ...base, disciplina: "" }).ok, false);
  assert.equal(validarPedidoCorrecaoProva({ ...base, valorTotal: 7 }).dados.valorTotal, 10);
  assert.equal(validarPedidoCorrecaoProva({ ...base, gabarito: "x".repeat(4001) }).ok, false);
});

test("prompt: com e sem gabarito, sem nome do aluno; IA simulada responde", () => {
  const com = montarPromptCorrecaoProva(validarPedidoCorrecaoProva({ ...base, gabarito: "1) C" }).dados);
  assert.match(com, /GABARITO DO PROFESSOR/);
  assert.match(com, /NÃO escreva o nome do aluno/);
  const sem = montarPromptCorrecaoProva(validarPedidoCorrecaoProva(base).dados);
  assert.match(sem, /NÃO enviou gabarito/);
  assert.equal(respostaSimulada(sem), CORRECAO_PROVA_SIMULADA);
});

test("nota recalculada no código: certa = valor, errada/em branco = 0, parcial limitada", () => {
  const cp = normalizarCorrecaoProva(CORRECAO_PROVA_SIMULADA, validarPedidoCorrecaoProva(base).dados);
  assert.equal(cp.nota, 4);
  assert.equal(cp.percentual, 40);
  assert.deepEqual([cp.conta.certa, cp.conta.parcial, cp.conta.errada, cp.conta.em_branco], [1, 1, 1, 1]);
  // IA diz "certa" mas dá 0 pontos; "errada" com pontos: o código manda
  const j = { correcao_prova: { questoes: [{ situacao: "certa", valor: 5, pontos: 0 }, { situacao: "errada", valor: 5, pontos: 5 }, { situacao: "parcial", valor: 5, pontos: 99 }] } };
  const c2 = normalizarCorrecaoProva(j, { valorTotal: 10 });
  assert.deepEqual(c2.questoes.map((q) => q.valor), [3.33, 3.33, 3.33], "valores somando mais que o total são reescalados");
  assert.deepEqual(c2.questoes.map((q) => q.pontos), [3.33, 0, 3.33]);
});

test("valores ausentes: divide o total por igual; situação inválida vira ilegível", () => {
  const cp = normalizarCorrecaoProva({ correcao_prova: { questoes: [{ situacao: "certa" }, { situacao: "talvez" }] } }, { valorTotal: 10 });
  assert.deepEqual(cp.questoes.map((q) => [q.valor, q.situacao, q.pontos]), [[5, "certa", 5], [5, "ilegivel", 0]]);
  assert.match(avisosDaCorrecao(cp).join(";"), /sem gabarito.*ilegível/);
  assert.equal(normalizarCorrecaoProva({ correcao_prova: { legivel: false, questoes: [] } }, { valorTotal: 10 }).legivel, false);
});

test("ajuste do professor: muda situação e pontos, nota recalcula", () => {
  let cp = normalizarCorrecaoProva(CORRECAO_PROVA_SIMULADA, { valorTotal: 10, gabarito: "x" });
  cp = ajustarQuestao(cp, 0, { situacao: "certa" });
  assert.equal(cp.nota, 6.5);
  cp = ajustarQuestao(cp, 2, { pontos: "2,5" });
  assert.equal(cp.nota, 7.5);
  cp = ajustarQuestao(cp, 2, { pontos: 50 });
  assert.equal(cp.questoes[2].pontos, 2.5, "não passa do valor");
  cp = ajustarQuestao(cp, 3, { situacao: "parcial" });
  assert.equal(cp.questoes[3].pontos, 1.25);
});

test("impressão: escapa texto e mostra a nota", () => {
  const cp = normalizarCorrecaoProva(CORRECAO_PROVA_SIMULADA, { valorTotal: 10 });
  const html = correcaoProvaParaHtml(cp, { aluno: "Ana <b>", turma: "7B" });
  assert.match(html, /Nota: 4 \/ 10 \(40%\)/);
  assert.match(html, /Ana &lt;b&gt;/);
});
