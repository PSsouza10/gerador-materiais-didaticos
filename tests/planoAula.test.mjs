// Plano de aula (Currículo Paulista): pedido, normalização e texto
import { test } from "node:test";
import assert from "node:assert/strict";
import { validarPedidoPlano, montarPromptPlano, normalizarPlano, problemasDoPlano, planoParaTexto, resumoDaApostila, montarPromptRevisaoPlano, aplicarRevisaoPlano, adicionarPlanoNaLista, LIMITE_PLANOS_SALVOS, urlIlustracaoValida, mensagemFalhaPlano } from "../lib/planoAula.js";
import { PLANO_SIMULADO, respostaSimulada } from "../lib/iaSimulada.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "7", tema: "Volume", aulas: 2, bncc: "EF07MA30" };

test("pedido: obrigatórios, aulas permitidas e BNCC de outra etapa bloqueada", () => {
  assert.equal(validarPedidoPlano({ ...base, tema: "" }).ok, false);
  assert.equal(validarPedidoPlano({ ...base, aulas: 99 }).dados.aulas, 2, "valor fora da lista vira o padrão");
  const r = validarPedidoPlano({ ...base, nivel: "Ensino Médio", bncc: "EF89EF09" });
  assert.equal(r.ok, false);
  assert.match(r.erro, /Ensino Fundamental.*Ensino Médio/);
  assert.equal(validarPedidoPlano(base).ok, true);
});

test("prompt pede o formato do Currículo Paulista e o número exato de aulas", () => {
  const p = montarPromptPlano(validarPedidoPlano({ ...base, aulas: 3 }).dados, "EF07MA30 — texto oficial");
  assert.match(p, /Currículo Paulista/);
  assert.match(p, /exatamente 3 aula/);
  assert.match(p, /"plano_de_aula"/);
  assert.match(p, /Não escreva nomes de alunos/);
  assert.equal(respostaSimulada(p), PLANO_SIMULADO);
});

test("normalização: aulas renumeradas, habilidade oficial no lugar da inventada, no máximo N aulas", () => {
  const d = validarPedidoPlano({ ...base, aulas: 2 }).dados;
  const json = { plano_de_aula: { ...PLANO_SIMULADO.plano_de_aula, habilidades: [{ codigo: "EM13MAT999", descricao: "inventada" }], aulas: [{ numero: 7, desenvolvimento: "a" }, { numero: 9, desenvolvimento: "b" }, { numero: 3, desenvolvimento: "c" }] } };
  const pl = normalizarPlano(json, d, { c: "EF07MA30", t: "Resolver e elaborar problemas de cálculo de volume" });
  assert.deepEqual(pl.aulas.map((a) => a.numero), [1, 2]);
  assert.deepEqual(pl.habilidades, [{ codigo: "EF07MA30", descricao: "Resolver e elaborar problemas de cálculo de volume" }]);
  assert.deepEqual(problemasDoPlano(pl, d), []);
});

test("sem habilidade informada: código da IA de outra etapa é descartado", () => {
  const d = validarPedidoPlano({ ...base, bncc: "" }).dados;
  const pl = normalizarPlano({ plano_de_aula: { habilidades: [{ codigo: "EM13MAT101", descricao: "x" }, { codigo: "EF07MA30", descricao: "y" }], aulas: [], objetivos: [] } }, d);
  assert.deepEqual(pl.habilidades.map((h) => h.codigo), ["EF07MA30"]);
  assert.ok(problemasDoPlano(pl, d).length > 0, "plano vazio é apontado");
});

test("texto para copiar tem todas as seções", () => {
  const d = validarPedidoPlano({ ...base, professor: "Prof. Teste", turma: "7º B" }).dados;
  const t = planoParaTexto(normalizarPlano(PLANO_SIMULADO, d));
  for (const s of ["PLANO DE AULA", "Professor(a): Prof. Teste", "UNIDADE TEMÁTICA", "HABILIDADE", "OBJETIVOS", "Aula 1", "Aula 2", "RECURSOS", "AVALIAÇÃO", "RECUPERAÇÃO CONTÍNUA"]) assert.ok(t.includes(s), s);
});

