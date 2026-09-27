"use client";
import React from "react";
import { ShieldCheck } from "lucide-react";

// Explica, em linguagem direta, onde ficam os dados e como funcionam os links.
export default function Privacidade({ compacto = false }) {
  return (
    <section className="rounded-3xl border border-slate-200 bg-white p-6 shadow-sm">
      <h2 className="flex items-center gap-2 text-base font-bold text-slate-800">
        <ShieldCheck className="h-4 w-4 text-emerald-600" /> Onde ficam seus dados
      </h2>
      <ul className="mt-3 space-y-2 text-[13px] leading-relaxed text-slate-700">
        <li>
          <b>Neste navegador:</b> suas preferências e a lista &ldquo;Minhas Apostilas&rdquo;. Não há conta nem sincronização. Elas se
          perdem se você limpar os dados do navegador, e não aparecem em outro navegador ou aparelho. Use{" "}
          <b>Exportar backup</b> para guardar uma cópia e <b>Importar</b> para restaurar.
        </li>
        <li>
          <b>Sua conta:</b> o login é feito pelo Google. O site recebe seu nome, e-mail e foto só para identificar a sessão
          (um cookie neste navegador, válido por 30 dias). No servidor fica apenas um contador de gerações, sem seu e-mail nem
          seu nome. Use <b>Sair</b> no menu da conta em computadores compartilhados.
        </li>
        <li>
          <b>Computador compartilhado:</b> quem usar este navegador depois verá sua lista e poderá revogar seus links. Exporte o
          backup e use <b>Limpar lista</b> ao terminar.
        </li>
        {!compacto && (
          <>
            <li>
              <b>Links de compartilhamento:</b> o material fica guardado no servidor (Vercel Blob) e <b>qualquer pessoa com o link</b>{" "}
              consegue abrir. O endereço é aleatório e difícil de adivinhar, não aparece em buscadores e fica ativo até você
              clicar em <b>Revogar link</b> em Minhas Apostilas.
            </li>
            <li>
              <b>O que vai no link:</b> o conteúdo da apostila, a ilustração, seu nome e o nome da escola, se preenchidos. Nada
              além do que aparece na folha.
            </li>
            <li>
              <b>Estudantes:</b> não escreva nomes ou dados pessoais de alunos no formulário. O texto das orientações é enviado
              à IA (OpenAI) para gerar o material.
            </li>
          </>
        )}
      </ul>
    </section>
  );
}
