import { NextResponse } from "next/server";
import { head, del } from "@vercel/blob";
import { chaveConfere } from "@/lib/chave";

// Revoga (apaga) um material compartilhado. Exige a chave de revogação que
// foi entregue apenas ao navegador que gerou o material.
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function DELETE(request, { params }) {
  const { id } = params;
  if (!/^[\w-]{6,32}$/.test(id)) return NextResponse.json({ error: "Link inválido." }, { status: 400 });

  let chave;
  try {
    ({ chave } = await request.json());
  } catch {
    return NextResponse.json({ error: "Requisição inválida." }, { status: 400 });
  }

  let meta;
  try {
    meta = await head(`materiais/${id}.json`);
  } catch {
    // já não existe: para o professor, o resultado é o mesmo
    return NextResponse.json({ ok: true, jaRevogado: true });
  }

  try {
    const res = await fetch(meta.url, { cache: "no-store" });
    const registro = await res.json();
    if (!chaveConfere(chave, registro.chaveHash)) {
      return NextResponse.json({ error: "Chave de revogação não confere." }, { status: 403 });
    }
    await del(meta.url);
    return NextResponse.json({ ok: true });
  } catch (e) {
    console.error("Erro ao revogar material:", e);
    return NextResponse.json({ error: "Não foi possível revogar agora. Tente novamente." }, { status: 500 });
  }
}
