"use client";
import React from "react";
import { Sparkles, BookMarked, CalendarDays, Layers, ArrowRight, ExternalLink, BadgeCheck, CircleAlert } from "lucide-react";
import { obterNivel } from "@/lib/niveis";

// "Prof. Paulo Souza" → "Paulo" (ignora títulos)
const primeiroNome = (nome = "") =>
  nome
    .split(/\s+/)
    .find((p) => p && !/^(prof|profa|prof\.ª|professora?|dr|dra|sr|sra)\.?ª?$/i.test(p)) || "";

const dataCurta = (iso) =>
  new Date(iso).toLocaleDateString("pt-BR", { day: "2-digit", month: "short" }).replace(".", "");

function Cartao({ icone: Icone, rotulo, valor, detalhe }) {
  return (
    <div className="rounded-2xl border border-slate-100 bg-white p-5 shadow-sm">
      <div className="flex items-center gap-2 text-slate-400">
        <Icone className="h-4 w-4" />
        <span className="text-xs font-bold uppercase tracking-wide">{rotulo}</span>
      </div>
      <p className="mt-2 text-3xl font-extrabold text-slate-800">{valor}</p>
      {detalhe && <p className="mt-1 text-xs text-slate-400">{detalhe}</p>}
    </div>
  );
}

export default function Dashboard({ materiais, config, irPara }) {
  const semana = Date.now() - 7 * 864e5;
  const daSemana = materiais.filter((m) => new Date(m.criadoEm).getTime() >= semana).length;
  const porDisciplina = Object.entries(
    materiais.reduce((acc, m) => ({ ...acc, [m.disciplina]: (acc[m.disciplina] || 0) + 1 }), {})
  ).sort((a, b) => b[1] - a[1]);
  const comBncc = materiais.filter((m) => m.bncc).length;

  return (
    <div className="space-y-6">
      <section className="flex flex-col gap-4 rounded-3xl bg-gradient-to-r from-violet-500 to-indigo-500 p-6 text-white shadow-lg shadow-indigo-200 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-sm font-semibold text-white/80">
            {primeiroNome(config.professor) ? `Olá, ${primeiroNome(config.professor)}!` : "Olá, professor(a)!"}
          </p>
          <h2 className="mt-1 text-xl font-extrabold">Crie uma apostila alinhada à BNCC em poucos minutos</h2>
          <p className="mt-1 text-sm text-white/80">Escolha a habilidade, o tema e o nível; a IA escreve, você revisa e imprime.</p>
        </div>
        <button
          onClick={() => irPara("Gerar Material")}
          className="flex flex-none items-center justify-center gap-2 rounded-2xl bg-white px-5 py-3 text-sm font-bold text-indigo-600 shadow-sm transition-all hover:scale-[1.02]"
        >
          <Sparkles className="h-4 w-4" /> Gerar novo material
        </button>
      </section>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <Cartao icone={BookMarked} rotulo="Materiais" valor={materiais.length} detalhe="gerados neste navegador" />
        <Cartao icone={CalendarDays} rotulo="Últimos 7 dias" valor={daSemana} />
        <Cartao
          icone={BadgeCheck}
          rotulo="Com habilidade BNCC"
          valor={materiais.length ? `${Math.round((comBncc / materiais.length) * 100)}%` : "—"}
          detalhe={materiais.length ? `${comBncc} de ${materiais.length}` : undefined}
        />
      </div>

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[1fr_300px]">
        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <div className="mb-4 flex items-center justify-between">
            <h3 className="text-base font-bold text-slate-800">Recentes</h3>
            {materiais.length > 0 && (
              <button onClick={() => irPara("Minhas Apostilas")} className="flex items-center gap-1 text-xs font-bold text-indigo-600 hover:underline">
                Ver todas <ArrowRight className="h-3.5 w-3.5" />
              </button>
            )}
          </div>
          {materiais.length === 0 ? (
            <div className="rounded-2xl border-2 border-dashed border-slate-200 p-8 text-center">
              <BookMarked className="mx-auto h-8 w-8 text-slate-300" />
              <p className="mt-2 text-sm font-semibold text-slate-500">Você ainda não gerou nenhum material.</p>
              <p className="text-xs text-slate-400">Os materiais que você gerar aparecem aqui, com o link de compartilhamento.</p>
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {materiais.slice(0, 5).map((m) => (
                <li key={m.id} className="flex items-center gap-3 py-3">
                  <div className="min-w-0 flex-1">
                    <p className="truncate text-sm font-bold text-slate-700">{m.titulo}</p>
                    <p className="truncate text-xs text-slate-400">
                      {m.disciplina} · {obterNivel(m.dificuldade).curto}
                      {m.bncc ? ` · ${m.bncc}` : ""} · {dataCurta(m.criadoEm)}
                    </p>
                  </div>
                  <a href={m.url} target="_blank" rel="noopener noreferrer" className="btn-prev flex-none">
                    <ExternalLink className="h-3.5 w-3.5" /> Abrir
                  </a>
                </li>
              ))}
            </ul>
          )}
        </section>

        <section className="rounded-3xl border border-slate-100 bg-white p-6 shadow-sm">
          <h3 className="mb-4 flex items-center gap-2 text-base font-bold text-slate-800">
            <Layers className="h-4 w-4 text-violet-400" /> Por disciplina
          </h3>
          {porDisciplina.length === 0 ? (
            <p className="text-xs text-slate-400">Sem dados ainda.</p>
          ) : (
            <ul className="space-y-2.5">
              {porDisciplina.map(([d, n]) => (
                <li key={d}>
                  <div className="flex justify-between text-xs font-semibold text-slate-600">
                    <span>{d}</span>
                    <span>{n}</span>
                  </div>
                  <div className="mt-1 h-1.5 rounded-full bg-slate-100">
                    <div className="h-1.5 rounded-full bg-indigo-400" style={{ width: `${(n / materiais.length) * 100}%` }} />
                  </div>
                </li>
              ))}
            </ul>
          )}
          <div className="mt-6 flex gap-2 rounded-xl bg-amber-50 p-3 text-[11.5px] leading-relaxed text-amber-700">
            <CircleAlert className="mt-0.5 h-4 w-4 flex-none" />
            A lista fica salva neste navegador. Em outro computador, use os links de compartilhamento.
          </div>
        </section>
      </div>
    </div>
  );
}
