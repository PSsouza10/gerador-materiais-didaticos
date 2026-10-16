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

// ---------- Suporte visual ----------
import { conferirFigura, operandosDaResolucao, minimoComFigura, suportesDaDisciplina } from "../lib/avaliacao.js";
import { normalizarFigura, numerosDaFigura } from "../lib/figuras.js";

test("figuras novas: bloco, polígono, linhas, setores, relógio e dinheiro são limpas e dão seus números", () => {
  const b = normalizarFigura({ tipo: "bloco", comprimento: "30", largura: 20, altura: 10, unidade: "cm" });
  assert.deepEqual(numerosDaFigura(b), [30, 20, 10]);
  assert.equal(normalizarFigura({ tipo: "bloco", comprimento: 0, largura: 2, altura: 3 }), null);
  assert.deepEqual(numerosDaFigura(normalizarFigura({ tipo: "poligono", forma: "quadrado", lado: 4 })), [4]);
  assert.equal(normalizarFigura({ tipo: "poligono", forma: "hexagono", base: 1, altura: 1 }), null);
  assert.equal(normalizarFigura({ tipo: "linhas", itens: [{ rotulo: "jan", valor: 1 }] }), null, "linha precisa de 2 pontos");
  assert.equal(normalizarFigura({ tipo: "setores", itens: [{ rotulo: "a", valor: 0 }, { rotulo: "b", valor: 0 }] }), null);
  assert.deepEqual(normalizarFigura({ tipo: "relogio", hora: 25, minuto: 70 }), { tipo: "relogio", hora: 23, minuto: 59, legenda: "" });
  const din = normalizarFigura({ tipo: "dinheiro", itens: [{ valor: 20, quantidade: 2 }, { valor: 3, quantidade: 1 }, { valor: 0.5, quantidade: 3 }] });
  assert.deepEqual(din.itens, [{ valor: 20, quantidade: 2 }, { valor: 0.5, quantidade: 3 }], "não existe cédula de R$ 3");
  assert.equal(normalizarFigura({ tipo: "angulo", graus: 400 }), null);
});

test("pedido de figuras: porcentagem, mínimo de questões e suportes por disciplina", () => {
  assert.equal(validarPedidoAvaliacao(base).dados.figuras, 40, "padrão 40%");
  assert.equal(validarPedidoAvaliacao({ ...base, figuras: 33 }).dados.figuras, 40);
  assert.equal(minimoComFigura(5, 40), 2);
  assert.equal(minimoComFigura(8, 60), 5);
  assert.equal(minimoComFigura(8, 0), 0);
  const p = montarPromptAvaliacao(validarPedidoAvaliacao({ ...base, itens: 5 }).dados, "EF07MA30");
  assert.match(p, /pelo menos 2 dos 5 itens TÊM "figura"/);
  assert.match(p, /"leituraFigura"/);
  assert.match(p, /"tipo": "bloco"/);
  assert.match(p, /aparecem SÓ na figura/);
  assert.match(montarPromptAvaliacao(validarPedidoAvaliacao({ ...base, figuras: 0 }).dados), /Não use figuras/);
  assert.match(suportesDaDisciplina("Geografia"), /climograma/);
  assert.match(suportesDaDisciplina("Ciências"), /ciclo da água/);
});

