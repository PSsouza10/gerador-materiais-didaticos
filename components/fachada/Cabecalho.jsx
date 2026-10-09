"use client";
import React, { useEffect, useState } from "react";
import Link from "next/link";
import { useSession, signIn } from "next-auth/react";
import { Menu, X, UserRound, ArrowRight } from "lucide-react";
import Marca from "./Marca";

const LINKS = [
  { href: "#como-funciona", rotulo: "Como funciona" },
  { href: "#exemplos", rotulo: "Exemplos" },
  { href: "#bncc", rotulo: "BNCC" },
  { href: "#perguntas", rotulo: "Perguntas" },
];

// Cabeçalho da fachada: navegação por âncoras, "Entrar" (Google) e acesso direto ao gerador.
export default function Cabecalho() {
  const { status } = useSession();
  const [aberto, setAberto] = useState(false);
  const [rolou, setRolou] = useState(false);
  const logado = status === "authenticated";

  useEffect(() => {
    const aoRolar = () => setRolou(window.scrollY > 8);
    aoRolar();
    window.addEventListener("scroll", aoRolar, { passive: true });
    return () => window.removeEventListener("scroll", aoRolar);
  }, []);

  useEffect(() => {
    if (!aberto) return;
    const aoTeclar = (e) => e.key === "Escape" && setAberto(false);
    window.addEventListener("keydown", aoTeclar);
    return () => window.removeEventListener("keydown", aoTeclar);
  }, [aberto]);

  const entrar = () => signIn("google", { callbackUrl: "/criar" });

  const BotaoConta = ({ className = "" }) =>
    logado ? (
      <Link href="/criar" className={`btn-contorno ${className}`}>
        Abrir o EduGera <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    ) : (
      <button type="button" onClick={entrar} className={`btn-contorno ${className}`}>
        <UserRound className="h-4 w-4" aria-hidden="true" /> Entrar
      </button>
    );

  return (
    <header
      id="topo"
      className={`sticky top-0 z-40 transition-[background-color,box-shadow,backdrop-filter] duration-300 ${
        rolou || aberto ? "bg-creme/90 shadow-[0_1px_0_rgba(22,26,79,0.08)] backdrop-blur-md" : "bg-transparent"
      }`}
    >
      <div className="mx-auto flex h-[72px] max-w-[1200px] items-center gap-6 px-5 sm:px-8">
        <Link href="/" className="rounded-lg" aria-label="EduGera — página inicial">
          <Marca />
        </Link>
        <nav aria-label="Seções da página" className="ml-6 hidden lg:block">
          <ul className="flex items-center gap-7 text-[15px] font-medium text-marinho">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} className="link-nav">
                  {l.rotulo}
                </a>
              </li>
            ))}
          </ul>
        </nav>
        <div className="ml-auto flex items-center gap-2 sm:gap-3">
          <BotaoConta />
          <span className="hidden md:inline-flex">
            <Link href="/criar" className="btn-primario !min-h-[44px] !px-5 !py-2.5 !text-[15px]">
              Criar apostila
            </Link>
          </span>
        </div>
        <button
          type="button"
          className="inline-flex h-11 w-11 items-center justify-center rounded-xl text-marinho hover:bg-marinho/5 lg:hidden"
          aria-expanded={aberto}
          aria-controls="menu-movel"
          aria-label={aberto ? "Fechar menu" : "Abrir menu"}
          onClick={() => setAberto((v) => !v)}
        >
          {aberto ? <X className="h-6 w-6" aria-hidden="true" /> : <Menu className="h-6 w-6" aria-hidden="true" />}
        </button>
      </div>

      {aberto && (
        <nav id="menu-movel" aria-label="Menu" className="border-t border-marinho/10 px-5 pb-6 pt-2 lg:hidden">
          <ul className="flex flex-col">
            {LINKS.map((l) => (
              <li key={l.href}>
                <a href={l.href} onClick={() => setAberto(false)} className="block rounded-lg px-2 py-3 text-base font-medium text-marinho hover:bg-marinho/5">
                  {l.rotulo}
                </a>
              </li>
            ))}
          </ul>
          <div className="mt-4 md:hidden">
            <Link href="/criar" className="btn-primario w-full justify-center">
              Criar minha primeira apostila
            </Link>
          </div>
        </nav>
      )}
    </header>
  );
}
