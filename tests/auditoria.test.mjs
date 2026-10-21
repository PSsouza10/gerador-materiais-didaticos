import { test } from "node:test";
import assert from "node:assert/strict";
import { auditarMaterial, resumirBateria } from "../lib/auditoria.js";
import { auditarInconsistenciasPedagogicas } from "../lib/auditoriaPedagogica.js";
import { CASOS_BATERIA } from "../lib/bateria.js";
import { normalizarMaterial } from "../lib/material.js";

const form = { disciplina: "Matemática", nivel: "Ensino Fundamental", ano: "4", bncc: "EF04MA09", questoes: 5 };
const base = () =>
  normalizarMaterial({
    tituloDidatico: "Frações na Reta",
    resumoPedagogico: "Uma fração unitária é uma das partes iguais de um inteiro.",
    conceitos: [{ termo: "Fração unitária", definicao: "Fração com numerador 1." }],
    formulas: [{ nome: "Comparar", expressao: "1/a < 1/b se a > b", descricao: "" }],
    figuraExplicativa: { tipo: "fracao", partes: 4, pintadas: 1 }, // tipo diferente da reta citada no exercício 2
    exercicios: [
      { enunciado: "Qual fração unitária é a maior?", alternativas: ["a) 1/2", "b) 1/3", "c) 1/4", "d) 1/5"], resposta: "a) 1/2" },
      { enunciado: "Localize 1/3 na reta numérica.", alternativas: [], resposta: "No primeiro tracinho." },
    ],
  });

test("aponta quantidade errada, figura citada que faltou e regra com letras no 4º ano", () => {
  const a = auditarMaterial(form, base(), { questoes: 5 });
  const motivos = a.problemas.map((p) => `${p.onde}: ${p.motivo}`).join("\n");
  assert.match(motivos, /vieram 2, mas foram pedidos 5/);
  assert.match(motivos, /Exercício 2: o enunciado cita uma figura/);
  assert.match(motivos, /regra escrita com letras/);
  assert.ok(a.erros >= 2);
  assert.ok(a.nota < 80);
});

test("nota cai com erros e avisos, sem passar de 0", () => {
  const m = base();
  m.exercicios = [];
  m.resumoPedagogico = "";
  const a = auditarMaterial({ ...form, nivel: "Ensino Médio" }, m, { questoes: 10 });
  assert.ok(a.nota >= 0);
  assert.ok(a.problemas.some((p) => /código EF04MA09 é do Ensino Fundamental/.test(p.motivo)));
});

test("resumo da bateria conta aprovados, falhas e problemas comuns", () => {
  const ok = { auditoria: { nota: 92, erros: 0, avisos: 2, problemas: [{ fonte: "qualidade", motivo: "texto longo (500 caracteres)" }] } };
  const ruim = { auditoria: { nota: 40, erros: 3, avisos: 1, problemas: [{ fonte: "qualidade", motivo: "texto longo (900 caracteres)" }] } };
  const s = resumirBateria([ok, ruim, { erro: "timeout" }]);
  assert.equal(s.aprovados, 1);
  assert.equal(s.falhas, 1);
  assert.equal(s.media, 66);
  assert.equal(s.comuns[0].vezes, 2); // números ignorados ao agrupar
});

test("casos da bateria: disciplinas e etapas variadas, códigos da etapa certa", () => {
  assert.ok(CASOS_BATERIA.length >= 20);
  assert.ok(new Set(CASOS_BATERIA.map((c) => c.disciplina)).size >= 8);
  for (const c of CASOS_BATERIA) assert.equal(c.bncc.startsWith("EM"), c.nivel === "Ensino Médio", c.bncc);
});

