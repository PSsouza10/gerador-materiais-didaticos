"use client";
import { useMemo, useRef, useState } from "react";
import { Download, Loader2, PenLine } from "lucide-react";
import { localizarErros } from "@/lib/redacaoFoto";
import { escreverComLetra } from "@/lib/letraProfessor";
import { desenhoDaMarca, notaDaMarca, TINTA, FONTE_MAO } from "./desenho";
import { EscritaSvg, desenharEscrita } from "./escrita";
import PadMao from "./PadMao";

// A redação do aluno, na própria foto, corrigida "à mão": erro circulado ou sublinhado em
// vermelho, a correção escrita acima, a nota circulada no alto e um bilhete do professor no fim.
// A escrita usa, nesta ordem: o que o professor escreveu na tela (PadMao), a letra cadastrada
// dele ("Minha letra") ou a letra cursiva padrão. As marcas podem ser arrastadas.
// Nada aqui vai para o servidor: a foto fica só no aparelho.
const virgula = (n) => String(n).replace(".", ",");
const MAO = `'${FONTE_MAO}', 'Segoe Print', 'Bradley Hand', cursive`;
const BILHETE = { W: 1000, margem: 50, entre: 54, tamanho: 17 };

export default function FolhaCorrigida({ fotos, paginas, resultado, glifos = null }) {
  const marcas = useMemo(() => localizarErros(paginas, resultado.errosPortugues), [paginas, resultado]);
  const [desloc, setDesloc] = useState({});
  const [mao, setMao] = useState({}); // { [erro]: {src,w,h}, recado: {src,w,h} }
  const [pad, setPad] = useState(null);
  const [baixando, setBaixando] = useState(false);
  const arraste = useRef(null);
  const semLugar = resultado.errosPortugues.filter((_, k) => !marcas.some((m) => m.erro === k));
  const escrita = { glifos, mao };

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
        const c = await paginaEmCanvas(fotos[p], p, marcas, desloc, resultado, escrita);
        if (p) pdf.addPage();
        colocar(pdf, c);
      }
      pdf.addPage();
      colocar(pdf, await bilheteEmCanvas(resultado, semLugar, escrita));
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
      <p className="mt-1 text-xs text-slate-500">
        Marca fora do lugar? Arraste. {glifos ? "As correções saem com a sua letra." : <a href="/redacao/minha-letra" className="font-semibold text-indigo-600 hover:underline">Quer que saiam com a sua letra?</a>}
      </p>
      {fotos.map((f, p) => (
        <Pagina key={p} foto={f} p={p} marcas={marcas.filter((m) => m.pagina === p)} resultado={resultado} desloc={desloc} escrita={escrita} iniciar={iniciar} mover={mover} soltar={soltar} />
      ))}

      {marcas.length > 0 && (
        <details className="mt-3 rounded-xl border border-slate-200 p-3 text-sm">
          <summary className="cursor-pointer font-semibold text-slate-800">Escrever as correções com o dedo ou a caneta</summary>
          <ul className="mt-2 space-y-1">
            {marcas.map((m) => {
              const e = resultado.errosPortugues[m.erro];
              return (
                <li key={m.erro} className="flex flex-wrap items-center gap-2">
                  <span className="min-w-0 flex-1 text-slate-700">
                    “{e.trecho}” → <b>{notaDaMarca(e)}</b>
                  </span>
                  <button type="button" onClick={() => setPad({ chave: m.erro, titulo: `Escreva a correção de “${e.trecho}”` })} className="inline-flex items-center gap-1 rounded-lg border border-slate-300 px-2 py-1 text-xs font-semibold text-slate-800">
                    <PenLine className="h-3.5 w-3.5" /> {mao[m.erro] ? "Reescrever" : "Escrever à mão"}
                  </button>
                  {mao[m.erro] && (
                    <button type="button" onClick={() => setMao(({ [m.erro]: _, ...resto }) => resto)} className="text-xs text-slate-500 hover:underline">
                      desfazer
                    </button>
                  )}
                </li>
              );
            })}
          </ul>
        </details>
      )}

      <Bilhete resultado={resultado} semLugar={semLugar} escrita={escrita} />
      <button type="button" onClick={() => setPad({ chave: "recado", titulo: "Recado à mão para o aluno (vai no fim do bilhete)" })} className="mt-2 inline-flex items-center gap-1 text-sm font-semibold text-indigo-600 hover:underline">
        <PenLine className="h-4 w-4" /> {mao.recado ? "Reescrever o recado à mão" : "Escrever um recado à mão"}
      </button>

      {pad && (
        <PadMao
          titulo={pad.titulo}
          aoFechar={() => setPad(null)}
          aoUsar={(img) => {
            setMao((m) => ({ ...m, [pad.chave]: img }));
            setPad(null);
          }}
        />
      )}
    </div>
  );
}

