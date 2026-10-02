import React from "react";
import { CookingPot, ShoppingCart, School, Trees, House, Signpost, Store, FlaskConical, Library, Volleyball, MessagesSquare, CircleHelp } from "lucide-react";
import Tx from "@/components/Tx";
import FiguraDidatica from "@/components/FiguraDidatica";
import { PERSONAGENS } from "@/lib/cena";

// Cena do cotidiano: personagens fixos do EduGera conversando em balões sobre
// a situação e sobre a figura do conteúdo. Tudo em SVG/HTML simples (o
// html2canvas do PDF desenha igual à tela) e com contorno escuro para P&B.

const LUGAR = {
  cozinha: { icone: CookingPot, rotulo: "Na cozinha" },
  mercado: { icone: ShoppingCart, rotulo: "No mercado" },
  escola: { icone: School, rotulo: "Na escola" },
  parque: { icone: Trees, rotulo: "No parque" },
  casa: { icone: House, rotulo: "Em casa" },
  rua: { icone: Signpost, rotulo: "Na rua" },
  feira: { icone: Store, rotulo: "Na feira" },
  laboratorio: { icone: FlaskConical, rotulo: "No laboratório" },
  biblioteca: { icone: Library, rotulo: "Na biblioteca" },
  quadra: { icone: Volleyball, rotulo: "Na quadra" },
};

const T = "#1e293b"; // contorno

// Bustos dos personagens (originais), 64×64
function Rosto({ quem, tamanho = 56 }) {
  const comum = { width: tamanho, height: tamanho, viewBox: "0 0 64 64", "aria-hidden": true, className: "flex-none" };
  const olhos = (y = 31, dx = 7) => (
    <>
      <circle cx={32 - dx} cy={y} r="2.3" fill={T} />
      <circle cx={32 + dx} cy={y} r="2.3" fill={T} />
    </>
  );
  const sorriso = (y = 39) => <path d={`M25 ${y} Q32 ${y + 6} 39 ${y}`} fill="none" stroke={T} strokeWidth="2.2" strokeLinecap="round" />;
  switch (quem) {
    case "lia":
      return (
        <svg {...comum}>
          <circle cx="32" cy="32" r="31" fill="#fef3c7" />
          <path d="M8 64 Q10 48 32 47 Q54 48 56 64Z" fill="#facc15" stroke={T} strokeWidth="2" />
          <circle cx="20" cy="20" r="10" fill="#3f2a1d" stroke={T} strokeWidth="2" />
          <circle cx="44" cy="20" r="10" fill="#3f2a1d" stroke={T} strokeWidth="2" />
          <circle cx="32" cy="33" r="15" fill="#a0673f" stroke={T} strokeWidth="2" />
          <path d="M17 30 Q20 15 32 16 Q44 15 47 30 Q40 22 32 23 Q24 22 17 30Z" fill="#3f2a1d" />
          {olhos(33, 6)}
          {sorriso(38)}
          <circle cx="22" cy="38" r="2.5" fill="#f472b6" opacity=".6" />
          <circle cx="42" cy="38" r="2.5" fill="#f472b6" opacity=".6" />
        </svg>
      );
    case "theo":
      return (
        <svg {...comum}>
          <circle cx="32" cy="32" r="31" fill="#dbeafe" />
          <path d="M8 64 Q10 48 32 47 Q54 48 56 64Z" fill="#3b82f6" stroke={T} strokeWidth="2" />
          <circle cx="32" cy="33" r="15" fill="#f5c9a0" stroke={T} strokeWidth="2" />
          <path d="M16 29 L19 16 L24 22 L28 13 L32 21 L37 13 L40 22 L45 16 L48 29 Q40 21 32 22 Q24 21 16 29Z" fill="#ea7a2d" stroke={T} strokeWidth="1.6" strokeLinejoin="round" />
          <circle cx="25.5" cy="33" r="5" fill="none" stroke={T} strokeWidth="1.8" />
          <circle cx="38.5" cy="33" r="5" fill="none" stroke={T} strokeWidth="1.8" />
          <line x1="30.5" y1="33" x2="33.5" y2="33" stroke={T} strokeWidth="1.8" />
          {olhos(33, 6.5)}
          <path d="M27 41 Q32 43 37 40" fill="none" stroke={T} strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );
    case "vo":
      return (
        <svg {...comum}>
          <circle cx="32" cy="32" r="31" fill="#f3e8ff" />
          <path d="M8 64 Q10 48 32 47 Q54 48 56 64Z" fill="#a855f7" stroke={T} strokeWidth="2" />
          <path d="M26 64 L32 50 L38 64" fill="#f3e8ff" stroke={T} strokeWidth="1.6" />
          <circle cx="32" cy="12" r="7" fill="#cbd5e1" stroke={T} strokeWidth="2" />
          <circle cx="32" cy="33" r="15" fill="#e8b48a" stroke={T} strokeWidth="2" />
          <path d="M17 31 Q18 17 32 17 Q46 17 47 31 Q44 23 32 23 Q20 23 17 31Z" fill="#cbd5e1" stroke={T} strokeWidth="1.6" />
          <rect x="21" y="29" width="9" height="7" rx="3" fill="none" stroke={T} strokeWidth="1.8" />
          <rect x="34" y="29" width="9" height="7" rx="3" fill="none" stroke={T} strokeWidth="1.8" />
          <line x1="30" y1="32" x2="34" y2="32" stroke={T} strokeWidth="1.8" />
          {olhos(32.5, 6.5)}
          {sorriso(39)}
        </svg>
      );
    default: // edu
      return (
        <svg {...comum}>
          <circle cx="32" cy="32" r="31" fill="#e0e7ff" />
          <path d="M8 64 Q10 48 32 47 Q54 48 56 64Z" fill="#4f46e5" stroke={T} strokeWidth="2" />
          <path d="M28 47 L32 56 L36 47" fill="#fff" stroke={T} strokeWidth="1.6" />
          <circle cx="32" cy="32" r="15" fill="#c68a5e" stroke={T} strokeWidth="2" />
          <path d="M17 29 Q18 15 32 16 Q46 15 47 29 Q42 21 32 21 Q22 21 17 29Z" fill="#1f2937" />
          <path d="M18 34 Q20 48 32 48 Q44 48 46 34 Q42 42 32 42 Q22 42 18 34Z" fill="#1f2937" />
          {olhos(31, 6)}
          <path d="M27 38 Q32 41 37 38" fill="none" stroke="#fff" strokeWidth="2" strokeLinecap="round" />
        </svg>
      );
  }
}

