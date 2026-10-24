// Módulo de Redação — Fase 1 (docs/specs/redacao.md): construtor, contagens, pedido,
// validação da resposta da IA (Zod), regras fixas e histórico no banco (PGlite).
import { test, before } from "node:test";
import assert from "node:assert/strict";
import { PGlite } from "@electric-sql/pglite";
import { definirClienteTeste } from "../lib/banco.js";
import { listarMigracoes, lerInstrucoes } from "../lib/migracoes.js";
import * as R from "../lib/redacao.js";
import { ETAPAS_REDACAO, CHECKLIST_REDACAO } from "../lib/redacaoEtapas.js";
import { REDACAO_ROTEIRO_SIMULADA } from "../lib/iaSimulada.js";
import * as H from "../lib/redacoesBanco.js";
import { consumir } from "../lib/contas.js";
import { PLANOS, PLANO_ADMIN, resumoDoUso } from "../lib/planos.js";

const palavras = (n) => Array.from({ length: n }, (_, i) => `palavra${i}`).join(" ");

// Caso real (spec, seção 9): prova de 30/08/2026, Gestão Escolar/Pedagógica no planejamento docente.
// Os parágrafos 1 e 2 repetem a tese e a proposta fica incompleta.
const CASO_30_08 = {
  tema: "O papel da Gestão Escolar e Pedagógica no planejamento docente",
  contexto: "O planejamento docente é uma etapa central do trabalho na escola e depende de orientação constante da equipe gestora",
  tese: "Assim, a gestão escolar e pedagógica é fundamental para que o planejamento do professor seja eficaz",
  argumento1: "A BNCC orienta que o planejamento organize as aprendizagens essenciais, e a gestão escolar e pedagógica é fundamental para que o planejamento do professor seja eficaz",
  consequencia1: "Sem esse acompanhamento, cada professor planeja isolado e as habilidades previstas ficam sem continuidade entre as turmas",
  argumento2: "Na prática, reuniões de HTPC bem conduzidas permitem analisar resultados de avaliações e ajustar as sequências didáticas de cada ano",
  principio2: "Esse trabalho coletivo expressa a gestão democrática prevista na LDB e coloca a aprendizagem de todos no centro",
  retomada: "Portanto, a gestão escolar e pedagógica sustenta um planejamento docente coerente e voltado à aprendizagem",
  proposta: "Cabe à equipe gestora acompanhar os planos de aula",
};

test("etapas: 9, na ordem e com as faixas da spec; checklist com 5 itens", () => {
  assert.deepEqual(
    ETAPAS_REDACAO.map((e) => [e.min, e.max]),
    [[3, 20], [12, 35], [8, 30], [15, 45], [12, 35], [15, 45], [12, 35], [8, 30], [15, 45]]
  );
  assert.ok(ETAPAS_REDACAO.every((e) => e.dica && e.titulo));
  assert.equal(CHECKLIST_REDACAO.length, 5);
});

test("contagem: palavras e linhas estimadas (≈160 palavras → ≈21 linhas)", () => {
  assert.equal(R.contarPalavras("A gestão — democrática — guia o pré-planejamento, 2026."), 7);
  assert.equal(R.linhasEstimadas(0), 0);
  assert.equal(R.linhasEstimadas(150), 20);
  const l = R.linhasEstimadas(160);
  assert.ok(l >= 21 && l <= 22, `160 palavras → ${l} linhas`);
  assert.equal(R.avisoLinhas(22), "");
  assert.match(R.avisoLinhas(15), /abaixo do mínimo de 20/);
  assert.match(R.avisoLinhas(35, { minLinhas: 20, maxLinhas: 30 }), /acima do máximo de 30/);
  assert.match(R.avisoLinhas(26, { minLinhas: 7, maxLinhas: 25 }), /máximo de 25/);
});