// Correção escrita acima do erro: mão livre > letra do professor > fonte cursiva
function EscritaDaMarca({ erro, k, g, escrita }) {
  const livre = escrita.mao[k];
  if (livre) {
    const h = g.fonte * 1.5;
    const w = (livre.w / livre.h) * h;
    return <image href={livre.src} x={g.textoX} y={g.textoY - h * 0.85} width={w} height={h} />;
  }
  if (escrita.glifos) return <EscritaSvg texto={notaDaMarca(erro)} glifos={escrita.glifos} tamanho={g.fonte * 0.55} x={g.textoX} base={g.textoY} />;
  return (
    <text x={g.textoX} y={g.textoY} fill={TINTA} fontFamily={MAO} fontSize={g.fonte} fontWeight={700}>
      {notaDaMarca(erro)}
    </text>
  );
}

function Pagina({ foto, p, marcas, resultado, desloc, escrita, iniciar, mover, soltar }) {
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
              <EscritaDaMarca erro={erro} k={m.erro} g={g} escrita={escrita} />
            </g>
          );
        })}
        {p === 0 && <NotaCirculada W={W} H={H} resultado={resultado} glifos={escrita.glifos} />}
      </svg>
    </div>
  );
}

const geometriaNota = (W, H) => {
  const f = Math.min(W, H) / 15;
  return { f, cx: W - f * 2.2, cy: f * 1.5 };
};

function NotaCirculada({ W, H, resultado, glifos }) {
  const { f, cx, cy } = geometriaNota(W, H);
  const nota = virgula(resultado.notaTotal);
  return (
    <g>
      <ellipse cx={cx} cy={cy} rx={f * 1.9} ry={f * 1.05} transform={`rotate(-6 ${cx} ${cy})`} fill="rgba(255,255,255,0.55)" stroke={TINTA} strokeWidth={Math.max(3, f / 14)} />
      {glifos ? (
        <EscritaSvg texto={`${nota}/${resultado.notaMaxima}`} glifos={glifos} tamanho={f * 0.36} x={cx - f * 1.45} base={cy + f * 0.3} />
      ) : (
        <>
          <text x={cx} y={cy + f * 0.32} textAnchor="middle" fill={TINTA} fontFamily={MAO} fontSize={f} fontWeight={700}>
            {nota}
          </text>
          <text x={cx + f * 1.45} y={cy + f * 0.95} textAnchor="middle" fill={TINTA} fontFamily={MAO} fontSize={f * 0.4} fontWeight={700}>
            /{resultado.notaMaxima}
          </text>
        </>
      )}
    </g>
  );
}

function linhasDoBilhete(r, semLugar) {
  const faltam = r.elementos?.faltam || [];
  return [
    `Nota: ${virgula(r.notaTotal)} / ${r.notaMaxima}`,
    ...(r.bilhete ? [r.bilhete] : []),
    ...r.criterios.map((c) => `${c.nome.split(/[(:]/)[0].trim()}: ${virgula(c.nota)} de ${virgula(c.max)}`),
    ...(faltam.length ? [`${r.elementos.titulo}: faltou ${faltam.join(", ")}.`] : []),
    ...semLugar.slice(0, 6).map((e) => `"${e.trecho}": ${e.correcao}`),
    ...(r.proximoPasso ? [`Para a próxima: ${r.proximoPasso}`] : []),
  ];
}

// Bilhete com a letra do professor: cada linha do texto é quebrada na largura da folha
function layoutBilhete(r, semLugar, glifos) {
  const { W, margem, entre, tamanho } = BILHETE;
  let y = margem + entre;
  const blocos = [];
  for (const linha of linhasDoBilhete(r, semLugar)) {
    const l = escreverComLetra(linha, glifos, { tamanho, x0: margem, base: y, larguraMax: W - 2 * margem, entreLinhas: entre });
    blocos.push({ texto: linha, base: y });
    y += l.altura;
  }
  return { blocos, altura: y + margem };
}

