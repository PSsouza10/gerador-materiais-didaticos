import test from "node:test";
import assert from "node:assert/strict";
import { normalizarApontamentos, aplicarRevisao, problemasDoRevisor, promptRevisor } from "../lib/revisorConteudo.js";
import { auditarMaterial } from "../lib/auditoria.js";

const material = {
  tituloDidatico: "Verbos",
  resumoPedagogico: "Verbo indica ação.",
  conceitos: [{ termo: "Verbo", definicao: "palavra que indica ação" }],
  formulas: [{ nome: "Conjugação", expressao: "Eu + verbo + o/a/e", descricao: "presente" }],
  exercicios: [
    { enunciado: "Identifique o modo de 'Lave as mãos'.", resposta: "c) Imperativo" },
    { enunciado: "Complete: Se você ____ (estuda/estudar).", resposta: "estudar", fala: { quem: "edu", texto: "Se você estudar…" } },
  ],
};

test("prompt do revisor leva disciplina, ano, habilidade e a apostila", () => {
  const p = promptRevisor({ disciplina: "Português", nivel: "Ensino Fundamental", ano: "6", tema: "Verbos" }, material, "EF06LP04 — Analisar…");
  assert.match(p, /professor\(a\) experiente de Português/);
  assert.match(p, /6º ano/);
  assert.match(p, /EF06LP04/);
  assert.match(p, /Eu \+ verbo \+ o\/a\/e/);
});

test("normaliza: descarta exercício inexistente, lugar desconhecido vira geral, sem repetidos", () => {
  const a = normalizarApontamentos(
    {
      apontamentos: [
        { onde: "formulas", gravidade: "erro", problema: "Regra inventada.", sugestao: "Use -o na 1ª pessoa." },
        { onde: "exercicio", numero: 2, gravidade: "erro", problema: "A fala entrega a resposta." },
        { onde: "exercicio", numero: 2, gravidade: "erro", problema: "A fala entrega a resposta." },
        { onde: "exercicio", numero: 9, problema: "Não existe." },
        { onde: "xyz", problema: "Falta imperativo negativo." },
        { onde: "resumo", problema: "" },
      ],
    },
    2
  );
  assert.equal(a.length, 3);
  assert.deepEqual(a.map((x) => x.lugar), ["formulas", "exercicio", "geral"]);
  assert.equal(a[2].gravidade, "aviso");
  assert.deepEqual(normalizarApontamentos(null, 2), []);
});

test("aplica: apontamento fica grudado no exercício e entra na auditoria", () => {
  const ap = normalizarApontamentos({ apontamentos: [{ onde: "exercicio", numero: 2, gravidade: "erro", problema: "A fala entrega a resposta.", sugestao: "Troque a fala." }, { onde: "formulas", problema: "Regra inventada." }] }, 2);
  const m = aplicarRevisao(material, ap, material.exercicios.map((e) => e.enunciado));
  assert.equal(m.revisaoConteudo.total, 2);
  assert.equal(m.exercicios[0].revisor, undefined);
  assert.match(m.exercicios[1].revisor[0].motivo, /Sugestão: Troque a fala/);
  assert.equal(m.revisorGeral[0].onde, "Fórmulas e regras");
  const probs = problemasDoRevisor(m);
  assert.ok(probs.some((p) => p.onde === "Exercício 2" && p.gravidade === "erro"));
  assert.ok(auditarMaterial({}, m).problemas.some((p) => p.fonte === "revisor" && p.onde === "Exercício 2"));
});

test("professor removeu o exercício 1 enquanto o revisor lia: apontamento segue o exercício certo", () => {
  const enunciados = material.exercicios.map((e) => e.enunciado);
  const ap = normalizarApontamentos({ apontamentos: [{ onde: "exercicio", numero: 2, problema: "A fala entrega a resposta." }, { onde: "exercicio", numero: 1, problema: "Algo." }] }, 2);
  const depois = { ...material, exercicios: [material.exercicios[1]] };
  const m = aplicarRevisao(depois, ap, enunciados);
  assert.equal(m.exercicios.length, 1);
  assert.equal(m.exercicios[0].revisor.length, 1);
  assert.match(m.exercicios[0].revisor[0].motivo, /fala/);
});

