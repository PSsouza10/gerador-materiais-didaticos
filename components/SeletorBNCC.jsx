"use client";
import React, { useEffect, useMemo, useRef, useState } from "react";
import { Hash, CheckCircle2, AlertTriangle, Loader2, X, Info } from "lucide-react";
import { buscarHabilidades, indexar, resolverCodigo, normalizarCodigo, daDisciplina, cobreAno, rotuloAno } from "@/lib/bncc";

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

const anosDe = (h) => (h.e === "EM" ? "Ensino Médio" : h.a ? `${h.a.replace(/, /g, "º, ")}º ano` : "");

export default function SeletorBNCC({ codigo, habilidade, disciplina, nivel, ano, onChange }) {
  const [base, setBase] = useState(null);
  const [carregando, setCarregando] = useState(false);
  const [aberto, setAberto] = useState(false);
  const [ativo, setAtivo] = useState(0);
  const [corrigido, setCorrigido] = useState(null); // { de, para }
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
    () => (base && aberto ? buscarHabilidades(base.lista, codigo, { disciplina, nivel, ano }) : []),
    [base, aberto, codigo, disciplina, nivel, ano]
  );
  const primeiraOutra = resultados.findIndex((h) => !daDisciplina(h, disciplina));

  const oficial = base && codigo ? resolverCodigo(base.mapa, codigo) : null;
  const digitando = aberto && resultados.length > 0;
  const status = !codigo ? null : !base ? "carregando" : oficial ? "valido" : digitando ? null : "desconhecido";
  const foraDaDisciplina = oficial && !daDisciplina(oficial, disciplina);
  const foraDoAno = oficial && cobreAno(oficial, ano) === false;

  const aplicar = (h, digitado) => {
    const n = normalizarCodigo(digitado);
    setCorrigido(n && n !== h.c && !h.c.startsWith(n) ? { de: n, para: h.c } : null);
    onChange({ bncc: h.c, habilidade: h.t, bnccVerificada: true });
  };

  const escolher = (h) => {
    setCorrigido(null);
    onChange({ bncc: h.c, habilidade: h.t, bnccVerificada: true });
    setAberto(false);
  };

  const digitar = (valor) => {
    // Atualização síncrona: o campo sempre mostra exatamente o que foi digitado
    const h = base ? resolverCodigo(base.mapa, valor) : null;
    // Só troca o texto do campo quando o código digitado está completo e é oficial
    // (incluindo correções como EF7MA30 → EF07MA30)
    if (h) aplicar(h, valor);
    else {
      setCorrigido(null);
      onChange({ bncc: valor.toUpperCase(), habilidade: oficial ? "" : habilidade, bnccVerificada: false });
    }
    setAberto(true);
    setAtivo(0);
    if (!base) garantirBase();
  };

  // Base carregou depois que um código completo já estava no campo: só confirma,
  // nunca sobrescreve o que está sendo digitado
  useEffect(() => {
    if (!base || !codigo) return;
    const h = resolverCodigo(base.mapa, codigo);
    if (h && (h.c !== codigo || h.t !== habilidade)) aplicar(h, codigo);
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
    listaRef.current?.querySelector(`[data-i="${ativo}"]`)?.scrollIntoView({ block: "nearest" });
  }, [ativo]);

  const Opcao = ({ h, i }) => (
    <div
      id={`bncc-opcao-${h.c}`}
      data-i={i}
      role="option"
      aria-selected={i === ativo}
      onMouseDown={(e) => {
        e.preventDefault();
        escolher(h);
      }}
      onMouseEnter={() => setAtivo(i)}
      className={`cursor-pointer rounded-lg px-3 py-2 ${i === ativo ? "bg-indigo-50" : ""}`}
    >
      <div className="flex flex-wrap items-center gap-x-2">
        <span className="font-mono text-xs font-bold text-indigo-700">{h.c}</span>
        <span className="text-[11px] font-semibold text-slate-600">
          {h.d}
          {anosDe(h) ? ` · ${anosDe(h)}` : ""}
        </span>
      </div>
      <p className="mt-0.5 line-clamp-2 text-xs leading-snug text-slate-700">{h.t}</p>
    </div>
  );

  return (
    <div className="relative">
      <label id="rotulo-bncc" htmlFor="campo-bncc" className="mb-1.5 flex items-center gap-1.5 text-xs font-bold text-slate-600">
        <Hash className="h-3.5 w-3.5 text-violet-400" />
        Habilidade da BNCC
        <span className="font-medium text-slate-500">(opcional)</span>
      </label>

      <div className="relative">
        <input
          id="campo-bncc"
          name="bncc"
          maxLength={20}
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
          aria-expanded={aberto && resultados.length > 0}
          aria-activedescendant={aberto && resultados[ativo] ? `bncc-opcao-${resultados[ativo].c}` : undefined}
          aria-describedby={oficial ? "bncc-descricao" : undefined}
          aria-autocomplete="list"
          autoComplete="off"
          spellCheck={false}
        />
        <span className="absolute right-3 top-1/2 -translate-y-1/2">
          {carregando || status === "carregando" ? (
            <Loader2 className="h-4 w-4 animate-spin text-slate-500" />
          ) : status === "valido" ? (
            <CheckCircle2 className="h-4 w-4 text-emerald-600" aria-label="Código oficial encontrado" />
          ) : status === "desconhecido" ? (
            <AlertTriangle className="h-4 w-4 text-amber-600" aria-label="Código não encontrado" />
          ) : null}
        </span>

        {aberto && resultados.length > 0 && (
          <div
            ref={listaRef}
            id="lista-bncc"
            role="listbox"
            aria-label="Habilidades encontradas"
            className="absolute z-30 mt-1 max-h-80 w-full overflow-y-auto rounded-xl border border-slate-100 bg-white p-1 shadow-xl"
          >
            <div role="group" aria-labelledby="grupo-bncc-mesma">
              {primeiraOutra !== 0 && (
                <div id="grupo-bncc-mesma" className="px-3 pb-1 pt-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-slate-500">
                  {disciplina}
                  {ano ? ` · ${rotuloAno(ano)} primeiro` : ""}
                </div>
              )}
              {resultados.slice(0, primeiraOutra === -1 ? undefined : primeiraOutra).map((h, i) => (
                <Opcao key={h.c} h={h} i={i} />
              ))}
            </div>
            {primeiraOutra !== -1 && (
              <div role="group" aria-labelledby="grupo-bncc-outras" className="mt-1 border-t border-slate-100 pt-1">
                <div id="grupo-bncc-outras" className="px-3 pb-1 pt-1.5 text-[10.5px] font-extrabold uppercase tracking-wider text-amber-700">
                  Outras disciplinas — confira antes de escolher
                </div>
                {resultados.slice(primeiraOutra).map((h, j) => (
                  <Opcao key={h.c} h={h} i={primeiraOutra + j} />
                ))}
              </div>
            )}
          </div>
        )}
      </div>

      {/* Descrição da habilidade */}
      {(codigo || habilidade) && (
        <div
          className={`mt-2 rounded-xl border px-3 py-2 text-xs leading-relaxed ${
            status === "valido" ? "border-emerald-100 bg-emerald-50/60 text-slate-700" : "border-amber-100 bg-amber-50/60 text-slate-700"
          }`}
        >
          {status === "valido" ? (
            <>
              <span className="font-bold text-emerald-800">
                Habilidade oficial da BNCC · {oficial.c}
                {anosDe(oficial) ? ` · ${anosDe(oficial)}` : ""}
              </span>
              <p id="bncc-descricao" className="mt-0.5">
                {oficial.t}
              </p>
              {corrigido && (
                <p role="status" className="mt-1 flex items-center gap-1 text-[11.5px] font-semibold text-indigo-700">
                  <Info className="h-3.5 w-3.5" /> Código corrigido de {corrigido.de} para {corrigido.para}.
                </p>
              )}
              {foraDaDisciplina && (
                <p className="mt-1 text-[11.5px] font-semibold text-amber-800">
                  Atenção: esta habilidade é de {oficial.d}, não de {disciplina}.
                </p>
              )}
              {foraDoAno && (
                <p className="mt-1 text-[11.5px] font-semibold text-amber-800">
                  Atenção: esta habilidade é do {anosDe(oficial)}; você selecionou {rotuloAno(ano)}.
                </p>
              )}
            </>
          ) : status === "desconhecido" ? (
            <>
              <span className="font-bold text-amber-800">Código não localizado na BNCC nacional.</span> Se for de um currículo
              estadual/municipal, descreva a habilidade abaixo. No material ela aparecerá como{" "}
              <b>&ldquo;habilidade informada pelo docente&rdquo;</b>, separada das habilidades oficiais.
              <textarea
                value={habilidade}
                onChange={(e) => onChange({ bncc: codigo, habilidade: e.target.value, bnccVerificada: false })}
                rows={2}
                className="ipt mt-1.5 resize-none bg-white text-xs"
                placeholder="Descrição da habilidade (informada pelo docente)"
                aria-label="Descrição da habilidade informada pelo docente"
              />
            </>
          ) : null}
          {codigo && (
            <button
              type="button"
              onClick={() => {
                setCorrigido(null);
                onChange({ bncc: "", habilidade: "", bnccVerificada: false });
              }}
              className="mt-1 inline-flex items-center gap-1 text-[11px] font-semibold text-slate-600 hover:text-slate-800"
            >
              <X className="h-3 w-3" /> limpar
            </button>
          )}
        </div>
      )}
    </div>
  );
}