test("faixa de cada etapa: curta, ok, longa", () => {
  const e = ETAPAS_REDACAO[2]; // tese 8–30
  assert.equal(R.situacaoEtapa(e, palavras(5)), "curta");
  assert.equal(R.situacaoEtapa(e, palavras(10)), "ok");
  assert.equal(R.situacaoEtapa(e, palavras(31)), "longa");
});

test("construtor monta 4 parágrafos (tema fora do texto) e as linhas", () => {
  const m = R.montarRedacao(CASO_30_08);
  assert.equal(m.paragrafos.length, 4);
  assert.equal(m.texto.split("\n\n").length, 4);
  assert.ok(m.paragrafos[0].startsWith("O planejamento docente") && m.paragrafos[0].includes("Assim, a gestão"));
  assert.ok(m.paragrafos[3].endsWith("planos de aula."));
  assert.ok(!m.texto.includes(CASO_30_08.tema));
  assert.equal(m.linhas, Math.ceil(m.palavras / 7.5));
  // etapa vazia não quebra a montagem (voltar e editar depois)
  assert.equal(R.montarRedacao({ contexto: "Só o contexto" }).texto, "Só o contexto.");
});

test("pedido: texto obrigatório, mínimo de palavras, perfil e linhas", () => {
  assert.equal(R.validarPedidoRedacao({}).ok, false);
  assert.equal(R.validarPedidoRedacao({ texto: palavras(10) }).ok, false);
  const ok = R.validarPedidoRedacao({ texto: palavras(40), bancaPerfil: "xpto", minLinhas: "7", maxLinhas: 25 });
  assert.equal(ok.ok, true);
  assert.equal(ok.dados.perfil, "concurso");
  assert.deepEqual([ok.dados.minLinhas, ok.dados.maxLinhas], [7, 25]);
  assert.equal(R.validarPedidoRedacao({ texto: palavras(40), minLinhas: 30, maxLinhas: 20 }).ok, false);
  assert.equal(R.validarPedidoRedacao({ texto: "a ".repeat(7000) }).ok, false);
});

test("Grátis: até 2 laudas (60 linhas ≈ 450 palavras)", () => {
  assert.equal(R.passaDoLimiteGratis(palavras(450)), false);
  assert.equal(R.passaDoLimiteGratis(palavras(451)), true);
  assert.match(R.MENSAGEM_LAUDAS, /Pro/);
});

test("prompt: regras da spec, 5 critérios, texto delimitado e esquema", () => {
  const d = R.validarPedidoRedacao({ texto: R.montarRedacao(CASO_30_08).texto, tema: CASO_30_08.tema }).dados;
  const s = R.sistemaRedacao("concurso");
  assert.match(s, /concurso público para professores/);
  assert.match(s, /agente \+ ação \+ meio \+ finalidade/);
  assert.match(s, /BNCC, LDB \(Lei 9\.394\/96\), ECA, PNE/);
  const p = R.montarPromptRedacao(d);
  assert.match(p, /<<<REDACAO\n[\s\S]+\nREDACAO>>>/);
  assert.match(p, /"proximoPasso"/);
  for (const c of R.CRITERIOS_REDACAO) assert.ok(p.includes(c.nome));
});

test("caso de 30/08: resposta no esquema → nota 6,0–6,5, tese repetida e proposta incompleta", () => {
  const d = R.validarPedidoRedacao({ texto: R.montarRedacao(CASO_30_08).texto, tema: CASO_30_08.tema }).dados;
  const n = R.normalizarRespostaRedacao(REDACAO_ROTEIRO_SIMULADA, d);
  assert.equal(n.ok, true);
  const r = n.resultado;
  assert.ok(r.notaTotal >= 6 && r.notaTotal <= 6.5, `nota ${r.notaTotal}`);
  assert.equal(r.criterios.length, 5);
  assert.match(r.criterios[1].justificativa, /repetem a mesma tese/);
  assert.deepEqual(r.propostaIntervencao.faltam, ["meio", "finalidade"]);
  assert.ok(r.criterios[3].nota <= 1);
  assert.equal(r.linhasEstimadas, R.linhasDoTexto(d.texto));
  assert.equal(r.aviso, R.AVISO_IA);
  assert.equal(r.errosPortugues[0].tipo, "concordância");
});

