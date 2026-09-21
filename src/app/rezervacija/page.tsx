import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { getSessionFamily } from "@/lib/portal";
import { BookingWizard, type Katalog, type PocetniKontakt } from "@/components/booking/BookingWizard";
import { Logo } from "@/components/Logo";
import { ObavijestZatvaranja } from "@/components/ObavijestZatvaranja";
import { lokalniISO } from "@/lib/slots";

export const dynamic = "force-dynamic";

export const metadata = {
  title: "Rezervacija dječjeg rođendana",
  description:
    "Pošaljite upit za dječji rođendan u Party Kidzoni Nova Gradiška: odaberite datum, igraonicu, paket i temu, a mi vam se javljamo s potvrdom.",
  alternates: { canonical: "/rezervacija" },
};

export default async function RezervacijaPage({
  searchParams,
}: {
  searchParams: Promise<{ paket?: string; djeca?: string }>;
}) {
  const { paket, djeca } = await searchParams;

  // Ako je roditelj prijavljen, unaprijed popuni kontakt podatke (brzo ponavljanje).
  const portal = await getSessionFamily();
  const pocetniKontakt: PocetniKontakt | undefined = portal
    ? {
        parentName: portal.family.parentName,
        email: portal.family.email,
        phone: portal.family.phone ?? "",
        childName: portal.family.children[0]?.firstName ?? "",
        childBirthDate: portal.family.children[0] ? portal.family.children[0].birthDate.toISOString().slice(0, 10) : "",
        marketingConsent: portal.family.marketingConsent,
      }
    : undefined;
  const pocetniBrojDjece = djeca && /^\d+$/.test(djeca) ? Number(djeca) : undefined;
  const [rooms, packages, addons, themes, zatvaranja] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.closedPeriod.findMany({ where: { endDate: { gte: lokalniISO(new Date()) } }, orderBy: { startDate: "asc" } }),
  ]);

  const katalog: Katalog = {
    rooms: rooms.map((r) => ({
      id: r.id,
      name: r.name,
      description: r.description ?? "",
      minChildren: r.minChildren,
      maxChildren: r.maxChildren,
      color: r.color,
      mergeableWith: (r.mergeableWith as string[] | null) ?? [],
    })),
    packages: packages.map((p) => ({
      id: p.id,
      name: p.name,
      slug: p.slug,
      roomId: p.roomId,
      basePriceCents: p.basePriceCents,
      perChildCents: p.perChildCents,
      includedItems: (p.includedItems as string[]) ?? [],
      minChildren: p.minChildren,
      maxChildren: p.maxChildren,
      durationMin: p.durationMin,
      popular: p.popular,
      cijenaPoDogovoru: p.cijenaPoDogovoru,
      description: p.description ?? "",
      sidrenaCijenaCents: p.sidrenaCijenaCents,
      sidrenaPerChildCents: p.sidrenaPerChildCents,
      sidrenaDatum: p.sidrenaDatum,
    })),
    addons: addons.map((a) => ({
      id: a.id,
      name: a.name,
      priceCents: a.priceCents,
      unit: a.unit as "per_child" | "flat",
      category: a.category ?? "",
      description: a.description ?? "",
      sidrenaCijenaCents: a.sidrenaCijenaCents,
      sidrenaDatum: a.sidrenaDatum,
    })),
    themes: themes.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji, gradient: t.gradient })),
    depositPercent: env.depositPercent,
    onlinePayments: env.onlinePayments,
    zatvaranja: zatvaranja.map((z) => ({ od: z.startDate, do: z.endDate, razlog: z.reason })),
  };

  return (
    <div className="min-h-screen bg-paper">
      <ObavijestZatvaranja />
      <header className="border-b border-black/5 bg-white">
        <div className="section flex h-16 items-center justify-between">
          <Link href="/" className="flex items-center gap-2 font-display text-lg font-extrabold text-brand-600">
            <Logo size="sm" />
          </Link>
          <Link href="/" className="text-sm text-ink-500 hover:text-ink-800">
            ← Natrag na početnu
          </Link>
        </div>
      </header>
      <main className="section py-8">
        <BookingWizard
          katalog={katalog}
          pocetniPaketSlug={paket}
          pocetniKontakt={pocetniKontakt}
          pocetniBrojDjece={pocetniBrojDjece}
        />
      </main>
    </div>
  );
}
