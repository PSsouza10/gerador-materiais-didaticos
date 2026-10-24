"use client";
import { useMemo, useRef, useState } from "react";
import { Download, Loader2 } from "lucide-react";
import { localizarErros } from "@/lib/redacaoFoto";
import { desenhoDaMarca, notaDaMarca, TINTA, FONTE_MAO } from "./desenho";

// A redação do aluno, na própria foto, corrigida "à mão": erro circulado ou sublinhado em
// vermelho, a correção escrita acima em letra cursiva, a nota circulada no alto e um bilhete
// do professor no fim. As marcas podem ser arrastadas se caírem fora do lugar.
// Nada aqui vai para o servidor: a foto fica só no aparelho.
const virgula = (n) => String(n).replace(".", ",");
const MAO = `'${FONTE_MAO}', 'Segoe Print', 'Bradley Hand', cursive`;

export default function FolhaCorrigida({ fotos, paginas, resultado }) {
  const marcas = useMemo(() => localizarErros(paginas, resultado.errosPortugues), [paginas, resultado]);
  const [desloc, setDesloc] = useState({});
  const [baixando, setBaixando] = useState(false);
  const arraste = useRef(null);
  const semLugar = resultado.errosPortugues.filter((_, k) => !marcas.some((m) => m.erro === k));

  function iniciar(e, k, svg, W) {
    e.preventDefault();
    const escala = W / svg.getBoundingClientRect().width;
    const ini = desloc[k] || { dx: 0, dy: 0 };
    arraste.current = { k, x: e.clientX, y: e.clientY, ini, escala };
    e.currentTarget.setPointerCapture?.(e.pointerId);
  }
  function mover(e) {
    const a = arraste.current;
    if (!a) return;
    setDesloc((d) => ({ ...d, [a.k]: { dx: a.ini.dx + (e.clientX - a.x) * a.escala, dy: a.ini.dy + (e.clientY - a.y) * a.escala } }));
  }
  const soltar = () => (arraste.current = null);

  async function baixar() {
    setBaixando(true);
    try {
      await document.fonts?.load?.(`48px ${FONTE_MAO}`).catch(() => {});
      const { jsPDF } = await import("jspdf");
      const pdf = new jsPDF({ unit: "mm", format: "a4" });
      for (let p = 0; p < fotos.length; p++) {
        const c = await paginaEmCanvas(fotos[p], p, marcas, desloc, resultado);
        if (p) pdf.addPage();
        colocar(pdf, c);
      }
      pdf.addPage();
      colocar(pdf, bilheteEmCanvas(resultado, semLugar));
      pdf.save("redacao-corrigida.pdf");
    } finally {
      setBaixando(false);
    }
  }

  return (
    <div className="mt-6">
      {/* eslint-disable-next-line @next/next/no-page-custom-font */}
      <link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Caveat:wght@500;700&display=swap" />
      <div className="flex flex-wrap items-center justify-between gap-2">
        <h2 className="font-bold text-slate-900">Folha corrigida</h2>
        <button type="button" onClick={baixar} disabled={baixando} className="inline-flex items-center gap-2 rounded-xl border border-slate-300 px-3 py-1.5 text-sm font-semibold text-slate-800 hover:border-indigo-300">
          {baixando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Download className="h-4 w-4" />} Baixar PDF
        </button>
      </div>
      <p className="mt-1 text-xs text-slate-500">Marca fora do lugar? Arraste com o dedo ou o mouse.</p>
      {fotos.map((f, p) => (
        <Pagina key={p} foto={f} p={p} marcas={marcas.filter((m) => m.pagina === p)} resultado={resultado} desloc={desloc} iniciar={iniciar} mover={mover} soltar={soltar} />
      ))}
      <Bilhete resultado={resultado} semLugar={semLugar} />
    </div>
  );
}