test("conclusão sem proposta: 0 no critério e mensagem com o que falta", () => {
  const d = R.validarPedidoRedacao({ texto: palavras(200) }).dados;
  const json = structuredClone(REDACAO_ROTEIRO_SIMULADA);
  json.criterios[3].nota = 1.5; // a IA deu nota mesmo sem proposta
  json.propostaIntervencao = { agente: false, acao: false, meio: false, finalidade: false, comentario: "" };
  const r = R.normalizarRespostaRedacao(json, d).resultado;
  assert.equal(r.criterios[3].nota, 0);
  assert.match(r.criterios[3].justificativa, /ausente: faltam agente, ação, meio, finalidade/);
  assert.equal(r.notaTotal, 1.75 + 1 + 1.75 + 0 + 1.25);
});

test("validação Zod: aceita números em texto, recusa resposta sem os 5 critérios", () => {
  const d = R.validarPedidoRedacao({ texto: palavras(200), minLinhas: 20, maxLinhas: 30 }).dados;
  const json = structuredClone(REDACAO_ROTEIRO_SIMULADA);
  json.criterios[0].nota = "1,75";
  json.criterios[4].nota = 9; // acima do máximo: limitado a 2
  json.errosPortugues.push({ trecho: "x", tipo: "inventado", correcao: "y" });
  const r = R.normalizarRespostaRedacao(json, d).resultado;
  assert.equal(r.criterios[0].nota, 1.75);
  assert.equal(r.criterios[4].nota, 2);
  assert.equal(r.errosPortugues[1].tipo, "outro");
  assert.equal(r.dentroDoLimite, true); // 200 palavras ≈ 27 linhas
  assert.equal(R.normalizarRespostaRedacao({ ...json, criterios: json.criterios.slice(0, 4) }, d).ok, false);
  assert.equal(R.normalizarRespostaRedacao(null, d).ok, false);
  // sem "elementos" e sem próximo passo: aceita, com todos os elementos ausentes (critério da proposta = 0)
  const minimo = R.normalizarRespostaRedacao({ criterios: json.criterios }, d);
  assert.equal(minimo.ok, true);
  assert.equal(minimo.resultado.criterios[3].nota, 0);
  // resposta em lista e notas escritas por extenso
  const lista = R.normalizarRespostaRedacao([{ ...json, notaTotal: "6,5/10", criterios: json.criterios.map((c) => ({ ...c, nota: "1,5 de 2", max: "2 pontos" })) }], d);
  assert.equal(lista.ok, true);
  assert.equal(lista.resultado.criterios[0].nota, 1.5);
});

test("planos: a Redação inteira é só do Pro (Grátis sem correções)", () => {
  assert.equal(PLANOS.gratis.limites.redacoesMes, 0);
  assert.equal(PLANOS.gratis.construtorRedacao, false);
  assert.equal(PLANOS.pro_mensal.construtorRedacao, true);
  assert.equal(PLANO_ADMIN.construtorRedacao, true);
  const r = resumoDoUso({ mes: { redacao: 1 }, dia: {} }, { plano: PLANOS.gratis });
  assert.deepEqual(r.redacoes, { usados: 1, limite: 0 });
  assert.equal(r.construtorRedacao, false);
});

// ---------- banco ----------
const db = new PGlite();
before(async () => {
  for (const m of listarMigracoes(new URL("../db/migracoes", import.meta.url).pathname)) for (const i of lerInstrucoes(m.up)) await db.query(i);
  definirClienteTeste({
    consultar: async (t, p = []) => (await db.query(t, p)).rows,
    transacao: (lista) =>
      db.transaction(async (tx) => {
        const r = [];
        for (const [t, p = []] of lista) r.push((await tx.query(t, p)).rows);
        return r;
      }),
  });
});

