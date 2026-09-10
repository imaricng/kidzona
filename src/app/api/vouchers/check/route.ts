import { NextRequest, NextResponse } from "next/server";
import { provjeriBon } from "@/lib/vouchers";

/** GET /api/vouchers/check?code=KZ-GIFT-XXXX — provjera bona prije iskorištenja. */
export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get("code");
  if (!code) return NextResponse.json({ valid: false, razlog: "Nedostaje kod" }, { status: 400 });
  const rezultat = await provjeriBon(code);
  return NextResponse.json(rezultat);
}
