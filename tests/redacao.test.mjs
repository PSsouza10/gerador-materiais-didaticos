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
  assert.equal(R.normalizarRespostaRedacao({ criterios: json.criterios }, d).ok, false); // sem proposta/próximo passo
});

test("planos: correção Grátis 1/mês; construtor só no Pro", () => {
  assert.equal(PLANOS.gratis.limites.redacoesMes, 1);
  assert.equal(PLANOS.gratis.construtorRedacao, false);
  assert.equal(PLANOS.pro_mensal.construtorRedacao, true);
  assert.equal(PLANO_ADMIN.construtorRedacao, true);
  const r = resumoDoUso({ mes: { redacao: 1 }, dia: {} }, { plano: PLANOS.gratis });
  assert.deepEqual(r.redacoes, { usados: 1, limite: 1 });
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
