import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { objaviCjenik } from "@/lib/cjenik";

export const dynamic = "force-dynamic";

/**
 * GET /cjenik/<naziv datoteke>.csv — objavljeni cjenik usluga (i arhivske
 * verzije). `/cjenik/aktualni.csv` je stalna adresa važeće verzije. Pristup je
 * slobodan i za automatizirane programe (čl. 5. Pravilnika o načinu objave cjenika).
 */
export async function GET(_req: NextRequest, { params }: { params: Promise<{ datoteka: string }> }) {
  const { datoteka } = await params;
  const vazeca = await objaviCjenik();
  const verzija = datoteka === "aktualni.csv" ? vazeca : await prisma.cjenikVerzija.findUnique({ where: { datoteka } });
  if (!verzija) return NextResponse.json({ error: "Cjenik nije pronađen" }, { status: 404 });
  return new NextResponse(verzija.sadrzaj, {
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `inline; filename="${verzija.datoteka}"`,
      "Cache-Control": "public, max-age=0, must-revalidate",
    },
  });
}
