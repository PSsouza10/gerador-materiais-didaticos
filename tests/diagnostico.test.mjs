// Avaliação diagnóstica (primeiro uso real, 23/10/2026): distribuição de habilidades,
// cobertura, situações repetidas, pergunta repetida no texto-base e "completar" as que faltaram.
import { test } from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import * as D from "../lib/diagnostico.js";
import { montarPromptAvaliacao, montarPromptRepor, normalizarItem, validarPedidoAvaliacao, aplicarRevisaoItens } from "../lib/avaliacao.js";
import { tokenCompletar, tokenConfere } from "../lib/completar.js";
import { completarAvaliacao } from "../lib/completarCliente.js";

const BNCC = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url))).habilidades;
const pool7 = BNCC.filter((h) => h.d === "Matemática" && h.e === "EF" && String(h.a).split(/\s*,\s*/).includes("7"));
const seq = (vals) => {
  let k = 0;
  return () => vals[k++ % vals.length];
};

test("unidade temática das habilidades do 7º ano", () => {
  const u = (c) => D.unidadeDaHabilidade(pool7.find((h) => h.c === c));
  assert.equal(u("EF07MA01"), "numeros");
  assert.equal(u("EF07MA18"), "algebra");
  assert.equal(u("EF07MA24"), "geometria");
  assert.equal(u("EF07MA32"), "grandezas");
  assert.equal(u("EF07MA36"), "estatistica");
  const todas = new Set(pool7.map(D.unidadeDaHabilidade));
  assert.deepEqual([...todas].sort(), ["algebra", "estatistica", "geometria", "grandezas", "numeros"]);
});

test("10 questões: 10 habilidades diferentes, cobrindo as 5 unidades (com geometria)", () => {
  for (let k = 0; k < 20; k++) {
    const p = D.planoDiagnostico(pool7, { tema: "Diagnóstico do 7º ano", itens: 10 }, 10);
    assert.equal(p.length, 10);
    assert.equal(new Set(p.map((x) => x.codigo)).size, 10, "sem habilidade repetida");
    assert.deepEqual([...new Set(p.map((x) => x.unidade))].sort(), ["algebra", "estatistica", "geometria", "grandezas", "numeros"]);
    assert.deepEqual(p.map((x) => x.dificuldade), ["facil", "facil", "facil", "media", "media", "media", "media", "dificil", "dificil", "dificil"]);
  }
});

test("tema que cita unidades: só elas entram", () => {
  const p = D.planoDiagnostico(pool7, { tema: "Diagnóstico de geometria e frações", itens: 8 }, 8);
  assert.deepEqual([...new Set(p.map((x) => x.unidade))].sort(), ["geometria", "numeros"]);
  assert.equal(new Set(p.map((x) => x.codigo)).size, 8);
});

test("o pedido aceita o modo diagnóstico só sem habilidade escolhida", () => {
  const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Diagnóstico", itens: 10 };
  assert.equal(validarPedidoAvaliacao({ ...base, modo: "diagnostico" }).dados.modo, "diagnostico");
  assert.equal(validarPedidoAvaliacao({ ...base, modo: "diagnostico", bncc: "EF07MA01" }).dados.modo, "");
});

