import { test } from "node:test";
import assert from "node:assert/strict";
import { lerRespostasTexto, corrigirAluno, relatorioTurma, relatorioCsv, normalizarLeitura, faixaDe } from "../lib/correcao.js";

const av = {
  itens: [
    { correta: "A", habilidades: [{ codigo: "EF07MA32" }], descritor: "Área do retângulo", distratores: { B: "Calculou o perímetro.", C: "Somou os lados.", D: "Esqueceu a unidade." } },
    { correta: "C", habilidades: [{ codigo: "EF07MA32" }], descritor: "Área do triângulo", distratores: { A: "Não dividiu por 2.", B: "x", D: "y" } },
    { correta: "B", habilidades: [{ codigo: "EF07MA30" }], descritor: "Volume", distratores: { A: "Somou as medidas.", C: "z", D: "w" } },
    { correta: "D", habilidades: [{ codigo: "EF07MA30" }], descritor: "Volume em litros", distratores: { A: "Não converteu.", B: "q", C: "r" } },
  ],
};

test("lê as respostas digitadas em vários formatos", () => {
  assert.deepEqual(lerRespostasTexto("abcd", 4), ["A", "B", "C", "D"]);
  assert.deepEqual(lerRespostasTexto("A B - D", 4), ["A", "B", "-", "D"]);
  assert.deepEqual(lerRespostasTexto("1A 2C 4*", 4), ["A", "C", "-", "*"]);
  assert.deepEqual(lerRespostasTexto("A,,C,D", 4), ["A", "-", "C", "D"]);
  assert.deepEqual(lerRespostasTexto("AB", 4), ["A", "B", "-", "-"]);
});

test("corrige um aluno: nota de 0 a 10, branco e dupla marcação contam como erro", () => {
  const r = corrigirAluno(av, ["A", "C", "*", "-"]);
  assert.equal(r.acertos, 2);
  assert.equal(r.nota, 5);
  assert.equal(r.percentual, 50);
  assert.deepEqual(r.porItem.map((p) => p.certo), [true, true, false, false]);
});

test("relatório da turma: por questão, por habilidade, erro mais comum e o que reforçar", () => {
  const alunos = [
    { id: 1, nome: "Ana", numero: "2", respostas: ["A", "C", "A", "A"] },
    { id: 2, nome: "Bruno", numero: "1", respostas: ["A", "A", "A", "D"] },
    { id: 3, nome: "Caio", numero: "3", respostas: ["B", "C", "B", "A"] },
    { id: 4, nome: "Duda", numero: "4", respostas: ["A", "C", "A", "A"] },
  ];
  const rel = relatorioTurma(av, alunos);
  assert.equal(rel.alunos, 4);
  assert.equal(rel.porQuestao[0].percentual, 75);
  assert.equal(rel.porQuestao[2].percentual, 25);
  assert.equal(rel.porQuestao[2].erroMaisComum.letra, "A");
  assert.equal(rel.porQuestao[2].erroMaisComum.explicacao, "Somou as medidas.");
  const vol = rel.porHabilidade.find((h) => h.codigo === "EF07MA30");
  assert.equal(vol.percentual, 25); // 2 acertos em 8 respostas
  assert.equal(vol.faixa, "reforcar");
  assert.equal(rel.porHabilidade[0].codigo, "EF07MA30", "pior habilidade primeiro");
  assert.equal(rel.sugestoes[0].codigo, "EF07MA30");
  assert.match(rel.sugestoes[0].erro, /75% marcaram A: Somou as medidas\./);
  assert.deepEqual(rel.sugestoes[0].alunos, ["Ana", "Duda"]);
  assert.deepEqual(rel.sugestoes[0].descritores, ["Volume", "Volume em litros"], "todos os descritores da habilidade");
  assert.equal(rel.sugestoes[0].descritorDaQuestao, "Volume");
  assert.equal(rel.porQuestao[1].distribuicao["-"], 0);
  assert.equal(rel.porAluno[0].nome, "Bruno", "ordem pelo número de chamada");
  assert.equal(rel.media, 5);
  const csv = relatorioCsv(av, rel);
  assert.match(csv, /Nº;Nome;Q1;Q2;Q3;Q4;Acertos;Nota;Reforçar/);
  assert.match(csv, /Questão;Habilidade;Descritor;% acerto;Branco;Dupla marcação;Erro mais comum/);
  assert.match(csv, /1;Bruno;A;A;A;D;2\/4;5;/);
});

test("faixas e leitura da foto", () => {
  assert.equal(faixaDe(70).id, "adequado");
  assert.equal(faixaDe(55).id, "atencao");
  assert.equal(faixaDe(10).id, "reforcar");
  const l = normalizarLeitura({ respostas: ["a", null, "*", "x"], numero: "nº 12" }, 5);
  assert.deepEqual(l.respostas, ["A", "-", "*", "?", "-"]);
  assert.deepEqual(l.duvidas, [4]);
  assert.equal(l.numero, "12");
  assert.equal(normalizarLeitura({ respostas: [], legivel: true }, 3).legivel, false);
});
