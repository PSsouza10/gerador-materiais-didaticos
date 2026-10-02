// "Cena do cotidiano": situação-problema contada por personagens fixos do EduGera,
// com balões de fala. É o que abre o conteúdo em TODA disciplina e liga a
// apostila à ilustração: os personagens conversam sobre a figura do conteúdo
// (reta, fração, linha do tempo, ciclo...) que aparece no meio da cena.
// A IA só escreve o roteiro em JSON; o desenho é do próprio sistema
// (components/CenaCotidiano.jsx), igual em tela, impressão e PDF.

import { normalizarFigura } from "./figuras.js";

// Elenco fixo (personagens originais do EduGera)
export const PERSONAGENS = {
  lia: { nome: "Lia", papel: "estudante curiosa" },
  theo: { nome: "Théo", papel: "estudante que às vezes se confunde" },
  vo: { nome: "Vó Ana", papel: "avó que usa o assunto no dia a dia" },
  edu: { nome: "Prof. Edu", papel: "professor que faz perguntas e não entrega a resposta" },
};
export const IDS_PERSONAGENS = Object.keys(PERSONAGENS);

export const LUGARES = ["cozinha", "mercado", "escola", "parque", "casa", "rua", "feira", "laboratorio", "biblioteca", "quadra"];

const txt = (v, max) => (typeof v === "string" ? v.trim().slice(0, max) : "");

export function normalizarCena(c) {
  if (!c || typeof c !== "object") return null;
  const falas = (Array.isArray(c.falas) ? c.falas : [])
    .map((f) => ({ quem: IDS_PERSONAGENS.includes(f?.quem) ? f.quem : null, texto: txt(f?.texto, 220) }))
    .filter((f) => f.quem && f.texto)
    .slice(0, 6);
  if (falas.length < 2) return null;
  return {
    titulo: txt(c.titulo, 70),
    lugar: LUGARES.includes(c.lugar) ? c.lugar : "casa",
    falas,
    figura: normalizarFigura(c.figura),
    pergunta: txt(c.pergunta, 220),
  };
}

// Personagens que aparecem na cena, na ordem da primeira fala
export const elencoDaCena = (cena) => [...new Set((cena?.falas || []).map((f) => f.quem))];