function Pagina({ foto, p, marcas, resultado, desloc, iniciar, mover, soltar }) {
  const ref = useRef(null);
  const { w: W, h: H } = foto;
  return (
    <div className="relative mt-3 overflow-hidden rounded-xl border border-slate-200 shadow-sm">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={foto.url} alt={`Página ${p + 1} da redação`} className="block w-full select-none" draggable={false} />
      <svg ref={ref} viewBox={`0 0 ${W} ${H}`} className="absolute inset-0 h-full w-full touch-none" onPointerMove={mover} onPointerUp={soltar} onPointerCancel={soltar}>
        {marcas.map((m) => {
          const erro = resultado.errosPortugues[m.erro];
          const g = desenhoDaMarca(m, erro.tipo, W, H, m.erro, desloc[m.erro]);
          return (
            <g key={m.erro} onPointerDown={(e) => iniciar(e, m.erro, ref.current, W)} style={{ cursor: "grab" }}>
              <title>{`${erro.tipo}: ${erro.correcao}`}</title>
              {g.forma === "circulo" ? (
                <ellipse cx={g.cx} cy={g.cy} rx={g.rx} ry={g.ry} transform={`rotate(${g.rot} ${g.cx} ${g.cy})`} fill="none" stroke={TINTA} strokeWidth={g.traco} />
              ) : (
                <path d={g.d} fill="none" stroke={TINTA} strokeWidth={g.traco} strokeLinecap="round" />
              )}
              <rect x={g.x1} y={g.y1 - g.fonte * 1.1} width={Math.max(g.x2 - g.x1, g.fonte * 3)} height={g.fonte * 2.2} fill="transparent" />
              <text x={g.textoX} y={g.textoY} fill={TINTA} fontFamily={MAO} fontSize={g.fonte} fontWeight={700}>
                {notaDaMarca(erro)}
              </text>
            </g>
          );
        })}
        {p === 0 && <NotaCirculada W={W} H={H} resultado={resultado} />}
      </svg>
    </div>
  );
}

function NotaCirculada({ W, H, resultado }) {
  const f = Math.min(W, H) / 15;
  const cx = W - f * 2.2;
  const cy = f * 1.5;
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={f * 1.9} ry={f * 1.05} transform={`rotate(-6 ${cx} ${cy})`} fill="rgba(255,255,255,0.55)" stroke={TINTA} strokeWidth={Math.max(3, f / 14)} />
      <text x={cx} y={cy + f * 0.32} textAnchor="middle" fill={TINTA} fontFamily={MAO} fontSize={f} fontWeight={700}>
        {virgula(resultado.notaTotal)}
      </text>
      <text x={cx + f * 1.45} y={cy + f * 0.95} textAnchor="middle" fill={TINTA} fontFamily={MAO} fontSize={f * 0.4} fontWeight={700}>
        /{resultado.notaMaxima}
      </text>
    </g>
  );
}

function linhasDoBilhete(r, semLugar) {
  const faltam = r.elementos?.faltam || [];
  return [
    ...(r.bilhete ? [r.bilhete] : []),
    ...r.criterios.map((c) => `${c.nome.split(/[(:]/)[0].trim()}: ${virgula(c.nota)} de ${virgula(c.max)}`),
    ...(faltam.length ? [`${r.elementos.titulo}: faltou ${faltam.join(", ")}.`] : []),
    ...semLugar.slice(0, 6).map((e) => `"${e.trecho}" → ${e.correcao}`),
    ...(r.proximoPasso ? [`Para a próxima: ${r.proximoPasso}`] : []),
  ];
}

function Bilhete({ resultado: r, semLugar }) {
  return (
    <div
      className="mt-4 rounded-xl border border-amber-200 p-5 shadow-sm"
      style={{ background: "repeating-linear-gradient(#fffbea, #fffbea 33px, #e8dcc0 34px)", fontFamily: MAO, color: TINTA, fontSize: 24, lineHeight: "34px" }}
    >
      <p style={{ fontSize: 30, fontWeight: 700 }}>
        Nota: {virgula(r.notaTotal)} / {r.notaMaxima}
      </p>
      {linhasDoBilhete(r, semLugar).map((l, i) => (
        <p key={i}>{l}</p>
      ))}
      <p className="mt-2 font-sans text-[11px] leading-4 text-slate-500">{r.aviso}</p>
    </div>
  );
}

