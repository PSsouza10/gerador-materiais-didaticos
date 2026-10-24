"use client";
import { useEffect, useState } from "react";
import { Loader2, Camera, Keyboard } from "lucide-react";
import { contarPalavras, linhasEstimadas, avisoLinhas, linhasPadrao, generoDoPerfil, PERFIS_REDACAO, GENEROS, LAUDAS_GRATIS, LINHAS_POR_LAUDA, AVISO_IA, MIN_PALAVRAS } from "@/lib/redacao";
import { textoDasLinhas } from "@/lib/redacaoFoto";
import FolhaCorrigida from "./FolhaCorrigida";

// Correção por IA (spec, seção 4 e Fase 2 10.1): texto digitado OU foto da folha manuscrita.
// Foto: a IA lê, a pessoa confere a transcrição e só então corrige; a folha volta marcada "à mão".
const CHAVE_PARA_CORRIGIR = "edugera.redacao.paraCorrigir";
const virgula = (n) => String(n).replace(".", ",");
const LADO_MAX = 1800;

// Foto do celular → JPEG menor (cabe no limite do servidor e a IA lê bem)
async function prepararFoto(arquivo) {
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
  c.getContext("2d").drawImage(img, 0, 0, c.width, c.height);
  const dataUrl = c.toDataURL("image/jpeg", 0.86);
  URL.revokeObjectURL(url);
  return { url: dataUrl, w: c.width, h: c.height, base64: dataUrl.split(",")[1] };
}

