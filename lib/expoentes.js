// Potências escritas como 3^4, 10^-27, (2^3)^2, a^(m+n) viram expoentes de verdade.
// Quando dá, usa caracteres sobrescritos Unicode (3⁴, 10⁻²⁷): aparecem iguais na
// tela, na impressão e no PDF, e continuam pesquisáveis. O que não tem sobrescrito
// Unicode (ex.: m×n) sai como <sup>.
const SOBRESCRITO = {
  0: "⁰", 1: "¹", 2: "²", 3: "³", 4: "⁴", 5: "⁵", 6: "⁶", 7: "⁷", 8: "⁸", 9: "⁹",
  "-": "⁻", "−": "⁻", "+": "⁺", "(": "⁽", ")": "⁾", n: "ⁿ", i: "ⁱ", x: "ˣ",
};
const POTENCIA = /\^(\((?:[^()]|\([^()]*\))*\)|[-−+]?[0-9A-Za-z]+(?:[.,][0-9]+)?)/g;

// Devolve partes { tipo: "texto" | "sup", valor }
export function partesComExpoentes(texto) {
  const s = String(texto ?? "");
  const partes = [];
  let ultimo = 0;
  let textoAcumulado = "";
  for (const m of s.matchAll(POTENCIA)) {
    textoAcumulado += s.slice(ultimo, m.index);
    let exp = m[1];
    if (exp.startsWith("(") && exp.endsWith(")")) exp = exp.slice(1, -1);
    if ([...exp].every((c) => SOBRESCRITO[c])) {
      textoAcumulado += [...exp].map((c) => SOBRESCRITO[c]).join("");
    } else {
      if (textoAcumulado) partes.push({ tipo: "texto", valor: textoAcumulado });
      textoAcumulado = "";
      partes.push({ tipo: "sup", valor: exp });
    }
    ultimo = m.index + m[0].length;
  }
  textoAcumulado += s.slice(ultimo);
  if (textoAcumulado) partes.push({ tipo: "texto", valor: textoAcumulado });
  return partes;
}

// Versão só-texto (Unicode quando possível; senão mantém ^( ))
export function textoComExpoentes(texto) {
  return partesComExpoentes(texto)
    .map((p) => (p.tipo === "sup" ? `^(${p.valor})` : p.valor))
    .join("");
}
