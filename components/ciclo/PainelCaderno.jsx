"use client";
import React, { useEffect, useMemo, useState } from "react";
import { Loader2, Copy, Check, RefreshCw, Sparkles, AlertTriangle } from "lucide-react";
import { agregar, gruposMaisFracos, itensParaReavaliacao, montarReavaliacao, compararAntesDepois, MIN_ALUNOS } from "@/lib/ciclo";

const COR = { adequado: "bg-emerald-100 text-emerald-900", atencao: "bg-amber-100 text-amber-900", reforcar: "bg-rose-100 text-rose-900" };
const chaveRascunho = (c) => `edugera:reavaliacao:${c}`;

function Celula({ v }) {
  if (!v) return <td className="px-2 py-1.5 text-center text-slate-400" title={`Menos de ${MIN_ALUNOS} alunos`}>—</td>;
  return (
    <td className="px-2 py-1.5 text-center">
      <span className={`rounded px-1.5 py-0.5 font-bold ${COR[v.faixa] || ""}`}>{v.percentual}%</span>
    </td>
  );
}

function BotaoCopiar({ texto, rotulo = "Copiar link" }) {
  const [ok, setOk] = useState(false);
  return (
    <button
      type="button"
      className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-700 hover:border-indigo-300"
      onClick={async () => {
        try {
          await navigator.clipboard.writeText(texto);
          setOk(true);
          setTimeout(() => setOk(false), 2000);
        } catch {
          /* copia à mão */
        }
      }}
    >
      {ok ? <Check className="h-3.5 w-3.5" /> : <Copy className="h-3.5 w-3.5" />} {ok ? "Copiado" : rotulo}
    </button>
  );
}

const botao = "inline-flex items-center gap-2 rounded-xl bg-indigo-600 px-4 py-2 text-sm font-semibold text-white hover:bg-indigo-700 disabled:opacity-60";

