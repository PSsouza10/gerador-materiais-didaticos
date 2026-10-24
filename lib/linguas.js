// Regras para disciplinas de língua estrangeira que ainda não têm regra própria no pedido à IA.
// Língua Espanhola: explicação em português, a língua-alvo aparece nos exemplos, falas e exercícios.
export const ehEspanhol = (disciplina = "") => /espanhol|espa[nñ]ola|spanish/i.test(String(disciplina));

export function regraLinguaEstrangeira(disciplina = "") {
  if (!ehEspanhol(disciplina)) return "";
  return `
- LÍNGUA ESPANHOLA: explicações, conceitos, dicas e enunciados em português do Brasil; o espanhol aparece nos exemplos, nas regras (com exemplo real em espanhol), em parte das falas dos personagens e nos exercícios que avaliam o uso da língua. Toda frase em espanhol vem correta, com acentos e sinais de abertura (¿ ?, ¡ !), no nível do ano (vocabulário do cotidiano).
- Trabalhe os falsos cognatos e as diferenças com o português quando fizer sentido (ex.: "exquisito" = delicioso; "embarazada" = grávida), sem estereótipos de países ou povos hispânicos.
- Em "formulas", use estruturas reais da língua (ex.: "Ser + adjetivo para características: Ella es alta."). Nada de pseudofórmulas.`;
}
