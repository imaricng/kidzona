import type { NextRequest } from "next/server";
import { env } from "@/lib/env";

/**
 * Smije li zahtjev pokrenuti cron posao? Zaštićeno `CRON_SECRET`-om
 * (Authorization: Bearer <secret> ili ?secret=<secret>). Vercel Cron sam šalje
 * zaglavlje kad je CRON_SECRET postavljen. U produkciji bez tajne endpoint je
 * zatvoren; pri lokalnom razvoju bez tajne dopušten je bez autorizacije.
 */
export function cronDozvoljen(req: NextRequest): boolean {
  if (!env.cronSecret && process.env.NODE_ENV !== "production") return true;
  const header = req.headers.get("authorization") ?? "";
  const queryS = req.nextUrl.searchParams.get("secret") ?? "";
  return !!env.cronSecret && (header === `Bearer ${env.cronSecret}` || queryS === env.cronSecret);
}
