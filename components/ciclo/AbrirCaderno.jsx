"use client";
import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, FolderPlus, LayoutDashboard, LogIn } from "lucide-react";
import { adicionarAvaliacaoNaLista } from "@/lib/avaliacao";

const K_AVALIACOES = "edugera:avaliacoes"; // a mesma lista da aba Avaliação

function lerSalvas() {
  try {
    const v = JSON.parse(window.localStorage.getItem(K_AVALIACOES) || "[]");
    return Array.isArray(v) ? v : [];
  } catch {
    return [];
  }
}

// /caderno/<código>: o professor entra, vê o caderno e o adiciona às suas avaliações
export default function AbrirCaderno({ codigo }) {
  const [estado, setEstado] = useState({ carregando: true });

  useEffect(() => {
    fetch(`/api/cadernos/${codigo}`, { cache: "no-store" })
      .then(async (r) => ({ status: r.status, j: await r.json().catch(() => ({})) }))
      .then(({ status, j }) => setEstado({ carregando: false, status, ...j }))
      .catch(() => setEstado({ carregando: false, status: 0, error: "Sem conexão com o servidor." }));
  }, [codigo]);

  function adicionar() {
    const c = estado.caderno;
    const salvas = lerSalvas();
    const ja = salvas.find((s) => s.origem?.tipo === "caderno" && s.origem.codigo === c.codigo);
    let id = ja?.id;
    if (!ja) {
      const nova = adicionarAvaliacaoNaLista(salvas, c.avaliacao, { tipo: "caderno", codigo: c.codigo, titulo: c.titulo, escolas: c.escolas, cadernoTipo: c.tipo });
      try {
        window.localStorage.setItem(K_AVALIACOES, JSON.stringify(nova));
      } catch {
        return setEstado((e) => ({ ...e, error: "O navegador não deixou guardar a avaliação (armazenamento cheio ou bloqueado)." }));
      }
      id = nova[0].id;
    }
    window.location.href = `/criar?aba=prova&abrir=${encodeURIComponent(id)}`;
  }

  if (estado.carregando)
    return (
      <p className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Abrindo o caderno…
      </p>
    );
  if (estado.status === 401)
    return (
      <div>
        <p className="text-slate-700">Entre com a sua conta Google para abrir o caderno {codigo}.</p>
        <button type="button" onClick={() => signIn("google", { callbackUrl: `/caderno/${codigo}` })} className="mt-4 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">
          <LogIn className="h-4 w-4" /> Entrar com Google
        </button>
      </div>
    );
  if (!estado.caderno) return <p className="font-semibold text-rose-700">{estado.error || "Caderno não encontrado."}</p>;

  const c = estado.caderno;
  const id = c.avaliacao?.identificacao || {};
  return (
    <div>
      <p className="text-xs font-bold uppercase tracking-wide text-violet-700">{c.tipo === "reavaliacao" ? "Mini-reavaliação da rede" : "Caderno diagnóstico da rede"}</p>
      <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{c.titulo}</h1>
      <p className="mt-1 text-slate-600">{[id.componente, id.etapa, `${c.avaliacao?.itens?.length || 0} questões`].filter(Boolean).join(" · ")}</p>
      {!c.ativo && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-sm text-amber-900">Este caderno foi encerrado pela coordenação: não recebe mais resultados.</p>}
      <ol className="mt-5 list-decimal space-y-1 pl-5 text-[15px] text-slate-700">
        <li>Adicione o caderno às suas avaliações (fica salvo neste navegador).</li>
        <li>Baixe o PDF do aluno, com o cartão-resposta, e aplique como está.</li>
        <li>Corrija a turma (pela foto do cartão ou marcando as respostas).</li>
        <li>Envie o resultado: vai só a contagem de respostas por questão, sem nome de aluno.</li>
      </ol>
      <p className="mt-4 text-sm text-slate-600">Escolas do caderno: {c.escolas.join(" · ")}</p>
      {estado.envios?.length > 0 && <p className="mt-2 text-sm text-emerald-700">Você já enviou {estado.envios.length} turma(s) deste caderno.</p>}
      {estado.error && <p className="mt-3 font-semibold text-rose-700">{estado.error}</p>}
      <div className="mt-6 flex flex-wrap gap-3">
        <button type="button" onClick={adicionar} className="inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2.5 font-semibold text-white hover:bg-indigo-700">
          <FolderPlus className="h-4 w-4" /> Adicionar às minhas avaliações
        </button>
        {estado.gerir && (
          <a href={`/caderno/${c.codigo}/painel`} className="inline-flex items-center gap-2 rounded-xl border border-slate-200 bg-white px-4 py-2.5 font-semibold text-slate-800 hover:border-indigo-300">
            <LayoutDashboard className="h-4 w-4" /> Painel da coordenação
          </a>
        )}
      </div>
    </div>
  );
}
