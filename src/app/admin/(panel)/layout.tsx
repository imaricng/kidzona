import { redirect } from "next/navigation";
import Link from "next/link";
import { getSession, odjava } from "@/lib/auth";
import { hr } from "@/i18n/hr";
import { AdminNav } from "@/components/admin/AdminNav";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";

async function odjavaAction() {
  "use server";
  await odjava();
  redirect("/admin");
}

export default async function PanelLayout({ children }: { children: React.ReactNode }) {
  const sesija = await getSession();
  if (!sesija) redirect("/admin");
  // Roditelji nemaju pristup administraciji — preusmjeri na njihov portal.
  if (sesija.role === "roditelj") redirect("/portal");

  return (
    <div className="min-h-screen bg-paper">
      <div className="flex">
        {/* Sidebar (desktop) */}
        <aside className="sticky top-0 hidden h-screen w-60 shrink-0 flex-col border-r border-black/5 bg-white p-4 md:flex">
          <Link href="/" className="mb-6 flex items-center gap-2 font-display text-lg font-extrabold text-brand-600">
            <Logo size="sm" />
          </Link>
          <AdminNav />
          <div className="mt-auto border-t border-black/5 pt-4">
            <p className="px-3 text-sm font-medium text-ink-700">{sesija.name}</p>
            <p className="px-3 text-xs text-ink-400">{sesija.role}</p>
            <form action={odjavaAction}>
              <button type="submit" className="mt-2 w-full rounded-xl px-3 py-2 text-left text-sm text-ink-500 hover:bg-red-50 hover:text-red-600">
                ↪ {hr.admin.odjava}
              </button>
            </form>
          </div>
        </aside>

        <div className="min-w-0 flex-1">
          {/* Mobilna nav traka */}
          <div className="sticky top-0 z-30 flex items-center justify-between border-b border-black/5 bg-white px-4 py-3 md:hidden">
            <Link href="/admin/dashboard" className="font-display font-extrabold text-brand-600"><Logo size="sm" /></Link>
            <form action={odjavaAction}>
              <button type="submit" className="text-sm text-ink-500">{hr.admin.odjava}</button>
            </form>
          </div>
          <div className="md:hidden">
            <div className="border-b border-black/5 bg-white px-2 pb-2">
              <AdminNav mobilni />
            </div>
          </div>

          <main className="p-4 sm:p-6 lg:p-8">{children}</main>
        </div>
      </div>
    </div>
  );
}