test("uso 'redacao': 1 por mês no Grátis", async () => {
  assert.equal((await consumir("r1@x.br", "redacao", 1)).ok, true);
  assert.deepEqual(await consumir("r1@x.br", "redacao", 1), { ok: false, motivo: "mes" });
});

test("histórico: salvar, listar sem o texto, ler e apagar só a própria", async () => {
  const resultado = { notaTotal: 6.25, criterios: [] };
  const id = await H.salvarRedacao("aluno@x.br", { tema: "Gestão", texto: "texto do aluno", perfil: "concurso", resultado });
  const lista = await H.listarRedacoes("aluno@x.br");
  assert.equal(lista.length, 1);
  assert.equal(lista[0].nota, 6.25);
  assert.equal(lista[0].texto, undefined);
  assert.equal((await H.lerRedacao("aluno@x.br", id)).texto, "texto do aluno");
  assert.equal(await H.lerRedacao("outro@x.br", id), null);
  assert.equal(await H.apagarRedacao("outro@x.br", id), false);
  assert.equal(await H.apagarRedacao("aluno@x.br", "1; DROP"), false);
  assert.equal(await H.apagarRedacao("aluno@x.br", id), true);
  assert.equal((await H.listarRedacoes("aluno@x.br")).length, 0);
});

// ---------- gêneros e ENEM ----------
import { GENEROS_REDACAO } from "../lib/redacaoEtapas.js";
import * as F from "../lib/redacaoFoto.js";
import { TRANSCRICAO_SIMULADA, respostaSimulada } from "../lib/iaSimulada.js";
import { tokenFoto, tokenFotoConfere } from "../lib/redacaoFotoToken.js";

test("gêneros: cada um com etapas, checklist de 5, 5 critérios e elementos ligados a um critério", () => {
  for (const [id, g] of Object.entries(GENEROS_REDACAO)) {
    assert.ok(g.etapas.length >= 6 && g.etapas[0].parte === 0, id);
    assert.equal(g.checklist.length, 5, id);
    assert.equal(g.criterios.length, 5, id);
    assert.ok(g.criterios.some((c) => c.id === g.criterioDosElementos), id);
  }
});

test("perfil: concurso e ENEM são sempre dissertação; escola escolhe o gênero", () => {
  const t = palavras(60);
  assert.equal(R.validarPedidoRedacao({ texto: t, bancaPerfil: "enem", genero: "carta" }).dados.genero, "dissertacao");
  const d = R.validarPedidoRedacao({ texto: t, bancaPerfil: "escolar", genero: "narrativo" }).dados;
  assert.equal(d.genero, "narrativo");
  assert.deepEqual([d.minLinhas, d.maxLinhas], [15, 30]);
  assert.equal(R.validarPedidoRedacao({ texto: t, bancaPerfil: "enem" }).dados.minLinhas, 7);
});

test("carta: local e data e vocativo em linhas próprias, sem ponto final forçado", () => {
  const m = R.montarRedacao({ local: "Araçariguama, 24 de outubro de 2026", vocativo: "Senhor Prefeito", motivo: "Sou aluno do 6º ano", corpo: "A rua da escola não tem faixa", pedido: "Peço uma faixa de pedestres", despedida: "Atenciosamente", assinatura: "Ana" }, undefined, "carta");
  assert.deepEqual(m.paragrafos.slice(0, 2), ["Araçariguama, 24 de outubro de 2026", "Senhor Prefeito,"]);
  assert.equal(m.paragrafos.at(-2), "Atenciosamente,");
  assert.equal(m.paragrafos.at(-1), "Ana");
});

