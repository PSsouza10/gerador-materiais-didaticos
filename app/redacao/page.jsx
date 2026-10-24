import { authConfigurado, usuarioAtual } from "@/lib/auth";
import { bancoLigado } from "@/lib/banco";
import { temConstrutorRedacao } from "@/lib/uso";
import { listarRedacoes } from "@/lib/redacoesBanco";
import Moldura from "@/components/redacao/Moldura";
import Entrar from "@/components/redacao/Entrar";
import Historico from "@/components/redacao/Historico";

export const dynamic = "force-dynamic";
export const metadata = { title: "Redação · EduGera", robots: { index: false, follow: false } };

export default async function PaginaRedacao() {
  const usuario = authConfigurado ? await usuarioAtual() : null;
  const pro = usuario ? await temConstrutorRedacao(usuario.email).catch(() => false) : false;
  let historico = null;
  if (usuario && bancoLigado()) historico = await listarRedacoes(usuario.email).catch(() => null);
  return (
    <Moldura titulo="Construir ou corrigir uma redação" subtitulo="Concurso, ENEM e escola (do Fundamental ao Médio)." voltar="/criar">
      <div className="mt-6 grid gap-3 sm:grid-cols-3">
        <a href="/redacao/construir" className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-300">
          <span className="text-lg font-bold text-slate-900">Construir</span>
          {!pro && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">Pro</span>}
          <span className="mt-1 block text-sm text-slate-600">Escreva parte por parte, com dicas: dissertação, artigo, conto, relato, carta ou notícia.</span>
        </a>
        <a href="/redacao/corrigir" className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-300">
          <span className="text-lg font-bold text-slate-900">Corrigir</span>
          <span className="mt-1 block text-sm text-slate-600">Cole o texto e receba nota por critério, erros de português e trechos reescritos.</span>
        </a>
        <a href="/redacao/corrigir?modo=foto" className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-300">
          <span className="text-lg font-bold text-slate-900">Foto da folha</span>
          <span className="mt-1 block text-sm text-slate-600">Fotografe a redação escrita à mão. Ela volta corrigida em vermelho, como se o professor tivesse corrigido.</span>
        </a>
      </div>
      <p className="mt-3 text-sm text-slate-600">
        Professor: <a href="/redacao/minha-letra" className="font-semibold text-indigo-600 hover:underline">cadastre a sua letra</a> e as correções na foto saem escritas com ela.
      </p>
      {!usuario && authConfigurado && <Entrar voltarPara="/redacao" />}
      {historico && (
        <div className="mt-8">
          <h2 className="text-lg font-bold text-slate-900">Minhas redações</h2>
          <Historico itens={historico} />
        </div>
      )}
    </Moldura>
  );
}
