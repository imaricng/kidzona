import { NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";

/**
 * GET /api/pozivnice/predlozak/{themeId}/{roomId} — slika predloška pozivnice.
 * Predlošci se čuvaju u bazi (nema vanjskog pohranjivanja datoteka), pa ih
 * poslužuje aplikacija. Slika je ista za sve proslave te teme i igraonice.
 */
export async function GET(_req: Request, { params }: { params: Promise<{ themeId: string; roomId: string }> }) {
  const { themeId, roomId } = await params;
  const predlozak = await prisma.pozivnicaPredlozak.findUnique({
    where: { themeId_roomId: { themeId, roomId } },
    select: { mime: true, podaci: true, updatedAt: true },
  });
  if (!predlozak) return new NextResponse("Predložak nije postavljen.", { status: 404 });

  return new NextResponse(new Uint8Array(predlozak.podaci), {
    headers: {
      "Content-Type": predlozak.mime,
      "Content-Length": String(predlozak.podaci.length),
      // Predložak se mijenja rijetko; `updatedAt` u oznaci razbija predmemoriju.
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
      ETag: `"${predlozak.updatedAt.getTime()}"`,
    },
  });
}
