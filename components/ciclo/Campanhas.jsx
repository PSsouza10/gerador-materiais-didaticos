"use client";
import React, { useEffect, useState } from "react";
import { Loader2 } from "lucide-react";

const campo = "rounded-xl border border-slate-200 px-3 py-2 text-sm focus:border-indigo-400 focus:outline-none";
const botao = "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60";
const data = (iso) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
const daquiA = (dias) => new Date(Date.now() + dias * 864e5).toISOString().slice(0, 10);

// Administrador: links de campanha (edugera.app/convite/<CÓDIGO>) com dias de Pro grátis
export default function Campanhas() {
  const [lista, setLista] = useState(null);
  const [f, setF] = useState({ codigo: "INSTA60", dias: 60, limite: 200, fim: daquiA(30) });
  const [msg, setMsg] = useState("");
  const [enviando, setEnviando] = useState(false);
  const origem = typeof window !== "undefined" ? window.location.origin : "";

  const pedir = async (corpo) => {
    setEnviando(true);
    setMsg("");
    try {
      const r = await fetch("/api/admin/campanhas", corpo ? { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) } : { cache: "no-store" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Erro ${r.status}.`);
      setLista(j.campanhas || []);
      if (corpo && !corpo.acao) setMsg(`Campanha ${j.codigo} criada. Link: ${origem}/convite/${j.codigo}`);
    } catch (e) {
      setMsg(e.message);
    } finally {
      setEnviando(false);
    }
  };
  useEffect(() => {
    pedir();
  }, []);

  return (
    <div className="mt-6 rounded-2xl border border-slate-200 p-4">
      <h2 className="font-bold text-slate-900">Campanhas de divulgação (link com dias de Pro grátis)</h2>
      <p className="mt-1 text-[13px] text-slate-600">
        Quem abre o link e entra com o Google ganha os dias de Pro, sem cobrança. Uma campanha por conta; quem já paga o Pro não usa. O link pode ser repassado: o limite de contas e a
        data de fim seguram o custo.
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-4">
        <label className="text-[12px] font-bold text-slate-600">
          Código
          <input className={`${campo} mt-1 w-full uppercase`} value={f.codigo} maxLength={20} onChange={(e) => setF({ ...f, codigo: e.target.value })} />
        </label>
        <label className="text-[12px] font-bold text-slate-600">
          Dias de Pro
          <input type="number" min={1} max={366} className={`${campo} mt-1 w-full`} value={f.dias} onChange={(e) => setF({ ...f, dias: e.target.value })} />
        </label>
        <label className="text-[12px] font-bold text-slate-600">
          Limite de contas
          <input type="number" min={1} className={`${campo} mt-1 w-full`} value={f.limite} onChange={(e) => setF({ ...f, limite: e.target.value })} />
        </label>
        <label className="text-[12px] font-bold text-slate-600">
          Ativar até
          <input type="date" className={`${campo} mt-1 w-full`} value={f.fim} onChange={(e) => setF({ ...f, fim: e.target.value })} />
        </label>
      </div>
      <button type="button" className={`${botao} mt-3`} disabled={enviando} onClick={() => pedir({ ...f, dias: Number(f.dias), limite: Number(f.limite) })}>
        {enviando && <Loader2 className="h-4 w-4 animate-spin" />} Criar campanha
      </button>
      {msg && <p className="mt-2 break-all text-sm font-semibold text-slate-800">{msg}</p>}
      {lista && lista.length > 0 && (
        <table className="mt-4 w-full text-[13px]">
          <thead className="text-left text-[12px] text-slate-500">
            <tr>
              <th className="py-1">Link</th>
              <th>Dias</th>
              <th>Usadas</th>
              <th>Até</th>
              <th />
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-100">
            {lista.map((c) => (
              <tr key={c.codigo} className={c.ativa ? "" : "text-slate-400"}>
                <td className="py-1.5 font-mono">/convite/{c.codigo}</td>
                <td>{c.dias}</td>
                <td>
                  {c.resgates} de {c.limite}
                </td>
                <td>{data(c.fim)}</td>
                <td className="text-right">
                  <button type="button" className="rounded-lg border border-slate-200 px-2 py-1 text-[12px] font-semibold" onClick={() => pedir({ acao: "ativa", codigo: c.codigo, ativa: !c.ativa })}>
                    {c.ativa ? "Encerrar" : "Reabrir"}
                  </button>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      )}
    </div>
  );
}