function Bilhete({ resultado: r, semLugar, escrita }) {
  const recado = escrita.mao.recado;
  if (escrita.glifos) {
    const { W, margem, entre, tamanho } = BILHETE;
    const { blocos, altura } = layoutBilhete(r, semLugar, escrita.glifos);
    const hRecado = recado ? Math.min(220, (recado.h / recado.w) * (W - 2 * margem)) : 0;
    const H = altura + hRecado;
    return (
      <div className="mt-4 overflow-hidden rounded-xl border border-amber-200 shadow-sm">
        <svg viewBox={`0 0 ${W} ${H}`} className="block w-full">
          <rect width={W} height={H} fill="#fffbea" />
          {Array.from({ length: Math.floor(H / entre) }, (_, i) => (
            <line key={i} x1={20} x2={W - 20} y1={margem + (i + 1) * entre + 6} y2={margem + (i + 1) * entre + 6} stroke="#e8dcc0" />
          ))}
          {blocos.map((b, i) => (
            <EscritaSvg key={i} texto={b.texto} glifos={escrita.glifos} tamanho={tamanho} x={margem} base={b.base} larguraMax={W - 2 * margem} entreLinhas={entre} />
          ))}
          {recado && <image href={recado.src} x={margem} y={altura - margem} width={(recado.w / recado.h) * hRecado} height={hRecado} />}
        </svg>
        <p className="bg-[#fffbea] px-5 pb-3 text-[11px] text-slate-500">{r.aviso}</p>
      </div>
    );
  }
  return (
    <div
      className="mt-4 rounded-xl border border-amber-200 p-5 shadow-sm"
      style={{ background: "repeating-linear-gradient(#fffbea, #fffbea 33px, #e8dcc0 34px)", fontFamily: MAO, color: TINTA, fontSize: 24, lineHeight: "34px" }}
    >
      {linhasDoBilhete(r, semLugar).map((l, i) => (
        <p key={i} style={i === 0 ? { fontSize: 30, fontWeight: 700 } : undefined}>
          {l}
        </p>
      ))}
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {recado && <img src={recado.src} alt="Recado do professor" className="mt-2 max-h-40 w-auto" />}
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

async function escreverNoCanvas(x, texto, escrita, livre, { tamanhoFonte, tamanhoLetra, px, base }) {
  if (livre) {
    const h = tamanhoFonte * 1.5;
    x.drawImage(await carregar(livre.src), px, base - h * 0.85, (livre.w / livre.h) * h, h);
  } else if (escrita.glifos) await desenharEscrita(x, texto, escrita.glifos, { tamanho: tamanhoLetra, x0: px, base });
  else {
    x.font = `700 ${tamanhoFonte}px ${MAO}`;
    x.fillText(texto, px, base);
  }
}

async function paginaEmCanvas(foto, p, marcas, desloc, r, escrita) {
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
    if (g.forma === "circulo") {
      x.ellipse(g.cx, g.cy, g.rx, g.ry, (g.rot * Math.PI) / 180, 0, 2 * Math.PI);
      x.stroke();
    } else x.stroke(new Path2D(g.d));
    await escreverNoCanvas(x, notaDaMarca(erro), escrita, escrita.mao[m.erro], { tamanhoFonte: g.fonte, tamanhoLetra: g.fonte * 0.55, px: g.textoX, base: g.textoY });
  }
  if (p === 0) {
    const { f, cx, cy } = geometriaNota(W, H);
    x.lineWidth = Math.max(3, f / 14);
    x.beginPath();
    x.ellipse(cx, cy, f * 1.9, f * 1.05, (-6 * Math.PI) / 180, 0, 2 * Math.PI);
    x.stroke();
    if (escrita.glifos) await desenharEscrita(x, `${virgula(r.notaTotal)}/${r.notaMaxima}`, escrita.glifos, { tamanho: f * 0.36, x0: cx - f * 1.45, base: cy + f * 0.3 });
    else {
      x.textAlign = "center";
      x.font = `700 ${f}px ${MAO}`;
      x.fillText(virgula(r.notaTotal), cx, cy + f * 0.32);
      x.font = `700 ${f * 0.4}px ${MAO}`;
      x.fillText(`/${r.notaMaxima}`, cx + f * 1.45, cy + f * 0.95);
      x.textAlign = "start";
    }
  }
  return c;
}

async function bilheteEmCanvas(r, semLugar, escrita) {
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
  let y = 120;
  if (escrita.glifos) {
    for (const linha of linhasDoBilhete(r, semLugar)) {
      const opc = { tamanho: 25, x0: 80, base: y, larguraMax: W - 160, entreLinhas: 56 };
      const l = escreverComLetra(linha, escrita.glifos, opc);
      if (y + l.altura > H - 300) break;
      await desenharEscrita(x, linha, escrita.glifos, opc);
      y += l.altura;
    }
  } else {
    linhasDoBilhete(r, semLugar).forEach((linha, i) => {
      x.font = i === 0 ? `700 60px ${MAO}` : `500 40px ${MAO}`;
      for (const parte of quebrar(x, linha, W - 160)) {
        if (y > H - 300) return;
        x.fillText(parte, 80, y);
        y += 56;
      }
    });
  }
  const recado = escrita.mao.recado;
  if (recado) {
    const h = Math.min(260, (recado.h / recado.w) * (W - 160));
    x.drawImage(await carregar(recado.src), 80, Math.min(y, H - 120 - h), (recado.w / recado.h) * h, h);
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