import { CASOS_BATERIA_2 } from "../lib/bateria.js";
import { conferirPedido } from "../lib/coerencia.js";
import { createRequire } from "node:module";
test("conjunto 2 da bateria: códigos existem na BNCC e combinam com disciplina, etapa e ano", () => {
  const bncc = new Set(createRequire(import.meta.url)("../data/bncc-habilidades.json").habilidades.map((h) => h.c));
  assert.ok(CASOS_BATERIA_2.length >= 15);
  for (const c of CASOS_BATERIA_2) {
    if (!c.bncc) continue; // casos sem BNCC de propósito
    assert.ok(bncc.has(c.bncc), c.bncc);
    assert.deepEqual(conferirPedido(c), [], `${c.bncc} ${c.disciplina} ${c.ano}`);
  }
});

test("auditoria pedagógica identifica rótulo incorreto, troca na subtração, totais divergentes e associação incompleta", () => {
  const material = {
    formulas: [{ nome: "Propriedade da Igualdade", expressao: "a + b = b + a", descricao: "A ordem dos números não altera a soma." }],
    dicas: ["Ao adicionar ou subtrair, experimente trocar a ordem dos números."],
    aplicacaoPratica: {
      situacao: "Encontrar combinações diferentes que resultem no mesmo total.",
      exemplos: ["Comprar 2 maçãs e 2 bananas por 10 reais.", "Comprar 4 maçãs e 1 banana por 11 reais."],
    },
    cena: { figura: { tipo: "tabela", cabecalho: ["Fruta", "Preço"], linhas: [["Maçã", "R$ 2"], ["Banana", "R$ 3"]] } },
    exercicios: [{
      tipo: "associar",
      enunciado: "Associe as expressões: 1, 2, 3 e A, B, C.",
      figura: { tipo: "tabela", cabecalho: ["Expressões"], linhas: [["1 + 9"], ["2 + 8"], ["5 + 5"]] },
    }],
  };
  const problemas = auditarInconsistenciasPedagogicas({ disciplina: "Matemática" }, material);
  assert.equal(problemas.length, 4);
  assert.match(problemas.map((p) => p.motivo).join("\n"), /propriedade comutativa da adição/);
  assert.match(problemas.map((p) => p.motivo).join("\n"), /essa operação não é comutativa/);
  assert.match(problemas.map((p) => p.motivo).join("\n"), /mesmo total/);
  assert.match(problemas.map((p) => p.motivo).join("\n"), /apenas uma coluna/);
  assert.ok(problemas.every((p) => p.fonte === "pedagógica" && ["erro", "aviso"].includes(p.gravidade)));
});

test("auditoria pedagógica não acusa regra correta, exemplos com totais iguais ou associação com duas colunas", () => {
  const material = {
    formulas: [{ nome: "Propriedade comutativa da adição", expressao: "a + b = b + a", descricao: "A ordem das parcelas pode ser trocada." }],
    dicas: ["Na subtração, não troque a ordem dos termos."],
    aplicacaoPratica: {
      situacao: "Compare combinações diferentes que resultem no mesmo total.",
      exemplos: ["Comprar 2 maçãs e 2 bananas por 10 reais.", "Comprar 5 maçãs por 10 reais."],
    },
    cena: { figura: { tipo: "tabela", cabecalho: ["Fruta", "Preço"], linhas: [["Maçã", "R$ 2"], ["Banana", "R$ 3"]] } },
    exercicios: [{
      tipo: "associar",
      enunciado: "Associe as expressões: 1, 2, 3 e A, B, C.",
      figura: { tipo: "tabela", cabecalho: ["Expressões", "Correspondência"], linhas: [["1 + 9", "A"], ["2 + 8", "B"], ["5 + 5", "C"]] },
    }],
  };
  assert.deepEqual(auditarInconsistenciasPedagogicas({ disciplina: "Matemática" }, material), []);
});

test("auditarMaterial inclui as novas verificações pedagógicas no resultado estruturado", () => {
  const material = {
    ...base(),
    formulas: [{ nome: "Propriedade da Igualdade", expressao: "a+b=b+a", descricao: "A ordem dos termos não altera a soma." }],
  };
  const auditoria = auditarMaterial(form, material, { semRevisor: true });
  assert.ok(auditoria.problemas.some((p) => p.fonte === "pedagógica" && /propriedade comutativa/.test(p.motivo)));
});
