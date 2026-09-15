import type { MetadataRoute } from "next";
import { prisma } from "@/lib/prisma";
import { SITE_URL, slugIgraonice } from "@/lib/seo";

export const revalidate = 3600;

/** sitemap.xml — javne stranice i podstranice aktivnih igraonica. */
export default async function sitemap(): Promise<MetadataRoute.Sitemap> {
  const sada = new Date();
  let igraonice: MetadataRoute.Sitemap = [];
  try {
    const sobe = await prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" }, select: { name: true } });
    igraonice = sobe.map((s) => ({
      url: `${SITE_URL}/proslave/${slugIgraonice(s.name)}`,
      lastModified: sada,
      changeFrequency: "monthly",
      priority: 0.9,
    }));
  } catch (e) {
    // Bez baze sitemap i dalje sadrži osnovne stranice.
    console.error("Sitemap: igraonice nisu dohvaćene", e);
  }
  return [
    { url: SITE_URL, lastModified: sada, changeFrequency: "weekly", priority: 1 },
    ...igraonice,
    { url: `${SITE_URL}/rezervacija`, lastModified: sada, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE_URL}/pokloni`, lastModified: sada, changeFrequency: "monthly", priority: 0.6 },
    { url: `${SITE_URL}/privatnost`, lastModified: sada, changeFrequency: "yearly", priority: 0.2 },
  ];
}