// ---------- exportação (canvas → PDF), mesma geometria da tela ----------
function carregar(url) {
  return new Promise((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = falha;
    i.src = url;
  });
}

async function paginaEmCanvas(foto, p, marcas, desloc, r) {
  const img = await carregar(foto.url);
  const { w: W, h: H } = foto;
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.drawImage(img, 0, 0, W, H);
  x.strokeStyle = x.fillStyle = TINTA;
  for (const m of marcas.filter((m) => m.pagina === p)) {
    const erro = r.errosPortugues[m.erro];
    const g = desenhoDaMarca(m, erro.tipo, W, H, m.erro, desloc[m.erro]);
    x.lineWidth = g.traco;
    x.beginPath();
    if (g.forma === "circulo") x.ellipse(g.cx, g.cy, g.rx, g.ry, (g.rot * Math.PI) / 180, 0, 2 * Math.PI);
    else x.stroke(new Path2D(g.d));
    x.stroke();
    x.font = `700 ${g.fonte}px ${MAO}`;
    x.fillText(notaDaMarca(erro), g.textoX, g.textoY);
  }
  if (p === 0) {
    const f = Math.min(W, H) / 15;
    const cx = W - f * 2.2;
    const cy = f * 1.5;
    x.lineWidth = Math.max(3, f / 14);
    x.beginPath();
    x.ellipse(cx, cy, f * 1.9, f * 1.05, (-6 * Math.PI) / 180, 0, 2 * Math.PI);
    x.stroke();
    x.textAlign = "center";
    x.font = `700 ${f}px ${MAO}`;
    x.fillText(virgula(r.notaTotal), cx, cy + f * 0.32);
    x.font = `700 ${f * 0.4}px ${MAO}`;
    x.fillText(`/${r.notaMaxima}`, cx + f * 1.45, cy + f * 0.95);
  }
  return c;
}

function bilheteEmCanvas(r, semLugar) {
  const W = 1240;
  const H = 1754; // A4 em 150 dpi
  const c = document.createElement("canvas");
  c.width = W;
  c.height = H;
  const x = c.getContext("2d");
  x.fillStyle = "#fffbea";
  x.fillRect(0, 0, W, H);
  x.strokeStyle = "#e8dcc0";
  for (let y = 140; y < H; y += 56) {
    x.beginPath();
    x.moveTo(60, y);
    x.lineTo(W - 60, y);
    x.stroke();
  }
  x.fillStyle = TINTA;
  x.font = `700 60px ${MAO}`;
  x.fillText(`Nota: ${virgula(r.notaTotal)} / ${r.notaMaxima}`, 80, 120);
  x.font = `500 40px ${MAO}`;
  let y = 188;
  for (const linha of linhasDoBilhete(r, semLugar))
    for (const parte of quebrar(x, linha, W - 160)) {
      if (y > H - 120) break;
      x.fillText(parte, 80, y);
      y += 56;
    }
  x.fillStyle = "#64748b";
  x.font = "22px sans-serif";
  x.fillText(r.aviso, 80, H - 60);
  return c;
}

function quebrar(x, texto, largura) {
  const linhas = [];
  let atual = "";
  for (const p of String(texto).split(" ")) {
    const t = atual ? `${atual} ${p}` : p;
    if (x.measureText(t).width > largura && atual) {
      linhas.push(atual);
      atual = p;
    } else atual = t;
  }
  if (atual) linhas.push(atual);
  return linhas;
}

function colocar(pdf, canvas) {
  const larg = 190;
  const alt = 277;
  const r = Math.min(larg / canvas.width, alt / canvas.height);
  const w = canvas.width * r;
  const h = canvas.height * r;
  pdf.addImage(canvas.toDataURL("image/jpeg", 0.88), "JPEG", 10 + (larg - w) / 2, 10, w, h);
}
