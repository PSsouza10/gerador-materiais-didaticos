import { notFound, redirect } from "next/navigation";
import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { ehAdmin } from "@/lib/uso";
import { bancoLigado } from "@/lib/banco";
import { resumoDeCustos } from "@/lib/custoIA";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Custo de IA · EduGera",
  robots: { index: false, follow: false },
};

// Dólar → real só para leitura. COTACAO_DOLAR na Vercel troca sem mexer no código.
const DOLAR = Number(process.env.COTACAO_DOLAR) || 5.3;

const NOMES = {
  "/api/gerar-material": "Apostila / ficha / lista",
  "/api/gerar-avaliacao": "Avaliação Prova Paulista",
  "/api/gerar-plano": "Plano de aula",
  "/api/trocar-questao": "Troca de questão",
  "/api/ler-cartao": "Correção pela foto do cartão",
  "/api/corrigir-exercicio": "Correção de exercício",
  "/api/revisar-conteudo": "Revisão de conteúdo",
  "/api/gerar-imagem": "Ilustração",
};

const reais = (usd) => (usd === null || usd === undefined ? "—" : (usd * DOLAR).toLocaleString("pt-BR", { style: "currency", currency: "BRL", minimumFractionDigits: 3, maximumFractionDigits: 3 }));
const inteiro = (n) => (n === null || n === undefined ? "—" : Math.round(n).toLocaleString("pt-BR"));

export default async function PaginaCustos({ searchParams }) {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  if (!usuario) redirect("/");
  if (!ehAdmin(usuario.email)) notFound();

  const dias = [7, 30, 90].includes(Number(searchParams?.dias)) ? Number(searchParams.dias) : 30;
  let linhas = null;
  let erro = null;
  if (bancoLigado()) {
    try {
      linhas = await resumoDeCustos(dias);
    } catch (e) {
      erro = String(e?.message || e).slice(0, 160);
    }
  } else erro = "Banco desligado neste ambiente.";

  return (
    <main className="min-h-screen bg-slate-50 px-4 py-12">
      <div className="mx-auto max-w-5xl">
        <a href="/" className="text-sm font-semibold text-indigo-600 hover:underline">Voltar ao EduGera</a>
        <section className="mt-6 rounded-3xl border border-slate-100 bg-white p-6 shadow-sm sm:p-8">
          <p className="text-xs font-bold uppercase tracking-wide text-indigo-600">Painel administrativo</p>
          <h1 className="mt-2 text-2xl font-extrabold text-slate-900">Custo de IA por pedido</h1>
          <p className="mt-2 max-w-3xl text-sm leading-relaxed text-slate-600">
            Custo médio de cada pedido nos últimos {dias} dias, somando todas as chamadas que ele fez (gerar, conferir,
            refazer). Estimativa pelos tokens informados pela OpenAI e pelo Gemini e pela tabela de preços do plano
            pago; dólar a R$ {DOLAR.toLocaleString("pt-BR")}. Não registra conta, conteúdo nem dado de aluno.
          </p>
          <p className="mt-3 flex gap-3 text-sm">
            {[7, 30, 90].map((d) => (
              <a key={d} href={`?dias=${d}`} className={d === dias ? "font-bold text-indigo-700" : "text-indigo-600 hover:underline"}>
                {d} dias
              </a>
            ))}
          </p>

          {erro && <p className="mt-6 rounded-2xl bg-amber-50 p-4 text-sm text-amber-900">{erro}</p>}
          {linhas && linhas.length === 0 && (
            <p className="mt-6 rounded-2xl bg-slate-50 p-4 text-sm text-slate-700">Nenhum pedido registrado ainda. A medição começou em 22/10/2026.</p>
          )}
          {linhas && linhas.length > 0 && (
            <div className="mt-6 overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="text-xs uppercase text-slate-500">
                  <tr>
                    <th className="py-2 pr-4">Recurso</th>
                    <th className="py-2 pr-4 text-right">Pedidos</th>
                    <th className="py-2 pr-4 text-right">Chamadas / pedido</th>
                    <th className="py-2 pr-4 text-right">Tokens entrada</th>
                    <th className="py-2 pr-4 text-right">Tokens saída</th>
                    <th className="py-2 pr-4 text-right">Custo médio</th>
                    <th className="py-2 pr-4 text-right">9 em 10 até</th>
                    <th className="py-2 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100 tabular-nums">
                  {linhas.map((l) => (
                    <tr key={l.rota}>
                      <td className="py-2 pr-4 font-semibold text-slate-900">
                        {NOMES[l.rota] || l.rota}
                        {l.tem_modelo_sem_preco && <span className="ml-1 text-xs font-normal text-amber-700">(modelo sem preço na tabela)</span>}
                      </td>
                      <td className="py-2 pr-4 text-right">{inteiro(l.pedidos)}</td>
                      <td className="py-2 pr-4 text-right">{(l.chamadas_media || 0).toLocaleString("pt-BR", { maximumFractionDigits: 1 })}</td>
                      <td className="py-2 pr-4 text-right">{inteiro(l.entrada_media)}</td>
                      <td className="py-2 pr-4 text-right">{inteiro(l.saida_media)}</td>
                      <td className="py-2 pr-4 text-right font-semibold">{reais(l.custo_medio)}</td>
                      <td className="py-2 pr-4 text-right">{reais(l.custo_p90)}</td>
                      <td className="py-2 text-right">{reais(l.custo_total)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </section>
      </div>
    </main>
  );
}
