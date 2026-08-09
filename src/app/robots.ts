import type { MetadataRoute } from "next";

import { siteConfig } from "@/config/site";

export default function robots(): MetadataRoute.Robots {
  const base = siteConfig.url.replace(/\/$/, "");

  return {
    rules: {
      userAgent: "*",
      allow: "/",
      // O painel e os uploads de clientes não devem ser indexados.
      disallow: ["/admin", "/admin/", "/api/", "/uploads/"],
    },
    sitemap: `${base}/sitemap.xml`,
  };
}
