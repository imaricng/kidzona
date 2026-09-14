import { NextRequest, NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { posaljiUpit, NeispravnaRezervacijaError } from "@/lib/reservations";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";

/**
 * POST /api/booking
 * Prima upit za proslavu s weba: provjerava podatke, sprema upit (ne zauzima
 * termin), povezuje bazu obitelji i šalje obavijest kupcu i osoblju.
 * Administrator upit zatim odobrava, uređuje ili odbija.
 */
export async function POST(req: NextRequest) {
  // Rate-limit: najviše 10 upita u 5 minuta po IP-u.
  const ip = dohvatiIp(req.headers);
  if (!rateLimit(`booking:${ip}`, 10, 5 * 60_000).dozvoljeno) {
    return NextResponse.json({ error: "Previše pokušaja. Pokušajte za nekoliko minuta." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 400 });
  }

  const parsed = bookingSchema.safeParse(body);
  if (!parsed.success) {
    const prvaGreska = parsed.error.errors[0]?.message ?? "Neispravni podaci";
    return NextResponse.json({ error: prvaGreska, detalji: parsed.error.flatten() }, { status: 422 });
  }

  try {
    const r = await posaljiUpit(parsed.data);
    return NextResponse.json({ ok: true, code: r.code });
  } catch (e) {
    if (e instanceof NeispravnaRezervacijaError) {
      return NextResponse.json({ error: e.message, code: "NEISPRAVNA_REZERVACIJA" }, { status: 422 });
    }
    console.error("Pogreška pri slanju upita:", e);
    return NextResponse.json({ error: "Došlo je do pogreške. Pokušajte ponovno." }, { status: 500 });
  }
}
