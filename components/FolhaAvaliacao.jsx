"use client";
import React, { forwardRef } from "react";
import Tx from "@/components/Tx";
import FiguraDidatica from "@/components/FiguraDidatica";
import { LETRAS, ROTULO_DIFICULDADE, mapaHabilidades } from "@/lib/avaliacao";

// Folha A4 da avaliação (padrão Prova Paulista / SARESP). A mesma folha serve à prévia,
// à impressão e ao PDF (lib/pdf.js pagina pelos blocos .cabecalho-escola, .bloco-exercicio
// e .quebra-antes). Versão do aluno: prova + cartão-resposta. Versão do professor:
// a mesma prova + cartão-gabarito + gabarito comentado com análise dos distratores.

const dois = (n) => String(n).padStart(2, "0");

// Bolinha do cartão em SVG (o html2canvas centraliza SVG melhor que texto em caixinha)
const Bolinha = ({ letra, cheia = false }) => (
  <svg width="22" height="22" viewBox="0 0 22 22" aria-hidden="true" className="inline-block">
    <circle cx="11" cy="11" r="9.5" fill={cheia ? "#1e293b" : "#fff"} stroke="#334155" strokeWidth="1.4" />
    <text x="11" y="15" textAnchor="middle" fontSize="11" fontWeight="700" fill={cheia ? "#fff" : "#334155"} fontFamily="system-ui, sans-serif">
      {letra}
    </text>
  </svg>
);

