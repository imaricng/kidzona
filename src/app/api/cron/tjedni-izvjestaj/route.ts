import { NextRequest, NextResponse } from "next/server";
import { cronDozvoljen } from "@/lib/cron";
import { posaljiTjedniIzvjestaj } from "@/lib/tjedni-izvjestaj";

/**
 * GET/POST /api/cron/tjedni-izvjestaj
 * Tjedni izvještaj „Rođendani ovaj tjedan“ svakog ponedjeljka u 08:00 po
 * hrvatskom vremenu. Vercel Cron radi u UTC-u pa se okida u 06:00 i 07:00 UTC
 * (ljeto/zima). Uz `?test=1` šalje se odmah (za ručnu provjeru izgleda).
 */
async function pokreni(req: NextRequest) {
  if (!cronDozvoljen(req)) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }
  const forsiraj = req.nextUrl.searchParams.get("test") === "1";
  const rezultat = await posaljiTjedniIzvjestaj(new Date(), { forsiraj });
  return NextResponse.json({ ok: true, ...rezultat });
}

export async function GET(req: NextRequest) {
  return pokreni(req);
}

export async function POST(req: NextRequest) {
  return pokreni(req);
}
