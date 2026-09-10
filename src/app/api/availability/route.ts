import { NextRequest, NextResponse } from "next/server";
import { dohvatiDostupnostDana } from "@/lib/reservations";

/**
 * GET /api/availability?date=YYYY-MM-DD
 * Vraća početke po rasporedu tog dana (traffic-light + slobodne sobe) i zauzete
 * intervale igraonica.
 */
export async function GET(req: NextRequest) {
  const date = req.nextUrl.searchParams.get("date");
  if (!date || !/^\d{4}-\d{2}-\d{2}$/.test(date)) {
    return NextResponse.json({ error: "Neispravan datum" }, { status: 400 });
  }
  const dostupnost = await dohvatiDostupnostDana(date);
  return NextResponse.json({ date, ...dostupnost });
}
