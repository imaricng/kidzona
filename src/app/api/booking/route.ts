import { NextRequest, NextResponse } from "next/server";
import { bookingSchema } from "@/lib/validation";
import { kreirajRezervaciju, NeispravnaRezervacijaError, TerminZauzetError } from "@/lib/reservations";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";

/**
 * POST /api/booking
 * Kreira rezervaciju: validira ulaz, sprječava dvostruku rezervaciju, naplaćuje
 * (mock/Stripe), izdaje fiskalizirani račun, povezuje CRM i okida automatske
 * poruke. Vraća kod rezervacije za stranicu potvrde.
 */
export async function POST(req: NextRequest) {
  // Rate-limit: najviše 10 rezervacija u 5 minuta po IP-u.
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
    const r = await kreirajRezervaciju(parsed.data);
    // clientSecret postoji samo u Stripe načinu (potvrda karticom na frontu).
    return NextResponse.json({ ok: true, code: r.code, clientSecret: r.clientSecret });
  } catch (e) {
    if (e instanceof TerminZauzetError) {
      return NextResponse.json(
        { error: "Nažalost, odabrani termin je upravo zauzet. Odaberite drugi.", code: "TERMIN_ZAUZET" },
        { status: 409 },
      );
    }
    if (e instanceof NeispravnaRezervacijaError) {
      return NextResponse.json({ error: e.message, code: "NEISPRAVNA_REZERVACIJA" }, { status: 422 });
    }
    console.error("Pogreška pri stvaranju rezervacije:", e);
    return NextResponse.json({ error: "Došlo je do pogreške. Pokušajte ponovno." }, { status: 500 });
  }
}
