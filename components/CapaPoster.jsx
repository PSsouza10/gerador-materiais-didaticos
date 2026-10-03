"use client";
import React, { forwardRef, useRef } from "react";
import { useAjusteAoCaber } from "@/lib/ajuste";
import Tx from "@/components/Tx";
import { Rosto } from "@/components/CenaCotidiano";
import { elencoDaCena } from "@/lib/cena";
import { bnccDoMaterial, rodapeBncc } from "@/lib/material";

// Capa "pôster 3D": fundo creme, paleta azul-petróleo + coral, título em letras
// grossas arredondadas com contorno e sombra (efeito 3D), mascote 3D da IA à
// esquerda e os conceitos do material em blocos com rótulo e explicação, mais um
// quadro-resumo em forma de calendário de argolas. Todo texto é HTML real
// (a IA de imagem erra palavras: só desenha o mascote e os objetos).
// Só usa recursos que o html2canvas desenha bem (sem blur/backdrop-filter).

const CREME = "#f6eedc";
const PETROLEO = "#1f5f6e";
const PETROLEO_ESCURO = "#163f4a";
const CORAL = "#e8805a";
const CONTORNO_COR = "#173a44";
const FONTE = "'Fredoka', 'Baloo 2', system-ui, sans-serif";

// contorno escuro + "profundidade" para baixo, como letras 3D
const sombra3D = (px, prof) =>
  [
    `0 ${px}px 0 ${CONTORNO_COR}`, `${px}px 0 0 ${CONTORNO_COR}`, `-${px}px 0 0 ${CONTORNO_COR}`, `0 -${px}px 0 ${CONTORNO_COR}`,
    `${px * 0.7}px ${px * 0.7}px 0 ${CONTORNO_COR}`, `-${px * 0.7}px ${px * 0.7}px 0 ${CONTORNO_COR}`,
    `${px * 0.7}px -${px * 0.7}px 0 ${CONTORNO_COR}`, `-${px * 0.7}px -${px * 0.7}px 0 ${CONTORNO_COR}`,
    ...Array.from({ length: prof }, (_, i) => `0 ${px + i + 1}px 0 ${CONTORNO_COR}`),
    `0 ${px + prof + 6}px 10px rgba(23,58,68,.25)`,
  ].join(", ");

// Título em duas cores: começo em azul-petróleo, fim em coral (como "NÚMEROS NO DIA A DIA: QUANTIDADE...")
function Titulo({ texto, tamanho }) {
  const [a, b] = (() => {
    const i = texto.indexOf(":");
    if (i > 0 && i < texto.length - 2) return [texto.slice(0, i + 1), texto.slice(i + 1).trim()];
    const p = texto.split(/\s+/);
    const meio = Math.ceil(p.length / 2);
    return [p.slice(0, meio).join(" "), p.slice(meio).join(" ")];
  })();
  const s = sombra3D(Math.max(2.5, tamanho / 20), Math.max(3, Math.round(tamanho / 14)));
  return (
    <h2 aria-label={texto} className="text-center uppercase" style={{ fontFamily: FONTE, fontWeight: 700, fontSize: tamanho, lineHeight: 1.12, letterSpacing: "0.01em" }}>
      <span style={{ color: PETROLEO, textShadow: s }}>{a}</span>
      {b && (
        <>
          <br />
          <span style={{ color: CORAL, textShadow: s }}>{b}</span>
        </>
      )}
    </h2>
  );
}

// "5º ANO" grande, como o selo da série dos pôsteres
function SeloSerie({ form }) {
  const ano = form.ano ? (form.ano.startsWith("EM") ? `${form.ano.slice(2)}ª SÉRIE` : `${form.ano}º ANO`) : "";
  return (
    <div className="text-right" style={{ fontFamily: FONTE }}>
      {ano && (
        <p style={{ fontSize: 46, fontWeight: 700, lineHeight: 1, color: CORAL, textShadow: sombra3D(2.5, 3) }}>{ano}</p>
      )}
      <p className="mt-3 text-[13px] font-semibold" style={{ color: PETROLEO_ESCURO }}>
        {form.disciplina}
        {form.nivel ? ` · ${form.nivel}` : ""}
      </p>
    </div>
  );
}

