import { redirect } from "next/navigation";
import { headers } from "next/headers";
import Link from "next/link";
import { prijava, getSession } from "@/lib/auth";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";
import { hr } from "@/i18n/hr";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.prijavaNaslov };

/** Server action za prijavu administratora/osoblja. */
async function prijaviAction(formData: FormData) {
  "use server";
  const ip = dohvatiIp(await headers());
  if (!rateLimit(`login:${ip}`, 8, 10 * 60_000).dozvoljeno) redirect("/admin?error=rate");
  const email = String(formData.get("email") ?? "");
  const password = String(formData.get("password") ?? "");
  const sesija = await prijava(email, password);
  if (!sesija) redirect("/admin?error=1");
  // Roditelji idu na svoj portal, osoblje/admin u administraciju.
  if (sesija.role === "roditelj") redirect("/portal");
  redirect("/admin/dashboard");
}

export default async function AdminLoginPage({
  searchParams,
}: {
  searchParams: Promise<{ error?: string }>;
}) {
  const { error } = await searchParams;
  const sesija = await getSession();
  if (sesija) redirect(sesija.role === "roditelj" ? "/portal" : "/admin/dashboard");

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-100 via-berry-50 to-sky2-100 p-4">
      <div className="card w-full max-w-sm">
        <Link href="/" className="mb-4 flex items-center justify-center gap-2 font-display text-xl font-extrabold text-brand-600">
          <Logo size="sm" />
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-ink-900">{hr.admin.prijavaNaslov}</h1>

        {error && (
          <p className="mt-4 rounded-2xl bg-red-50 px-4 py-2 text-center text-sm text-red-700 ring-1 ring-red-200">
            {error === "rate" ? "Previše pokušaja. Pokušajte za nekoliko minuta." : hr.admin.pogresnaPrijava}
          </p>
        )}

        <form action={prijaviAction} className="mt-6 space-y-4">
          <div>
            <label className="label" htmlFor="email">E-pošta</label>
            <input id="email" name="email" type="email" className="input" autoComplete="username" required />
          </div>
          <div>
            <label className="label" htmlFor="password">{hr.admin.lozinka}</label>
            <input id="password" name="password" type="password" className="input" autoComplete="current-password" required />
          </div>
          <button type="submit" className="btn-primary w-full">{hr.admin.prijaviSe}</button>
        </form>      </div>
    </div>
  );
}