test("plano a partir de apostila do EduGera ou de PDF", () => {
  const registro = { form: { tema: "Volume", professor: "Prof. X", escola: "Escola Y" }, material: { tituloDidatico: "Volume no dia a dia", resumoPedagogico: "Calcular volume.", conceitos: [{ termo: "Volume", definicao: "espaço ocupado" }], formulas: [{ expressao: "V = c × l × h" }], exercicios: [{ enunciado: "Calcule o volume da caixa." }] } };
  const t = resumoDaApostila(registro);
  for (const s of ["Volume no dia a dia", "Conceito: Volume", "V = c × l × h", "Exercício 1: Calcule o volume da caixa."]) assert.ok(t.includes(s), s);
  assert.ok(!t.includes("Prof. X") && !t.includes("Escola Y"), "sem dados do professor no texto enviado à IA");
  const d = validarPedidoPlano({ ...base, tema: "" }, { temBase: true }).dados;
  assert.equal(d.tema, "conforme o material base");
  assert.match(montarPromptPlano(d, "", { tipo: "apostila", texto: t }), /MATERIAL BASE: uma apostila criada no EduGera[\s\S]*Volume no dia a dia/);
  assert.match(montarPromptPlano(d, "", { tipo: "pdf" }), /MATERIAL BASE: o PDF anexo/);
  assert.equal(validarPedidoPlano({ ...base, tema: "" }).ok, false, "sem base, o tema continua obrigatório");
});

test("revisão automática: corrige sem perder habilidade oficial nem número de aulas", () => {
  const d = validarPedidoPlano({ ...base, aulas: 2 }).dados;
  const pl = normalizarPlano(PLANO_SIMULADO, d, { c: "EF07MA30", t: "oficial" });
  const prompt = montarPromptRevisaoPlano(pl, "EF07MA30 — oficial");
  assert.match(prompt, /volume com capacidade/);
  assert.match(prompt, /"correcoes"/);
  assert.equal(respostaSimulada(prompt).correcoes.length, 1, "simulação reconhece o pedido de revisão");
  const corrigido = { ...PLANO_SIMULADO.plano_de_aula, objetivos: ["Calcular o volume (espaço ocupado) de blocos"], habilidades: [{ codigo: "EF99XX99", descricao: "inventada" }] };
  const a = aplicarRevisaoPlano(pl, { correcoes: ["Objetivo confundia volume e capacidade"], plano_de_aula: corrigido }, d);
  assert.equal(a.aplicada, true);
  assert.deepEqual(a.plano.objetivos, ["Calcular o volume (espaço ocupado) de blocos"]);
  assert.deepEqual(a.plano.habilidades, [{ codigo: "EF07MA30", descricao: "oficial" }], "habilidade oficial é mantida");
  // revisão que perde aulas é ignorada
  const ruim = aplicarRevisaoPlano(pl, { correcoes: ["x"], plano_de_aula: { ...corrigido, aulas: [corrigido.aulas[0]] } }, d);
  assert.equal(ruim.aplicada, false);
  assert.equal(ruim.plano, pl);
});

test("planos salvos: mais novo primeiro, com limite", () => {
  let l = [];
  for (let i = 0; i < LIMITE_PLANOS_SALVOS + 5; i++) l = adicionarPlanoNaLista(l, { n: i }, null);
  assert.equal(l.length, LIMITE_PLANOS_SALVOS);
  assert.equal(l[0].plano.n, LIMITE_PLANOS_SALVOS + 4);
});

test("ilustração do plano: só do armazenamento do EduGera", () => {
  assert.equal(urlIlustracaoValida("https://abc.public.blob.vercel-storage.com/apostilas/x.png"), "https://abc.public.blob.vercel-storage.com/apostilas/x.png");
  assert.equal(urlIlustracaoValida("https://site-qualquer.com/x.png"), null);
  assert.equal(urlIlustracaoValida('javascript:alert(1)'), null);
  assert.equal(urlIlustracaoValida(undefined), null);
});

test("mensagemFalhaPlano: explica ao professor o que fazer", () => {
  const longo = [{ status: 400, erro: '{"error":{"code":"context_length_exceeded","message":"maximum context length"}}' }];
  assert.match(mensagemFalhaPlano(longo, { comPdf: true }), /grande demais.*só as páginas/);
  assert.doesNotMatch(mensagemFalhaPlano(longo, { comPdf: false }), /PDF/);
  assert.match(mensagemFalhaPlano([{ status: 400, erro: "Invalid file data: unable to process PDF" }], { comPdf: true }), /não conseguiu abrir este PDF/);
  assert.match(mensagemFalhaPlano([{ status: 429, erro: "insufficient_quota", semCredito: true }]), /sem crédito/);
  assert.match(mensagemFalhaPlano([{ status: 0, erro: "AbortError: timeout" }]), /demorou demais/);
  assert.match(mensagemFalhaPlano([{ status: 500, erro: "x" }]), /Tente de novo/);
  assert.match(mensagemFalhaPlano(), /Tente de novo/);
});

