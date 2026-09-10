import { NextRequest, NextResponse } from "next/server";
import { voucherPurchaseSchema } from "@/lib/validation";
import { kupiBon } from "@/lib/vouchers";

/** POST /api/vouchers/purchase — kupnja poklon-bona (mock plaćanje). */
export async function POST(req: NextRequest) {
  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 400 });
  }
  const parsed = voucherPurchaseSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: parsed.error.errors[0]?.message ?? "Neispravni podaci" }, { status: 422 });
  }
  try {
    const bon = await kupiBon(parsed.data);
    return NextResponse.json({ ok: true, code: bon.code });
  } catch {
    return NextResponse.json({ error: "Kupnja nije uspjela. Pokušajte ponovno." }, { status: 500 });
  }
}
