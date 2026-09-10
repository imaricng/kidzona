import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { zatraziReset } from "@/lib/password-reset";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";
import { hr } from "@/i18n/hr";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Zaboravljena lozinka" };

async function zatraziAction(formData: FormData) {
  "use server";
  const ip = dohvatiIp(await headers());
  if (rateLimit(`reset:${ip}`, 5, 15 * 60_000).dozvoljeno) {
    const email = String(formData.get("email") ?? "");
    if (email) await zatraziReset(email);
  }
  // Uvijek isti odgovor (ne otkrivamo postoji li račun).
  redirect("/portal/zaboravljena-lozinka?sent=1");
}

export default async function ZaboravljenaLozinka({ searchParams }: { searchParams: Promise<{ sent?: string }> }) {
  const { sent } = await searchParams;

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-100 via-berry-50 to-sky2-100 p-4">
      <div className="card w-full max-w-sm">
        <Link href="/" className="mb-4 flex items-center justify-center gap-2 font-display text-xl font-extrabold text-brand-600">
          <Logo size="sm" />
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-ink-900">Postavljanje nove lozinke</h1>

        {sent ? (
          <p className="mt-4 rounded-2xl bg-mint-50 px-4 py-3 text-center text-sm text-mint-700">
            Ako račun postoji, na vašu smo e-poštu poslali poveznicu za postavljanje nove lozinke.
          </p>
        ) : (
          <form action={zatraziAction} className="mt-6 space-y-4">
            <p className="text-sm text-ink-500">Unesite e-poštu povezanu s računom — poslat ćemo vam poveznicu za postavljanje nove lozinke.</p>
            <input name="email" type="email" className="input" placeholder="E-pošta" required />
            <button type="submit" className="btn-primary w-full">Pošalji poveznicu</button>
          </form>
        )}
        <p className="mt-4 text-center text-sm text-ink-500">
          <Link href="/portal/prijava" className="font-medium text-brand-600 hover:underline">← {hr.portal.prijava}</Link>
        </p>
      </div>
    </div>
  );
}
