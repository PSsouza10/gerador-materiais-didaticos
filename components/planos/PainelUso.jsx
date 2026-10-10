import React from "react";
import Link from "next/link";
import { ArrowLeft, Gauge, CalendarDays, Sparkles, ShieldCheck, Wand2, Image as Imagem, BookMarked, Mail, Info } from "lucide-react";

// Painel "Uso e limites" (app/uso/page.jsx). Sem estado: os números chegam prontos do servidor.
const TIPOS = { geracao: "Geração de apostila", revisao: "Revisão de conteúdo", correcao: "Correção de exercício", imagem: "Ilustração" };
const dataHora = (iso) =>
  new Date(iso).toLocaleString("pt-BR", { timeZone: "America/Sao_Paulo", day: "2-digit", month: "2-digit", hour: "2-digit", minute: "2-digit" });
// renovação do mês: 1º dia do mês seguinte (a virada é em UTC; mostra a data, não a hora)
const data = (iso) => new Date(iso).toLocaleDateString("pt-BR", { timeZone: "UTC", day: "numeric", month: "long" }).replace(/^1 /, "1º ");

function Barra({ icone: Icone, titulo, usados, limite, renova, legenda }) {
  const semLimite = limite === null || limite === undefined;
  const pct = semLimite ? 0 : limite ? Math.min(100, (usados / limite) * 100) : 100;
  const esgotado = !semLimite && usados >= limite;
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-4 shadow-sm">
      <div className="flex items-center gap-2 text-sm font-bold text-slate-700">
        <Icone className="h-4 w-4 text-indigo-500" aria-hidden="true" /> {titulo}
      </div>
      <p className="mt-2 text-2xl font-extrabold text-slate-900">
        {usados}
        <span className="text-base font-semibold text-slate-500"> {legenda || (semLimite ? "· sem limite" : `de ${limite}`)}</span>
      </p>
      {!semLimite && (
        <div
          className="mt-2 h-2 overflow-hidden rounded-full bg-slate-100"
          role="progressbar"
          aria-label={titulo}
          aria-valuemin={0}
          aria-valuemax={limite}
          aria-valuenow={Math.min(usados, limite)}
        >
          <div className={`h-full ${esgotado ? "bg-rose-500" : "bg-indigo-500"}`} style={{ width: `${pct}%` }} />
        </div>
      )}
      {esgotado && <p className="mt-2 text-[12.5px] font-semibold text-rose-700">Limite atingido{renova ? ` · renova ${renova}` : ""}.</p>}
      {!esgotado && renova && <p className="mt-2 text-[12.5px] text-slate-500">Renova {renova}.</p>}
    </div>
  );
}