test("figura × resolução: bloco ajustado às medidas da conta; número solto e dado repetido no texto avisam", () => {
  const item = (figura, resolucao, textoBase = "Observe a figura.") => ({ figura, resolucao, textoBase, comando: "Qual é o volume?", alternativas: ["60", "600", "6 000", "60 000"], leituraFigura: "as medidas" });
  const r = conferirFigura(item({ tipo: "bloco", comprimento: 30, largura: 25, altura: 10, unidade: "cm" }, "V = 30 × 20 × 10 = 6000. Portanto, 6 000 cm³."), 1);
  assert.deepEqual([r.item.figura.comprimento, r.item.figura.largura, r.item.figura.altura], [30, 20, 10]);
  assert.ok(r.avisos.some((a) => a.tipo === "corrigido" && /ajustada/.test(a.motivo)));
  const ok = conferirFigura(item({ tipo: "bloco", comprimento: 20, largura: 30, altura: 10, unidade: "cm" }, "V = 30 × 20 × 10 = 6000."), 1);
  assert.equal(ok.avisos.length, 0, "mesmas medidas em outra ordem: sem aviso");
  const solto = conferirFigura(item({ tipo: "linhas", unidade: "m³", itens: [{ rotulo: "jan", valor: 12 }, { rotulo: "mar", valor: 18 }] }, "19 − 12 = 7; 7 × 1000 = 7000."), 2);
  assert.match(solto.avisos.map((a) => a.motivo).join(" "), /usa 19/);
  const repetido = conferirFigura(item({ tipo: "bloco", comprimento: 30, largura: 20, altura: 10 }, "V = 30 × 20 × 10 = 6000.", "A caixa tem 30 cm, 20 cm e 10 cm."), 3);
  assert.match(repetido.avisos.map((a) => a.motivo).join(" "), /não depende da leitura da figura/);
  assert.deepEqual(operandosDaResolucao("18 − 12 = 6 m³; 6 × 1000 = 6000. Portanto, 6 000 litros"), [18, 12, 1000]);
});

test("prova de teste: 3 questões com figura, sem avisos de figura, e meta de figuras cobrada", () => {
  const d = validarPedidoAvaliacao({ ...base, itens: 5 }).dados;
  const { avaliacao, avisos } = conferirAvaliacao(normalizarAvaliacao(AVALIACAO_SIMULADA, d, OFICIAL, resolver));
  assert.deepEqual(avaliacao.itens.map((i) => i.figura?.tipo || null), ["bloco", null, "tabela", null, "linhas"]);
  assert.ok(!avisos.some((a) => /figura/i.test(a.motivo)), JSON.stringify(avisos));
  assert.ok(avaliacao.itens.filter((i) => i.figura).every((i) => i.leituraFigura));
  const semFig = conferirAvaliacao({ metaFiguras: 4, itens: avaliacao.itens });
  assert.ok(semFig.avisos.some((a) => a.onde === "Suporte visual"));
});

test("até 2 habilidades por questão (a 2ª entra na matriz); código inválido é ignorado", () => {
  const r = (c) => (["EF07MA30", "EF07MA36"].includes(c) ? { c } : null);
  const it = normalizarItem({ habilidades: ["EF07MA30", "EF07MA36", "EF07MA37"], comando: "?" }, r);
  assert.deepEqual(it.habilidades.map((h) => h.codigo), ["EF07MA30", "EF07MA36"]);
  assert.equal(it.habilidade.codigo, "EF07MA30");
  const texto = normalizarItem({ habilidade: "EF07MA30, EF07MA36", comando: "?" }, r);
  assert.deepEqual(texto.habilidades.map((h) => h.codigo), ["EF07MA30", "EF07MA36"]);
  assert.deepEqual(normalizarItem({ habilidade: "volume", comando: "?" }, r).habilidades, []);
  const mapa = mapaHabilidades([it, normalizarItem({ habilidade: "EF07MA30", comando: "?" }, r)]);
  assert.deepEqual(mapa.map((m) => [m.codigo, m.itens]), [["EF07MA30", [1, 2]], ["EF07MA36", [1]]]);
  const d = validarPedidoAvaliacao({ ...base, itens: 5 }).dados;
  const prova = normalizarAvaliacao(AVALIACAO_SIMULADA, d, OFICIAL, (c) => ({ c }));
  assert.deepEqual(prova.itens[4].habilidades.map((h) => h.codigo), ["EF07MA30", "EF07MA36"], "gráfico de linhas também cobra estatística");
});
