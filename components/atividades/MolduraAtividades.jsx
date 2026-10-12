import Link from "next/link";
import { ArrowRight } from "lucide-react";
import Marca from "@/components/fachada/Marca";
import "@/components/fachada/fachada.css";
import { suporteEmail, suporteWhatsapp } from "@/lib/planos";

// Moldura das páginas /atividades: mesmo visual da fachada e da página de planos.
// trilha = [{ rotulo, href? }] — o último item é a página atual (sem link).
export default function MolduraAtividades({ trilha = [], jsonLd = null, children }) {
  return (
    <div className="fachada min-h-screen">
      {jsonLd && <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }} />}
      <header className="mx-auto flex h-[80px] max-w-[1280px] items-center gap-4 px-5 sm:px-8">
        <Link href="/" className="rounded-lg" aria-label="EduGera — página inicial">
          <Marca />
        </Link>
        <div className="ml-auto flex items-center gap-2">
          <span className="hidden sm:inline-flex">
            <Link href="/planos" className="btn-contorno">
              Planos
            </Link>
          </span>
          <Link href="/criar" className="btn-contorno whitespace-nowrap">
            Criar material <ArrowRight className="h-4 w-4" aria-hidden="true" />
          </Link>
        </div>
      </header>

      <main className="mx-auto max-w-[1080px] px-5 pb-20 sm:px-8">
        {trilha.length > 0 && (
          <nav aria-label="Você está em" className="pt-2 text-[14px] text-tinta">
            <ol className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
              {trilha.map((t, i) => (
                <li key={t.rotulo} className="flex items-center gap-1.5">
                  {i > 0 && <span aria-hidden="true">›</span>}
                  {t.href ? (
                    <Link href={t.href} className="font-medium text-roxo hover:underline">
                      {t.rotulo}
                    </Link>
                  ) : (
                    <span aria-current="page" className="font-semibold text-marinho">
                      {t.rotulo}
                    </span>
                  )}
                </li>
              ))}
            </ol>
          </nav>
        )}
        {children}
      </main>

      <footer className="border-t border-marinho/10">
        <nav aria-label="Rodapé" className="mx-auto flex max-w-[1080px] flex-wrap gap-x-6 gap-y-2 px-5 py-6 text-[14px] text-tinta sm:px-8">
          <Link href="/" className="hover:text-roxo">Início</Link>
          <Link href="/atividades" className="hover:text-roxo">Atividades por ano</Link>
          <Link href="/planos" className="hover:text-roxo">Planos</Link>
          <Link href="/privacidade" className="hover:text-roxo">Privacidade</Link>
          <Link href="/termos" className="hover:text-roxo">Termos de Uso</Link>
          <a href={`mailto:${suporteEmail()}`} className="hover:text-roxo">Contato</a>
          <a href={suporteWhatsapp().link} target="_blank" rel="noopener noreferrer" className="hover:text-roxo">WhatsApp {suporteWhatsapp().rotulo}</a>
        </nav>
      </footer>
    </div>
  );
}

// Botão-chamada para o gerador, usado nas três páginas.
export function ChamadaCriar({ texto, botao }) {
  return (
    <div className="mt-12 rounded-3xl bg-marinho p-6 text-center text-white sm:p-8">
      <p className="font-titulo text-[1.5rem] font-semibold leading-tight">{texto}</p>
      <Link href="/criar" className="btn-primario mt-4 inline-flex">
        {botao} <ArrowRight className="h-4 w-4" aria-hidden="true" />
      </Link>
    </div>
  );
}

// Lista de anos em "pílulas".
export function PilulasAnos({ itens }) {
  return (
    <ul className="mt-3 flex flex-wrap gap-2">
      {itens.map((it) => (
        <li key={it.href}>
          <Link href={it.href} className="inline-block rounded-full bg-roxo-claro px-3.5 py-1.5 text-[14px] font-semibold text-marinho hover:bg-roxo hover:text-white">
            {it.rotulo}
          </Link>
        </li>
      ))}
    </ul>
  );
}
