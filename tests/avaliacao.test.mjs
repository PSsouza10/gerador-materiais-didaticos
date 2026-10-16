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
  assert.ok(!avisos.some((a) => a.onde === "Item 3" && /falta explicar/.test(a.motivo)), "B, A e D têm análise");
  assert.equal(aq.figura.tipo, "tabela");
  assert.equal(aq.distratores.C, undefined, "a correta não tem análise de distrator");
  assert.ok(aq.distratores.B, "a antiga marcada mantém a explicação do erro");
  assert.deepEqual(avaliacao.itens.map((i) => i.dificuldade), ["facil", "facil", "media", "media", "media"], "gráfico de 2 passos: Difícil vira Média");
});

test("conferência: avisos de formato fora do padrão", () => {
  const r = conferirItem({ alternativas: ["1", "1", "3"], correta: "A", comando: "Qual é a alternativa incorreta?", textoBase: "Observe o gráfico.", figura: null, distratores: {}, resolucao: "", habilidade: { codigo: "EF07MA99", verificada: false } }, 3);
  const m = r.avisos.map((a) => a.motivo).join(" | ");
  assert.match(m, /3 alternativas/);
  assert.match(m, /repetidas/);
  assert.match(m, /negativa/);
  assert.match(m, /gráfico|figura/);
  assert.match(m, /não foi localizada/);
  assert.match(m, /falta explicar o erro que leva à alternativa "1"/);
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

// ---------- Contas refeitas pelo sistema (caso real de 16/10: "Área de retângulos…") ----------
import { contasDoTexto } from "../lib/contaTexto.js";
import { itensParaRefazer, aplicarRefeitos, finalizarAvaliacao, esperadoDaFigura, montarPromptRefazer } from "../lib/avaliacao.js";
import { AVALIACAO_AREA_SIMULADA, AREA_REFEITOS_SIMULADOS } from "../lib/iaSimulada.js";
import { geometriaDaFigura } from "../lib/figuras.js";

test("o sistema refaz as contas: m² não atrapalha, conta errada é apontada", () => {
  const r = contasDoTexto("Retângulo: 10 × 5 = 50 m²; triângulo: (5 × 3) ÷ 2 = 7,5 m²; 50 + 7,5 = 57,5 m². Portanto, 57,5 m².");
  assert.equal(r.final, 57.5);
  assert.equal(r.erradas.length, 0);
  const e = contasDoTexto("Calculou o perímetro: 6 × 4 + 4 × 2 = 40.");
  assert.equal(e.final, 32);
  assert.equal(e.erradas[0].escrito, 40);
  assert.equal(contasDoTexto("3 m³ = 3 000 litros").contas.length, 0, "conversão não é conta");
  assert.equal(contasDoTexto("Usou 2 x 3 = 6").final, 6);
});

test("figura composta: área calculada pelo sistema (fachada 65 m², jardim em L 33 m²)", () => {
  const casa = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [10, 0], [10, 5], [5, 8], [0, 5]], cotas: [{ de: [5, 5], ate: [5, 8] }] });
  assert.equal(geometriaDaFigura(casa).area, 65);
  const L = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [8, 0], [8, 3], [3, 3], [3, 6], [0, 6]] });
  assert.deepEqual(geometriaDaFigura(L), { area: 33, perimetro: 28 });
  assert.equal(normalizarFigura({ tipo: "contorno", pontos: [[0, 0], [1, 1], [2, 2]] }), null, "pontos alinhados não formam figura");
  const it = { figura: casa, comando: "Qual é a área total da fachada?", alternativas: ["30 m²", "50 m²", "65 m²", "80 m²"] };
  assert.deepEqual(esperadoDaFigura(it), { grandeza: "área", valor: 65 });
});

