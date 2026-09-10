import { NextRequest, NextResponse } from "next/server";
import { registracijaSchema } from "@/lib/validation";
import { registrirajRoditelja } from "@/lib/auth";
import { hr } from "@/i18n/hr";

/** POST /api/portal/register — registracija roditelja + obitelji s djecom. */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 400 });
  }
  const parsed = registracijaSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Neispravni podaci" }, { status: 422 });
  }
  const sesija = await registrirajRoditelja(parsed.data);
  if (!sesija) {
    return NextResponse.json({ error: hr.portal.emailZauzet }, { status: 409 });
  }
  return NextResponse.json({ ok: true });
}
