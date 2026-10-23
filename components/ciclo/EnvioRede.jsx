"use client";
import React, { useEffect, useState } from "react";
import { Send, Loader2, CheckCircle2 } from "lucide-react";
import { contagensDaTurma, MIN_ALUNOS } from "@/lib/ciclo";

// Professor de um caderno da rede: envia o resultado da turma para a coordenação.
// Vai só a contagem de respostas por questão (quantos marcaram A, B, C, D, branco, dupla).
export default function EnvioRede({ avaliacao, caderno, alunos }) {
  const [escola, setEscola] = useState("");
  const [turma, setTurma] = useState(avaliacao?.identificacao?.turma || "");
  const [enviando, setEnviando] = useState(false);
  const [erro, setErro] = useState("");
  const [envios, setEnvios] = useState([]);

  useEffect(() => {
    let vivo = true;
    fetch(`/api/cadernos/${caderno.codigo}`, { cache: "no-store" })
      .then((r) => (r.ok ? r.json() : null))
      .then((j) => vivo && j && setEnvios(j.envios || []))
      .catch(() => {});
    return () => {
      vivo = false;
    };
  }, [caderno.codigo]);

  async function enviar() {
    if (!escola) return setErro("Escolha a escola.");
    if (!turma.trim()) return setErro('Escreva a turma (ex.: "7º A").');
    if (!alunos.length) return setErro("Lance as respostas dos alunos antes de enviar.");
    setErro("");
    setEnviando(true);
    try {
      const corpo = { escola, turma, alunos: alunos.length, contagens: contagensDaTurma(avaliacao, alunos) };
      const r = await fetch(`/api/cadernos/${caderno.codigo}/resultados`, { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify(corpo) });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Não foi possível enviar (erro ${r.status}).`);
      setEnvios(j.envios || []);
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setEnviando(false);
    }
  }

  return (
    <div className="mt-4 rounded-2xl border border-violet-200 bg-violet-50 p-4 text-[13px] text-violet-950">
      <p className="font-bold">Enviar o resultado para a coordenação · {caderno.titulo}</p>
      <p className="mt-1 text-[12px]">
        Vai só a contagem de respostas de cada questão ({alunos.length} aluno(s) lançado(s)). <b>Nenhum nome, número ou resposta individual sai deste aparelho.</b>{" "}
        {alunos.length > 0 && alunos.length < MIN_ALUNOS && `Turmas com menos de ${MIN_ALUNOS} alunos entram só no total da escola.`}
      </p>
      <div className="mt-3 grid gap-2 sm:grid-cols-[1fr_10rem_auto]">
        <select className="ipt" value={escola} onChange={(e) => setEscola(e.target.value)} aria-label="Escola do caderno">
          <option value="">Escola…</option>
          {(caderno.escolas || []).map((e) => (
            <option key={e}>{e}</option>
          ))}
        </select>
        <input className="ipt" value={turma} maxLength={40} onChange={(e) => setTurma(e.target.value)} placeholder="Turma (7º A)" aria-label="Turma do envio" />
        <button type="button" onClick={enviar} disabled={enviando} className="btn-prev">
          {enviando ? <Loader2 className="h-3.5 w-3.5 animate-spin" /> : <Send className="h-3.5 w-3.5" />} Enviar resultado
        </button>
      </div>
      {erro && <p className="mt-2 font-semibold text-rose-700">{erro}</p>}
      {envios.length > 0 && (
        <ul className="mt-2 space-y-0.5 text-[12px]">
          {envios.map((e) => (
            <li key={`${e.escola}-${e.turma}`} className="flex items-center gap-1">
              <CheckCircle2 className="h-3.5 w-3.5 text-emerald-600" /> Enviado: {e.escola} · {e.turma} · {e.alunos} aluno(s) · {new Date(e.atualizadoEm).toLocaleString("pt-BR")}
            </li>
          ))}
          <li className="text-violet-800">Lançou mais alunos? Envie de novo a mesma turma: o envio anterior é substituído.</li>
        </ul>
      )}
    </div>
  );
}
