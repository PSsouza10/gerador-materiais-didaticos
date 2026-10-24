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
    <Moldura titulo="Construir ou corrigir uma redação" subtitulo="Dissertação argumentativa para concurso, ENEM ou escola." voltar="/criar">
      <div className="mt-6 grid gap-3 sm:grid-cols-2">
        <a href="/redacao/construir" className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-300">
          <span className="text-lg font-bold text-slate-900">Construir</span>
          {!pro && <span className="ml-2 rounded-full bg-indigo-100 px-2 py-0.5 text-xs font-bold text-indigo-700">Pro</span>}
          <span className="mt-1 block text-sm text-slate-600">Escreva parte por parte, em 9 etapas com dicas. O EduGera monta os 4 parágrafos e conta as linhas.</span>
        </a>
        <a href="/redacao/corrigir" className="rounded-2xl border border-slate-200 p-5 hover:border-indigo-300">
          <span className="text-lg font-bold text-slate-900">Corrigir</span>
          <span className="mt-1 block text-sm text-slate-600">Cole o texto e receba nota por critério, erros de português e trechos reescritos.</span>
        </a>
      </div>
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