export default function PainelUso({ uso, materiais, recentes, suporte, suporteTexto, aviso, nome }) {
  if (!uso)
    return (
      <main className="mx-auto max-w-3xl px-4 py-16 text-center">
        <p className="text-slate-700">Não foi possível carregar seu uso agora. Tente de novo em instantes.</p>
        <Link href="/criar" className="mt-4 inline-block font-semibold text-indigo-700 underline">
          Voltar ao EduGera
        </Link>
      </main>
    );
  const bloqueado = uso.restantes === 0;
  const motivoDia = bloqueado && uso.hoje.restantes === 0 && (uso.limite === null || uso.usados < uso.limite);
  const renovaMes = `em ${data(uso.renovaMes)}`;
  return (
    <main className="min-h-screen bg-slate-50">
      <div className="mx-auto max-w-5xl px-4 py-8 sm:px-6">
        <Link href="/criar" className="inline-flex items-center gap-1.5 text-sm font-semibold text-indigo-700 hover:underline">
          <ArrowLeft className="h-4 w-4" aria-hidden="true" /> Voltar ao EduGera
        </Link>
        <div className="mt-4 flex flex-wrap items-end justify-between gap-4">
          <div>
            <h1 className="text-2xl font-extrabold text-slate-900 sm:text-3xl">Uso e limites</h1>
            <p className="mt-1 text-slate-600">{nome ? `${nome}, este` : "Este"} é o seu uso no mês atual.</p>
          </div>
          <div className="rounded-2xl bg-white px-4 py-3 shadow-sm ring-1 ring-slate-100">
            <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">Seu plano</p>
            <p className="text-lg font-extrabold text-indigo-700">
              {uso.plano.nome}
              {uso.assinatura?.origem === "simulada" ? " (simulado)" : uso.assinatura?.origem === "manual" ? " (liberado)" : ""}
            </p>
          </div>
        </div>

        {aviso && (
          <p role="status" className="mt-6 flex items-start gap-2 rounded-2xl border border-indigo-100 bg-indigo-50 p-4 text-[15px] text-indigo-900">
            <Info className="mt-0.5 h-4 w-4 flex-none" aria-hidden="true" /> {aviso}
          </p>
        )}

        {bloqueado && (
          <div role="alert" className="mt-6 rounded-2xl border border-rose-200 bg-rose-50 p-4 text-[15px] text-rose-900">
            <b>Novas gerações estão bloqueadas.</b>{" "}
            {motivoDia
              ? `Você chegou ao limite de ${uso.hoje.limite} por dia. Amanhã você pode gerar de novo.`
              : `Você usou as ${uso.limite} gerações deste mês. O limite renova ${renovaMes}.`}{" "}
            <Link href="/planos" className="font-semibold underline">
              Ver planos
            </Link>
          </div>
        )}

        <section aria-label="Uso do mês" className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Barra icone={Gauge} titulo="Gerações neste mês" usados={uso.usados} limite={uso.limite} renova={renovaMes} />
          <Barra icone={CalendarDays} titulo="Gerações hoje" usados={uso.hoje.usados} limite={uso.hoje.limite} renova="à meia-noite" />
          <Barra icone={ShieldCheck} titulo="Revisões de conteúdo" usados={uso.revisoes.usados} limite={uso.revisoes.limite} renova={renovaMes} />
          <Barra icone={Wand2} titulo="Correções de exercício" usados={uso.correcoes.usados} limite={uso.correcoes.limite} renova={renovaMes} />
          <Barra
            icone={Imagem}
            titulo="Ilustrações neste mês"
            usados={uso.imagens.usados}
            limite={null}
            legenda={uso.imagens.porGeracao === null ? "· sem limite" : `· até ${uso.imagens.porGeracao} por apostila`}
          />
          <Barra icone={BookMarked} titulo="Materiais na biblioteca" usados={materiais?.visiveis ?? 0} limite={uso.biblioteca} />
        </section>
        <p className="mt-2 text-[12.5px] text-slate-500">
          {uso.biblioteca !== null
            ? `Biblioteca: "Minhas Apostilas" mostra os ${uso.biblioteca} materiais mais recentes${
                materiais && materiais.total > materiais.visiveis ? ` (${materiais.total - materiais.visiveis} guardados, com os links funcionando)` : ""
              }. Nada é apagado.`
            : ""}
        </p>

        <section className="mt-8 rounded-3xl border border-slate-100 bg-white p-5 shadow-sm">
          <h2 className="flex items-center gap-2 text-lg font-bold text-slate-800">
            <Sparkles className="h-5 w-5 text-violet-500" aria-hidden="true" /> Últimos usos
          </h2>
          {recentes.length === 0 ? (
            <p className="mt-3 text-sm text-slate-600">Nenhum uso registrado neste mês.</p>
          ) : (
            <div className="mt-3 overflow-x-auto">
              <table className="w-full min-w-[480px] text-left text-sm">
                <thead>
                  <tr className="border-b border-slate-100 text-slate-500">
                    <th scope="col" className="py-2 pr-3 font-semibold">Quando</th>
                    <th scope="col" className="py-2 pr-3 font-semibold">O quê</th>
                    <th scope="col" className="py-2 font-semibold">Código do pedido</th>
                  </tr>
                </thead>
                <tbody>
                  {recentes.map((r, i) => (
                    <tr key={i} className="border-b border-slate-50 last:border-0">
                      <td className="py-2 pr-3 text-slate-700">{dataHora(r.em)}</td>
                      <td className="py-2 pr-3 text-slate-800">{TIPOS[r.tipo] || r.tipo}</td>
                      <td className="py-2 font-mono text-[12px] text-slate-500">{r.requestId ? r.requestId.slice(0, 8) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="mt-2 text-[12px] text-slate-500">O código ajuda o suporte a encontrar um pedido, se algo der errado.</p>
            </div>
          )}
        </section>

        <div className="mt-8 flex flex-wrap items-center gap-3">
          <Link href="/planos" className="rounded-full bg-indigo-600 px-5 py-2.5 text-sm font-bold text-white hover:bg-indigo-700">
            Ver planos
          </Link>
          <span className="inline-flex items-center gap-1.5 text-sm text-slate-600">
            <Mail className="h-4 w-4" aria-hidden="true" /> {suporte ? `Suporte: ${suporte}` : suporteTexto}
          </span>
        </div>
        <p className="mt-4 text-[12.5px] text-slate-500">Nenhuma cobrança é feita no EduGera neste momento.</p>
      </div>
    </main>
  );
}