test("plano a partir de material sem tema/ano/habilidade: tema do material, código conferido e texto oficial", async () => {
  const { readFileSync } = await import("node:fs");
  const { indexar, resolverCodigo, DISCIPLINA_PARA_COMPONENTE, cobreAno } = await import("../lib/bncc.js");
  const { habilidadesCandidatas } = await import("../lib/planoAula.js");
  const bncc = JSON.parse(readFileSync(new URL("../data/bncc-habilidades.json", import.meta.url))).habilidades;
  const mapa = indexar(bncc);
  const d = validarPedidoPlano({ disciplina: "História", nivel: "Ensino Fundamental", ano: "", tema: "", aulas: 2 }, { temBase: true }).dados;
  assert.equal(d.temaDoMaterial, true);
  // a IA recebe a lista oficial da disciplina e é mandada escolher dela
  const cand = habilidadesCandidatas(bncc, d, DISCIPLINA_PARA_COMPONENTE[d.disciplina], cobreAno);
  assert.ok(cand.length > 50 && cand.some((c) => c.startsWith("EF09HI19 — ")));
  const prompt = montarPromptPlano(d, "", { tipo: "pdf" }, cand);
  assert.match(prompt, /LISTA OFICIAL DE HABILIDADES[\s\S]*EF09HI19 — /);
  assert.match(prompt, /identifique pelo material/);
  assert.match(prompt, /"tema": "\.\.\."/);
  // caso real: a IA usou EF09HI08 com texto inventado sobre o regime militar
  const ia = { plano_de_aula: { tema: "Ditadura civil-militar no Brasil", unidade_tematica: "Regime Militar no Brasil", habilidades: [{ codigo: "EF09HI08", descricao: "Identificar e analisar os impactos do regime militar..." }, { codigo: "EF09HI99", descricao: "inventado" }], objetivos: ["x"], aulas: [{ titulo: "A", desenvolvimento: "y" }, { titulo: "B", desenvolvimento: "z" }], avaliacao: { criterios: ["c"] } } };
  const pl = normalizarPlano(ia, d, null, (c) => resolverCodigo(mapa, c));
  assert.equal(pl.identificacao.tema, "Ditadura civil-militar no Brasil", "nunca 'conforme o material base'");
  assert.deepEqual(pl.habilidades.map((h) => h.codigo), ["EF09HI08"], "código inexistente sai");
  assert.match(pl.habilidades[0].descricao, /diversidade/, "texto sempre o oficial da BNCC");
  assert.equal(pl.identificacao.etapa, "Ensino Fundamental — 9º ano", "ano vem do código");
  // sem tema da IA: usa a unidade temática
  assert.equal(normalizarPlano({ plano_de_aula: { ...ia.plano_de_aula, tema: "" } }, d, null, (c) => resolverCodigo(mapa, c)).identificacao.tema, "Regime Militar no Brasil");
  // nenhum código válido: avisa o professor
  const sem = normalizarPlano({ plano_de_aula: { ...ia.plano_de_aula, habilidades: [{ codigo: "XX" }] } }, d, null, (c) => resolverCodigo(mapa, c));
  assert.ok(problemasDoPlano(sem, d).some((x) => /habilidade da BNCC não identificada/.test(x)));
  // professor informou tema e ano: nada muda
  const d2 = validarPedidoPlano({ disciplina: "História", nivel: "Ensino Fundamental", ano: "8", tema: "Revolução Francesa", aulas: 2 }, { temBase: true }).dados;
  const pl2 = normalizarPlano(ia, d2, null, (c) => resolverCodigo(mapa, c));
  assert.equal(pl2.identificacao.tema, "Revolução Francesa");
  assert.equal(pl2.identificacao.etapa, "Ensino Fundamental — 8º ano");
  // lista grande demais não vai cortada
  assert.deepEqual(habilidadesCandidatas(bncc, { nivel: "Ensino Fundamental", ano: "" }, DISCIPLINA_PARA_COMPONENTE["Português"], cobreAno), []);
});