function Cartao({ itens, gabarito }) {
  const colunas = itens.length > 6 ? 2 : 1;
  const porColuna = Math.ceil(itens.length / colunas);
  const grupos = Array.from({ length: colunas }, (_, c) => itens.slice(c * porColuna, (c + 1) * porColuna).map((it, k) => ({ it, n: c * porColuna + k + 1 })));
  return (
    <section className="quebra-antes bloco-exercicio rounded-xl border-2 border-slate-400 p-4">
      <div className="flex items-baseline justify-between border-b border-slate-300 pb-2">
        <p className="text-[13px] font-extrabold uppercase tracking-wider text-slate-800">{gabarito ? "Cartão-gabarito · professor" : "Cartão-resposta"}</p>
        {!gabarito && <p className="text-[11px] text-slate-600">Pinte só uma bolinha por questão.</p>}
      </div>
      {!gabarito && (
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 text-[12px] text-slate-700">
          <p>Nome: ________________________________________</p>
          <p>Nº ______</p>
          <p>Turma: ________</p>
        </div>
      )}
      <div className={`mt-4 grid gap-x-10 ${colunas === 2 ? "grid-cols-2" : "grid-cols-1"}`}>
        {grupos.map((g, c) => (
          <table key={c} className="w-full border-collapse text-[12px]">
            <thead>
              <tr className="text-slate-500">
                <th className="w-16 py-1 text-left font-bold">Questão</th>
                {LETRAS.map((l) => (
                  <th key={l} className="py-1 font-bold">{l}</th>
                ))}
              </tr>
            </thead>
            <tbody>
              {g.map(({ it, n }) => (
                <tr key={n} className="border-t border-slate-200">
                  <td className="py-1.5 font-bold text-slate-800">{dois(n)}</td>
                  {LETRAS.map((l) => (
                    <td key={l} className="py-1.5 text-center">
                      <Bolinha letra={l} cheia={gabarito && it.correta === l} />
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        ))}
      </div>
    </section>
  );
}

const FolhaAvaliacao = forwardRef(function FolhaAvaliacao({ avaliacao, versao = "aluno", cartao = true }, ref) {
  const av = avaliacao || { itens: [], identificacao: {} };
  const id = av.identificacao || {};
  const itens = av.itens || [];
  const professor = versao === "professor";
  const habilidades = mapaHabilidades(itens);
  // Figura 1, Figura 2... na ordem em que aparecem
  const numFigura = [];
  itens.reduce((k, it, i) => ((numFigura[i] = it.figura ? k + 1 : null), it.figura ? k + 1 : k), 0);
  return (
    <article ref={ref} className="folha-a4 folha-avaliacao bg-white font-sans text-[12.5px] leading-[1.5] text-slate-800">
      <header className="cabecalho-escola rounded-xl border-2 border-slate-300 p-4">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            {id.escola && <p className="text-[11px] font-bold uppercase tracking-wider text-slate-500">{id.escola}</p>}
            <h2 className="mt-0.5 text-[17px] font-extrabold leading-tight text-slate-900"><Tx>{av.titulo}</Tx></h2>
            <p className="mt-0.5 text-[11.5px] text-slate-600">
              {[id.componente, id.etapa, id.turma, id.professor && (/^prof/i.test(id.professor) ? id.professor : `Prof.(ª) ${id.professor}`)].filter(Boolean).join(" · ")}
            </p>
          </div>
          {professor && <span className="flex-none rounded-md bg-slate-800 px-2 py-1 text-[10.5px] font-bold uppercase tracking-wider text-white">Professor</span>}
        </div>
        <div className="mt-3 grid grid-cols-[1fr_auto_auto] gap-x-4 border-t border-slate-200 pt-3 text-[12px] text-slate-700">
          <p>Nome: ____________________________________________</p>
          <p>Nº ______</p>
          <p>Data: ____/____/______</p>
        </div>
        <ul className="mt-3 list-disc space-y-0.5 pl-5 text-[11.5px] text-slate-700">
          <li>Esta avaliação tem {itens.length} questões. Cada questão tem 4 alternativas (A, B, C e D) e só uma é correta.</li>
          <li>Leia o texto e o comando com atenção antes de responder.</li>
          {cartao && <li>Marque suas respostas no cartão-resposta, na última folha, pintando só uma bolinha por questão.</li>}
        </ul>
      </header>

      {itens.map((it, i) => (
        <section key={i} className="bloco-exercicio mt-4 rounded-xl border border-slate-200 px-4 py-3">
          <p className="text-[11.5px] font-extrabold uppercase tracking-wider text-slate-900">Questão {dois(i + 1)}</p>
          {it.textoBase && (
            <p className="mt-1.5 text-[12.5px]">
              <Tx>{it.textoBase}</Tx>
            </p>
          )}
          {it.figura && (
            <div className="mt-2.5 flex flex-col items-center">
              <FiguraDidatica figura={it.figura} semLegenda />
              <p className="mt-1 text-center text-[10.5px] text-slate-700">
                <b>Figura {numFigura[i]}</b>
                {it.figura.legenda ? ` – ${it.figura.legenda}` : ""}
              </p>
              <p className="text-center text-[9.5px] text-slate-500">Fonte: Elaborado pelo EduGera.</p>
            </div>
          )}
          <p className="mt-2 text-[12.5px] font-semibold">
            <Tx>{it.comando}</Tx>
          </p>
          <ol className="mt-2 space-y-1 pl-1 text-[12.5px]">
            {it.alternativas.map((a, j) => (
              <li key={j} className="flex gap-2">
                <span className="w-5 flex-none font-bold">({LETRAS[j]})</span>
                <span>
                  <Tx>{a}</Tx>
                </span>
              </li>
            ))}
          </ol>
        </section>
      ))}

      {cartao && itens.length > 0 && <Cartao itens={itens} gabarito={professor} />}

      {professor && itens.length > 0 && (
        <>
          <section className="quebra-antes bloco-exercicio rounded-xl border-2 border-slate-300 p-4">
            <p className="text-[13px] font-extrabold uppercase tracking-wider text-slate-800">Gabarito e matriz da avaliação</p>
            <table className="mt-3 w-full border-collapse text-[11.5px]">
              <thead>
                <tr className="bg-slate-100 text-left text-slate-700">
                  <th className="border border-slate-300 px-2 py-1">Questão</th>
                  <th className="border border-slate-300 px-2 py-1">Resposta</th>
                  <th className="border border-slate-300 px-2 py-1">Habilidade</th>
                  <th className="border border-slate-300 px-2 py-1">O que avalia</th>
                  <th className="border border-slate-300 px-2 py-1">Nível</th>
                </tr>
              </thead>
              <tbody>
                {itens.map((it, i) => (
                  <tr key={i}>
                    <td className="border border-slate-300 px-2 py-1 font-bold">{dois(i + 1)}</td>
                    <td className="border border-slate-300 px-2 py-1 text-center font-extrabold">{it.correta || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1 font-mono text-[10.5px]">{it.habilidade?.codigo || "—"}</td>
                    <td className="border border-slate-300 px-2 py-1"><Tx>{it.descritor || "—"}</Tx></td>
                    <td className="border border-slate-300 px-2 py-1">{ROTULO_DIFICULDADE[it.dificuldade] || "—"}</td>
                  </tr>
                ))}
              </tbody>
            </table>
            {habilidades.length > 0 && (
              <div className="mt-3 text-[11.5px] text-slate-700">
                <p className="font-bold text-slate-800">Questões por habilidade</p>
                <ul className="mt-1 list-disc pl-5">
                  {habilidades.map((h) => (
                    <li key={h.codigo}>
                      <b className="font-mono">{h.codigo}</b>: questões {h.itens.map(dois).join(", ")}
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </section>
          {itens.map((it, i) => (
            <section key={`r${i}`} className="bloco-exercicio mt-3 rounded-xl border border-slate-200 px-4 py-3 text-[12px]">
              <p className="font-extrabold text-slate-900">
                Questão {dois(i + 1)} · resposta {it.correta || "—"}
              </p>
              {it.figura && it.leituraFigura && (
                <p className="mt-1">
                  <b>O que ler na Figura {numFigura[i]}:</b> <Tx>{it.leituraFigura}</Tx>
                </p>
              )}
              {it.resolucao && (
                <p className="mt-1">
                  <b>Resolução:</b> <Tx>{it.resolucao}</Tx>
                </p>
              )}
              {Object.keys(it.distratores || {}).length > 0 && (
                <div className="mt-1.5">
                  <p className="font-bold">Quem marcou outra letra provavelmente:</p>
                  <ul className="mt-0.5 space-y-0.5">
                    {LETRAS.filter((l) => it.distratores[l]).map((l) => (
                      <li key={l}>
                        <b>({l})</b> <Tx>{it.distratores[l]}</Tx>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </section>
          ))}
        </>
      )}

      <footer className="rodape-material mt-5 border-t border-slate-100 pt-2 text-center text-[10px] text-slate-500">
        Avaliação gerada com EduGera · padrão Prova Paulista/SARESP{professor ? " · versão do professor" : ""} · revise antes de aplicar
      </footer>
    </article>
  );
});

export default FolhaAvaliacao;
