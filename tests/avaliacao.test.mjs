// Avaliação (Prova Paulista / SARESP): pedido, normalização e conferências
import { test } from "node:test";
import assert from "node:assert/strict";
import {
  validarPedidoAvaliacao,
  montarPromptAvaliacao,
  normalizarAvaliacao,
  normalizarItem,
  conferirAvaliacao,
  conferirItem,
  ordenarNumericas,
  equilibrarGabarito,
  contarLetras,
  mapaHabilidades,
  resumoParaAvaliacao,
  adicionarAvaliacaoNaLista,
  LIMITE_AVALIACOES_SALVAS,
} from "../lib/avaliacao.js";
import { AVALIACAO_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Volume", itens: 8, bncc: "EF07MA30" };
const OFICIAL = { c: "EF07MA30", t: "Resolver e elaborar problemas de cálculo de medida do volume de blocos retangulares" };
const resolver = (c) => (c === "EF07MA30" ? OFICIAL : c === "EF07MA29" ? { c: "EF07MA29", t: "outra" } : null);

test("pedido: obrigatórios, quantidade permitida e BNCC de outra etapa bloqueada", () => {
  assert.equal(validarPedidoAvaliacao({ ...base, tema: "" }).ok, false);
  assert.equal(validarPedidoAvaliacao({ ...base, itens: 99 }).dados.itens, 8, "fora da lista vira o padrão");
  assert.equal(validarPedidoAvaliacao({ ...base, itens: 12 }).dados.itens, 12);
  const r = validarPedidoAvaliacao({ ...base, nivel: "Ensino Médio" });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Ensino Fundamental/);
  const ap = validarPedidoAvaliacao({ ...base, tema: "" }, { temBase: true });
  assert.equal(ap.ok, true, "partindo de apostila, o tema pode ficar vazio");
  assert.equal(ap.dados.temaDoMaterial, true);
});

test("prompt: padrão Prova Paulista/SARESP, 4 alternativas, distratores e número exato de itens", () => {
  const d = validarPedidoAvaliacao({ ...base, itens: 10 }).dados;
  const p = montarPromptAvaliacao(d, "EF07MA30 — texto oficial");
  assert.match(p, /Prova Paulista/);
  assert.match(p, /SARESP/);
  assert.match(p, /Exatamente 10 itens/);
  assert.match(p, /3 "facil", 4 "media" e 3 "dificil"/);
  assert.match(p, /"distratores"/);
  assert.match(p, /Exatamente 4 alternativas/);
  assert.match(p, /exceto/);
  assert.equal(respostaSimulada(p), AVALIACAO_SIMULADA, "o ambiente de teste reconhece o pedido");
});

test("item: tira rótulos repetidos, letra em maiúscula e distrator só das letras que existem", () => {
  const it = normalizarItem(
    { habilidade: "ef07ma30", comando: "Quanto?", alternativas: ["a) 1", "(B) 2", "C. 3", "d - 4"], correta: "b)", distratores: { a: "x", b: "não vale", C: "y", d: "z", E: "fora" } },
    resolver
  );
  assert.deepEqual(it.alternativas, ["1", "2", "3", "4"]);
  assert.equal(it.correta, "B");
  assert.deepEqual(Object.keys(it.distratores).sort(), ["A", "B", "C", "D"], "a da correta só sai na conferência");
  assert.deepEqual(it.habilidade, { codigo: "EF07MA30", verificada: true });
});

test("habilidade inventada volta para a oficial informada; sem oficial, fica marcada como não verificada", () => {
  const a = normalizarItem({ habilidade: "EF07MA99", comando: "?" }, resolver, OFICIAL);
  assert.deepEqual(a.habilidade, { codigo: "EF07MA30", verificada: true, substituida: "EF07MA99" });
  const b = normalizarItem({ habilidade: "EF07MA99", comando: "?" }, resolver, null);
  assert.deepEqual(b.habilidade, { codigo: "EF07MA99", verificada: false });
  const c = normalizarItem({ habilidade: "EF07MA29", comando: "?" }, resolver, OFICIAL);
  assert.equal(c.habilidade.codigo, "EF07MA29", "código oficial diferente do informado é respeitado");
});

test("alternativas numéricas vão em ordem crescente e a letra correta acompanha", () => {
  const it = ordenarNumericas({ alternativas: ["600 cm³", "6 cm³", "60 cm³", "6 000 cm³"], correta: "C", distratores: { A: "a", B: "b", D: "d" } });
  assert.deepEqual(it.alternativas, ["6 cm³", "60 cm³", "600 cm³", "6 000 cm³"]);
  assert.equal(it.correta, "B", "60 cm³ era C e agora é B");
  assert.equal(it.distratores.C, "a", "o distrator de 600 (antes A) agora é C");
  assert.equal(it.distratores.A, "b");
  const texto = { alternativas: ["casa", "rua", "mar", "sol"], correta: "A", distratores: {} };
  assert.equal(ordenarNumericas(texto), texto, "alternativas de texto não são reordenadas");
});