test("caso real: gabarito impossível vira SEM GABARITO, explicações erradas e figura composta pedem refazer", () => {
  const d = validarPedidoAvaliacao({ ...base, tema: "Área de retângulos, quadrados e triângulos", bncc: "", itens: 5 }).dados;
  const r = (c) => ({ c });
  const p1 = conferirAvaliacao(normalizarAvaliacao(AVALIACAO_AREA_SIMULADA, d, null, r));
  const q4 = p1.avaliacao.itens[3];
  assert.equal(q4.correta, null, "57,5 não está entre 65, 75, 80 e 85");
  assert.equal(q4.semGabarito, true);
  assert.ok(p1.avisos.some((a) => a.onde === "Item 4" && a.tipo === "erro" && /SEM GABARITO/.test(a.motivo)));
  assert.ok(p1.avisos.some((a) => a.onde === "Item 4" && /composta/.test(a.motivo)));
  assert.ok(p1.avisos.some((a) => a.onde === "Item 2" && /4 × 6 dá 24, não 20/.test(a.motivo)));
  assert.ok(p1.avisos.some((a) => a.onde === "Item 2" && /usa 12/.test(a.motivo)), "multiplicar por 12 é erro inventado");
  assert.ok(p1.avisos.some((a) => a.onde === "Item 5" && /6 × 4 \+ 4 × 2 dá 32, não 40/.test(a.motivo)));
  assert.ok(p1.avisos.some((a) => a.onde === "Item 3" && /também estão no texto/.test(a.motivo)));
  assert.deepEqual(itensParaRefazer(p1.avaliacao), [1, 2, 3, 4]);
  assert.match(montarPromptRefazer(p1.avaliacao, [3], d), /nenhuma alternativa tem esse valor/);
  const ap = aplicarRefeitos(p1.avaliacao, AREA_REFEITOS_SIMULADOS, r);
  assert.deepEqual(ap.trocados, [2, 3, 4, 5]);
  const f = finalizarAvaliacao(ap.avaliacao);
  assert.deepEqual(f.avisos, [], JSON.stringify(f.avisos));
  const q4b = f.avaliacao.itens[3];
  assert.equal(q4b.alternativas["ABCD".indexOf(q4b.correta)], "65 m²");
  assert.equal(q4b.figura.tipo, "contorno");
  assert.ok(Math.max(...Object.values(contarLetras(f.avaliacao.itens))) <= 2, "gabarito espalhado");
  for (const it of f.avaliacao.itens) assert.ok(!it.semGabarito);
});

test("2ª tentativa que não melhora mantém a questão marcada sem gabarito", () => {
  const d = validarPedidoAvaliacao({ ...base, tema: "Área", bncc: "", itens: 5 }).dados;
  const p1 = conferirAvaliacao(normalizarAvaliacao(AVALIACAO_AREA_SIMULADA, d, null, (c) => ({ c })));
  const ruim = { itensRefeitos: [{ numero: 4, ...AVALIACAO_AREA_SIMULADA.itens[3] }] };
  const ap = aplicarRefeitos(p1.avaliacao, ruim, (c) => ({ c }));
  assert.deepEqual(ap.trocados, []);
  const f = finalizarAvaliacao(ap.avaliacao);
  assert.equal(f.avaliacao.itens[3].semGabarito, true);
  assert.ok(f.avisos.some((a) => a.tipo === "erro" && a.onde === "Item 4"));
});

test("figura sem nome ganha nome padrão; 'Figura 1 –' escrito pela IA é tirado", () => {
  const a = normalizarItem({ comando: "?", figura: { tipo: "poligono", forma: "retangulo", base: 8, altura: 5, legenda: "" } });
  assert.equal(a.figura.legenda, "Retângulo com as medidas");
  const b = normalizarItem({ comando: "?", figura: { tipo: "barras", itens: [{ rotulo: "a", valor: 1 }], legenda: "Figura 2 – Chuva em março" } });
  assert.equal(b.figura.legenda, "Chuva em março");
});

test("bateria da Avaliação: 7 casos e critério de publicação", async () => {
  const { CASOS_AVALIACAO, auditarAvaliacao, resumirBateriaAvaliacao } = await import("../lib/bateriaAvaliacao.js");
  assert.equal(CASOS_AVALIACAO.length, 7);
  assert.equal(CASOS_AVALIACAO.filter((c) => c.disciplina === "Matemática").length, 5);
  const d = validarPedidoAvaliacao({ ...base, tema: "Área", bncc: "", itens: 5 }).dados;
  const ruim = conferirAvaliacao(normalizarAvaliacao(AVALIACAO_AREA_SIMULADA, d, null, (c) => ({ c }))).avaliacao;
  const a = auditarAvaliacao(ruim);
  assert.deepEqual(a.semGabarito, [4]);
  assert.ok(a.contasErradas.length >= 2);
  assert.equal(a.aprovado, false);
  const bom = finalizarAvaliacao(aplicarRefeitos(ruim, AREA_REFEITOS_SIMULADOS, (c) => ({ c })).avaliacao).avaliacao;
  assert.equal(auditarAvaliacao(bom).aprovado, true);
  assert.equal(resumirBateriaAvaliacao([{ auditoria: auditarAvaliacao(bom) }]).liberado, true);
});

