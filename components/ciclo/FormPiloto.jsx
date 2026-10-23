"use client";
import React, { useState } from "react";
import { Loader2 } from "lucide-react";

const campo = "w-full rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-roxo/60 focus:outline-none";
const botao = "inline-flex items-center gap-2 rounded-xl bg-roxo px-4 py-2 text-sm font-semibold text-white hover:bg-roxo-escuro disabled:opacity-60";

function Bloco({ titulo, ajuda, acao, extra }) {
  const [emails, setEmails] = useState("");
  const [dias, setDias] = useState(60);
  const [enviando, setEnviando] = useState(false);
  const [msg, setMsg] = useState("");
  async function enviar(desmarcar = false) {
    setEnviando(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/piloto", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ acao, emails, dias: Number(dias), desmarcar }) });
      const j = await r.json().catch(() => ({}));
      setMsg(r.ok ? j.feitos.join(" ") : j.error || `Erro ${r.status}.`);
      if (r.ok) setEmails("");
    } catch {
      setMsg("Sem conexão com o servidor.");
    } finally {
      setEnviando(false);
    }
  }
  return (
    <div className="mt-6 rounded-2xl border border-slate-200 p-4">
      <h2 className="font-bold text-slate-900">{titulo}</h2>
      <p className="mt-1 text-[13px] text-slate-600">{ajuda}</p>
      <textarea className={`${campo} mt-3 min-h-[80px]`} value={emails} onChange={(e) => setEmails(e.target.value)} placeholder="um e-mail por linha" aria-label={`E-mails: ${titulo}`} />
      {extra && (
        <label className="mt-2 flex items-center gap-2 text-sm text-slate-700">
          Dias de Pro: <input type="number" min={1} max={366} className={`${campo} w-24`} value={dias} onChange={(e) => setDias(e.target.value)} />
        </label>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        <button type="button" className={botao} disabled={enviando || !emails.trim()} onClick={() => enviar(false)}>
          {enviando && <Loader2 className="h-4 w-4 animate-spin" />} {acao === "pro" ? "Liberar Pro" : "Marcar como coordenador(a)"}
        </button>
        {acao === "coordenador" && (
          <button type="button" className="rounded-xl border border-slate-200 px-4 py-2 text-sm font-semibold text-slate-700" disabled={enviando || !emails.trim()} onClick={() => enviar(true)}>
            Desmarcar
          </button>
        )}
      </div>
      {msg && <p className="mt-2 text-sm font-semibold text-slate-800">{msg}</p>}
    </div>
  );
}

export default function FormPiloto() {
  return (
    <>
      <Bloco titulo="Coordenação" acao="coordenador" ajuda="Quem pode distribuir cadernos e ver o painel dos próprios cadernos. Administradores já podem." />
      <Bloco titulo="Professores do piloto (Pro sem cobrança)" acao="pro" extra ajuda="Libera o Pro por N dias (padrão 60). Não mexe em quem já paga: ao fim do prazo, a conta volta ao plano que tinha." />
    </>
  );
}
