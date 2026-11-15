import { NextRequest, NextResponse } from "next/server";
import { cronDozvoljen } from "@/lib/cron";
import { zakljuciDan } from "@/lib/automation";

/**
 * GET/POST /api/cron/kraj-dana
 * Kraj radnog dana u 21 h: današnje proslave prelaze u „završeno", a roditelji
 * dobivaju zahvalu i molbu za recenziju. Vercel Cron radi u UTC-u, pa se poziva
 * u 19 i 20 h UTC (21 h ljeti i zimi); poziv prije 21 h našeg vremena ne radi ništa.
 */
async function pokreni(req: NextRequest) {
  if (!cronDozvoljen(req)) {
    return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
  }
  const rezultat = await zakljuciDan();
  return NextResponse.json({ ok: true, ...rezultat });
}

export async function GET(req: NextRequest) {
  return pokreni(req);
}

export async function POST(req: NextRequest) {
  return pokreni(req);
}
