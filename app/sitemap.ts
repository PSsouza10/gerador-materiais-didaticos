import type { MetadataRoute } from "next";
import { ATIVIDADES } from "@/lib/atividadesDados";
import { SITE } from "@/lib/atividades";
import { PROVA_PAULISTA } from "@/lib/provaPaulistaDados";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date("2026-10-22");
  const atividades = ATIVIDADES.caminhos().map((p: string) => ({
    url: `${SITE}${p}`,
    lastModified: agora,
    changeFrequency: "monthly" as const,
    priority: p === "/atividades" ? 0.8 : 0.7,
  }));
  const provaPaulista = PROVA_PAULISTA.caminhos().map((p: string) => ({
    url: `${SITE}${p}`,
    lastModified: agora,
    changeFrequency: "monthly" as const,
    priority: p === "/prova-paulista" ? 0.9 : p.startsWith("/prova-paulista/") ? 0.8 : 0.6,
  }));
  return [
    { url: `${SITE}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/criar`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/planos`, lastModified: agora, changeFrequency: "monthly", priority: 0.6 },
    ...atividades,
    ...provaPaulista,
    { url: `${SITE}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
