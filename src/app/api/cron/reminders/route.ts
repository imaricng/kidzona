import { NextRequest, NextResponse } from "next/server";
import { cronDozvoljen } from "@/lib/cron";
import { pokreniPodsjetnike } from "@/lib/automation";

/**
 * GET/POST /api/cron/reminders
 * Jutarnja automatika: podsjetnici 7 i 3 dana prije proslave, zahvale za jučer
 * (ako ih večernji posao nije poslao) i rođendanske ponude. Vidi `vercel.json`.
 */
async function pokreni(req: NextRequest) {
  if (!cronDozvoljen(req)) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }
  const rezultat = await pokreniPodsjetnike();
  return NextResponse.json({ ok: true, ...rezultat });
}

export async function GET(req: NextRequest) {
  return pokreni(req);
}

export async function POST(req: NextRequest) {
  return pokreni(req);
}
