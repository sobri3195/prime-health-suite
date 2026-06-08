import { createFileRoute } from "@tanstack/react-router";
import type {} from "@tanstack/react-start";
import { listPublishedDiklatSlugs } from "@/lib/diklat.functions";

const BASE_URL = "https://prime-health-suite.lovable.app";

export const Route = createFileRoute("/sitemap.xml")({
  server: {
    handlers: {
      GET: async () => {
        const slugs = await listPublishedDiklatSlugs();
        const staticEntries = [
          { path: "/", changefreq: "weekly", priority: "1.0" },
          { path: "/diklat", changefreq: "daily", priority: "0.9" },
        ];
        const dynamic = slugs.map((s) => ({
          path: `/diklat/${s.slug}`,
          lastmod: s.updated_at?.slice(0, 10),
          changefreq: "monthly",
          priority: "0.8",
        }));

        const urls = [...staticEntries, ...dynamic].map((e) =>
          [
            `  <url>`,
            `    <loc>${BASE_URL}${e.path}</loc>`,
            "lastmod" in e && e.lastmod ? `    <lastmod>${e.lastmod}</lastmod>` : null,
            `    <changefreq>${e.changefreq}</changefreq>`,
            `    <priority>${e.priority}</priority>`,
            `  </url>`,
          ]
            .filter(Boolean)
            .join("\n"),
        );

        const xml = [
          `<?xml version="1.0" encoding="UTF-8"?>`,
          `<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">`,
          ...urls,
          `</urlset>`,
        ].join("\n");

        return new Response(xml, {
          headers: {
            "Content-Type": "application/xml",
            "Cache-Control": "public, max-age=3600",
          },
        });
      },
    },
  },
});
