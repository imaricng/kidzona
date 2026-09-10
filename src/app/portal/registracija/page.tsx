import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession } from "@/lib/auth";
import { hr } from "@/i18n/hr";
import { RegistracijaForm } from "@/components/portal/RegistracijaForm";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.portal.registracija };

export default async function PortalRegistracija() {
  const sesija = await getSession();
  if (sesija) redirect(sesija.role === "roditelj" ? "/portal" : "/admin/dashboard");

  return (
    <div className="min-h-screen bg-paper py-10">
      <div className="mx-auto max-w-2xl px-4">
        <Link href="/" className="flex items-center justify-center gap-2 font-display text-xl font-extrabold text-brand-600">
          <Logo size="sm" />
        </Link>
        <div className="mt-6 text-center">
          <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.portal.registracijaNaslov}</h1>
          <p className="mt-1 text-ink-500">{hr.portal.registracijaOpis}</p>
        </div>
        <div className="mt-8">
          <RegistracijaForm />
        </div>
      </div>
    </div>
  );
}