test("regras de 16/10 (tarde): figura × texto não muda gabarito; contorno sem medida; verificador tolerante", () => {
  const base1 = { comando: "Qual é a área do tapete?", textoBase: "A figura mostra o tapete.", leituraFigura: "as medidas", alternativas: ["13 m²", "26 m²", "40 m²", "48 m²"], correta: "C", distratores: { A: "Somou: 8 + 5 = 13.", B: "Calculou o perímetro: 2 × (8 + 5) = 26.", D: "Leu errado a figura e usou a medida de outro tapete." }, habilidades: [] };
  // figura 8 × 6 (48) mas a resolução usa 8 × 5 (40): gabarito continua 40 e a questão é refeita
  const r = conferirItem({ ...base1, figura: normalizarFigura({ tipo: "poligono", forma: "retangulo", base: 8, altura: 6, unidade: "m" }), resolucao: "8 × 5 = 40. Portanto, 40 m²." }, 1);
  assert.equal(r.item.correta, "C");
  assert.match(r.item.problemas.join(" "), /figura e a resolução não combinam/);
  // explicação sem conta (erro de leitura) é aceita
  const ok = conferirItem({ ...base1, figura: normalizarFigura({ tipo: "poligono", forma: "retangulo", base: 8, altura: 5, unidade: "m" }), resolucao: "8 × 5 = 40. Portanto, 40 m²." }, 1);
  assert.deepEqual(ok.item.problemas, [], JSON.stringify(ok.avisos));
  // explicação que chega ao valor de outra letra: refazer a alternativa
  const outra = conferirItem({ ...base1, distratores: { ...base1.distratores, D: "Calculou 2 × (8 + 5) = 26." }, figura: normalizarFigura({ tipo: "poligono", forma: "retangulo", base: 8, altura: 5, unidade: "m" }), resolucao: "8 × 5 = 40." }, 1);
  assert.match(outra.avisos.map((a) => a.motivo).join(" "), /valor da alternativa "26 m²"/);
  // intermediário (3 + 3 = 6) aceito
  const L = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [8, 0], [8, 3], [3, 3], [3, 6], [0, 6]] });
  const li = conferirItem({ comando: "Qual é a área do jardim?", textoBase: "Observe a planta.", leituraFigura: "medidas", figura: L, alternativas: ["24 m²", "28 m²", "33 m²", "48 m²"], correta: "C", resolucao: "8 × 3 = 24; 3 × 3 = 9; 24 + 9 = 33.", distratores: { A: "Só a parte de baixo: 8 × 3 = 24.", B: "Perímetro: 8 + 3 + 5 + 3 + 3 + 6 = 28.", D: "Tratou como retângulo: 8 × 6 = 48." }, habilidades: [] }, 1);
  assert.deepEqual(li.item.problemas, [], JSON.stringify(li.avisos));
  // contorno com lado inclinado sem cota: refazer
  const casaSemCota = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [10, 0], [10, 5], [5, 8], [0, 5]] });
  const c = conferirItem({ ...base1, figura: casaSemCota, comando: "Qual é a área?", alternativas: ["50 m²", "65 m²", "80 m²", "30 m²"], correta: "B", resolucao: "10 × 5 = 50; (10 × 3) ÷ 2 = 15; 50 + 15 = 65." }, 1);
  assert.match(c.item.problemas.join(" "), /lado sem medida/);
});