// Bloco de conceito: RÓTULO em petróleo + (explicação) com bolinha 3D numerada
function Conceito({ c, i }) {
  const cores = [CORAL, PETROLEO, "#e7b04a", "#5a9e7c"];
  const cor = cores[i % cores.length];
  return (
    <div className="flex items-start gap-3">
      <svg width="40" height="40" viewBox="0 0 40 40" aria-hidden="true" className="flex-none">
        <circle cx="20" cy="22" r="17" fill={CONTORNO_COR} />
        <circle cx="20" cy="19" r="17" fill={cor} stroke={CONTORNO_COR} strokeWidth="2.5" />
        <ellipse cx="14" cy="12" rx="6" ry="3.5" fill="#fff" opacity=".35" />
        <text x="20" y="25" textAnchor="middle" fontSize="17" fontWeight="700" fill="#fff" fontFamily="Fredoka, system-ui, sans-serif">{i + 1}</text>
      </svg>
      <div className="min-w-0">
        <p className="uppercase leading-tight" style={{ fontFamily: FONTE, fontWeight: 700, fontSize: 19, color: PETROLEO_ESCURO }}>
          {c.termo}
        </p>
        <p className="text-[12.5px] leading-snug" style={{ color: "#3c4f55" }}>
          (<Tx>{c.definicao}</Tx>)
        </p>
      </div>
    </div>
  );
}

