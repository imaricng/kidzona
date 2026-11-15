import { NextRequest, NextResponse } from "next/server";
import { cronDozvoljen } from "@/lib/cron";
import { osvjeziKalendar } from "@/lib/reservations";

// Svaka proslava je jedan poziv Googleu; s više desetaka proslava treba vremena.
export const maxDuration = 60;

/**
 * POST /api/cron/kalendar
 * Ponovno upisuje sve potvrđene proslave u Google kalendar (npr. nakon promjene
 * oblika naslova). Nije zakazano — pokreće se ručno, zaštićeno `CRON_SECRET`-om.
 */
export async function POST(req: NextRequest) {
  if (!cronDozvoljen(req)) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }
  const rezultat = await osvjeziKalendar();
  return NextResponse.json({ ok: rezultat.greske.length === 0, ...rezultat });
}
