import type { MetadataRoute } from "next";
import { ATIVIDADES } from "@/lib/atividadesDados";
import { SITE } from "@/lib/atividades";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date("2026-10-12");
  const atividades = ATIVIDADES.caminhos().map((p: string) => ({
    url: `${SITE}${p}`,
    lastModified: agora,
    changeFrequency: "monthly" as const,
    priority: p === "/atividades" ? 0.8 : 0.7,
  }));
  return [
    { url: `${SITE}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/criar`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/planos`, lastModified: agora, changeFrequency: "monthly", priority: 0.6 },
    ...atividades,
    { url: `${SITE}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
