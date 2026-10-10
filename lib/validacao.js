// Limites de entrada (auditoria pública, P3): evitam abuso e custo de IA.
// Usados no formulário (maxLength) e conferidos de novo no servidor.
export const LIMITES = {
  professor: 120,
  escola: 120,
  tema: 200,
  conteudo: 2000,
  habilidade: 2000, // a maior habilidade oficial tem ~1500 caracteres
  bncc: 20,
  ano: 6,
  turma: 60,
};

const ROTULOS = {
  professor: "Identificação do Professor",
  escola: "Escola",
  tema: "Tema Principal",
  conteudo: "Conteúdo ou Orientação",
  habilidade: "Habilidade da BNCC",
  bncc: "Código BNCC",
  ano: "Ano / Série",
  turma: "Turma",
};

// Remove caracteres de controle (menos quebra de linha e tab) e apara espaços.
export const limparTexto = (v) =>
  typeof v === "string" ? v.replace(/[\u0000-\u0008\u000B\u000C\u000E-\u001F\u007F]/g, "").trim() : "";

// Devolve { ok, erro, dados } com os campos limpos, ou a primeira mensagem de erro.
// Quantidade de exercícios que o professor pode pedir (custo de texto é pequeno;
// a ilustração é o que pesa e continua sendo uma só)
export const QUANTIDADES = [5, 8, 10];

export function validarPedido(body = {}) {
  const dados = {};
  for (const [campo, max] of Object.entries(LIMITES)) {
    const v = limparTexto(body[campo]);
    if (v.length > max) return { ok: false, erro: `O campo "${ROTULOS[campo]}" passou do limite de ${max} caracteres.` };
    dados[campo] = v;
  }
  dados.disciplina = limparTexto(body.disciplina).slice(0, 60);
  dados.nivel = limparTexto(body.nivel).slice(0, 60);
  dados.dificuldade = limparTexto(body.dificuldade).slice(0, 20);
  dados.questoes = QUANTIDADES.includes(Number(body.questoes)) ? Number(body.questoes) : QUANTIDADES[0];
  if (!dados.disciplina || !dados.nivel || !dados.tema) {
    return { ok: false, erro: "Disciplina, Nível de Ensino e Tema Principal são obrigatórios." };
  }
  if (dados.tema.length < 3) return { ok: false, erro: "Escreva um tema com pelo menos 3 caracteres." };
  return { ok: true, dados };
}