test("narrativo: rubrica do gênero no prompt e elementos ausentes tiram nota da estrutura", () => {
  const d = R.validarPedidoRedacao({ texto: palavras(150), bancaPerfil: "escolar", genero: "narrativo" }).dados;
  const p = R.montarPromptRedacao(d);
  assert.match(R.sistemaRedacao("escolar", "narrativo"), /Texto narrativo/);
  assert.match(p, /"elementos":\{"inicial":true,"conflito":true,"climax":true,"desfecho":true/);
  const r = R.normalizarRespostaRedacao(respostaSimulada(`${R.sistemaRedacao("escolar", "narrativo")}\n${p}`), d).resultado;
  assert.equal(r.notaMaxima, 10);
  assert.deepEqual(r.elementos.faltam, ["clímax", "desfecho"]);
  const estrutura = r.criterios.find((c) => c.id === "estrutura");
  assert.ok(estrutura.nota <= 1, `estrutura ${estrutura.nota}`);
  assert.equal(r.propostaIntervencao, undefined);
});

test("ENEM: competências de 0 a 200 em múltiplos de 40, total até 1000", () => {
  const d = R.validarPedidoRedacao({ texto: palavras(200), bancaPerfil: "enem" }).dados;
  const prompt = R.montarPromptRedacao(d);
  assert.match(prompt, /0, 40, 80, 120, 160 ou 200/);
  const r = R.normalizarRespostaRedacao(respostaSimulada(prompt), d).resultado;
  assert.equal(r.notaMaxima, 1000);
  assert.ok(r.criterios.every((c) => c.max === 200 && c.nota % 40 === 0));
  // 3 de 5 elementos da proposta → C5 no máximo 120
  assert.ok(r.criterios[4].nota <= 120);
  assert.equal(r.notaTotal, r.criterios.reduce((s, c) => s + c.nota, 0));
});

// ---------- foto ----------
test("transcrição: normaliza caixas, parágrafos e junta palavra hifenizada", () => {
  const t = F.normalizarTranscricao({ legivel: true, linhasDaFoto: [{ texto: "O plane-", caixa: [10, 5, 50, 900], novoParagrafo: true }, { texto: "jamento  é bom.", caixa: [2000, 900, 60, 100] }, { texto: "Outro parágrafo", caixa: [70, 5, 110, 900], novoParagrafo: true }] });
  assert.equal(t.ok, true);
  assert.deepEqual(t.linhas[1].caixa, [60, 100, 1000, 900]);
  assert.equal(F.textoDasLinhas([t.linhas]), "O planejamento é bom.\n\nOutro parágrafo");
  assert.equal(F.normalizarTranscricao({ legivel: false }).ok, false);
  assert.equal(F.normalizarTranscricao({ linhasDaFoto: [] }).ok, false);
  assert.match(F.montarPromptTranscricao(), /NÃO corrija/);
});

test("marcas na foto: acha o trecho do erro na linha certa e na posição aproximada", () => {
  const linhas = F.normalizarTranscricao(TRANSCRICAO_SIMULADA).linhas;
  const erros = [
    { trecho: "os professor", tipo: "concordância", correcao: "os professores" },
    { trecho: "cabe a coordenação", tipo: "crase", correcao: "cabe à coordenação" },
    { trecho: "palavra que não existe", tipo: "ortografia", correcao: "x" },
  ];
  const m = F.localizarErros([linhas], erros);
  assert.equal(m.length, 2);
  assert.equal(m[0].linha, 1);
  assert.ok(m[0].x1 > 600 && m[0].x2 <= 900, `x ${m[0].x1}-${m[0].x2}`);
  assert.deepEqual([m[0].y1, m[0].y2], linhas[1].caixa.filter((_, i) => i % 2 === 0));
  assert.equal(m[1].linha, 4);
  assert.ok(m[1].x1 < 400);
});

test("token da foto: vale para a mesma conta por 30 minutos", () => {
  const em = new Date().toISOString();
  const t = tokenFoto("a@x.br", em);
  assert.equal(tokenFotoConfere(t, "a@x.br", em), true);
  assert.equal(tokenFotoConfere(t, "b@x.br", em), false);
  assert.equal(tokenFotoConfere(t, "a@x.br", new Date(Date.now() - 31 * 60e3).toISOString()), false);
});
