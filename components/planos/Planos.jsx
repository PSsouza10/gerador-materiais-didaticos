"use client";
import React, { useState } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { signIn } from "next-auth/react";
import { Check, ArrowLeft, ArrowRight, Loader2, FlaskConical, Mail, Info } from "lucide-react";
import Marca from "@/components/fachada/Marca";
import { formatarPreco, rotuloPeriodo, ROTULOS_LIMITES, valorLimite } from "@/lib/planos";
import "@/components/fachada/fachada.css";

// Página de planos. Preços e limites vêm de lib/planos.js.
// Não há checkout: no site publicado os planos pagos aparecem como "Em breve";
// no site de teste dá para SIMULAR a assinatura (nada é cobrado).
export default function Planos({ planos, logado, atual, assinatura, simulacao, suporte, suportePadrao, aviso = null }) {
  const router = useRouter();
  const [ocupado, setOcupado] = useState(null);
  const [msg, setMsg] = useState("");

  // plano = id para simular; null = encerrar a simulação
  const simular = async (plano) => {
    setOcupado(plano || "encerrar");
    setMsg("");
    try {
      const r = await fetch("/api/assinatura", {
        method: plano ? "POST" : "DELETE",
        headers: { "Content-Type": "application/json" },
        body: plano ? JSON.stringify({ plano }) : undefined,
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || "Não foi possível mudar o plano.");
      setMsg(plano ? "Plano simulado ativado. Nenhuma cobrança foi feita." : "Simulação encerrada: sua conta voltou ao plano normal.");
      router.refresh();
    } catch (e) {
      setMsg(e.message);
    } finally {
      setOcupado(null);
    }
  };

  const Botao = ({ p }) => {
    const ehAtual = atual === p.id;
    if (p.id === "gratis") {
      if (ehAtual) return <span className="btn-secundario w-full justify-center opacity-80">Seu plano atual{assinatura?.origem === "simulada" ? " (simulado)" : ""}</span>;
      if (!logado)
        return (
          <button type="button" onClick={() => signIn("google", { callbackUrl: "/criar" })} className="btn-secundario w-full justify-center">
            Começar grátis
          </button>
        );
      if (simulacao)
        return (
          <button type="button" onClick={() => simular("gratis")} disabled={!!ocupado} className="btn-secundario w-full justify-center">
            {ocupado === "gratis" ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />} Simular Grátis
          </button>
        );
      return null;
    }
    if (p.id === "escola") {
      // Escola: sem preço e sem cobrança por enquanto
      return (
        <span className="btn-secundario w-full cursor-not-allowed justify-center opacity-60" aria-disabled="true">
          Em breve
        </span>
      );
    }
    if (ehAtual) return <span className="btn-primario w-full justify-center opacity-90">Seu plano atual{assinatura?.origem === "simulada" ? " (simulado)" : ""}</span>;
    if (simulacao)
      return (
        <button type="button" onClick={() => simular(p.id)} disabled={!!ocupado} className="btn-primario w-full justify-center">
          {ocupado === p.id ? <Loader2 className="h-4 w-4 animate-spin" /> : <FlaskConical className="h-4 w-4" aria-hidden="true" />}
          Simular assinatura
        </button>
      );
    return (
      <span className="btn-primario w-full cursor-not-allowed justify-center opacity-60" aria-disabled="true" title="A assinatura ainda não está disponível">
        Em breve
      </span>
    );
  };

  return (
    <div className="fachada min-h-screen">
      <header className="mx-auto flex h-[80px] max-w-[1280px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="rounded-lg" aria-label="EduGera — página inicial">
          <Marca />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          {logado && (
            <Link href="/uso" className="btn-contorno hidden sm:inline-flex">
              Meu uso
            </Link>
          )}
          <Link href={logado ? "/criar" : "/"} className="btn-contorno">
            {logado ? (
              <>
                Abrir o EduGera <ArrowRight className="h-4 w-4" aria-hidden="true" />
              </>
            ) : (
              <>
                <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Início
              </>
            )}
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1280px] px-5 pb-20 sm:px-8">
        <section className="pt-6 text-center sm:pt-10">
          <p className="eyebrow justify-center">Planos</p>
          <h1 className="font-titulo mx-auto mt-3 max-w-[18ch] text-[2.4rem] font-semibold leading-[1.08] text-marinho sm:text-[3.2rem]">
            Escolha como usar o EduGera
          </h1>
          <p className="mx-auto mt-4 max-w-[60ch] text-[17px] leading-relaxed text-tinta">
            Comece de graça. Os planos pagos ainda não estão à venda: os valores abaixo são provisórios e nenhuma cobrança é feita.
          </p>
          {aviso && (
            <p role="status" className="mx-auto mt-5 max-w-[62ch] rounded-2xl bg-roxo-claro px-4 py-3 text-[15px] font-medium text-marinho">
              {aviso}
            </p>
          )}
          {simulacao && (
            <p className="mx-auto mt-5 inline-flex items-center gap-2 rounded-full bg-amber-100 px-4 py-2 text-[14px] font-semibold text-amber-900">
              <FlaskConical className="h-4 w-4" aria-hidden="true" /> Site de teste: a assinatura é só simulada, sem pagamento.
            </p>
          )}
          {atual === "admin" && (
            <p className="mx-auto mt-4 max-w-[60ch] text-[14.5px] text-tinta">
              Sua conta é de administrador (sem limites).{simulacao ? " Para conferir os limites, simule um plano abaixo." : ""}
            </p>
          )}
          {simulacao && assinatura?.origem === "simulada" && (
            <p className="mt-3">
              <button type="button" onClick={() => simular(null)} disabled={!!ocupado} className="text-[14px] font-semibold text-marinho underline">
                {ocupado === "encerrar" ? "Encerrando…" : "Encerrar simulação"}
              </button>
            </p>
          )}
          {msg && (
            <p role="status" className="mx-auto mt-4 max-w-[60ch] text-[15px] font-semibold text-marinho">
              {msg}
            </p>
          )}
        </section>

        <section aria-label="Planos" className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
          {planos.map((p) => {
            const destaque = p.id === "pro_mensal";
            return (
              <article
                key={p.id}
                className={`papel flex flex-col p-6 ${destaque ? "ring-2 ring-roxo" : ""} ${atual === p.id ? "outline outline-2 outline-offset-2 outline-verde" : ""}`}
              >
                <div className="flex items-center justify-between gap-2">
                  <h2 className="font-titulo text-[1.5rem] font-semibold text-marinho">{p.nome}</h2>
                  {p.emBreve && <span className="rounded-full bg-creme px-2.5 py-1 text-[12px] font-bold text-marinho">Em breve</span>}
                  {atual === p.id && <span className="rounded-full bg-verde-claro px-2.5 py-1 text-[12px] font-bold text-verde-escuro">Atual</span>}
                </div>
                <p className="mt-4 flex items-baseline gap-1.5">
                  <span className="font-titulo text-[2.1rem] font-semibold text-marinho">{formatarPreco(p)}</span>
                  {p.preco ? <span className="text-[15px] text-tinta">{rotuloPeriodo(p.periodo)}</span> : null}
                </p>
                <ul className="mt-5 flex-1 space-y-2.5 text-[15px] text-tinta">
                  {p.recursos.map((r) => (
                    <li key={r} className="flex gap-2">
                      <Check className="mt-0.5 h-4 w-4 flex-none text-verde-escuro" aria-hidden="true" />
                      {r}
                    </li>
                  ))}
                </ul>
                <div className="mt-6">
                  <Botao p={p} />
                </div>
              </article>
            );
          })}
        </section>

        <section className="papel mt-10 overflow-x-auto p-2 sm:p-4" aria-labelledby="comparar">
          <h2 id="comparar" className="font-titulo px-3 pt-2 text-[1.4rem] font-semibold text-marinho">
            Limites de cada plano
          </h2>
          <table className="mt-3 w-full min-w-[620px] text-left text-[14.5px]">
            <thead>
              <tr className="border-b border-marinho/10 text-marinho">
                <th scope="col" className="px-3 py-2.5 font-semibold">
                  Limite
                </th>
                {planos.map((p) => (
                  <th key={p.id} scope="col" className="px-3 py-2.5 font-semibold">
                    {p.nome}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody>
              {ROTULOS_LIMITES.map(([chave, rotulo]) => (
                <tr key={chave} className="border-b border-marinho/5 last:border-0">
                  <th scope="row" className="px-3 py-2.5 font-medium text-tinta">
                    {rotulo}
                  </th>
                  {planos.map((p) => (
                    <td key={p.id} className="px-3 py-2.5 text-marinho">
                      {p.emBreve ? "Em breve" : valorLimite(p.limites[chave])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </section>

        <section className="mt-8 flex flex-col gap-2 text-[14.5px] text-tinta">
          <p className="flex items-start gap-2">
            <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            O limite mensal renova no dia 1º; o diário, à meia-noite (horário de Brasília). Ao atingir o limite, novas gerações ficam
            bloqueadas até a renovação. Nada é cobrado automaticamente.
          </p>
          <p className="flex items-start gap-2">
            <Mail className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" />
            {suporte ? (
              <>
                Suporte: <a className="underline" href={`mailto:${suporte}`}>{suporte}</a>
              </>
            ) : (
              suportePadrao
            )}
          </p>
        </section>
      </main>
    </div>
  );
}