test("regras de 16/10 (fim da tarde): valor com unidade/fração não apaga gabarito; contorno cruzado; explicação sem '='; unidade", async () => {
  const { numeroDaAlternativa, unidadeDaAlternativa } = await import("../lib/avaliacao.js");
  const { valorAlcancado } = await import("../lib/contaTexto.js");
  assert.equal(numeroDaAlternativa("26°C"), 26);
  assert.equal(numeroDaAlternativa("26 °C"), 26);
  assert.equal(numeroDaAlternativa("9/10 do bolo"), 0.9);
  assert.equal(numeroDaAlternativa("1 1/2"), 1.5);
  assert.equal(numeroDaAlternativa("2 h 30 min"), null);
  // temperatura: resolução 31 − 5 = 26, alternativa "26°C" (sem espaço) — gabarito mantido
  const temp = conferirItem({ comando: "Qual foi a temperatura mínima?", textoBase: "A máxima foi 31 °C e caiu 5 °C.", alternativas: ["24 °C", "26°C", "31 °C", "36 °C"], correta: "B", resolucao: "31 − 5 = 26. Portanto, 26 °C.", distratores: { A: "Tirou 7: 31 − 7 = 24.", C: "Leu só a máxima.", D: "Somou: 31 + 5 = 36." }, habilidades: [] }, 1);
  assert.equal(temp.item.correta, "B");
  assert.equal(temp.item.semGabarito, false);
  // fração: 3/10 + 6/10 = 9/10
  const fr = conferirItem({ comando: "Que fração do bolo foi comida?", textoBase: "Ana comeu 3/10 e Bia 6/10.", alternativas: ["3/10", "6/10", "9/10", "9/20"], correta: "C", resolucao: "3/10 + 6/10 = 9/10.", distratores: { A: "Contou só a parte de Ana.", B: "Contou só a parte de Bia.", D: "Somou numeradores e denominadores: 3 + 6 = 9 e 10 + 10 = 20." }, habilidades: [] }, 1);
  assert.equal(fr.item.correta, "C");
  // contorno que se cruza: não decide gabarito e pede refazer
  const cruz = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [8, 0], [8, 6], [4, -2], [0, 6]] });
  assert.equal(cruz.simples, false);
  assert.equal(geometriaDaFigura(cruz), null);
  const c = conferirItem({ comando: "Qual é a área do jardim?", textoBase: "Observe.", leituraFigura: "x", figura: cruz, alternativas: ["24 m²", "28 m²", "33 m²", "48 m²"], correta: "C", resolucao: "8 × 3 = 24; 3 × 3 = 9; 24 + 9 = 33.", distratores: { A: "8 × 3 = 24.", B: "8 + 3 + 5 + 3 + 3 + 6 = 28.", D: "8 × 6 = 48." }, habilidades: [] }, 1);
  assert.equal(c.item.correta, "C", "gabarito não muda por causa da figura");
  assert.match(c.item.problemas.join(" "), /se cruza/);
  // explicação sem "=" que chega a outro valor: refazer
  assert.equal(valorAlcancado("Somou 8 + 5, obtendo 13."), 13);
  const ex = conferirItem({ comando: "Qual é a área do tapete?", textoBase: "Observe.", leituraFigura: "x", figura: normalizarFigura({ tipo: "poligono", forma: "retangulo", base: 8, altura: 5, unidade: "m" }), alternativas: ["13 m²", "26 m²", "40 m²", "64 m²"], correta: "C", resolucao: "8 × 5 = 40.", distratores: { A: "Somou 8 + 5, obtendo 13.", B: "Calculou o perímetro 2 × (8 + 5) e chegou a 13.", D: "Fez 8 × 8 = 64." }, habilidades: [] }, 1);
  assert.match(ex.item.problemas.join(" "), /"26 m²" chega a 13/);
  // alternativas sem unidade recebem a da resolução
  assert.equal(unidadeDaAlternativa("33 m²"), "m²");
  const un = conferirItem({ comando: "Qual é a área do jardim?", textoBase: "O jardim tem 8 m por 3 m.", alternativas: ["11", "22", "24", "48"], correta: "C", resolucao: "8 × 3 = 24. Portanto, 24 m².", distratores: { A: "8 + 3 = 11.", B: "2 × (8 + 3) = 22.", D: "8 × 3 × 2 = 48." }, habilidades: [] }, 1);
  assert.deepEqual(un.item.alternativas, ["11 m²", "22 m²", "24 m²", "48 m²"]);
});

