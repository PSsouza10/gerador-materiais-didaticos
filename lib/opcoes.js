// Opções compartilhadas entre o formulário e as Configurações.

export const DISCIPLINAS = [
  "Matemática",
  "Informática",
  "Português",
  "Ciências",
  "História",
  "Geografia",
  "Arte",
  "Educação Física",
  "Língua Inglesa",
  "Ensino Religioso",
];

export const NIVEIS = ["Ensino Fundamental", "Ensino Médio", "EJA", "Concurso", "Curso Livre"];

export const ESTILOS = ["3D Pixar/Disney", "Isométrico", "Vetor Ilustrado", "Realista"];

export const CAPAS = [
  { id: "escolar", rotulo: "Capa escolar (clara)" },
  { id: "comfy", rotulo: "Capa ComfyUI (escura)" },
  { id: "nenhuma", rotulo: "Sem capa" },
];

// Aceita o formato antigo (true/false) de materiais já compartilhados
export function normalizarCapa(v) {
  if (CAPAS.some((c) => c.id === v)) return v;
  if (v === true) return "comfy";
  return "nenhuma";
}
