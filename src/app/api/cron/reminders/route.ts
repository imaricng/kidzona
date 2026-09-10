import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pokreniPodsjetnike } from "@/lib/automation";

/**
 * GET/POST /api/cron/reminders
 * Pokreće dnevne automatske podsjetnike. Zaštićeno `CRON_SECRET`-om
 * (Authorization: Bearer <secret> ili ?secret=<secret>). U dev-u, ako secret nije
 * postavljen, dozvoljeno je bez autorizacije.
 *
 * Primjer Vercel Cron konfiguracije (vercel.json):
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
 */
async function pokreni(req: NextRequest) {
  if (env.cronSecret) {
    const header = req.headers.get("authorization") ?? "";
    const queryS = req.nextUrl.searchParams.get("secret") ?? "";
    const dozvoljeno = header === `Bearer ${env.cronSecret}` || queryS === env.cronSecret;
    if (!dozvoljeno) {
      return NextResponse.json({ error: "Neautorizirano" }, { status: 401 });
    }
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