test("resposta atrasada de outra apostila é ignorada", () => {
  const outra = { exercicios: [{ enunciado: "Quanto é 2 + 2?" }] };
  const ap = normalizarApontamentos({ apontamentos: [{ onde: "geral", problema: "X." }] }, 1);
  assert.equal(aplicarRevisao(outra, ap, ["Enunciado antigo"]), outra);
});

import { tabelaJaPreenchida } from "../lib/qualidade.js";
test("tabela de 'preencha' que já vem com as respostas é apontada", () => {
  const cheia = { enunciado: "Preencha a tabela com o modo correto.", figura: { tipo: "tabela", cabecalho: ["Frase", "Modo"], linhas: [["Estude.", "Imperativo"], ["Nós vamos.", "Indicativo"]] } };
  const vazia = { ...cheia, figura: { ...cheia.figura, linhas: [["Estude.", "____"], ["Nós vamos.", ""]] } };
  assert.equal(tabelaJaPreenchida(cheia), true);
  assert.equal(tabelaJaPreenchida(vazia), false);
  assert.equal(tabelaJaPreenchida({ ...cheia, enunciado: "Observe a tabela e responda." }), false);
});

import { falaEntregaResposta } from "../lib/qualidade.js";
test("alarmes falsos da bateria: lacuna na frase com tabela de dados; palavra que já está no enunciado", () => {
  assert.equal(tabelaJaPreenchida({ enunciado: "Complete: A cidade tem mais ____ e ____ em comparação ao campo.", figura: { tipo: "tabela", linhas: [["Agricultura", "Indústria"]] } }), false);
  assert.equal(tabelaJaPreenchida({ enunciado: "Complete a tabela com frações de 1/2 e 1/3.", figura: { tipo: "tabela", linhas: [["1/2", "2"]] } }), true);
  assert.equal(falaEntregaResposta({ fala: { texto: "Lia, como você escreve 'cachorro' em letra de imprensa?" }, enunciado: "Escreva a palavra 'cachorro' em letra de imprensa.", resposta: "cachorro. Letras separadas." }), false);
});

test("alarmes falsos reais do revisor (bateria 05/10) são descartados; erros reais ficam", () => {
  const exercicios = [{ tipo: "aberta" }, { tipo: "multipla_escolha", alternativas: ["a) 1", "b) 2"] }, { tipo: "completar" }, { tipo: "explicar" }];
  const ap = normalizarApontamentos(
    {
      apontamentos: [
        { onde: "exercicio", numero: 1, gravidade: "erro", problema: "O exercício não apresenta alternativas para escolha.", sugestao: "Incluir alternativas para que o aluno escolha a correta." },
        { onde: "exercicio", numero: 3, problema: "Falta de alternativas para escolha.", sugestao: "Incluir alternativas." },
        { onde: "exercicio", numero: 4, gravidade: "erro", problema: "A resposta está repetida.", sugestao: "Remover a repetição na resposta." },
        { onde: "figura", problema: "A figura do conteúdo não tem legenda.", sugestao: "Adicionar uma legenda explicativa." },
        { onde: "geral", problema: "Faltam alternativas para a pergunta.", sugestao: "Adicionar alternativas." },
        { onde: "exercicio", numero: 2, gravidade: "erro", problema: "Só há 2 alternativas; falta a alternativa correta.", sugestao: "Incluir a alternativa correta 136,36." },
        { onde: "exercicio", numero: 4, gravidade: "erro", problema: "A descrição da pirâmide etária está incorreta: base larga indica população jovem.", sugestao: "Corrigir." },
      ],
    },
    exercicios
  );
  assert.deepEqual(ap.map((a) => a.numero), [2, 4]);
  assert.match(ap[1].problema, /pirâmide/);
});
