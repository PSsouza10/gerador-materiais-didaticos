"use client";
import React, { useEffect, useState } from "react";
import { signIn } from "next-auth/react";
import { Loader2, Gift, LogIn, CheckCircle2 } from "lucide-react";

const botao = "inline-flex items-center gap-2 rounded-xl bg-roxo px-5 py-3 font-semibold text-white hover:bg-roxo-escuro disabled:opacity-60";
const data = (iso) => (iso ? new Date(iso).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" }) : "");

// /convite/<CÓDIGO>: entra com o Google e ativa os dias de Pro da campanha
export default function AtivarConvite({ codigo }) {
  const [info, setInfo] = useState(null);
  const [ativando, setAtivando] = useState(false);
  const [feito, setFeito] = useState(null);
  const [erro, setErro] = useState("");

  useEffect(() => {
    fetch(`/api/convite/${codigo}`, { cache: "no-store" })
      .then((r) => r.json())
      .then(setInfo)
      .catch(() => setInfo({ valida: false, motivo: "Sem conexão com o servidor." }));
  }, [codigo]);

  async function ativar() {
    setAtivando(true);
    setErro("");
    try {
      const r = await fetch(`/api/convite/${codigo}`, { method: "POST" });
      const j = await r.json().catch(() => ({}));
      if (!r.ok) throw new Error(j.error || `Erro ${r.status}.`);
      setFeito(j);
    } catch (e) {
      setErro(e instanceof TypeError ? "Sem conexão com o servidor." : e.message);
    } finally {
      setAtivando(false);
    }
  }

  if (!info)
    return (
      <p className="flex items-center gap-2 text-slate-600">
        <Loader2 className="h-4 w-4 animate-spin" /> Abrindo o convite…
      </p>
    );

  if (feito)
    return (
      <div>
        <p className="flex items-center gap-2 text-xl font-extrabold text-emerald-700">
          <CheckCircle2 className="h-6 w-6" /> Pro ativado por {feito.dias} dias!
        </p>
        <p className="mt-2 text-slate-700">
          Vale{feito.ate ? ` até ${data(feito.ate)}` : ""}, sem cobrança. Depois a conta volta sozinha para o plano Grátis; nada é cobrado e seus materiais continuam guardados.
        </p>
        <a href="/criar?aba=prova" className={`${botao} mt-6`}>
          Criar meu primeiro simulado
        </a>
      </div>
    );

  return (
    <div>
      <p className="flex items-center gap-2 text-xs font-bold uppercase tracking-wide text-roxo-escuro">
        <Gift className="h-4 w-4" /> Convite EduGera
      </p>
      <h1 className="mt-2 text-2xl font-extrabold text-slate-900">{info.valida ? `${info.dias} dias de Pro grátis` : "Convite indisponível"}</h1>
      {info.valida ? (
        <>
          <ul className="mt-4 space-y-1 text-[15px] text-slate-700">
            <li>✓ Simulados no formato da Prova Paulista, com gabarito conferido</li>
            <li>✓ Correção da turma pela foto do cartão-resposta e relatório por habilidade</li>
            <li>✓ Apostilas, listas e planos de aula da BNCC</li>
            <li>✓ Sem cartão e sem cobrança: depois volta para o Grátis</li>
          </ul>
          <p className="mt-3 text-[13px] text-slate-500">
            Ative até {data(info.fim)}. Uma ativação por conta Google. Ao ativar, você concorda com os <a className="underline" href="/termos">Termos de Uso</a>.
          </p>
          {erro && <p className="mt-4 font-semibold text-rose-700">{erro}</p>}
          <div className="mt-6">
            {info.logado ? (
              <button type="button" className={botao} onClick={ativar} disabled={ativando}>
                {ativando ? <Loader2 className="h-4 w-4 animate-spin" /> : <Gift className="h-4 w-4" />} Ativar meus {info.dias} dias
              </button>
            ) : (
              <button type="button" className={botao} onClick={() => signIn("google", { callbackUrl: `/convite/${codigo}` })}>
                <LogIn className="h-4 w-4" /> Entrar com Google para ativar
              </button>
            )}
          </div>
        </>
      ) : (
        <>
          <p className="mt-3 text-slate-700">{info.motivo}</p>
          <a href="/criar" className={`${botao} mt-6`}>
            Conhecer o EduGera (plano Grátis)
          </a>
        </>
      )}
    </div>
  );
}