test("gabarito concentrado numa letra é espalhado (só itens de texto e sem letras na resolução)", () => {
  const item = (i) => ({ alternativas: [`w${i}`, `x${i}`, `y${i}`, `z${i}`], correta: "B", resolucao: "porque sim", distratores: { A: "a", C: "c", D: "d" }, comando: "?" });
  const itens = Array.from({ length: 8 }, (_, i) => item(i));
  const r = equilibrarGabarito(itens);
  assert.equal(r.mexeu, true);
  const c = contarLetras(r.itens);
  assert.ok(Math.max(...Object.values(c)) <= 3, `distribuição: ${JSON.stringify(c)}`);
  // o texto da alternativa correta é o mesmo, só mudou de lugar
  r.itens.forEach((it, i) => assert.equal(it.alternativas["ABCD".indexOf(it.correta)], `x${i}`));
  // cada item continua com distrator para as 3 letras erradas
  r.itens.forEach((it) => assert.deepEqual(Object.keys(it.distratores).sort(), "ABCD".split("").filter((l) => l !== it.correta)));
  // resolução que cita letra: não mexe
  const fixo = itens.map((it) => ({ ...it, resolucao: "a alternativa B está certa" }));
  assert.equal(equilibrarGabarito(fixo).mexeu, false);
  assert.equal(equilibrarGabarito(itens.slice(0, 4)).mexeu, false, "com menos de 5 itens não mexe");
});

test("conferência: letra errada é corrigida pela resolução e o distrator que sobra é cobrado", () => {
  const d = validarPedidoAvaliacao(base).dados;
  const av = normalizarAvaliacao(AVALIACAO_SIMULADA, d, OFICIAL, resolver);
  const { avaliacao, avisos } = conferirAvaliacao(av);
  assert.equal(avaliacao.itens.length, 5);
  const aq = avaliacao.itens[2];
  assert.equal(aq.correta, "C", "60 litros é a C (a IA marcou B)");
  assert.ok(avisos.some((a) => a.onde === "Item 3" && a.tipo === "corrigido"));
  assert.ok(!avisos.some((a) => a.onde === "Item 3" && /falta a análise/.test(a.motivo)), "B, A e D têm análise");
  assert.equal(aq.figura.tipo, "tabela");
  assert.equal(aq.distratores.C, undefined, "a correta não tem análise de distrator");
  assert.ok(aq.distratores.B, "a antiga marcada mantém a explicação do erro");
  assert.deepEqual(avaliacao.itens.map((i) => i.dificuldade), ["facil", "facil", "media", "media", "dificil"]);
});

test("conferência: avisos de formato fora do padrão", () => {
  const r = conferirItem({ alternativas: ["1", "1", "3"], correta: "A", comando: "Qual é a alternativa incorreta?", textoBase: "Observe o gráfico.", figura: null, distratores: {}, resolucao: "", habilidade: { codigo: "EF07MA99", verificada: false } }, 3);
  const m = r.avisos.map((a) => a.motivo).join(" | ");
  assert.match(m, /3 alternativas/);
  assert.match(m, /repetidas/);
  assert.match(m, /negativa/);
  assert.match(m, /gráfico|figura/);
  assert.match(m, /não foi localizada/);
  assert.match(m, /falta a análise do distrator B, C/);
  const geral = conferirAvaliacao({ itens: Array.from({ length: 6 }, () => ({ alternativas: ["a1", "b1", "c1", "d1"], correta: "D", comando: "?", textoBase: "", distratores: { A: "1", B: "2", C: "3" }, resolucao: "" })) });
  assert.ok(geral.avisos.some((a) => a.onde === "Gabarito"));
});

test("mapa de habilidades, resumo da apostila e lista salva", () => {
  const mapa = mapaHabilidades([{ habilidade: { codigo: "EF07MA30" }, descritor: "x" }, { habilidade: { codigo: "EF07MA29" }, descritor: "y" }, { habilidade: { codigo: "EF07MA30" }, descritor: "z" }]);
  assert.deepEqual(mapa[0], { codigo: "EF07MA30", itens: [1, 3], descritores: ["x", "z"] });
  const resumo = resumoParaAvaliacao({ form: { tema: "Volume", professor: "Nome do Professor" }, material: { tituloDidatico: "Volume", exercicios: [{ enunciado: "Calcule", resposta: "segredo" }] } });
  assert.match(resumo, /Exercício trabalhado 1: Calcule/);
  assert.doesNotMatch(resumo, /segredo|Nome do Professor/, "não leva gabarito nem dados do professor");
  let l = [];
  for (let i = 0; i < LIMITE_AVALIACOES_SALVAS + 3; i++) l = adicionarAvaliacaoNaLista(l, { titulo: String(i) });
  assert.equal(l.length, LIMITE_AVALIACOES_SALVAS);
});

test("itens saem em dificuldade crescente, sem trocar a ordem dentro do mesmo nível", () => {
  const it = (c, d) => ({ comando: c, dificuldade: d, alternativas: ["w", "x", "y", "z"], correta: "A", distratores: {} });
  const av = normalizarAvaliacao({ itens: [it("1", "dificil"), it("2", "facil"), it("3", "media"), it("4", "facil")] }, { itens: 8, tema: "x" });
  assert.deepEqual(av.itens.map((i) => i.comando), ["2", "4", "3", "1"]);
});
