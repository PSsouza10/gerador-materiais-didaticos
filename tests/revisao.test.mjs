import { test } from "node:test";
import assert from "node:assert/strict";
import { revisarMaterial, normalizar } from "../lib/revisao.js";

// Material reconstruído a partir dos PDFs auditados ("Dose certa: suplementos")
const auditado = () => ({
  tituloDidatico: "Dose certa: suplementos e exercícios",
  resumoPedagogico: "A prática excessiva de exercícios e o uso de suplementos podem trazer riscos à saúde.",
  conceitos: [
    { termo: "Suplemento", definicao: "Substância adicionada à dieta para potencializar nutrientes." },
    { termo: "Overtraining", definicao: "Condição resultante de treinos excessivos sem recuperação adequada." },
    { termo: "Anabolismo", definicao: "Processo metabólico de construção de moléculas complexas a partir de simples." },
  ],
  formulas: [
    { nome: "FCM", expressao: "FCM = 220 - idade", descricao: "frequência cardíaca máxima" },
    { nome: "IMC", expressao: "IMC = peso (kg) / altura (m)²", descricao: "índice de massa corporal" },
  ],
  dicas: [],
  lembreteImportante: "",
  aplicacaoPratica: {
    titulo: "Suplementos na vida cotidiana",
    situacao: "Muitas pessoas recorrem a suplementos para melhorar desempenho físico.",
    exemplos: ["IMC=peso(kg)/altura(m)²", "Ler o rótulo antes de usar um suplemento."],
  },
  exercicios: [{ enunciado: "Expíques por que o overtraining pode ser prejudicial para a saúde", alternativas: [], resposta: "..." }],
});

test("normalizar ignora caixa, acento e pontuação", () => {
  assert.equal(normalizar("Ação, já!"), "acao ja");
});

test("P2: exemplo que repete fórmula (mesmo sem espaços) é retirado", () => {
  const { material, avisos } = revisarMaterial(auditado());
  assert.deepEqual(material.aplicacaoPratica.exemplos, ["Ler o rótulo antes de usar um suplemento."]);
  assert.ok(avisos.some((a) => a.onde === "Exemplo 1" && /Fórmula 2/.test(a.motivo)));
});

test("P5: typos conhecidos são corrigidos mantendo a caixa", () => {
  const m = auditado();
  m.lembreteImportante = "Veja os EXEMPPLOS";
  const { material, avisos } = revisarMaterial(m);
  assert.match(material.exercicios[0].enunciado, /^Explique por que/);
  assert.equal(material.lembreteImportante, "Veja os EXEMPLOS");
  assert.ok(avisos.some((a) => a.tipo === "corrigido" && a.trecho === "Expíques"));
});

test("P7: conceito definido e nunca usado é apontado", () => {
  const { avisos } = revisarMaterial(auditado());
  const orfaos = avisos.filter((a) => a.onde === "Conceitos").map((a) => a.trecho);
  assert.deepEqual(orfaos, ["Anabolismo"]);
});

test("material limpo passa sem avisos e sem perder conteúdo", () => {
  const m = {
    tituloDidatico: "Volume",
    resumoPedagogico: "Volume é o espaço ocupado.",
    conceitos: [{ termo: "Volume", definicao: "Espaço ocupado por um corpo." }],
    formulas: [{ nome: "Bloco", expressao: "V = c × l × h", descricao: "comprimento × largura × altura" }],
    dicas: ["Converta as unidades antes de multiplicar."],
    lembreteImportante: "1 dm³ = 1 L",
    aplicacaoPratica: { titulo: "Caixa", situacao: "Uma caixa d'água.", exemplos: ["Aquário de 60 L"] },
    exercicios: [{ enunciado: "Calcule o volume.", alternativas: [], resposta: "24 cm³" }],
    figuraExplicativa: { tipo: "grade", legenda: "EXEMPPLOS" },
  };
  const { material, avisos } = revisarMaterial(m);
  assert.equal(avisos.length, 0);
  assert.deepEqual(material.dicas, m.dicas);
  assert.equal(material.figuraExplicativa.legenda, "EXEMPPLOS"); // figuras não são mexidas
});
