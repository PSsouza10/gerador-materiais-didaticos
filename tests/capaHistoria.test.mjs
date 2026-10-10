// Capa "História que Ensina": regras de conteúdo (sem navegador)
import { test } from "node:test";
import assert from "node:assert/strict";
import * as H from "../lib/capaHistoria.js";
import { CAPAS, normalizarCapa } from "../lib/opcoes.js";

test("nova capa existe, é Premium e as atuais continuam iguais", () => {
  const ids = CAPAS.map((c) => c.id);
  assert.deepEqual(ids, ["poster", "historia", "infografico", "escolar", "comfy", "nenhuma"]);
  assert.equal(CAPAS.find((c) => c.id === "historia").premium, true);
  assert.equal(normalizarCapa("historia"), "historia");
  for (const id of ["infografico", "escolar", "comfy", "poster", "nenhuma"]) assert.equal(normalizarCapa(id), id);
  assert.equal(normalizarCapa(true), "comfy", "materiais antigos");
});

test("disciplina e ano: só o que foi informado", () => {
  assert.deepEqual(H.linhaDisciplina({ disciplina: "Ciências", ano: "5" }), ["Ciências", "5º ano"]);
  assert.deepEqual(H.linhaDisciplina({ disciplina: "Português", ano: "6" }), ["Português", "6º ano"]);
  assert.deepEqual(H.linhaDisciplina({ disciplina: "Matemática", ano: "EM2" }), ["Matemática", "2ª série"]);
  assert.deepEqual(H.linhaDisciplina({ disciplina: "Arte", nivel: "Ensino Fundamental" }), ["Arte", "Ensino Fundamental"]);
  assert.deepEqual(H.linhaDisciplina({}), []);
});

test("título preservado exatamente, com acentos; 1ª palavra em destaque", () => {
  for (const t of ["Volume e Capacidade", "Verbos e suas variações", "Água, ar e solo: cuidar do meio ambiente é responsabilidade de todos nós", "Ação"]) {
    const { destaque, resto } = H.partesTitulo(t);
    assert.equal([destaque, resto].filter(Boolean).join(" "), t);
  }
  assert.deepEqual(H.partesTitulo("  Frações   e  decimais "), { destaque: "Frações", resto: "e decimais" });
});

test("fonte do título diminui com o tamanho e respeita o mínimo", () => {
  const curto = H.tamanhoInicialTitulo("Volume");
  const medio = H.tamanhoInicialTitulo("Verbos e suas variações");
  const longo = H.tamanhoInicialTitulo("Meio ambiente: pequenas atitudes que transformam o planeta");
  const enorme = H.tamanhoInicialTitulo("x ".repeat(120));
  assert.ok(curto > medio && medio > longo && longo >= enorme, `${curto} ${medio} ${longo} ${enorme}`);
  assert.ok(enorme >= H.TITULO_MIN);
  assert.ok(H.tamanhoInicialTitulo("Proporcionalidade") * 0.6 * 17 <= 666, "palavra longa cabe na largura");
});

test("identificação: escola, professor e turma só quando preenchidos", () => {
  assert.deepEqual(H.linhasIdentificacao({}), []);
  assert.deepEqual(H.linhasIdentificacao({ escola: "  ", professor: "" }), []);
  assert.deepEqual(H.linhasIdentificacao({ professor: "Prof.ª Ana" }), [["Professor(a)", "Prof.ª Ana"]]);
  assert.deepEqual(H.linhasIdentificacao({ escola: "EMEF São João", professor: "Paulo", turma: "5º B" }).map(([k]) => k), ["Escola", "Professor(a)", "Turma"]);
});

test("selo BNCC só com habilidade conferida", () => {
  assert.equal(H.seloBncc(null), null);
  assert.equal(H.seloBncc({ codigo: "EF05CI04", verificada: false }), null, "informada pelo docente não ganha selo");
  assert.deepEqual(H.seloBncc({ codigo: "ef05ci04", verificada: true }), { codigo: "EF05CI04" });
});

test("cada disciplina tem cor e desenho próprios; desconhecida usa o padrão", () => {
  const vistos = new Set();
  for (const d of ["Matemática", "Português", "Ciências", "História", "Geografia", "Arte", "Educação Física", "Língua Inglesa", "Informática", "Ensino Religioso"]) {
    const t = H.temaDaDisciplina(d);
    assert.match(t.cor, /^#[0-9a-f]{6}$/);
    vistos.add(t.desenho);
  }
  assert.equal(vistos.size, 10);
  assert.equal(H.temaDaDisciplina("Filosofia").desenho, "geral");
});

test("descrição e fala vêm do material, nunca inventadas", () => {
  assert.equal(H.descricaoDaCapa({}), "");
  assert.equal(H.descricaoDaCapa({ resumoPedagogico: "  Volume é o espaço  " }), "Volume é o espaço");
  assert.equal(H.chamadaDaCena({}), "");
  assert.equal(H.chamadaDaCena({ cena: { pergunta: "Quantos litros?" } }), "Quantos litros?");
});
