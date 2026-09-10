import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, odjava } from "@/lib/auth";
import { hr } from "@/i18n/hr";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function odjavaAction() {
  "use server";
  await odjava();
  redirect("/portal/prijava");
}

export default async function PortalLayout({ children }: { children: React.ReactNode }) {
  const sesija = await getSession();
  if (!sesija) redirect("/portal/prijava");
  if (sesija.role !== "roditelj") redirect("/admin/dashboard");

  return (
    <div className="min-h-screen bg-paper">
      <header className="border-b border-black/5 bg-white">
        <div className="section flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-600">
            <Logo size="sm" />
          </Link>
          <nav className="flex items-center gap-4 text-sm">
            <Link href="/portal" className="text-ink-600 hover:text-brand-600">{hr.portal.naslov}</Link>
            <Link href="/portal/djeca" className="text-ink-600 hover:text-brand-600">{hr.portal.mojaDjeca}</Link>
            <Link href="/portal/racun" className="text-ink-600 hover:text-brand-600">{hr.portal.racunIPrivatnost}</Link>
            <Link href="/rezervacija" className="btn-primary !px-3 !py-1.5 !text-sm">{hr.portal.novaRezervacija}</Link>
            <form action={odjavaAction}>
              <button type="submit" className="text-ink-400 hover:text-red-600">{hr.portal.odjava}</button>
            </form>
          </nav>
        </div>
      </header>
      <main className="section py-8">{children}</main>
    </div>
  );
}