test("o pedido à IA traz a distribuição obrigatória e as regras novas", () => {
  const plano = D.planoDiagnostico(pool7, { tema: "x", itens: 5 }, 5, seq([0.1, 0.5, 0.9]));
  const p = montarPromptAvaliacao({ disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Diagnóstico", itens: 5, figuras: 40, plano });
  assert.match(p, /DISTRIBUIÇÃO OBRIGATÓRIA/);
  for (const x of plano) assert.ok(p.includes(x.codigo));
  assert.match(p, /texto-base NÃO repete a pergunta/);
  assert.match(p, /x \+ 5 = 12/);
  assert.doesNotMatch(p, /LISTA OFICIAL/);
});

const item = (cod, textoBase, comando, descritor = "") => ({ habilidades: [{ codigo: cod }], habilidade: { codigo: cod }, textoBase, comando, descritor, correta: "A", alternativas: ["1", "2", "3", "4"], problemas: [] });

test("cobertura: habilidade repetida ou fora da distribuição vira problema com as que faltam", () => {
  const plano = [{ codigo: "EF07MA01", texto: "múltiplos" }, { codigo: "EF07MA18", texto: "equações" }, { codigo: "EF07MA24", texto: "triângulos" }];
  const av = { itens: [item("EF07MA01", "a", "b"), item("EF07MA01", "c", "d"), item("EF07MA99", "e", "f")] };
  const r = D.conferirCobertura(av, plano);
  assert.equal(r.itens[0].problemas.length, 0);
  assert.match(r.itens[1].problemas[0], /já é cobrada na questão 1.*EF07MA18.*EF07MA24/);
  assert.match(r.itens[2].problemas[0], /não está na distribuição/);
  assert.deepEqual(D.habilidadesQueFaltam(r.itens, plano).map((h) => h.codigo), ["EF07MA18", "EF07MA24"]);
  const pr = montarPromptRepor(r, 2, { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Diag", itens: 3, plano });
  assert.match(pr, /ainda faltam[\s\S]*EF07MA18[\s\S]*EF07MA24/);
});

test("duas receitas proporcionais parecidas: a segunda é refeita", () => {
  const av = {
    itens: [
      item("EF07MA17", "Para fazer um bolo, Ana usa 3 xícaras de farinha para cada 2 ovos. Ela quer fazer uma receita maior.", "Quantas xícaras de farinha ela usará com 6 ovos?"),
      item("EF07MA24", "Um triângulo tem ângulos de 40° e 60°.", "Quanto mede o terceiro ângulo?"),
      item("EF07MA17", "Para fazer um bolo maior, Ana usa xícaras de farinha e ovos na mesma proporção da receita.", "Quantas xícaras de farinha ela usará com 8 ovos?"),
    ],
  };
  const r = D.conferirRepeticoes(av);
  assert.equal(r.itens[1].problemas.length, 0);
  assert.match(r.itens[2].problemas[0], /(repete a situação ou o formato|mesma pergunta) da questão 1/);
});

test("texto-base que repete a pergunta: o sistema tira a frase repetida", () => {
  const tb = "Uma loja vende canetas a R$ 3,50 cada. Marina comprou 6 canetas. Quanto Marina pagou pelas canetas?";
  assert.equal(D.tirarPerguntaRepetida(tb, "Quanto Marina pagou pelas canetas?"), "Uma loja vende canetas a R$ 3,50 cada. Marina comprou 6 canetas.");
  // pergunta diferente fica
  const tb2 = "Você já pensou em quantas canetas cabem numa caixa? A loja tem caixas com 12 canetas.";
  assert.equal(D.tirarPerguntaRepetida(tb2, "Quantas canetas há em 5 caixas?"), tb2);
  const it = normalizarItem({ textoBase: tb, comando: "Quanto Marina pagou pelas canetas?", alternativas: ["A) 18", "B) 21", "C) 24", "D) 9,5"], correta: "B" });
  assert.doesNotMatch(it.textoBase, /\?/);
});

test("revisor: contexto sem sentido, figura ambígua e fácil demais viram problema", () => {
  const av = { itens: [{ ...item("EF07MA18", "t", "c"), figura: { tipo: "angulo" } }] };
  const r = aplicarRevisaoItens(av, { revisao: [{ n: 1, contextoSemSentido: true, figuraAmbigua: true, facilDemais: true, explicacoes: {} }] }, [0]);
  const p = r.avaliacao.itens[0].problemas.join(" | ");
  assert.match(p, /não faz sentido/);
  assert.match(p, /figura é ambígua/);
  assert.match(p, /abaixo do nível do ano/);
});

test("token de completar: só da mesma conta e por 30 minutos", () => {
  const ger = new Date().toISOString();
  const t = tokenCompletar("prof@x.br", ger);
  assert.equal(tokenConfere(t, "PROF@x.br", ger), true);
  assert.equal(tokenConfere(t, "outro@x.br", ger), false);
  assert.equal(tokenConfere(t, "prof@x.br", ger, Date.now() + 31 * 60 * 1000), false);
  assert.equal(tokenConfere("x", "prof@x.br", ger), false);
});

test("completar no navegador: pede uma a uma até fechar o número pedido", async () => {
  let chamadas = 0;
  globalThis.fetch = async (_u, o) => {
    chamadas++;
    const av = JSON.parse(o.body).avaliacao;
    return { ok: true, status: 200, json: async () => ({ item: { comando: `nova ${av.itens.length + 1}`, correta: "A" } }) };
  };
  const av = { pedido: { itens: 10 }, itens: Array.from({ length: 8 }, (_, i) => ({ comando: `q${i}` })) };
  const r = await completarAvaliacao(av, { token: "t", faltam: 2 });
  assert.equal(r.completa, true);
  assert.equal(r.avaliacao.itens.length, 10);
  assert.equal(chamadas, 2);
  // servidor recusa (prazo): para na hora
  globalThis.fetch = async () => ({ ok: false, status: 403, json: async () => ({}) });
  const r2 = await completarAvaliacao(av, { token: "t", faltam: 2 });
  assert.equal(r2.completa, false);
  assert.equal(r2.faltam, 2);
});

test("mesma pergunta em questões de habilidades diferentes (bateria de 23/10): a repetida é refeita", () => {
  const graf = (cod, tb) => ({ ...item(cod, tb, "Qual é a diferença entre o maior e o menor valor mostrados no gráfico?"), figura: { tipo: "linhas" } });
  const av = {
    itens: [
      graf("EF07MA32", "O gráfico mostra a área plantada em cada mês na horta da escola."),
      graf("EF07MA05", "Uma sorveteria registrou as vendas de picolés durante a semana."),
      item("EF07MA24", "Lia quer construir um triângulo com palitos de 3 cm, 4 cm e 9 cm.", "É possível construir esse triângulo?"),
      graf("EF07MA29", "O gráfico mostra quantos alunos faltaram em cada dia da semana de provas."),
    ],
  };
  const r = D.conferirRepeticoes(av, { diagnostico: true });
  assert.equal(r.itens[0].problemas.length, 0);
  assert.match(r.itens[1].problemas[0], /mesma pergunta da questão 1/);
  assert.equal(r.itens[2].problemas.length, 0);
  assert.match(r.itens[3].problemas[0], /mesma pergunta da questão 1/);
  // fora do diagnóstico: mesma pergunta só conta com o mesmo tipo de figura
  const area = { itens: [{ ...item("EF07MA32", "Terreno retangular da escola.", "Qual é a área do terreno?"), figura: { tipo: "poligono" } }, { ...item("EF07MA32", "Terreno em forma de L.", "Qual é a área do terreno?"), figura: { tipo: "contorno" } }] };
  assert.equal(D.conferirRepeticoes(area).itens[1].problemas.length, 0);
});

test("revisor do diagnóstico recebe o texto da habilidade de cada questão", async () => {
  const { montarPromptRevisaoItens } = await import("../lib/avaliacao.js");
  const plano = [{ codigo: "EF07MA32", texto: "Resolver problemas de cálculo de medida de área de figuras planas" }];
  const p = montarPromptRevisaoItens({ itens: [item("EF07MA32", "t", "c")] }, [0], { disciplina: "Matemática", ano: "7", tema: "Diag", plano });
  assert.match(p, /EF07MA32 — Resolver problemas de cálculo de medida de área/);
  assert.match(p, /avalia DE FATO a habilidade indicada/);
});
