"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hr } from "@/i18n/hr";

const STAVKE = [
  { href: "/admin/dashboard", label: hr.admin.nadzornaPloca, ikona: "📊" },
  { href: "/admin/kalendar", label: hr.admin.kalendar, ikona: "📅" },
  { href: "/admin/rezervacije", label: hr.admin.rezervacije, ikona: "🎟️" },
  { href: "/admin/crm", label: hr.admin.crm, ikona: "👨‍👩‍👧" },
  { href: "/admin/osoblje", label: hr.admin.osoblje, ikona: "🧑‍🏫" },
  { href: "/admin/paketi", label: hr.admin.paketi, ikona: "🎁" },
  { href: "/admin/prostor", label: "Igraonice i teme", ikona: "🏠" },
  { href: "/admin/pokloni", label: hr.pokloni.naslov, ikona: "🎀" },
  { href: "/admin/clanstva", label: "Članstva i vjernost", ikona: "⭐" },
  { href: "/admin/pos", label: hr.admin.pos, ikona: "🛒" },
];

export function AdminNav({ mobilni = false }: { mobilni?: boolean }) {
  const pathname = usePathname();
  return (
    <nav className={mobilni ? "flex gap-1 overflow-x-auto pt-2" : "flex flex-col gap-1"}>
      {STAVKE.map((s) => {
        const aktivno = pathname === s.href;
        return (
          <Link
            key={s.href}
            href={s.href}
            className={`flex items-center gap-2 whitespace-nowrap rounded-xl px-3 py-2 text-sm font-medium transition ${
              aktivno ? "bg-brand-500 text-white" : "text-ink-600 hover:bg-brand-50"
            }`}
          >
            <span aria-hidden>{s.ikona}</span>
            {s.label}
          </Link>
        );
      })}
    </nav>
  );
}