function Fala({ quem, texto, lado }) {
  const p = PERSONAGENS[quem] || PERSONAGENS.edu;
  const direita = lado === "direita";
  return (
    <div className={`flex items-end gap-2 ${direita ? "flex-row-reverse" : ""}`}>
      <div className="flex w-[62px] flex-none flex-col items-center">
        <Rosto quem={quem} />
        <span className="mt-0.5 text-[10px] font-extrabold text-slate-700">{p.nome}</span>
      </div>
      <div className={`relative mb-4 max-w-[78%] rounded-2xl border-2 border-slate-700 bg-white px-3 py-2 text-[12px] leading-snug text-slate-800`}>
        <Tx>{texto}</Tx>
        {/* rabinho do balão (SVG: o html2canvas não desenha bordas em triângulo) */}
        <svg width="14" height="12" viewBox="0 0 14 12" aria-hidden="true" className={`absolute -bottom-[10px] ${direita ? "right-4" : "left-4"}`}>
          <path d={direita ? "M0 0 L14 0 L12 11Z" : "M0 0 L14 0 L2 11Z"} fill="#fff" stroke="#334155" strokeWidth="2" strokeLinejoin="round" />
          <rect x="1" y="-2" width="12" height="3" fill="#fff" />
        </svg>
      </div>
    </div>
  );
}

export default function CenaCotidiano({ cena }) {
  if (!cena?.falas?.length) return null;
  const lugar = LUGAR[cena.lugar] || LUGAR.casa;
  const Icone = lugar.icone;
  // o primeiro a falar fica à esquerda; o outro, à direita (como numa tirinha)
  const primeiro = cena.falas[0].quem;
  const metade = Math.ceil(cena.falas.length / 2);
  return (
    <section className="cena-cotidiano bloco-exercicio mt-3 overflow-hidden rounded-2xl border-2 border-indigo-200 bg-gradient-to-b from-sky-50 to-white">
      <div className="flex items-center justify-between gap-2 bg-indigo-600 px-3.5 py-1.5 text-white">
        <div className="flex items-center gap-1.5">
          <MessagesSquare className="h-4 w-4" strokeWidth={2.4} />
          <span className="text-[11px] font-extrabold uppercase tracking-wider">Situação do cotidiano</span>
          {cena.titulo && <span className="text-[12px] font-bold normal-case">· {cena.titulo}</span>}
        </div>
        <span className="flex items-center gap-1 rounded-full bg-white/15 px-2 py-0.5 text-[10.5px] font-bold">
          <Icone className="h-3.5 w-3.5" /> {lugar.rotulo}
        </span>
      </div>
      <div className="space-y-1 px-3.5 pb-2 pt-3">
        {cena.falas.slice(0, metade).map((f, i) => (
          <Fala key={i} quem={f.quem} texto={f.texto} lado={f.quem === primeiro ? "esquerda" : "direita"} />
        ))}
        {/* a figura do conteúdo no meio da conversa: é dela que os personagens falam */}
        {cena.figura && (
          <div className="mx-auto my-1 flex w-fit justify-center rounded-xl border border-dashed border-indigo-300 bg-white px-3 py-2">
            <FiguraDidatica figura={cena.figura} />
          </div>
        )}
        {cena.falas.slice(metade).map((f, i) => (
          <Fala key={metade + i} quem={f.quem} texto={f.texto} lado={f.quem === primeiro ? "esquerda" : "direita"} />
        ))}
      </div>
      {cena.pergunta && (
        <div className="flex items-start gap-2 border-t border-indigo-100 bg-indigo-50 px-3.5 py-2 text-[12px] font-semibold text-indigo-800">
          <CircleHelp className="mt-0.5 h-4 w-4 flex-none" />
          <span>
            <Tx>{cena.pergunta}</Tx>
          </span>
        </div>
      )}
    </section>
  );
}
