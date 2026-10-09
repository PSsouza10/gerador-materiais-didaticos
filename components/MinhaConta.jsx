"use client";
import React, { useEffect, useState } from "react";
import { signOut } from "next-auth/react";
import { UserCircle, Trash2, Check, Save } from "lucide-react";
import { DISCIPLINAS } from "@/lib/opcoes";

// Fase 1 — perfil da conta (quando há banco) e exclusão da conta com tudo dela.
// Fica dentro do <form> das Configurações: por isso nada aqui é type="submit".
export default function MinhaConta() {
  const [estado, setEstado] = useState(null); // null = carregando / sem login
  const [perfil, setPerfil] = useState({ nomeExibicao: "", escola: "", disciplinas: [] });
  const [salvo, setSalvo] = useState(false);
  const [confirmar, setConfirmar] = useState("");
  const [apagando, setApagando] = useState(false);
  const [erro, setErro] = useState("");
  const [feito, setFeito] = useState("");

  useEffect(() => {
    let vivo = true;
    fetch("/api/conta", { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((d) => {
        if (!vivo || !d) return;
        setEstado({ banco: d.banco });
        if (d.perfil) setPerfil(d.perfil);
      })
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, []);

  // sem login, ou sem banco (site real até a Parte B): nada de perfil nem de exclusão
  if (!estado || !estado.banco) return null;

  const salvarPerfil = async () => {
    setErro("");
    const r = await fetch("/api/conta", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify(perfil) });
    if (r.ok) {
      setPerfil((await r.json()).perfil);
      setSalvo(true);
    } else setErro("Não foi possível salvar o perfil agora.");
  };

  const alternar = (d) => {
    setSalvo(false);
    setPerfil((p) => ({ ...p, disciplinas: p.disciplinas.includes(d) ? p.disciplinas.filter((x) => x !== d) : [...p.disciplinas, d] }));
  };

  const excluir = async () => {
    if (confirmar !== "EXCLUIR") return;
    setApagando(true);
    setErro("");
    try {
      const r = await fetch("/api/conta", { method: "DELETE", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ confirmar }) });
      if (!r.ok) throw new Error();
      const { materiais = 0 } = await r.json().catch(() => ({}));
      setFeito(`Conta excluída. ${materiais === 1 ? "1 link compartilhado apagado" : `${materiais} links compartilhados apagados`}, além da lista, do perfil e do histórico de uso. Saindo…`);
      try {
        window.localStorage.removeItem("edugera:config");
        window.localStorage.removeItem("edugera:materiais");
      } catch {
        /* armazenamento bloqueado */
      }
      await new Promise((ok) => setTimeout(ok, 3500)); // tempo para ler o resultado
      await signOut({ callbackUrl: "/" });
    } catch {
      setErro("Não foi possível excluir agora. Tente de novo em instantes.");
      setApagando(false);
    }
  };

  return (
    <>
      {estado.banco && (
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h2 className="flex items-center gap-1.5 text-base font-bold text-slate-800">
            <UserCircle className="h-4 w-4 text-violet-400" /> Perfil da conta
          </h2>
          <p className="mb-5 text-xs text-slate-500">Fica na sua conta e vale em qualquer aparelho. Não guardamos seu e-mail aqui.</p>
          <div className="grid grid-cols-1 gap-5 sm:grid-cols-2">
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Nome de exibição</span>
              <input
                className="ipt"
                value={perfil.nomeExibicao}
                maxLength={120}
                onChange={(e) => (setSalvo(false), setPerfil((p) => ({ ...p, nomeExibicao: e.target.value })))}
              />
            </label>
            <label className="block">
              <span className="mb-1.5 block text-xs font-bold text-slate-600">Escola</span>
              <input className="ipt" value={perfil.escola} maxLength={120} onChange={(e) => (setSalvo(false), setPerfil((p) => ({ ...p, escola: e.target.value })))} />
            </label>
          </div>
          <p className="mb-2 mt-5 text-xs font-bold text-slate-600">Disciplinas que você ensina</p>
          <div className="flex flex-wrap gap-2">
            {DISCIPLINAS.map((d) => (
              <button
                key={d}
                type="button"
                onClick={() => alternar(d)}
                aria-pressed={perfil.disciplinas.includes(d)}
                className={`rounded-full border px-3 py-1 text-xs font-semibold ${perfil.disciplinas.includes(d) ? "border-violet-400 bg-violet-50 text-violet-700" : "border-slate-200 text-slate-600"}`}
              >
                {d}
              </button>
            ))}
          </div>
          <button type="button" onClick={salvarPerfil} className="btn-prev mt-4">
            {salvo ? <Check className="h-3.5 w-3.5" /> : <Save className="h-3.5 w-3.5" />} {salvo ? "Perfil salvo" : "Salvar perfil"}
          </button>
        </section>
      )}

      <section className="rounded-3xl border border-rose-200 bg-rose-50/60 p-6">
        <h2 className="text-base font-bold text-rose-700">Excluir minha conta</h2>
        <p className="mt-1 text-xs text-rose-700">
          Apaga para sempre sua conta, a lista de materiais, os links compartilhados e o histórico de uso. Não dá para desfazer. Os PDFs que você já baixou
          continuam no seu aparelho.
        </p>
        <label className="mt-3 block text-xs font-semibold text-rose-700">
          Para confirmar, digite <b>EXCLUIR</b>:
          <input className="ipt mt-1 max-w-[12rem]" value={confirmar} onChange={(e) => setConfirmar(e.target.value.trim().toUpperCase())} autoComplete="off" />
        </label>
        <button type="button" disabled={confirmar !== "EXCLUIR" || apagando} onClick={excluir} className="btn-prev mt-3 !text-rose-600">
          <Trash2 className="h-3.5 w-3.5" /> {apagando ? "Excluindo…" : "Excluir minha conta"}
        </button>
      </section>
      {feito && (
        <p className="rounded-xl bg-emerald-50 px-4 py-3 text-sm font-semibold text-emerald-800" role="status">
          {feito}
        </p>
      )}
      {erro && (
        <p className="text-xs font-semibold text-rose-600" role="alert">
          {erro}
        </p>
      )}
    </>
  );
}