export default function Corretor({ idSalvo = null, modoInicial = "texto" }) {
  const [modo, setModo] = useState(modoInicial);
  const [texto, setTexto] = useState("");
  const [tema, setTema] = useState("");
  const [perfil, setPerfil] = useState("concurso");
  const [genero, setGenero] = useState("dissertacao");
  const [limites, setLimites] = useState(linhasPadrao("concurso", "dissertacao"));
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState(null);
  const [resultado, setResultado] = useState(null);
  // foto
  const [fotos, setFotos] = useState([]);
  const [paginas, setPaginas] = useState([]);
  const [leitura, setLeitura] = useState(null); // { lidaEm, token }
  const [lendo, setLendo] = useState("");

  useEffect(() => {
    if (idSalvo) {
      fetch(`/api/redacao/${idSalvo}`)
        .then((r) => (r.ok ? r.json() : Promise.reject()))
        .then((r) => {
          setTexto(r.texto);
          setTema(r.tema);
          setPerfil(r.perfil);
          setGenero(r.genero || "dissertacao");
          setResultado(r.resultado);
        })
        .catch(() => setErro({ texto: "Não foi possível abrir esta redação." }));
      return;
    }
    try {
      const v = JSON.parse(window.localStorage.getItem(CHAVE_PARA_CORRIGIR) || "null");
      if (v?.texto) {
        setTexto(v.texto);
        setTema(v.tema || "");
        if (v.perfil) setPerfil(v.perfil);
        if (v.genero) setGenero(v.genero);
        if (v.minLinhas && v.maxLinhas) setLimites({ minLinhas: v.minLinhas, maxLinhas: v.maxLinhas });
        window.localStorage.removeItem(CHAVE_PARA_CORRIGIR);
      }
    } catch {
      /* sem armazenamento */
    }
  }, [idSalvo]);

  const generoValido = generoDoPerfil(perfil, genero);
  function trocarPerfil(p) {
    setPerfil(p);
    setLimites(linhasPadrao(p, generoDoPerfil(p, genero)));
  }
  function trocarGenero(g) {
    setGenero(g);
    setLimites(linhasPadrao(perfil, g));
  }

  async function lerFotos(lista) {
    const arquivos = [...lista].slice(0, 4);
    if (!arquivos.length) return;
    setErro(null);
    setResultado(null);
    setFotos([]);
    setPaginas([]);
    setTexto("");
    let sessao = null;
    const prontas = [];
    const lidas = [];
    try {
      for (let p = 0; p < arquivos.length; p++) {
        setLendo(`Lendo a página ${p + 1} de ${arquivos.length}...`);
        const f = await prepararFoto(arquivos[p]);
        const r = await fetch("/api/redacao/ler-foto", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ foto: { base64: f.base64, mime: "image/jpeg" }, pagina: p, ...(sessao || {}) }),
        });
        const j = await r.json().catch(() => ({}));
        if (!r.ok) {
          setErro({ texto: j.error || "Não foi possível ler a foto.", pro: j.motivo === "recurso_pro" || j.limiteAtingido });
          if (!prontas.length) {
            setLendo("");
            return;
          }
          break;
        }
        sessao = { lidaEm: j.lidaEm, token: j.token };
        prontas.push({ url: f.url, w: f.w, h: f.h });
        lidas.push(j.linhas);
      }
      setFotos(prontas);
      setPaginas(lidas);
      setLeitura(sessao);
      setTexto(textoDasLinhas(lidas));
    } catch {
      setErro({ texto: "Não foi possível abrir a foto. Tente outra (JPG ou PNG)." });
    }
    setLendo("");
  }

  const palavras = contarPalavras(texto);
  const linhas = linhasEstimadas(palavras);
  const aviso = texto ? avisoLinhas(linhas, limites) : "";
  const ilegiveis = (texto.match(/\[ileg[ií]vel\]/gi) || []).length;

  async function corrigir() {
    setEnviando(true);
    setErro(null);
    setResultado(null);
    try {
      const r = await fetch("/api/redacao/corrigir", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ texto, tema, bancaPerfil: perfil, genero: generoValido, ...limites, ...(modo === "foto" && leitura ? leitura : {}) }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) setErro({ texto: j.error || "Não foi possível corrigir agora.", pro: j.motivo === "recurso_pro" || j.limiteAtingido });
      else setResultado(j.resultado);
    } catch {
      setErro({ texto: "Sem conexão. Tente de novo." });
    }
    setEnviando(false);
  }

  const aba = (m, Icone, rotulo) => (
    <button
      type="button"
      onClick={() => {
        setModo(m);
        setResultado(null);
        setErro(null);
      }}
      className={`inline-flex items-center gap-2 rounded-xl px-4 py-2 text-sm font-semibold ${modo === m ? "bg-indigo-600 text-white" : "border border-slate-300 text-slate-700"}`}
    >
      <Icone className="h-4 w-4" /> {rotulo}
    </button>
  );

  return (
    <div className="mt-6">
      {!idSalvo && (
        <div className="mb-4 flex flex-wrap gap-2">
          {aba("texto", Keyboard, "Digitar o texto")}
          {aba("foto", Camera, "Foto da folha")}
        </div>
      )}
      <div className="grid gap-3 sm:grid-cols-2">
        <select value={perfil} onChange={(e) => trocarPerfil(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Para quem é a redação">
          {Object.entries(PERFIS_REDACAO).map(([k, v]) => (
            <option key={k} value={k}>
              {v}
            </option>
          ))}
        </select>
        {perfil === "escolar" ? (
          <select value={generoValido} onChange={(e) => trocarGenero(e.target.value)} className="rounded-xl border border-slate-300 px-3 py-2 text-sm" aria-label="Gênero do texto">
            {Object.entries(GENEROS).map(([k, v]) => (
              <option key={k} value={k}>
                {v}
              </option>
            ))}
          </select>
        ) : (
          <p className="self-center text-sm text-slate-600">Dissertação argumentativa{perfil === "enem" ? " · nota de 0 a 1000" : " · nota de 0 a 10"}</p>
        )}
        <input value={tema} onChange={(e) => setTema(e.target.value)} maxLength={300} placeholder="Tema ou proposta (opcional)" className="rounded-xl border border-slate-300 px-3 py-2 text-sm sm:col-span-2" aria-label="Tema" />
      </div>

      {modo === "foto" && (
        <div className="mt-3 rounded-2xl border border-dashed border-indigo-300 bg-indigo-50/50 p-4 text-sm text-slate-700">
          <label className="inline-flex cursor-pointer items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 font-semibold text-white hover:bg-indigo-700">
            <Camera className="h-4 w-4" /> Fotografar ou escolher a folha
            <input type="file" accept="image/*" multiple className="hidden" onChange={(e) => lerFotos(e.target.files)} disabled={!!lendo} />
          </label>
          <p className="mt-2 text-xs text-slate-500">
            Folha de frente, inteira, com boa luz e sem sombra. Até {LAUDAS_GRATIS} páginas no Grátis (4 no Pro). A foto não é guardada: fica só neste aparelho.
          </p>
          {lendo && (
            <p className="mt-2 inline-flex items-center gap-2 font-semibold text-indigo-800">
              <Loader2 className="h-4 w-4 animate-spin" /> {lendo}
            </p>
          )}
          {fotos.length > 0 && !lendo && (
            <p className="mt-3 rounded-xl bg-amber-50 p-3 font-semibold text-amber-900">
              Confira o texto abaixo: a IA copiou como está escrito, sem corrigir. Ajuste só o que ela leu errado{ilegiveis ? ` (${ilegiveis} palavra(s) [ilegível])` : ""}. Depois, clique em Corrigir.
            </p>
          )}
        </div>
      )}

      {(modo === "texto" || fotos.length > 0) && (
        <>
          <textarea value={texto} onChange={(e) => setTexto(e.target.value)} rows={14} placeholder="Cole ou digite a redação aqui." className="mt-3 w-full rounded-xl border border-slate-300 p-3 text-[15px] leading-relaxed" aria-label="Texto da redação" />
          <div className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-700">
            <span>
              {palavras} palavras · cerca de {linhas} linhas · limite
            </span>
            <input type="number" min={1} max={120} value={limites.minLinhas} onChange={(e) => setLimites((l) => ({ ...l, minLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Mínimo de linhas" />
            <span>a</span>
            <input type="number" min={1} max={120} value={limites.maxLinhas} onChange={(e) => setLimites((l) => ({ ...l, maxLinhas: Number(e.target.value) || 1 }))} className="w-16 rounded-lg border border-slate-300 px-2 py-1" aria-label="Máximo de linhas" />
          </div>
          {aviso && <p className="mt-2 text-sm font-semibold text-amber-800">{aviso}</p>}
          {modo === "texto" && (
            <p className="mt-2 text-xs text-slate-500">
              Grátis: 1 correção por mês, até {LAUDAS_GRATIS} laudas (cerca de {LAUDAS_GRATIS * LINHAS_POR_LAUDA} linhas). O texto fica só no seu histórico e pode ser apagado.
            </p>
          )}
          <button type="button" onClick={corrigir} disabled={enviando || palavras < MIN_PALAVRAS} className="mt-3 inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-5 py-2.5 font-semibold text-white hover:bg-indigo-700 disabled:opacity-50">
            {enviando && <Loader2 className="h-4 w-4 animate-spin" />} {enviando ? "Corrigindo..." : "Corrigir com IA"}
          </button>
        </>
      )}
      {erro && (
        <div className="mt-3 rounded-xl bg-rose-50 p-3 text-sm font-semibold text-rose-800">
          {erro.texto}{" "}
          {erro.pro && (
            <a href="/planos" className="underline">
              Ver o Pro
            </a>
          )}
        </div>
      )}
      {resultado && modo === "foto" && fotos.length > 0 && <FolhaCorrigida fotos={fotos} paginas={paginas} resultado={resultado} />}
      {resultado && <Resultado r={resultado} />}
    </div>
  );
}

function Resultado({ r }) {
  const el = r.elementos || (r.propostaIntervencao && { titulo: "Proposta de intervenção", itens: ["agente", "acao", "meio", "finalidade"].map((id) => ({ id, nome: id === "acao" ? "Ação" : id[0].toUpperCase() + id.slice(1), presente: !!r.propostaIntervencao[id] })), comentario: r.propostaIntervencao.comentario });
  return (
    <div className="mt-8 border-t border-slate-100 pt-6" data-testid="resultado-redacao">
      <p className="text-3xl font-extrabold text-slate-900">
        {virgula(r.notaTotal)} <span className="text-lg font-semibold text-slate-500">/ {r.notaMaxima}</span>
      </p>
      <p className="mt-1 text-sm font-semibold text-amber-800">{r.aviso || AVISO_IA}</p>
      <p className="mt-1 text-sm text-slate-600">
        {r.palavras} palavras · cerca de {r.linhasEstimadas} linhas {r.dentroDoLimite ? "(dentro do limite)" : "(fora do limite)"}
      </p>
      {r.bilhete && <p className="mt-3 rounded-xl bg-amber-50 p-3 text-[15px] text-slate-800">{r.bilhete}</p>}

      <h2 className="mt-6 font-bold text-slate-900">Nota por critério</h2>
      <ul className="mt-2 space-y-2">
        {r.criterios.map((c) => (
          <li key={c.id} className="rounded-xl border border-slate-200 p-3 text-sm">
            <div className="flex items-start justify-between gap-3">
              <b className="text-slate-900">{c.nome}</b>
              <span className={`shrink-0 font-bold ${c.nota === 0 ? "text-rose-700" : "text-slate-900"}`}>
                {virgula(c.nota)} / {virgula(c.max)}
              </span>
            </div>
            <p className="mt-1 text-slate-700">{c.justificativa}</p>
          </li>
        ))}
      </ul>

      {el && (
        <>
          <h2 className="mt-6 font-bold text-slate-900">{el.titulo}</h2>
          <div className="mt-2 flex flex-wrap gap-2 text-sm">
            {el.itens.map((i) => (
              <span key={i.id} className={`rounded-full px-3 py-1 font-semibold ${i.presente ? "bg-emerald-100 text-emerald-800" : "bg-rose-100 text-rose-800"}`}>
                {i.presente ? "✓" : "✗"} {i.nome}
              </span>
            ))}
          </div>
          {el.comentario && <p className="mt-2 text-sm text-slate-700">{el.comentario}</p>}
        </>
      )}

      {r.errosPortugues.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-slate-900">Erros de português</h2>
          <div className="mt-2 overflow-x-auto rounded-xl border border-slate-200">
            <table className="w-full min-w-[480px] text-left text-sm">
              <thead className="bg-slate-50 text-slate-700">
                <tr>
                  <th className="px-3 py-2">Trecho</th>
                  <th className="px-3 py-2">Tipo</th>
                  <th className="px-3 py-2">Correção</th>
                </tr>
              </thead>
              <tbody>
                {r.errosPortugues.map((e, i) => (
                  <tr key={i} className="border-t border-slate-100 align-top">
                    <td className="px-3 py-2 text-rose-800">{e.trecho}</td>
                    <td className="px-3 py-2 text-slate-600">{e.tipo}</td>
                    <td className="px-3 py-2 text-emerald-800">{e.correcao}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}

      {r.trechosReescritos.length > 0 && (
        <>
          <h2 className="mt-6 font-bold text-slate-900">Trechos reescritos</h2>
          <ul className="mt-2 space-y-2 text-sm">
            {r.trechosReescritos.map((t, i) => (
              <li key={i} className="rounded-xl border border-slate-200 p-3">
                <p className="text-slate-500 line-through">{t.original}</p>
                <p className="mt-1 font-semibold text-slate-900">{t.reescrito}</p>
                <p className="mt-1 text-slate-600">{t.porque}</p>
              </li>
            ))}
          </ul>
        </>
      )}

      {r.proximoPasso && (
        <p className="mt-6 rounded-xl bg-indigo-50 p-3 text-sm text-indigo-950">
          <b>Próximo passo:</b> {r.proximoPasso}
        </p>
      )}
      <a href="/redacao" className="mt-4 inline-block text-sm font-semibold text-indigo-600 hover:underline">
        Minhas redações
      </a>
    </div>
  );
}
