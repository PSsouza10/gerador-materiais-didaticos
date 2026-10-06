import React from "react";
import { Rosto } from "@/components/CenaCotidiano";

// Ilustração da capa quando NÃO há imagem de IA (sem crédito na OpenAI, falha ou
// capa sem ilustração): a turma do EduGera diante de uma lousa com o tema escrito.
// Desenhada pelo próprio sistema (SVG/HTML), igual na tela, na impressão e no PDF.

const curto = (t = "", max = 42) => {
  const s = String(t).replace(/\s+/g, " ").trim();
  if (s.length <= max) return s;
  const corte = s.slice(0, max);
  return `${corte.slice(0, Math.max(corte.lastIndexOf(" "), 20))}…`;
};

export default function TurmaEduGera({ tema = "", lado = 320, escuro = false }) {
  const texto = curto(tema);
  const rosto = Math.round(lado * 0.22);
  const fonte = texto.length <= 16 ? lado * 0.11 : texto.length <= 28 ? lado * 0.085 : lado * 0.07;
  return (
    <div
      className="relative h-full w-full overflow-hidden"
      role="img"
      aria-label={`Lia, Prof. Edu, Vó Ana e Théo diante da lousa${texto ? `: ${texto}` : ""}`}
      style={{ background: escuro ? "linear-gradient(180deg,#26262c,#1b1b1e)" : "linear-gradient(180deg,#eef2ff 0%,#f5f3ff 60%,#ede9fe 100%)" }}
    >
      {/* lousa */}
      <div
        className="absolute left-[7%] right-[7%] flex items-center justify-center text-center"
        style={{
          top: "8%",
          height: "50%",
          background: "#235c4a",
          border: `${Math.max(6, Math.round(lado * 0.03))}px solid #b7834f`,
          borderRadius: Math.round(lado * 0.05),
          boxShadow: "0 8px 0 #8a5d33",
        }}
      >
        <span
          className="px-[8%] font-black leading-tight"
          style={{ color: "#f8fafc", fontSize: Math.round(fonte), letterSpacing: 0.3, textShadow: "0 0 1px rgba(255,255,255,.6)" }}
        >
          {texto || "Vamos estudar!"}
        </span>
        {/* giz e apagador */}
        <span className="absolute rounded-sm" style={{ bottom: -Math.round(lado * 0.045), left: "18%", width: lado * 0.1, height: lado * 0.025, background: "#f8fafc" }} />
        <span className="absolute rounded-sm" style={{ bottom: -Math.round(lado * 0.05), right: "16%", width: lado * 0.16, height: lado * 0.04, background: "#334155" }} />
      </div>
      {/* turma */}
      <div className="absolute inset-x-0 flex justify-center" style={{ bottom: "6%" }}>
        {["lia", "edu", "vo", "theo"].map((q, i) => (
          <div
            key={q}
            className="rounded-full"
            style={{ padding: 3, background: escuro ? "#3f3f46" : "#ffffff", marginLeft: i ? -rosto * 0.12 : 0, marginBottom: i % 2 ? 0 : rosto * 0.12, boxShadow: "0 6px 14px -6px rgba(30,27,75,.35)" }}
          >
            <Rosto quem={q} tamanho={i === 1 ? Math.round(rosto * 1.12) : rosto} />
          </div>
        ))}
      </div>
    </div>
  );
}
