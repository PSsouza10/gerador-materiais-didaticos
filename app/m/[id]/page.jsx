import { notFound } from "next/navigation";
import { head } from "@vercel/blob";
import MaterialCompartilhado from "@/components/MaterialCompartilhado";

// Task 4.1 — Página pública do material compartilhado entre docentes.
export const dynamic = "force-dynamic";

async function carregar(id) {
  if (!/^[\w-]{6,32}$/.test(id) || !process.env.BLOB_READ_WRITE_TOKEN) return null;
  try {
    const meta = await head(`materiais/${id}.json`);
    const res = await fetch(meta.url, { cache: "force-cache" });
    return res.ok ? res.json() : null;
  } catch {
    return null;
  }
}

export async function generateMetadata({ params }) {
  const dados = await carregar(params.id);
  return {
    title: dados ? `${dados.material.tituloDidatico} · EduGera` : "Material não encontrado · EduGera",
    description: dados ? dados.material.resumoPedagogico : undefined,
  };
}

export default async function Page({ params }) {
  const dados = await carregar(params.id);
  if (!dados) notFound();
  return <MaterialCompartilhado dados={dados} />;
}
