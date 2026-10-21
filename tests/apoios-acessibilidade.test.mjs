import { test } from "node:test";
import assert from "node:assert/strict";
import {
  APOIOS_ACESSIBILIDADE,
  auditarApoiosAcessibilidade,
  montarPromptApoiosAcessibilidade,
  normalizarApoiosAcessibilidade,
  promptImagemAcessibilidade,
} from "../lib/apoiosAcessibilidade.js";
import { validarPedido } from "../lib/validacao.js";

const base = { disciplina: "Matemática", nivel: "Ensino Fundamental", tema: "Frações" };

test("apoios opcionais aceitam somente opções conhecidas, sem duplicação", () => {
  assert.deepEqual(normalizarApoiosAcessibilidade(undefined), []);
  assert.deepEqual(normalizarApoiosAcessibilidade("etapas-curtas"), []);
  assert.deepEqual(
    normalizarApoiosAcessibilidade(["etapas-curtas", "desconhecido", "etapas-curtas", 4, "linguagem-direta"]),
    ["linguagem-direta", "etapas-curtas"]
  );
  assert.equal(APOIOS_ACESSIBILIDADE.length, 4);
});

test("validação do pedido normaliza apoios e mantém payloads legados válidos", () => {
  assert.deepEqual(validarPedido(base).dados.apoiosAcessibilidade, []);
  assert.deepEqual(
    validarPedido({ ...base, apoiosAcessibilidade: ["exemplo-guiado", "inventado"] }).dados.apoiosAcessibilidade,
    ["exemplo-guiado"]
  );
});

test("prompt fica vazio sem seleção e só inclui as instruções autorizadas", () => {
  assert.equal(montarPromptApoiosAcessibilidade([]), "");
  const prompt = montarPromptApoiosAcessibilidade(["linguagem-direta"]);
  assert.match(prompt, /frases curtas/);
  assert.doesNotMatch(prompt, /exemploGuiado/);
  assert.match(prompt, /Não infira diagnóstico/);
});

test("ilustração simples altera a direção do mesmo pedido de imagem, sem pedir outra geração", () => {
  assert.equal(promptImagemAcessibilidade([]), "");
  assert.match(promptImagemAcessibilidade(["ilustracao-simples"]), /poucos elementos relevantes/);
});

test("auditoria estrutural do exemplo guiado é determinística e não bloqueia outros apoios", () => {
  assert.deepEqual(auditarApoiosAcessibilidade([], {}), []);
  assert.deepEqual(auditarApoiosAcessibilidade(["linguagem-direta"], {}), []);
  assert.equal(auditarApoiosAcessibilidade(["exemplo-guiado"], {}).length, 1);
  assert.deepEqual(
    auditarApoiosAcessibilidade(["exemplo-guiado"], {
      exemploGuiado: { titulo: "Comparando frações", passos: ["Identifique os denominadores.", "Compare as partes."] },
    }),
    []
  );
});
