import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prijava, getSession } from "@/lib/auth";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";
import { hr } from "@/i18n/hr";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.portal.prijava };

async function prijaviAction(formData: FormData) {
  "use server";
  const ip = dohvatiIp(await headers());
  if (!rateLimit(`login:${ip}`, 8, 10 * 60_000).dozvoljeno) redirect("/portal/prijava?error=1");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const sesija = await prijava(email, password);
  if (!sesija) redirect("/portal/prijava?error=1");
  if (sesija.role !== "roditelj") redirect("/admin/dashboard");
  redirect("/portal");
}

export default async function PortalPrijava({ searchParams }: { searchParams: Promise<{ error?: string; reset?: string }> }) {
  const { error, reset } = await searchParams;
  const sesija = await getSession();
  if (sesija) redirect(sesija.role === "roditelj" ? "/portal" : "/admin/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-100 via-berry-50 to-sky2-100 p-4">
      <div className="card w-full max-w-sm">
        <Link href="/" className="mb-4 flex items-center justify-center gap-2 font-display text-xl font-extrabold text-brand-600">
          <Logo size="sm" />
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-ink-900">{hr.portal.prijava}</h1>
        {error && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2 text-center text-sm text-red-700">Pogrešna e-pošta ili lozinka.</p>}
        {reset && <p className="mt-4 rounded-2xl bg-mint-50 px-4 py-2 text-center text-sm text-mint-700">Lozinka je promijenjena. Prijavite se.</p>}
        <form action={prijaviAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">E-pošta</label>
            <input id="email" name="email" type="email" className="input" required />
          </div>
          <div>
            <label className="label" htmlFor="password">{hr.portal.lozinka}</label>
            <input id="password" name="password" type="password" className="input" required />
          </div>
          <button type="submit" className="btn-primary w-full">{hr.portal.prijava}</button>
        </form>
        <p className="mt-3 text-center text-sm">
          <Link href="/portal/zaboravljena-lozinka" className="text-ink-400 hover:text-brand-600">Zaboravljena lozinka?</Link>
        </p>
        <p className="mt-2 text-center text-sm text-ink-500">
          {hr.portal.nemateRacun}{" "}
          <Link href="/portal/registracija" className="font-medium text-brand-600 hover:underline">{hr.portal.registracija}</Link>
        </p>
      </div>
    </div>
  );
}
