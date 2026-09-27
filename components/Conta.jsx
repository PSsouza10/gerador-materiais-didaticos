"use client";
import React, { useEffect, useRef, useState } from "react";
import { signIn, signOut } from "next-auth/react";
import { LogIn, LogOut, ChevronDown, Infinity as Infinito } from "lucide-react";

// Medidor de gerações do mês
export function MedidorUso({ uso, compacto = false }) {
  if (!uso) return null;
  if (uso.limite === null)
    return (
      <span className="inline-flex items-center gap-1 rounded-full bg-emerald-50 px-2.5 py-1 text-[11.5px] font-bold text-emerald-800">
        <Infinito className="h-3.5 w-3.5" /> Gerações ilimitadas
      </span>
    );
  const pct = uso.limite ? Math.min(100, (uso.usados / uso.limite) * 100) : 100;
  return (
    <span className="inline-flex items-center gap-2 text-[11.5px] font-semibold text-slate-700" title="Gerações do plano grátis neste mês">
      {!compacto && (
        <span className="h-1.5 w-16 overflow-hidden rounded-full bg-slate-200" aria-hidden="true">
          <span className={`block h-full ${uso.restantes === 0 ? "bg-rose-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
        </span>
      )}
      {uso.usados} de {uso.limite} gerações este mês
    </span>
  );
}

// Botão Entrar / menu da conta
export default function Conta({ sessao, status, uso, authConfigurado }) {
  const [aberto, setAberto] = useState(false);
  const ref = useRef(null);
  useEffect(() => {
    const fora = (e) => ref.current && !ref.current.contains(e.target) && setAberto(false);
    document.addEventListener("mousedown", fora);
    return () => document.removeEventListener("mousedown", fora);
  }, []);

  if (authConfigurado === false) return null;
  if (status === "loading") return <span className="h-9 w-28 animate-pulse rounded-full bg-slate-100" aria-hidden="true" />;

  if (!sessao?.user) {
    return (
      <button
        onClick={() => signIn("google")}
        className="flex items-center gap-2 rounded-full bg-white px-4 py-2 text-sm font-bold text-indigo-700 shadow-sm ring-1 ring-indigo-200 hover:bg-indigo-50"
      >
        <LogIn className="h-4 w-4" /> Entrar com Google
      </button>
    );
  }

  const u = sessao.user;
  return (
    <div ref={ref} className="relative">
      <button
        onClick={() => setAberto((a) => !a)}
        aria-expanded={aberto}
        aria-haspopup="menu"
        className="flex items-center gap-2 rounded-full bg-white py-1.5 pl-1.5 pr-3 shadow-sm ring-1 ring-slate-200 hover:ring-indigo-200"
      >
        {u.image ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={u.image} alt="" referrerPolicy="no-referrer" className="h-7 w-7 rounded-full" />
        ) : (
          <span className="flex h-7 w-7 items-center justify-center rounded-full bg-indigo-100 text-sm font-bold text-indigo-700">
            {(u.name || u.email || "?")[0].toUpperCase()}
          </span>
        )}
        <span className="hidden max-w-[140px] truncate text-sm font-semibold text-slate-700 sm:inline">{u.name || u.email}</span>
        <ChevronDown className="h-4 w-4 text-slate-500" />
      </button>
      {aberto && (
        <div role="menu" className="absolute right-0 z-40 mt-2 w-64 rounded-2xl border border-slate-100 bg-white p-3 shadow-xl">
          <p className="truncate text-sm font-bold text-slate-800">{u.name}</p>
          <p className="truncate text-xs text-slate-600">{u.email}</p>
          <div className="mt-3 rounded-xl bg-slate-50 p-2.5">
            <p className="mb-1 text-[11px] font-bold uppercase tracking-wider text-slate-500">Plano grátis</p>
            <MedidorUso uso={uso} />
          </div>
          <button
            role="menuitem"
            onClick={() => signOut()}
            className="mt-3 flex w-full items-center gap-2 rounded-xl px-2.5 py-2 text-sm font-semibold text-slate-700 hover:bg-slate-50"
          >
            <LogOut className="h-4 w-4" /> Sair
          </button>
        </div>
      )}
    </div>
  );
}
