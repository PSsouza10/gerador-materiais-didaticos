import React from "react";

// Componente-base das etiquetas (EXEMPLO, disciplina, etapa, nível) — tela, PDF e impressão.
// Altura fixa e line-height igual à altura: o texto fica centrado também no
// html2canvas (que desloca o texto em cápsulas com padding vertical + flex).
// "espacado" compensa o letter-spacing do fim da palavra, que descentralizava EXEMPLO.
export default function Chip({ icone: Icone, children, className = "", altura = 24, forma = "pilula", espacado = false }) {
  return (
    <span
      className={`inline-flex flex-none items-center justify-center gap-1.5 whitespace-nowrap px-3 align-middle ${
        forma === "etiqueta" ? "rounded-md" : "rounded-full"
      } ${className}`}
      style={{ height: altura, boxSizing: "border-box" }}
    >
      {Icone && (
        <span className="inline-flex flex-none items-center justify-center" style={{ height: altura }} aria-hidden="true">
          <Icone className="h-3.5 w-3.5" />
        </span>
      )}
      <span
        className={`chip-texto ${espacado ? "tracking-widest" : ""}`}
        style={{ display: "block", height: altura, lineHeight: `${altura}px`, marginRight: espacado ? "-0.1em" : undefined }}
      >
        {children}
      </span>
    </span>
  );
}