export default function PainelCaderno({ codigo }) {
  const [dados, setDados] = useState(null);
  const [erro, setErro] = useState("");
  const [carregando, setCarregando] = useState(true);

  const carregar = () => {
    setCarregando(true);
    fetch(`/api/cadernos/${codigo}/painel`, { cache: "no-store" })
      .then(async (r) => ({ ok: r.ok, j: await r.json().catch(() => ({})) }))
      .then(({ ok, j }) => (ok ? (setDados(j), setErro("")) : setErro(j.error || "Não foi possível abrir o painel.")))
      .catch(() => setErro("Sem conexão com o servidor."))
      .finally(() => setCarregando(false));
  };
  useEffect(carregar, [codigo]);

  const ag = useMemo(() => (dados ? agregar(dados.caderno.avaliacao, dados.resultados) : null), [dados]);

  if (carregando && !dados)
    return (
      <p className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Carregando o painel…
      </p>
    );
  if (erro && !dados) return <p className="font-semibold text-rose-700">{erro}</p>;

  const c = dados.caderno;
  const origem = typeof window !== "undefined" ? window.location.origin : "";
  const id = c.avaliacao?.identificacao || {};
  const rotuloGrupo = ag.porHabilidade ? "Habilidade" : "Descritor";

  return (
    <div className="space-y-8">
      <header>
        <p className="text-xs font-bold uppercase tracking-wide text-violet-700">Painel da coordenação · {c.tipo === "reavaliacao" ? "mini-reavaliação" : "caderno diagnóstico"}</p>
        <h1 className="mt-1 text-2xl font-extrabold text-slate-900">{c.titulo}</h1>
        <p className="mt-1 text-slate-600">{[id.componente, id.etapa, `${c.avaliacao.itens.length} questões`, `código ${c.codigo}`].filter(Boolean).join(" · ")}</p>
        <p className="mt-3 flex flex-wrap items-center gap-2 text-sm">
          <code className="rounded bg-slate-100 px-2 py-1">{`${origem}/caderno/${c.codigo}`}</code>
          <BotaoCopiar texto={`${origem}/caderno/${c.codigo}`} rotulo="Copiar link para os professores" />
          <button type="button" onClick={carregar} className="inline-flex items-center gap-1 rounded-lg border border-slate-200 bg-white px-2.5 py-1 text-[12.5px] font-semibold text-slate-700">
            <RefreshCw className={`h-3.5 w-3.5 ${carregando ? "animate-spin" : ""}`} /> Atualizar
          </button>
        </p>
        <p className="mt-3 text-sm text-slate-700">
          <b>{ag.rede.turmas}</b> turma(s) enviaram · <b>{ag.rede.alunos}</b> aluno(s) · {ag.escolas.length} de {c.escolas.length} escola(s)
        </p>
        <p className="mt-1 text-[12.5px] text-slate-500">Só números: nenhum nome de aluno ou de professor chega aqui. Escola com menos de {MIN_ALUNOS} alunos aparece como —.</p>
      </header>

      {ag.rede.turmas === 0 ? (
        <p className="rounded-2xl bg-slate-50 p-4 text-slate-700">Nenhuma turma enviou ainda. Mande o link aos professores: eles adicionam o caderno, aplicam, corrigem e enviam.</p>
      ) : (
        <>
          <section>
            <h2 className="text-lg font-bold text-slate-900">Acerto por escola e {rotuloGrupo.toLowerCase()}</h2>
            <div className="mt-3 overflow-x-auto rounded-2xl border border-slate-200 bg-white">
              <table className="w-full text-[13px]">
                <thead className="bg-slate-50 text-left text-[12px] text-slate-600">
                  <tr>
                    <th className="px-2 py-2">Escola</th>
                    <th className="px-2 py-2 text-right">Alunos</th>
                    {ag.grupos.map((g) => (
                      <th key={g.chave} className="max-w-[10rem] px-2 py-2 text-center" title={g.descritor || g.chave}>
                        {ag.porHabilidade ? g.chave : g.chave.length > 40 ? `${g.chave.slice(0, 40)}…` : g.chave}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  <tr className="bg-indigo-50/60 font-semibold">
                    <td className="px-2 py-1.5">Rede (todas)</td>
                    <td className="px-2 py-1.5 text-right">{ag.rede.alunos}</td>
                    {ag.grupos.map((g) => (
                      <Celula key={g.chave} v={ag.rede.grupos[g.chave]} />
                    ))}
                  </tr>
                  {ag.escolas.map((e) => (
                    <tr key={e.escola}>
                      <td className="px-2 py-1.5">{e.escola}</td>
                      <td className="px-2 py-1.5 text-right">{e.alunos}</td>
                      {ag.grupos.map((g) => (
                        <Celula key={g.chave} v={e.grupos[g.chave]} />
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
            <p className="mt-1 text-[12px] text-slate-500">Adequado: 70% ou mais · atenção: 50% a 69% · reforçar: abaixo de 50%.</p>
          </section>

          <section>
            <h2 className="text-lg font-bold text-slate-900">Questões na rede</h2>
            <ul className="mt-2 divide-y divide-slate-100 rounded-2xl border border-slate-200 bg-white text-[13px]">
              {ag.questoes.map((q) => (
                <li key={q.n} className="px-3 py-2">
                  <b>Questão {q.n}</b> · {q.grupo}
                  {q.percentual !== null && <span> · {q.percentual}% de acerto</span>}
                  {q.erroMaisComum && (
                    <span className="block text-slate-600">
                      Erro mais comum: {q.erroMaisComum.percentual}% marcaram {q.erroMaisComum.letra}
                      {q.erroMaisComum.explicacao ? ` — ${q.erroMaisComum.explicacao}` : ""}
                    </span>
                  )}
                </li>
              ))}
            </ul>
          </section>
        </>
      )}

      <section>
        <h2 className="text-lg font-bold text-slate-900">Turmas que enviaram</h2>
        {dados.resultados.length ? (
          <ul className="mt-2 text-[13px] text-slate-700">
            {dados.resultados.map((r, k) => (
              <li key={k}>
                {r.escola} · {r.turma} · {r.alunos} aluno(s) · {new Date(r.atualizadoEm).toLocaleDateString("pt-BR")}
              </li>
            ))}
          </ul>
        ) : (
          <p className="mt-2 text-[13px] text-slate-600">Nenhuma ainda.</p>
        )}
      </section>

      {c.tipo === "diagnostico" &&
        (dados.reavaliacoes.length ? (
          dados.reavaliacoes.map((r) => <Comparacao key={r.codigo} diag={c} diagRes={dados.resultados} reav={r} origem={origem} />)
        ) : (
          <GerarReavaliacao caderno={c} agregado={ag} aoCriar={carregar} />
        ))}
    </div>
  );
}

// ---------- mini-reavaliação ----------
function GerarReavaliacao({ caderno, agregado, aoCriar }) {
  // vagas: a questão de origem de cada questão nova (pode repetir quando há poucas questões fracas)
  const vagas = useMemo(() => itensParaReavaliacao(caderno.avaliacao, agregado), [caderno, agregado]);
  const fracos = gruposMaisFracos(agregado).slice(0, 3);
  const [novos, setNovos] = useState(() => {
    try {
      const v = JSON.parse(window.localStorage.getItem(chaveRascunho(caderno.codigo)) || "[]");
      return Array.isArray(v) ? v : [];
    } catch {
      return [];
    }
  });
  const [rodando, setRodando] = useState(false);
  const [msg, setMsg] = useState("");
  const [criando, setCriando] = useState(false);
  const guardar = (l) => {
    setNovos(l);
    try {
      window.localStorage.setItem(chaveRascunho(caderno.codigo), JSON.stringify(l));
    } catch {
      /* segue em memória */
    }
  };

  if (!agregado.rede.visivel)
    return (
      <section className="rounded-2xl border border-slate-200 bg-white p-4">
        <h2 className="text-lg font-bold text-slate-900">Mini-reavaliação</h2>
        <p className="mt-1 text-[13px] text-slate-600">Aparece quando a rede tiver pelo menos {MIN_ALUNOS} alunos enviados.</p>
      </section>
    );

  // rascunho guardado de antes vale só se a vaga ainda aponta para a mesma questão de origem
  const validos = novos.filter((n) => vagas[n.vaga] === n.origem);
  const faltam = vagas.map((origem, vaga) => ({ vaga, origem })).filter(({ vaga }) => !validos.some((n) => n.vaga === vaga));
  const origensUnicas = [...new Set(vagas)].map((i) => i + 1);

  async function gerar() {
    setRodando(true);
    setMsg("");
    let lista = [...validos];
    const falhas = [];
    for (const { vaga, origem: indice } of faltam) {
      setMsg(`Gerando a questão nova ${lista.length + 1} de ${vagas.length} (irmã da questão ${indice + 1})…`);
      let ok = false;
      for (let t = 0; t < 2 && !ok; t++) {
        try {
          const r = await fetch(`/api/cadernos/${caderno.codigo}/reavaliacao-item`, {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ indice, novos: lista.map((n) => n.item) }),
          });
          const j = await r.json().catch(() => ({}));
          if (r.ok && j.item) {
            lista = [...lista, { vaga, origem: indice, item: j.item }];
            guardar(lista);
            ok = true;
          }
        } catch {
          /* tenta de novo */
        }
      }
      if (!ok) falhas.push(`irmã da questão ${indice + 1}`);
    }
    setRodando(false);
    setMsg(falhas.length ? `Não consegui as questões novas para: ${falhas.join(", ")}. Clique de novo para tentar só essas.` : "Questões novas prontas. Confira abaixo e crie o caderno.");
  }

  async function criar() {
    setCriando(true);
    setMsg("");
    try {
      const ordenados = [...validos].sort((a, b) => a.origem - b.origem || a.vaga - b.vaga);
      const av = montarReavaliacao(caderno.avaliacao, ordenados);
      const r = await fetch("/api/cadernos", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ tipo: "reavaliacao", origem: caderno.codigo, titulo: av.titulo, avaliacao: av }),
      });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Erro ${r.status}.`);
      try {
        window.localStorage.removeItem(chaveRascunho(caderno.codigo));
      } catch {
        /* ok */
      }
      aoCriar();
    } catch (e) {
      setMsg(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setCriando(false);
    }
  }

  return (
    <section className="rounded-2xl border border-indigo-200 bg-indigo-50 p-4 text-[13px] text-indigo-950">
      <h2 className="flex items-center gap-1.5 text-lg font-bold">
        <Sparkles className="h-5 w-5" /> Mini-reavaliação
      </h2>
      <p className="mt-1">
        Mais fracos na rede: {fracos.map((g) => `${g.chave} (${g.percentual}%)`).join(" · ")}. A reavaliação traz <b>{vagas.length} questões novas</b>, irmãs das questões{" "}
        {origensUnicas.join(", ")} do caderno (as dos grupos abaixo de 70%): mesma habilidade, descritor e nível, sem repetir nenhuma. Depois de aplicada, o painel compara antes e
        depois.
      </p>
      <p className="mt-1 text-[12px] text-indigo-800">Cada questão nova passa pela mesma conferência da prova e leva cerca de 30 a 60 segundos. Deixe esta página aberta.</p>
      {validos.length > 0 && (
        <ol className="mt-3 space-y-1">
          {[...validos]
            .sort((a, b) => a.origem - b.origem || a.vaga - b.vaga)
            .map((n) => (
              <li key={n.vaga} className="rounded-lg bg-white px-3 py-2">
                <b>Irmã da questão {n.origem + 1}:</b> {n.item.comando} <span className="text-slate-500">(gabarito {n.item.correta})</span>
              </li>
            ))}
        </ol>
      )}
      {msg && (
        <p className="mt-2 flex items-center gap-1.5 font-semibold">
          {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : msg.startsWith("Não") ? <AlertTriangle className="h-4 w-4" /> : null} {msg}
        </p>
      )}
      <div className="mt-3 flex flex-wrap gap-2">
        {faltam.length > 0 && (
          <button type="button" className={botao} disabled={rodando} onClick={gerar}>
            {rodando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Sparkles className="h-4 w-4" />} {validos.length ? `Gerar as ${faltam.length} que faltam` : `Gerar mini-reavaliação (${vagas.length} questões)`}
          </button>
        )}
        {validos.length > 0 && !rodando && (
          <button type="button" className={botao} disabled={criando} onClick={criar}>
            {criando && <Loader2 className="h-4 w-4 animate-spin" />} Criar caderno da reavaliação ({validos.length} questões)
          </button>
        )}
      </div>
    </section>
  );
}

// ---------- antes × depois ----------
function Seta({ d }) {
  if (d === null) return <span className="text-slate-400">—</span>;
  const cor = d > 0 ? "text-emerald-700" : d < 0 ? "text-rose-700" : "text-slate-600";
  return <b className={cor}>{d > 0 ? `+${d}` : d} p.p.</b>;
}

function Comparacao({ diag, diagRes, reav, origem }) {
  const cmp = useMemo(() => compararAntesDepois(diag.avaliacao, diagRes, reav.avaliacao, reav.resultados), [diag, diagRes, reav]);
  const escolas = [...new Set(cmp.grupos.flatMap((g) => g.escolas.map((e) => e.escola)))];
  return (
    <section className="rounded-2xl border border-emerald-200 bg-white p-4">
      <h2 className="text-lg font-bold text-slate-900">Antes × depois · {reav.titulo}</h2>
      <p className="mt-1 flex flex-wrap items-center gap-2 text-sm text-slate-600">
        Link da reavaliação para os professores: <code className="rounded bg-slate-100 px-2 py-1">{`${origem}/caderno/${reav.codigo}`}</code>
        <BotaoCopiar texto={`${origem}/caderno/${reav.codigo}`} />
      </p>
      <p className="mt-1 text-sm text-slate-700">
        Antes: {cmp.alunosAntes} aluno(s) · depois: {cmp.alunosDepois} aluno(s) · {reav.resultados.length} turma(s) enviaram a reavaliação.
      </p>
      {cmp.alunosDepois === 0 ? (
        <p className="mt-3 rounded-xl bg-slate-50 p-3 text-[13px] text-slate-700">Aguardando as turmas aplicarem e enviarem a reavaliação.</p>
      ) : (
        <div className="mt-3 overflow-x-auto">
          <table className="w-full text-[13px]">
            <thead className="bg-slate-50 text-left text-[12px] text-slate-600">
              <tr>
                <th className="px-2 py-2">Grupo</th>
                <th className="px-2 py-2 text-center">Rede antes</th>
                <th className="px-2 py-2 text-center">Rede depois</th>
                <th className="px-2 py-2 text-center">Diferença</th>
                {escolas.map((e) => (
                  <th key={e} className="px-2 py-2 text-center">
                    {e}
                  </th>
                ))}
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100">
              {cmp.grupos.map((g) => (
                <tr key={g.chave}>
                  <td className="px-2 py-1.5 font-semibold">{g.rotulo}</td>
                  <td className="px-2 py-1.5 text-center">{g.rede.antes === null ? "—" : `${g.rede.antes}%`}</td>
                  <td className="px-2 py-1.5 text-center">{g.rede.depois === null ? "—" : `${g.rede.depois}%`}</td>
                  <td className="px-2 py-1.5 text-center">
                    <Seta d={g.rede.diferenca} />
                  </td>
                  {escolas.map((e) => {
                    const x = g.escolas.find((y) => y.escola === e);
                    return (
                      <td key={e} className="px-2 py-1.5 text-center">
                        <Seta d={x?.diferenca ?? null} />
                      </td>
                    );
                  })}
                </tr>
              ))}
            </tbody>
          </table>
          <p className="mt-2 text-[12px] text-slate-500">
            p.p. = pontos percentuais. As questões são diferentes (mesma habilidade, descritor e nível): é um indicador de avanço, não uma medida exata. Escola com menos de{" "}
            {MIN_ALUNOS} alunos em um dos lados aparece como —.
          </p>
        </div>
      )}
    </section>
  );
}
