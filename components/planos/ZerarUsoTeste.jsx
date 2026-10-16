"use client";
import React, { useState } from "react";
import { RotateCcw, Loader2 } from "lucide-react";

// Botão do SITE DE TESTE: o administrador zera as próprias gerações do mês.
// Só aparece quando o servidor diz que é teste e a conta é de administrador.
export default function ZerarUsoTeste({ aoZerar, className = "" }) {
  const [estado, setEstado] = useState("pronto");
  const zerar = async () => {
    if (!window.confirm("Zerar todas as suas gerações deste mês no site de teste?")) return;
    setEstado("zerando");
    try {
      const r = await fetch("/api/uso/zerar", { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "erro");
      setEstado("zerado");
      if (aoZerar) aoZerar(j.uso);
      else window.location.reload();
    } catch {
      setEstado("erro");
    }
  };
  return (
    <span className={`inline-flex flex-wrap items-center gap-2 ${className}`}>
      <button type="button" onClick={zerar} disabled={estado === "zerando"} className="inline-flex items-center gap-1.5 rounded-lg border border-amber-300 bg-white px-3 py-1.5 text-[12.5px] font-bold text-amber-900 hover:bg-amber-50 disabled:opacity-60">
        {estado === "zerando" ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <RotateCcw className="h-3.5 w-3.5" />}
        Zerar minhas gerações (só no site de teste)
      </button>
      {estado === "zerado" && <span className="text-[12px] font-semibold text-emerald-700">Pronto: gerações zeradas.</span>}
      {estado === "erro" && <span className="text-[12px] font-semibold text-rose-700">Não foi possível zerar.</span>}
    </span>
  );
}
