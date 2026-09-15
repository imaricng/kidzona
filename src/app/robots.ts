import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/** robots.txt — privatni dijelovi (administracija, portal, potvrde) ne indeksiraju se. */
export default function robots(): MetadataRoute.Robots {
  return {
    rules: [{ userAgent: "*", allow: "/", disallow: ["/admin", "/portal", "/potvrda", "/checkin", "/api"] }],
    sitemap: `${SITE_URL}/sitemap.xml`,
    host: SITE_URL,
  };
}