// Quadro-resumo em forma de calendário de argolas (cabeçalho petróleo/coral)
function QuadroResumo({ linhas }) {
  return (
    <div className="relative pt-3">
      <svg className="absolute inset-x-0 top-0" height="22" width="100%" aria-hidden="true">
        {[0.12, 0.24, 0.36, 0.64, 0.76, 0.88].map((x, i) => (
          <g key={i}>
            <rect x={`${x * 100}%`} y="0" width="7" height="20" rx="3.5" fill="#c98a3b" stroke={CONTORNO_COR} strokeWidth="1.5" />
          </g>
        ))}
      </svg>
      <div className="overflow-hidden rounded-xl" style={{ border: `3px solid ${CONTORNO_COR}`, boxShadow: `0 6px 0 ${CONTORNO_COR}` }}>
        <div className="flex h-4">
          <div className="flex-1" style={{ background: "#5a9e7c" }} />
          <div className="flex-1" style={{ background: CORAL }} />
        </div>
        <table className="w-full border-collapse bg-white text-[12px]">
          <tbody>
            {linhas.map(([k, v], i) => (
              <tr key={i} style={{ borderTop: i ? `2px solid ${CONTORNO_COR}` : `2px solid ${CONTORNO_COR}` }}>
                <th className="w-[42%] px-2.5 py-1.5 text-left text-[11px] uppercase leading-tight text-white" style={{ background: PETROLEO, fontFamily: FONTE, fontWeight: 600 }}>
                  <Tx>{k}</Tx>
                </th>
                <td className="px-2.5 py-1.5 font-semibold leading-tight" style={{ color: PETROLEO_ESCURO }}>
                  <Tx>{v}</Tx>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}

// Selo redondo do EduGera no rodapé (como o selo dos pôsteres)
function Selo() {
  return (
    <svg width="92" height="92" viewBox="0 0 92 92" aria-hidden="true">
      <circle cx="46" cy="46" r="44" fill="#ece3cf" stroke="#c9bda3" strokeWidth="2" />
      <circle cx="46" cy="46" r="36" fill={CREME} stroke="#c9bda3" strokeWidth="1.5" strokeDasharray="3 3" />
      <text x="46" y="44" textAnchor="middle" fontSize="17" fontWeight="700" fill={PETROLEO_ESCURO} fontFamily="Fredoka, system-ui, sans-serif">Edu</text>
      <text x="46" y="62" textAnchor="middle" fontSize="17" fontWeight="700" fill={CORAL} fontFamily="Fredoka, system-ui, sans-serif">Gera</text>
    </svg>
  );
}

const limpa = (s, n) => (typeof s === "string" ? s.replace(/\s+/g, " ").trim().slice(0, n) : "");

const CapaPoster = forwardRef(function CapaPoster({ form, material, urlImagem, exemplo = false }, ref) {
  const m = material || {};
  const bncc = bnccDoMaterial(form, m);
  const titulo = form.tema ? m.tituloDidatico || form.tema : "Tema Principal";
  const conceitos = (m.conceitos || []).filter((c) => c.termo && c.termo !== "—").slice(0, 3);
  // quadro: fórmulas/regras (nome → expressão) ou exemplos práticos
  const linhas = [
    ...(m.formulas || []).filter((f) => f.expressao).map((f) => [limpa(f.nome || "Regra", 28), limpa(f.expressao, 40)]),
    ...(m.aplicacaoPratica?.exemplos || []).map((e, i) => [`Exemplo ${i + 1}`, limpa(e, 40)]),
  ].slice(0, 3);
  const chamada = limpa(m.cena?.pergunta || "", 130);
  const elenco = elencoDaCena(m.cena).slice(0, 2);

  const caixa = useRef(null);
  const ajuste = useAjusteAoCaber(caixa, `${titulo}|${JSON.stringify(conceitos)}|${JSON.stringify(linhas)}|${chamada}`);
  const base = titulo.length <= 24 ? 66 : titulo.length <= 44 ? 56 : titulo.length <= 70 ? 46 : 36;
  const tamanho = ajuste >= 2 ? Math.round(base * 0.85) : base;

  return (
    <section
      ref={ref}
      className="capa-a4 relative overflow-hidden font-sans"
      style={{ width: "210mm", height: "297mm", background: `radial-gradient(ellipse at 50% 35%, #fbf6ea 0%, ${CREME} 60%, #efe4cc 100%)` }}
    >
      {/* escola / professor */}
      <div className="absolute inset-x-12 top-[40px] flex items-center justify-between text-[11.5px]" style={{ color: PETROLEO_ESCURO }}>
        <span className="font-bold">{form.escola || "Material didático"}{form.professor ? ` · ${form.professor}` : ""}</span>
        {exemplo && <span className="rounded-full bg-amber-400 px-2.5 py-0.5 text-[10.5px] font-black text-amber-950">EXEMPLO</span>}
      </div>

      <div ref={caixa} className="absolute inset-x-10 top-[52px] bottom-[180px] flex flex-col justify-evenly overflow-hidden">
        <Titulo texto={titulo} tamanho={tamanho} />

        {/* mascote 3D (IA) + selo da série e conceitos */}
        <div className="mt-4 grid flex-none grid-cols-[340px_1fr] items-center gap-5">
          <div className="relative" style={{ height: 380 }}>
            {urlImagem ? (
              <div
                className="absolute inset-0 rounded-[24px]"
                role="img"
                aria-label={`Ilustração 3D sobre ${form.tema || "o tema"}`}
                style={{ backgroundImage: `url(${urlImagem})`, backgroundSize: "cover", backgroundPosition: "center" }}
              />
            ) : (
              // sem ilustração: a turma do EduGera reunida (sem quadro vazio por trás)
              <div className="absolute inset-0 flex flex-col items-center justify-center gap-3">
                <div className="flex -space-x-3">
                  {["lia", "edu", "vo", "theo"].map((q, i) => (
                    <div key={q} className="rounded-full p-1" style={{ background: CREME, marginTop: i % 2 ? 36 : 0 }}>
                      <Rosto quem={q} tamanho={i === 1 ? 100 : 80} />
                    </div>
                  ))}
                </div>
                <p className="text-center text-[12px] font-bold uppercase tracking-wider" style={{ color: PETROLEO, fontFamily: FONTE }}>
                  Lia · Prof. Edu · Vó Ana · Théo
                </p>
              </div>
            )}
            {/* esmaece as bordas da ilustração no creme (sem "foto colada") */}
            {/* bordas esmaecidas com gradientes lineares (o html2canvas do PDF desenha "inset box-shadow"
                como um bloco sólido por cima da imagem — era o quadro creme que cobria o mascote) */}
            {urlImagem && (
              <>
                <div className="absolute inset-x-0 top-0 h-8" style={{ background: `linear-gradient(180deg, ${CREME}, rgba(246,238,220,0))` }} />
                <div className="absolute inset-x-0 bottom-0 h-8" style={{ background: `linear-gradient(0deg, ${CREME}, rgba(246,238,220,0))` }} />
                <div className="absolute inset-y-0 left-0 w-8" style={{ background: `linear-gradient(90deg, ${CREME}, rgba(246,238,220,0))` }} />
                <div className="absolute inset-y-0 right-0 w-8" style={{ background: `linear-gradient(270deg, ${CREME}, rgba(246,238,220,0))` }} />
              </>
            )}
          </div>
          <div className="flex flex-col gap-5">
            <SeloSerie form={form} />
            {conceitos.map((c, i) => (
              <Conceito key={i} c={c} i={i} />
            ))}
          </div>
        </div>

        {/* quadro-resumo + chamada dos personagens */}
        <div className={`mt-4 grid flex-none items-end gap-5 ${linhas.length && chamada ? "grid-cols-[1fr_1fr]" : "grid-cols-1"}`}>
          {chamada && (
            <div className="flex items-end gap-2">
              <div className="flex flex-none -space-x-3">
                {elenco.map((q) => (
                  <div key={q} className="rounded-full p-0.5" style={{ background: CREME }}>
                    <Rosto quem={q} tamanho={54} />
                  </div>
                ))}
              </div>
              <div className="relative mb-5 rounded-2xl bg-white px-3 py-2 text-[12.5px] font-semibold leading-snug" style={{ border: `2.5px solid ${CONTORNO_COR}`, color: PETROLEO_ESCURO }}>
                <Tx>{chamada}</Tx>
              </div>
            </div>
          )}
          {linhas.length > 0 && <QuadroResumo linhas={linhas} />}
        </div>
      </div>

      {bncc?.codigo && (
        <p className="absolute inset-x-10 bottom-[136px] text-center text-[11px] leading-snug" style={{ color: PETROLEO_ESCURO }}>
          <b>{bncc.verificada ? `BNCC ${bncc.codigo}` : `Habilidade ${bncc.codigo}`}</b>
          {bncc.texto ? ` — ${limpa(bncc.texto, 170)}` : ""}
        </p>
      )}

      {/* identificação do aluno */}
      <div className="absolute inset-x-10 bottom-[100px] grid grid-cols-[1fr_120px_130px] gap-4 text-[11.5px]" style={{ color: PETROLEO_ESCURO }}>
        <span className="border-b-2 pb-1" style={{ borderColor: "#c9bda3" }}>Nome:</span>
        <span className="border-b-2 pb-1" style={{ borderColor: "#c9bda3" }}>Turma:</span>
        <span className="border-b-2 pb-1" style={{ borderColor: "#c9bda3" }}>Data: ___/___/___</span>
      </div>

      {/* faixa petróleo com o selo */}
      <div className="absolute inset-x-0 bottom-0 h-[64px]" style={{ background: PETROLEO_ESCURO }} />
      <div className="absolute bottom-[30px] left-1/2 -translate-x-1/2">
        <Selo />
      </div>
      <p className="absolute bottom-[30px] left-12 max-w-[230px] text-[9.5px] leading-tight text-white/80">{rodapeBncc(bncc, exemplo)}</p>
    </section>
  );
});

export default CapaPoster;
