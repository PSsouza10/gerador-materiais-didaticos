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

export const ESTILOS = ["3D colorido", "Isométrico", "Vetor Ilustrado", "Realista"];

// Materiais e preferências antigos guardavam "3D Pixar/Disney": vira "3D colorido"
export const normalizarEstilo = (e) => (ESTILOS.includes(e) ? e : e === "3D Pixar/Disney" ? "3D colorido" : ESTILOS[0]);

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
