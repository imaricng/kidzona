import { NextResponse, type NextRequest } from "next/server";

/**
 * Stara Vercel adresa trajno se preusmjerava na glavnu domenu (NEXT_PUBLIC_APP_URL)
 * kako tražilice ne bi vidjele isti sadržaj na dvije adrese.
 */
const STARE_ADRESE = new Set(["kidzona-pi.vercel.app"]);

export function middleware(req: NextRequest) {
  const glavna = process.env.NEXT_PUBLIC_APP_URL;
  const host = req.headers.get("host") ?? "";
  if (!glavna || !STARE_ADRESE.has(host)) return NextResponse.next();
  const cilj = new URL(`${req.nextUrl.pathname}${req.nextUrl.search}`, glavna);
  if (cilj.host === host) return NextResponse.next();
  return NextResponse.redirect(cilj, 308);
}

// API (cron, webhookovi), Next.js resursi i datoteke ne preusmjeravaju se.
export const config = {
  matcher: ["/((?!api|_next|.*\\..*).*)"],
};
