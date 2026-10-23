import { NextResponse } from "next/server";
import { comRequestId } from "@/lib/requestId";
import { exigirAdmin, semCache } from "@/lib/admin";
import { bancoLigado } from "@/lib/banco";
import { marcarCoordenador } from "@/lib/cadernos";
import { ativarAssinatura } from "@/lib/contas";

// Piloto do Ciclo de Recomposição (só administrador):
//   acao "coordenador": marca (ou desmarca) contas que podem criar cadernos;
//   acao "pro": libera o Pro sem cobrança para os professores do piloto, por N dias.
// Os e-mails NÃO são guardados: o banco recebe só o código (HMAC) da conta.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const EMAIL = /^[^\s@]{1,64}@[^\s@]{1,190}\.[^\s@]{2,}$/;

async function postRota(request) {
  const { erro } = await exigirAdmin();
  if (erro) return erro;
  if (!bancoLigado()) return NextResponse.json({ error: "Banco desligado neste ambiente." }, { status: 503, headers: semCache });
  let corpo;
  try {
    corpo = await request.json();
  } catch {
    return NextResponse.json({ error: "Pedido inválido." }, { status: 400, headers: semCache });
  }
  const emails = [...new Set(String(corpo.emails || "").split(/[\s,;]+/).map((e) => e.trim().toLowerCase()).filter(Boolean))];
  const invalidos = emails.filter((e) => !EMAIL.test(e));
  if (!emails.length || invalidos.length || emails.length > 100)
    return NextResponse.json({ error: invalidos.length ? `E-mail inválido: ${invalidos.slice(0, 3).join(", ")}` : "Informe de 1 a 100 e-mails." }, { status: 400, headers: semCache });

  const feitos = [];
  if (corpo.acao === "coordenador") {
    for (const e of emails) await marcarCoordenador(e, corpo.desmarcar !== true);
    feitos.push(`${emails.length} conta(s) ${corpo.desmarcar === true ? "deixaram de ser" : "agora são"} coordenador(as).`);
  } else if (corpo.acao === "pro") {
    const dias = Number(corpo.dias) || 60;
    if (!Number.isInteger(dias) || dias < 1 || dias > 366) return NextResponse.json({ error: "Dias inválidos (1 a 366)." }, { status: 400, headers: semCache });
    for (const e of emails) await ativarAssinatura(e, "pro_mensal", "manual", { dias });
    feitos.push(`Pro liberado por ${dias} dias para ${emails.length} conta(s).`);
  } else return NextResponse.json({ error: "Ação inválida." }, { status: 400, headers: semCache });
  return NextResponse.json({ ok: true, feitos }, { headers: semCache });
}

export const POST = comRequestId("/api/admin/piloto", postRota);
