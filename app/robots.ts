import type { MetadataRoute } from "next";

const SITE = "https://edugera.vercel.app";

// Só as páginas públicas são indexáveis. Materiais compartilhados (/m/),
// API e callbacks do login ficam de fora.
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: ["/", "/criar", "/planos", "/privacidade", "/termos"], disallow: ["/api/", "/m/", "/qualidade", "/capas-teste", "/uso"] }],
    sitemap: `${SITE}/sitemap.xml`,
  };
}