test("regras de 16/10 (noite): conta inteira com ° e %, nível coerente, questão que não passa sai da prova", async () => {
  const { passosDaConta, retirarComProblema, montarPromptTrocar } = await import("../lib/avaliacao.js");
  assert.equal(contasDoTexto("360° × (35/100) = 126°. Portanto, 126°.").erradas.length, 0, "não lê só o pedaço entre parênteses");
  assert.equal(contasDoTexto("35% × 360 = 126").final, 126);
  assert.equal(contasDoTexto("10 m × 5 m = 50 m²").final, 50);
  assert.equal(passosDaConta("A = 8 × 5 = 40."), 1);
  const um = normalizarItem({ comando: "?", dificuldade: "dificil", resolucao: "A = 8 × 5 = 40." });
  assert.equal(um.dificuldade, "facil");
  const dois = normalizarItem({ comando: "?", dificuldade: "dificil", resolucao: "18 − 12 = 6; 6 × 1000 = 6000." });
  assert.equal(dois.dificuldade, "media");
  const quatro = normalizarItem({ comando: "?", dificuldade: "dificil", resolucao: "10 × 5 = 50; (10 × 3) ÷ 2 = 15; 50 + 15 = 65." });
  assert.equal(quatro.dificuldade, "dificil");
  const d = validarPedidoAvaliacao({ ...base, tema: "Área", bncc: "", itens: 5 }).dados;
  const p1 = conferirAvaliacao(normalizarAvaliacao(AVALIACAO_AREA_SIMULADA, d, null, (c) => ({ c }))).avaliacao;
  assert.match(montarPromptTrocar(p1, [3], d), /questões NOVAS/);
  const r = retirarComProblema(p1);
  assert.equal(r.avaliacao.itens.length, 1, "só a Q1 passa sem correção");
  assert.equal(r.retiradas.length, 4);
});

test("casos reais da bateria (16/10, 17h): letras trocadas, explicações em lista, número inventado, conversão errada", () => {
  // Volume Q3: a explicação de "20" estava na letra de "12"
  const dep = normalizarItem({ textoBase: "Observe as medidas na figura.", comando: "Qual é o volume do depósito em metros cúbicos?", figura: { tipo: "bloco", comprimento: 5, largura: 4, altura: 3, unidade: "m" }, leituraFigura: "x", alternativas: ["12 m³", "20 m³", "40 m³", "60 m³"], correta: "D", resolucao: "5 m × 4 m × 3 m = 60 m³. Portanto, 60 m³.", distratores: { A: "Multiplicou apenas duas medidas: 5 × 4 = 20", B: "Subtraiu uma medida: 5 × 4 - 3 = 17", C: "(5 × 4) + 3 = 23" } });
  const r = conferirItem(dep, 3);
  assert.equal(r.item.distratores.B, "Multiplicou apenas duas medidas: 5 × 4 = 20", "foi para a letra de 20 m³");
  assert.ok(r.avisos.some((a) => a.tipo === "corrigido" && /reorganizadas/.test(a.motivo)));
  assert.ok(r.item.problemas.length > 0, "12 e 40 continuam sem explicação certa: refazer");
  // explicações em lista
  const lista = normalizarItem({ comando: "?", alternativas: ["9 m²", "20 m²", "25 m²", "40 m²"], correta: "B", distratores: ["Somou: 5 + 4 = 9.", "5 × 5 = 25.", "(5 × 4) × 2 = 40."] });
  assert.deepEqual(Object.keys(lista.distratores), ["A", "C", "D"]);
  const lista2 = normalizarItem({ comando: "?", alternativas: ["9 m²", "20 m²", "25 m²", "40 m²"], correta: "B", distratores: [{ letra: "C", explicacao: "5 × 5 = 25." }] });
  assert.equal(lista2.distratores.C, "5 × 5 = 25.");
  // Área Q4: "24 + 21 = 45" — 21 não sai das medidas
  const L = normalizarFigura({ tipo: "contorno", unidade: "m", pontos: [[0, 0], [8, 0], [8, 3], [3, 3], [3, 6], [0, 6]], legenda: "Terreno" });
  const t = conferirItem({ textoBase: "Observe a figura do terreno.", comando: "Qual é a área total do terreno?", figura: L, leituraFigura: "x", alternativas: ["18 m²", "24 m²", "33 m²", "45 m²"], correta: "C", resolucao: "8 × 3 = 24; 3 × 3 = 9; 24 + 9 = 33.", distratores: { A: "9 + 9 = 18.", B: "8 * 3 = 24.", D: "Somou incorretamente: 24 + 21 = 45." }, habilidades: [] }, 4);
  assert.match(t.item.problemas.join(" "), /usa 21/);
  // conversão errada por potência de 10 é erro típico (não é número inventado)
  const tq = conferirItem({ textoBase: "Veja as medidas na figura.", comando: "Quantos litros de água cabem no tanque?", figura: normalizarFigura({ tipo: "bloco", comprimento: 2, largura: 1.5, altura: 1, unidade: "m" }), leituraFigura: "x", alternativas: ["3 L", "300 L", "3 000 L", "300 000 L"], correta: "C", resolucao: "2 m × 1.5 m × 1 m = 3 m³; 3 × 1 000 = 3 000 L.", distratores: { A: "Não converteu: 2 × 1.5 × 1 = 3", B: "3 × 100 = 300", D: "Multiplicou por 100 000 em vez de 1 000: 3 × 100 000 = 300 000" }, habilidades: [] }, 5);
  assert.deepEqual(tq.item.problemas, [], JSON.stringify(tq.avisos));
});

