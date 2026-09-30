import React from "react";
import { partesComExpoentes } from "@/lib/expoentes";

// Texto pedagógico com potências formatadas (3^4 → 3⁴)
export default function Tx({ children }) {
  if (typeof children !== "string") return children ?? null;
  const partes = partesComExpoentes(children);
  if (partes.length === 1 && partes[0].tipo === "texto") return partes[0].valor;
  return partes.map((p, i) =>
    p.tipo === "sup" ? (
      <sup key={i} className="text-[0.7em]">
        {p.valor}
      </sup>
    ) : (
      <React.Fragment key={i}>{p.valor}</React.Fragment>
    )
  );
}
