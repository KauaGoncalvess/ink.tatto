import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";
import { getArtistSlugs } from "@/features/content/queries";

/**
 * Sitemap.
 *
 * As rotas estáticas são sempre incluídas; as de artista dependem do banco e,
 * se ele não estiver acessível no build, o sitemap sai sem elas em vez de
 * quebrar a geração.
 */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const base = siteConfig.url.replace(/\/$/, "");
  const now = new Date();

  const staticRoutes: MetadataRoute.Sitemap = [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/agendamento`, lastModified: now, changeFrequency: "daily", priority: 0.9 },
    { url: `${base}/servicos`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/artistas`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/galeria`, lastModified: now, changeFrequency: "weekly", priority: 0.7 },
    { url: `${base}/sobre`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/contato`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
  ];

  try {
    const slugs = await getArtistSlugs();
    return [
      ...staticRoutes,
      ...slugs.map((slug) => ({
        url: `${base}/artistas/${slug}`,
        lastModified: now,
        changeFrequency: "monthly" as const,
        priority: 0.7,
      })),
    ];
  } catch {
    return staticRoutes;
  }
}