test("reparo pelo sistema: alternativas erradas com número inventado viram erros típicos calculados", async () => {
  const { repararDistratores, repararAvaliacao } = await import("../lib/avaliacao.js");
  // caso real: retângulo 5 × 4 no texto, explicação "6 x 3 = 18" inventada
  const q1 = conferirItem({ textoBase: "Lucas quer cobrir o chão retangular de seu quarto. O quarto tem 5 metros de comprimento e 4 metros de largura.", comando: "Qual é a área do chão do quarto de Lucas?", alternativas: ["9 m²", "18 m²", "20 m²", "25 m²"], correta: "C", resolucao: "5 m x 4 m = 20 m². Portanto, 20 m².", distratores: { A: "Somou as medidas: 5 + 4 = 9.", B: "Multiplicou incorretamente: 6 x 3 = 18.", D: "Multiplicou incorretamente: 5 x 5 = 25." }, habilidades: [] }, 1).item;
  assert.ok(q1.problemas.length);
  const r = repararDistratores(q1);
  assert.ok(r, "o sistema conserta");
  const ok = conferirItem({ ...r, problemas: undefined }, 1).item;
  assert.deepEqual(ok.problemas, []);
  assert.equal(ok.alternativas["ABCD".indexOf(ok.correta)], "20 m²");
  const l18 = "ABCD"[ok.alternativas.indexOf("18 m²")];
  assert.match(ok.distratores[l18], /perímetro: 2 × \(5 \+ 4\) = 18/, "18 é o perímetro: a explicação inventada virou a certa");
  // caso real: quadrado de lado 7, explicações "usou 6", "7 por 8"
  const q5 = conferirItem({ textoBase: "Um quadrado tem lado medindo 7 metros.", comando: "Qual é a área deste quadrado?", alternativas: ["36 m²", "42 m²", "49 m²", "56 m²"], correta: "C", resolucao: "7 m * 7 m = 49 m².", distratores: { A: "Usou 6 m em vez de 7 m: 6 × 6 = 36.", B: "Multiplicou 7 por 6: 7 × 6 = 42.", D: "Multiplicou 7 por 8: 7 × 8 = 56." }, habilidades: [] }, 5).item;
  const av = repararAvaliacao({ itens: [q5] });
  assert.deepEqual(av.reparadas, [1]);
  assert.deepEqual(av.avaliacao.itens[0].problemas, []);
  assert.deepEqual(av.avaliacao.itens[0].alternativas.sort(), ["14 m²", "28 m²", "49 m²", "98 m²"].sort());
  // "40 − 30 = 10%": pontos percentuais não são erro de conta
  assert.equal(contasDoTexto("40 - 30 = 10%. Portanto, 10%.").erradas.length, 0);
});
