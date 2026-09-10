import { NextRequest, NextResponse } from "next/server";
import { env } from "@/lib/env";
import { pokreniPodsjetnike } from "@/lib/automation";

/**
 * GET/POST /api/cron/reminders
 * Pokreće dnevne automatske podsjetnike. Zaštićeno `CRON_SECRET`-om
 * (Authorization: Bearer <secret> ili ?secret=<secret>). Vercel Cron sam šalje
 * zaglavlje kad je CRON_SECRET postavljen. U produkciji bez tajne endpoint je
 * zatvoren; pri lokalnom razvoju bez tajne dopušten je bez autorizacije.
 *
 * Primjer Vercel Cron konfiguracije (vercel.json):
 *   { "crons": [{ "path": "/api/cron/reminders", "schedule": "0 9 * * *" }] }
 */
async function pokreni(req: NextRequest) {
  if (env.cronSecret || process.env.NODE_ENV === "production") {
    const header = req.headers.get("authorization") ?? "";
    const queryS = req.nextUrl.searchParams.get("secret") ?? "";
    const dozvoljeno = !!env.cronSecret && (header === `Bearer ${env.cronSecret}` || queryS === env.cronSecret);
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
