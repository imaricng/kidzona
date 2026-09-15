import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { lokalniISO, sljedeciDatumSTerminima } from "@/lib/slots";
import { RezervacijaForma } from "@/components/admin/RezervacijaForma";
import { spremiRucniUnos } from "../akcije";

export const dynamic = "force-dynamic";
export const metadata = { title: "Ručni unos proslave" };

export default async function RucniUnosPage() {
  const [sobe, paketi, teme] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  const pocetno: Record<string, string> = {
    dateISO: sljedeciDatumSTerminima(lokalniISO(new Date())),
    slotStart: "17:00",
    roomId: sobe[0]?.id ?? "",
    packageId: "",
    themeId: "",
    numChildren: "10",
    numAdults: "2",
    parentName: "",
    email: "",
    phone: "",
    childName: "",
    childBirthDate: "",
    napomene: "",
    dogovorenaCijena: "",
    status: "potvrdjeno",
    posaljiPotvrdu: "on",
  };

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rezervacije" className="text-sm text-ink-500 hover:text-ink-800">← {hr.admin.rezervacije}</Link>
      <h1 className="mt-2 font-display text-2xl font-extrabold text-ink-900">✍️ Ručni unos proslave</h1>
      <p className="mt-1 text-sm text-ink-500">
        Za proslave dogovorene telefonom, WhatsAppom ili uživo. Početak nije vezan uz raspored, ali potvrđena
        rezervacija ne može se preklapati s drugom potvrđenom u istoj igraonici.
      </p>
      <div className="card mt-6">
        <RezervacijaForma
          akcija={spremiRucniUnos}
          sobe={sobe.map((s) => ({ id: s.id, name: s.name, maxChildren: s.maxChildren }))}
          paketi={paketi.map((p) => ({
            id: p.id,
            name: p.name,
            roomId: p.roomId,
            durationMin: p.durationMin,
            basePriceCents: p.basePriceCents,
            perChildCents: p.perChildCents,
            cijenaPoDogovoru: p.cijenaPoDogovoru,
            minChildren: p.minChildren,
            maxChildren: p.maxChildren,
          }))}
          teme={teme.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji }))}
          pocetno={pocetno}
          rucniUnos
        />
      </div>
    </div>
  );
}
