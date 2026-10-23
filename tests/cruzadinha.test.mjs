// Cruzadinha: pedido, palavras da IA, montagem da grade e impressão
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedidoCruzadinha, montarPromptCruzadinha, letrasDaPalavra, dicaEntregaResposta, normalizarCruzadinha, montarGrade, gradeConsistente, problemasDaCruzadinha, cruzadinhaParaHtml, pedidoDePalavras, GRADE_MAX, QUANTIDADES } from "../lib/cruzadinha.js";
import { CRUZADINHA_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "6", tema: "Figuras planas", quantidade: 10, bncc: "EF06MA18" };

test("pedido: obrigatórios, quantidade permitida e BNCC de outra etapa bloqueada", () => {
  assert.equal(validarPedidoCruzadinha({ ...base, tema: "" }).ok, false);
  assert.equal(validarPedidoCruzadinha({ ...base, tema: "", habilidade: "Reconhecer polígonos" }).ok, true, "a habilidade serve de tema");
  assert.equal(validarPedidoCruzadinha({ ...base, quantidade: 99 }).dados.quantidade, 10);
  assert.equal(validarPedidoCruzadinha({ ...base, quantidade: 15 }).dados.quantidade, 15);
  const r = validarPedidoCruzadinha({ ...base, nivel: "Ensino Médio" });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Ensino Fundamental.*Ensino Médio/);
  assert.equal(validarPedidoCruzadinha({ ...base, tema: "x".repeat(201) }).ok, false);
});

test("prompt pede palavras a mais, uma palavra só e dica sem a resposta; IA simulada responde", () => {
  const d = validarPedidoCruzadinha(base).dados;
  const p = montarPromptCruzadinha(d, "EF06MA18 — texto oficial");
  assert.match(p, new RegExp(`exatamente ${pedidoDePalavras(10)} palavras`));
  assert.match(p, /UMA palavra só/);
  assert.match(p, /NÃO pode conter a própria resposta/);
  assert.match(p, /Não use nomes de alunos/);
  assert.equal(respostaSimulada(p), CRUZADINHA_SIMULADA);
});

test("letras: tira acento e cedilha, recusa espaço, hífen, curta ou longa demais", () => {
  assert.equal(letrasDaPalavra("Ângulo"), "ANGULO");
  assert.equal(letrasDaPalavra("Função"), "FUNCAO");
  assert.equal(letrasDaPalavra("número primo"), null);
  assert.equal(letrasDaPalavra("guarda-chuva"), null);
  assert.equal(letrasDaPalavra("pé"), null);
  assert.equal(letrasDaPalavra("A".repeat(15)), null);
});

test("dica que entrega a resposta é descartada", () => {
  assert.equal(dicaEntregaResposta("Figura com três lados, o triângulo.", "TRIANGULO"), true);
  assert.equal(dicaEntregaResposta("Polígonos triangulares têm três lados", "TRIANGULO"), true, "mesma família");
  assert.equal(dicaEntregaResposta("Figura com três lados.", "TRIANGULO"), false);
  const cz = normalizarCruzadinha({ cruzadinha: { palavras: [{ resposta: "Raio", dica: "O raio vai do centro à borda" }, { resposta: "Raio", dica: "Do centro à borda" }, { resposta: "Lado", dica: "Segmento do contorno" }, { resposta: "Lado", dica: "repetida" }, { resposta: "dois lados", dica: "x" }] } }, base);
  assert.deepEqual(cz.palavras.map((p) => p.resposta), ["RAIO", "LADO"]);
  assert.equal(cz.descartadas.length, 2);
  assert.match(cz.titulo, /Figuras planas/);
});

test("grade: atinge o alvo, cabe no limite e toda sequência de letras é uma palavra da lista", () => {
  const cz = normalizarCruzadinha(CRUZADINHA_SIMULADA, base);
  for (const alvo of QUANTIDADES)
    for (const semente of [1, 2, 3, 99]) {
      const g = montarGrade(cz.palavras, { alvo, semente });
      const n = g.horizontais.length + g.verticais.length;
      assert.equal(n, Math.min(alvo, cz.palavras.length), `alvo ${alvo}, semente ${semente}`);
      assert.ok(g.linhas <= GRADE_MAX && g.colunas <= GRADE_MAX);
      assert.ok(gradeConsistente(g), `grade inconsistente: alvo ${alvo}, semente ${semente}`);
      assert.ok(g.horizontais.length > 0 && g.verticais.length > 0);
    }
});

test("grade: números em ordem de leitura e cada número na casa onde a palavra começa", () => {
  const cz = normalizarCruzadinha(CRUZADINHA_SIMULADA, base);
  const g = montarGrade(cz.palavras, { alvo: 10, semente: 5 });
  for (const p of [...g.horizontais, ...g.verticais]) {
    assert.equal(g.numeros[p.linha][p.coluna], p.numero);
    assert.equal(g.letras[p.linha][p.coluna], p.resposta[0]);
  }
  const vistos = [];
  g.numeros.forEach((l) => l.forEach((x) => x && vistos.push(x)));
  assert.deepEqual(vistos, vistos.map((_, i) => i + 1));
});

test("grade: mesma semente → mesma grade; palavras que não cruzam ficam de fora", () => {
  const cz = normalizarCruzadinha(CRUZADINHA_SIMULADA, base);
  assert.deepEqual(montarGrade(cz.palavras, { alvo: 8, semente: 7 }), montarGrade(cz.palavras, { alvo: 8, semente: 7 }));
  const g = montarGrade([{ resposta: "CASA", dica: "a" }, { resposta: "XYZW", dica: "b" }], { alvo: 2 });
  assert.equal(g.horizontais.length + g.verticais.length, 1);
  assert.deepEqual(problemasDaCruzadinha({ grade: g }, 2), ["entraram 1 de 2 palavras (as outras não cruzaram na grade)"]);
  assert.equal(montarGrade([]), null);
});

test("impressão: folha do aluno sem letras e gabarito com as respostas", () => {
  const cz = normalizarCruzadinha(CRUZADINHA_SIMULADA, base);
  const grade = montarGrade(cz.palavras, { alvo: 6, semente: 1 });
  const html = cruzadinhaParaHtml({ ...cz, grade, identificacao: { escola: "EMEF <Teste>", componente: "Matemática" } });
  const [aluno, gabarito] = html.split('<div class="quebra"></div>');
  assert.doesNotMatch(aluno, /class="l"/);
  assert.match(gabarito, /class="l"/);
  assert.match(aluno, /Horizontais/);
  assert.match(html, /EMEF &lt;Teste&gt;/);
  for (const p of grade.horizontais) assert.ok(aluno.includes(p.dica.replace(/"/g, "&quot;")));
});
