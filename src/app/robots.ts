import type { MetadataRoute } from "next";

export default function robots(): MetadataRoute.Robots {
  const base = (process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000").replace(/\/$/, "");
  return {
    rules: [{ userAgent: "*", allow: ["/", "/book/"], disallow: ["/dashboard", "/admin", "/api/", "/b/"] }],
    sitemap: `${base}/sitemap.xml`,
  };
}
