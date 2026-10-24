"use client";
import { useState } from "react";
import { PERFIS_REDACAO, GENEROS } from "@/lib/redacao";

// Redações corrigidas da conta: abrir a correção ou apagar (texto do aluno é dado pessoal)
export default function Historico({ itens: iniciais }) {
  const [itens, setItens] = useState(iniciais);
  const [erro, setErro] = useState("");
  async function apagar(id) {
    if (!window.confirm("Apagar esta redação e a correção? Não dá para desfazer.")) return;
    setErro("");
    const r = await fetch(`/api/redacao/${id}`, { method: "DELETE" }).catch(() => null);
    if (r?.ok) setItens((l) => l.filter((x) => x.id !== id));
    else setErro("Não foi possível apagar agora. Tente de novo.");
  }
  if (!itens.length) return <p className="mt-3 rounded-2xl bg-slate-50 p-4 text-sm text-slate-600">Nenhuma redação corrigida ainda.</p>;
  return (
    <>
      <ul className="mt-3 divide-y divide-slate-100">
        {itens.map((r) => (
          <li key={r.id} className="flex flex-wrap items-center gap-3 py-3 text-sm">
            <span className="min-w-0 flex-1">
              <b className="text-slate-900">{r.tema || "Sem tema"}</b>
              <span className="block text-slate-500">
                {PERFIS_REDACAO[r.perfil]}{r.genero && r.genero !== "dissertacao" ? ` · ${GENEROS[r.genero]}` : ""} · {new Date(r.criadoEm).toLocaleDateString("pt-BR")}
                {r.nota !== null && ` · nota ${String(r.nota).replace(".", ",")}`}
              </span>
            </span>
            <a href={`/redacao/corrigir?id=${r.id}`} className="rounded-lg border border-slate-200 px-3 py-1.5 font-semibold text-slate-800 hover:border-indigo-300">
              Ver
            </a>
            <button type="button" onClick={() => apagar(r.id)} className="rounded-lg border border-rose-200 px-3 py-1.5 font-semibold text-rose-700 hover:bg-rose-50">
              Apagar
            </button>
          </li>
        ))}
      </ul>
      {erro && <p className="mt-2 text-sm font-semibold text-rose-700">{erro}</p>}
    </>
  );
}
