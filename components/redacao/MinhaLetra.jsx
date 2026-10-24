"use client";
import { useEffect, useState } from "react";
import { Loader2, Printer, Camera, Trash2 } from "lucide-react";
import { lerFolhaModelo } from "@/lib/visaoModelo";
import FolhaModelo from "./FolhaModelo";
import { alfaParaPng, EscritaSvg } from "./escrita";

const EXEMPLO = "Muito bem! Revise a concordância: os alunos usam.";
const LADO_MAX = 2600;

async function imageData(arquivo) {
  const url = URL.createObjectURL(arquivo);
  const img = await new Promise((ok, falha) => {
    const i = new Image();
    i.onload = () => ok(i);
    i.onerror = falha;
    i.src = url;
  });
  const r = Math.min(1, LADO_MAX / Math.max(img.naturalWidth, img.naturalHeight));
  const c = document.createElement("canvas");
  c.width = Math.round(img.naturalWidth * r);
  c.height = Math.round(img.naturalHeight * r);
  const ctx = c.getContext("2d", { willReadFrequently: true });
  ctx.drawImage(img, 0, 0, c.width, c.height);
  URL.revokeObjectURL(url);
  return ctx.getImageData(0, 0, c.width, c.height);
}

function Amostra({ glifos }) {
  return (
    <svg viewBox="0 0 640 90" className="mt-2 w-full rounded-xl border border-slate-200 bg-[#fffdf6]">
      <EscritaSvg texto={EXEMPLO} glifos={glifos} tamanho={20} x={12} base={52} larguraMax={616} />
    </svg>
  );
}

export default function MinhaLetra() {
  const [salva, setSalva] = useState(undefined);
  const [nova, setNova] = useState(null);
  const [faltam, setFaltam] = useState([]);
  const [estado, setEstado] = useState("");
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch("/api/redacao/letra")
      .then((r) => (r.ok ? r.json() : { glifos: null }))
      .then((j) => setSalva(j.glifos || null))
      .catch(() => setSalva(null));
  }, []);

  async function ler(arquivo) {
    if (!arquivo) return;
    setErro("");
    setNova(null);
    setEstado("Lendo a folha...");
    try {
      await new Promise((ok) => setTimeout(ok, 30));
      const r = lerFolhaModelo(await imageData(arquivo));
      if (!r.ok) setErro(r.erro);
      else {
        const glifos = {};
        for (const c of r.celulas) (glifos[c.caractere] ||= []).push({ src: alfaParaPng(c), w: c.w, h: c.h });
        setNova(glifos);
        setFaltam(r.faltam);
      }
    } catch {
      setErro("Não consegui abrir a foto. Tente outra (JPG ou PNG).");
    }
    setEstado("");
  }

  async function salvar() {
    setEstado("Salvando...");
    const r = await fetch("/api/redacao/letra", { method: "PUT", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ glifos: nova }) }).catch(() => null);
    const j = await r?.json().catch(() => ({}));
    if (r?.ok) {
      setSalva(nova);
      setNova(null);
    } else setErro(j?.error || "Não foi possível salvar agora.");
    setEstado("");
  }

  async function apagar() {
    if (!window.confirm("Apagar a sua letra? As correções voltam a usar a letra cursiva padrão.")) return;
    const r = await fetch("/api/redacao/letra", { method: "DELETE" }).catch(() => null);
    if (r?.ok) setSalva(null);
  }

  return (
    <div className="mt-6 text-sm text-slate-700">
      <style>{`@media print { @page { size: A4; margin: 0 } body * { visibility: hidden !important } .area-impressao, .area-impressao * { visibility: visible !important } .area-impressao { position: fixed; inset: 0; width: 210mm; height: 297mm } }`}</style>
      {salva === undefined ? (
        <Loader2 className="h-5 w-5 animate-spin text-slate-400" />
      ) : salva ? (
        <div className="rounded-2xl border border-emerald-200 bg-emerald-50 p-4">
          <p className="font-bold text-emerald-900">Sua letra está cadastrada. As correções na foto já saem com ela.</p>
          <Amostra glifos={salva} />
          <button type="button" onClick={apagar} className="mt-3 inline-flex items-center gap-1 text-xs font-semibold text-rose-700 hover:underline">
            <Trash2 className="h-3.5 w-3.5" /> Apagar minha letra
          </button>
        </div>
      ) : null}

      <ol className="mt-5 space-y-4">
        <li>
          <b className="text-marinho">1. Imprima a folha-modelo</b> e escreva cada letra no quadro, com caneta escura, sobre a linha pontilhada.
          <button type="button" onClick={() => window.print()} className="mt-2 flex items-center gap-2 rounded-full border border-[#e6dcc8] bg-white px-4 py-2 font-semibold text-slate-800 hover:border-roxo">
            <Printer className="h-4 w-4" /> Imprimir folha-modelo
          </button>
        </li>
        <li>
          <b className="text-marinho">2. Fotografe a folha inteira</b>, de frente, com boa luz e os 4 quadrados pretos aparecendo.
          <label className="mt-2 flex w-fit cursor-pointer items-center gap-2 rounded-full app-btn-principal px-4 py-2 font-semibold text-white hover:brightness-110">
            <Camera className="h-4 w-4" /> Enviar a foto da folha
            <input type="file" accept="image/*" className="hidden" onChange={(e) => ler(e.target.files?.[0])} />
          </label>
          <p className="mt-1 text-xs text-slate-500">A foto é lida aqui no seu aparelho. Só as letras recortadas são guardadas na sua conta, e só você usa.</p>
        </li>
      </ol>

      {estado && (
        <p className="mt-3 inline-flex items-center gap-2 font-semibold text-roxo-escuro">
          <Loader2 className="h-4 w-4 animate-spin" /> {estado}
        </p>
      )}
      {erro && <p className="mt-3 rounded-xl bg-rose-50 p-3 font-semibold text-rose-800">{erro}</p>}

      {nova && (
        <div className="mt-5 rounded-2xl border border-roxo/30 p-4">
          <p className="font-bold text-marinho">Assim vão ficar as correções com a sua letra:</p>
          <Amostra glifos={nova} />
          {faltam.length > 0 && <p className="mt-2 text-xs text-amber-800">Não encontrei: {faltam.join(" ")}. Essas vão usar a letra mais parecida (ex.: á → a).</p>}
          <div className="mt-3 grid grid-cols-8 gap-1 sm:grid-cols-12">
            {Object.entries(nova).map(([c, l]) => (
              // eslint-disable-next-line @next/next/no-img-element
              <img key={c} src={l[0].src} alt={c} title={c} className="h-10 w-full rounded border border-slate-100 object-contain" />
            ))}
          </div>
          <div className="mt-3 flex gap-2">
            <button type="button" onClick={salvar} className="rounded-full app-btn-principal px-4 py-2 font-semibold text-white hover:brightness-110">
              Salvar minha letra
            </button>
            <button type="button" onClick={() => setNova(null)} className="rounded-full border border-[#e6dcc8] bg-white px-4 py-2 font-semibold text-slate-800">
              Descartar
            </button>
          </div>
        </div>
      )}

      <div className="area-impressao mt-8 hidden print:block">
        <FolhaModelo />
      </div>
      <details className="mt-6">
        <summary className="cursor-pointer font-semibold text-slate-600">Ver a folha-modelo</summary>
        <div className="mt-2 rounded-xl border border-slate-200">
          <FolhaModelo />
        </div>
      </details>
    </div>
  );
}
