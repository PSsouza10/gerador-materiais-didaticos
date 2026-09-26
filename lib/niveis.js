// Task 3.2 — Níveis de dificuldade / adaptação.
// Compartilhado entre o formulário (rótulos) e a rota de IA (instruções do prompt).

export const NIVEIS_DIFICULDADE = [
  {
    id: "adaptado",
    rotulo: "Acompanhamento / Adaptado",
    curto: "Adaptado",
    descricao: "Linguagem simples, passo a passo, apoio visual e questões diretas.",
    prompt: `NÍVEL: ACOMPANHAMENTO / ADAPTADO (estudantes que precisam de apoio, em recomposição de aprendizagem ou com adaptação curricular).
- Use frases curtas, na ordem direta, com vocabulário concreto e do cotidiano. Evite dupla negação e termos técnicos sem explicação.
- Explique cada conceito com um exemplo concreto logo em seguida.
- Fórmulas/regras devem vir acompanhadas de um exemplo numérico simples, com números pequenos e inteiros sempre que possível.
- Dicas em formato de passo a passo (1º, 2º, 3º...).
- Exercícios com UMA etapa de raciocínio cada, enunciado curto, destacando a pergunta; prefira contextos familiares ao aluno.
- Mantenha a habilidade da BNCC: simplifique o caminho, não o objetivo de aprendizagem.`,
  },
  {
    id: "padrao",
    rotulo: "Padrão",
    curto: "Padrão",
    descricao: "Adequado à série/ano, conforme a habilidade da BNCC.",
    prompt: `NÍVEL: PADRÃO.
- Linguagem e complexidade adequadas ao ano/série e à habilidade da BNCC informada.
- Exercícios variados: aplicação direta e problemas contextualizados de duas etapas.`,
  },
  {
    id: "desafio",
    rotulo: "Desafio",
    curto: "Desafio",
    descricao: "Aprofundamento, problemas de várias etapas e generalização.",
    prompt: `NÍVEL: DESAFIO (aprofundamento para estudantes que já dominam o básico).
- Use o vocabulário técnico correto da disciplina, com precisão.
- Inclua ao menos uma fórmula/regra de generalização ou propriedade menos óbvia.
- Exercícios de múltiplas etapas, com análise, justificativa, comparação de estratégias ou elaboração de problemas (verbos: analisar, justificar, generalizar, elaborar).
- Estabeleça pelo menos uma conexão com outra área do conhecimento ou com situação-problema aberta.`,
  },
];

export const NIVEL_PADRAO = "padrao";

export function obterNivel(id) {
  return NIVEIS_DIFICULDADE.find((n) => n.id === id) || NIVEIS_DIFICULDADE[1];
}
