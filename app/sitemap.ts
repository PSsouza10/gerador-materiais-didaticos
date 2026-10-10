import type { MetadataRoute } from "next";

const SITE = "https://edugera.vercel.app";

export default function sitemap(): MetadataRoute.Sitemap {
  const agora = new Date("2026-09-27");
  return [
    { url: `${SITE}/`, lastModified: agora, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/criar`, lastModified: agora, changeFrequency: "weekly", priority: 0.8 },
    { url: `${SITE}/privacidade`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
    { url: `${SITE}/termos`, lastModified: agora, changeFrequency: "yearly", priority: 0.3 },
  ];
}
