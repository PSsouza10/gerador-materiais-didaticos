"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Hash, CheckCircle2, AlertTriangle, Loader2, X } from "lucide-react";
import { buscarHabilidades, indexar, normalizarCodigo } from "@/lib/bncc";

// Task 3.1 — Autocomplete de habilidades da BNCC.
// Carrega a base (≈100 kB gzip) só quando o campo recebe foco.
let cacheBase = null;
async function carregarBase() {
  if (!cacheBase) {
    cacheBase = import("@/data/bncc-habilidades.json").then((m) => {
      const dados = m.default || m;
      return { lista: dados.habilidades, mapa: indexar(dados.habilidades) };
    });
  }
  return cacheBase;
}

export default function SeletorBNCC({ codigo, habilidade, disciplina, nivel, onChange }) {
  const [base, setBase] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const listaRef = useRef(null);

  const garantirBase = async () => {
    if (base) return base;
    setCarregando(true);
    const b = await carregarBase();
    setBase(b);
    setCarregando(false);
    return b;
  };

  // Se já veio um código preenchido, valida ao carregar
  useEffect(() => {
    if (codigo) garantirBase();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const resultados = useMemo(
    () => (base && aberto ? buscarHabilidades(base.lista, codigo, { disciplina, nivel }) : []),
    [base, aberto, codigo, disciplina, nivel]
  );

  const oficial = base && codigo ? base.mapa.get(normalizarCodigo(codigo)) : null;
  const digitando = aberto && resultados.length > 0;
  const status = !codigo
    ? null
    : !base
    ? "carregando"
    : oficial
    ? "valido"
    : digitando
    ? null // ainda escolhendo na lista: não acusa "não encontrado" antes da hora
    : "desconhecido";

  const escolher = (h) => {
    onChange({ bncc: h.c, habilidade: h.t });
    setAberto(false);
  };

  const digitar = (valor) => {
    // Atualiza o campo de forma síncrona (input controlado não perde teclas)
    const h = base?.mapa.get(normalizarCodigo(valor));
    // Código completo e válido digitado → preenche a descrição oficial na hora
    onChange({ bncc: h ? h.c : valor.toUpperCase(), habilidade: h ? h.t : oficial ? "" : habilidade });
    setAberto(true);
    setAtivo(0);
    if (!base) garantirBase();
  };

  // Base carregou depois que o professor já digitou um código completo
  useEffect(() => {
    if (!base || !codigo) return;
    const h = base.mapa.get(normalizarCodigo(codigo));
    if (h && (h.c !== codigo || h.t !== habilidade)) onChange({ bncc: h.c, habilidade: h.t });
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [base]);

  const teclado = (e) => {
    if (!aberto || !resultados.length) return;
    if (e.key === "ArrowDown") {
      e.preventDefault();
      setAtivo((a) => Math.min(a + 1, resultados.length - 1));
    } else if (e.key === "ArrowUp") {
      e.preventDefault();
      setAtivo((a) => Math.max(a - 1, 0));
    } else if (e.key === "Enter") {
      e.preventDefault();
      escolher(resultados[ativo]);
    } else if (e.key === "Escape") {
      setAberto(false);
    }
  };

  useEffect(() => {
    listaRef.current?.children[ativo]?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  return (
    <div className="relative">
      <span className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <Hash className="h-3.5 w-3.5 text-violet-400" />
        Habilidade da BNCC
        <span className="font-medium text-slate-300">(opcional)</span>
      </span>

      <div className="relative">
        <input
          value={codigo}
          onChange={(e) => digitar(e.target.value)}
          onFocus={() => {
            garantirBase();
            setAberto(true);
          }}
          onBlur={() => setTimeout(() => setAberto(false), 150)}
          onKeyDown={teclado}
          className="ipt pr-9 font-mono uppercase"
          placeholder="Código (EF08MA02) ou palavra-chave (frações, volume...)"
          role="combobox"
          aria-controls="lista-bncc"
          aria-expanded={aberto}
          aria-autocomplete="list"
          autoComplete="off"
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {carregando || status === "carregando" ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-300" />
          ) : status === "valido" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-500" />
          ) : status === "desconhecido" ? (
            <AlertTriangle className="h-4 w-4 text-amber-500" />
          ) : null}
        </span>

        {aberto && resultados.length > 0 && (
          <ul
            ref={listaRef}
            id="lista-bncc"
            role="listbox"
            className="absolute z-30 mt-1 max-h-72 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-xl"
          >
            {resultados.map((h, i) => (
              <li
                key={h.c}
                role="option"
                aria-selected={i === ativo}
                onMouseDown={(e) => {
                  e.preventDefault();
                  escolher(h);
                }}
                onMouseEnter={() => setAtivo(i)}
                className={`cursor-pointer rounded-lg px-3 py-2 ${i === ativo ? "bg-indigo-50" : ""}`}
              >
                <div className="flex items-center gap-2">
                  <span className="font-mono text-xs font-bold text-indigo-600">{h.c}</span>
                  <span className="text-[10px] font-semibold text-slate-400">
                    {h.d}
                    {h.a ? ` · ${h.a}º ano` : ""}
                  </span>
                </div>
                <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-600">{h.t}</p>
              </li>
            ))}
          </ul>
        )}
      </div>

      {/* Descrição da habilidade — preenchida automaticamente com o texto oficial */}
      {(codigo || habilidade) && (
        <div
          className={`mt-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
            status === "valido"
              ? "border-emerald-100 bg-emerald-50/60 text-slate-600"
              : "border-amber-100 bg-amber-50/60 text-slate-600"
          }`}
        >
          {status === "valido" ? (
            <>
              <span className="font-bold text-emerald-700">Descrição oficial · {oficial.c}</span>
              <p className="mt-0.5">{oficial.t}</p>
            </>
          ) : status === "desconhecido" ? (
            <>
              <span className="font-bold text-amber-700">
                Código não encontrado na BNCC nacional.
              </span>{" "}
              Se for de um currículo estadual/municipal, descreva a habilidade abaixo:
              <textarea
                value={habilidade}
                onChange={(e) => onChange({ bncc: codigo, habilidade: e.target.value })}
                rows={2}
                className="ipt mt-1.5 resize-none bg-white text-xs"
                placeholder="Descrição da habilidade"
              />
            </>
          ) : null}
          {codigo && (
            <button
              type="button"
              onClick={() => onChange({ bncc: "", habilidade: "" })}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-400 hover:text-slate-600"
            >
              <X className="h-3 w-3" /> limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
