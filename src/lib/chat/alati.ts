/**
 * Alati koje chatbot smije pozvati. Svaki je tanak omotač oko logike koju već
 * koristi obrazac za rezervaciju — cijene, raspored i zauzeća dolaze iz baze i
 * iz `pricing.ts`, nikad iz modela. Jezični model uvjerljivo izmišlja brojke, a
 * kod nas cijena ulazi u obvezu prema kupcu.
 *
 * Nijedan alat ne piše u bazu. Upit šalje kupac klikom u sučelju, kroz isti
 * `/api/booking` kao i obrazac — model ga samo priprema.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { izracunajCijenu } from "@/lib/pricing";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { formatEur } from "@/lib/format";
import {
  krajTermina,
  lokalniISO,
  pocetciZaDatum,
  preklapaSe,
  sljedeciDatumSTerminima,
  trajanjeSati,
} from "@/lib/slots";
import { zatvaranjeZaDatum } from "@/lib/zatvaranja";

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

/** Sve što chatbot smije znati o ponudi — jedan poziv, da ne ispituje bazu u komadima. */
export async function dohvatiPonudu() {
  const [sobe, paketi, dodaci, teme, zatvaranja] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.closedPeriod.findMany({ where: { endDate: { gte: lokalniISO(new Date()) } }, orderBy: { startDate: "asc" } }),
  ]);

  return {
    igraonice: sobe.map((s) => ({
      id: s.id,
      naziv: s.name,
      opis: s.description ?? "",
      najviseDjece: s.maxChildren,
    })),
    paketi: paketi.map((p) => ({
      id: p.id,
      naziv: p.name,
      igraonicaId: p.roomId,
      opis: p.description ?? "",
      cijena: p.cijenaPoDogovoru ? "po dogovoru" : formatEur(p.basePriceCents),
      cijenaPoDogovoru: p.cijenaPoDogovoru,
      trajanje: trajanjeSati(p.durationMin),
      ukljucenoDjece: p.maxChildren,
      najmanjeDjece: p.minChildren,
      nadoplataPoDodatnomDjetetu: p.perChildCents > 0 ? formatEur(p.perChildCents) : null,
      ukljuceno: (p.includedItems as string[]) ?? [],
    })),
    dodaci: dodaci.map((d) => ({
      id: d.id,
      naziv: d.name,
      cijena: formatEur(d.priceCents),
      poDjetetu: d.unit === "per_child",
    })),
    teme: teme.map((t) => ({ id: t.id, naziv: t.name })),
    neradniDani: zatvaranja.map((z) => ({ od: z.startDate, do: z.endDate, razlog: z.reason })),
    napomena: "Slavljenik se ne broji u broj djece — uvijek je gratis.",
  };
}

export interface ProvjeraTermina {
  moguce: boolean;
  razlog?: string;
  slobodniPocetci?: string[];
  prijedlogDatuma?: string;
}

/**
 * Je li na taj datum moguća proslava i u koje vrijeme. Gleda raspored, neradne
 * dane i već potvrđene rezervacije (upiti ne zauzimaju termin).
 */
export async function provjeriTermin(dateISO: string, roomId?: string): Promise<ProvjeraTermina> {
  if (!DATUM.test(dateISO)) return { moguce: false, razlog: "Datum mora biti u obliku GGGG-MM-DD." };
  if (dateISO < lokalniISO(new Date())) return { moguce: false, razlog: "Taj je datum u prošlosti." };

  const zatvaranja = await prisma.closedPeriod.findMany({ where: { endDate: { gte: dateISO } } });
  const zatvoreno = zatvaranjeZaDatum(
    dateISO,
    zatvaranja.map((z) => ({ od: z.startDate, do: z.endDate, razlog: z.reason })),
  );
  if (zatvoreno) {
    return {
      moguce: false,
      razlog: `Na taj datum ne radimo${zatvoreno.razlog ? ` (${zatvoreno.razlog})` : ""}.`,
      prijedlogDatuma: prviSljedeciOtvoreni(dateISO, zatvaranja.map((z) => ({ od: z.startDate, do: z.endDate }))),
    };
  }

  const pocetci = pocetciZaDatum(dateISO);
  if (pocetci.length === 0) {
    return {
      moguce: false,
      razlog: "Tog dana nema termina za proslave.",
      prijedlogDatuma: sljedeciDatumSTerminima(dateISO),
    };
  }

  // Bez odabrane igraonice gledamo sve aktivne — termin je moguć ako je bar jedna slobodna.
  const sobe = roomId
    ? await prisma.room.findMany({ where: { id: roomId, active: true } })
    : await prisma.room.findMany({ where: { active: true } });
  if (sobe.length === 0) return { moguce: false, razlog: "Tražena igraonica nije dostupna." };

  const datum = new Date(`${dateISO}T00:00:00`);
  const sljedeci = new Date(datum.getTime() + 24 * 60 * 60 * 1000);
  const zauzete = await prisma.reservation.findMany({
    where: {
      date: { gte: datum, lt: sljedeci },
      status: { in: STATUSI_ZAUZIMAJU_TERMIN },
      OR: [{ roomId: { in: sobe.map((s) => s.id) } }, { secondRoomId: { in: sobe.map((s) => s.id) } }],
    },
    select: { slotStart: true, slotEnd: true, roomId: true, secondRoomId: true },
  });

  // Proslava traje najmanje dva sata; termin je slobodan ako ijedna igraonica u njemu nema rezervaciju.
  const slobodni = pocetci.filter((start) => {
    const termin = { start, end: krajTermina(start, 120) };
    return sobe.some((s) =>
      zauzete
        .filter((r) => r.roomId === s.id || r.secondRoomId === s.id)
        .every((r) => !preklapaSe({ start: r.slotStart, end: r.slotEnd }, termin)),
    );
  });

  if (slobodni.length === 0) {
    return {
      moguce: false,
      razlog: "Svi termini toga dana su zauzeti.",
      prijedlogDatuma: sljedeciDatumSTerminima(dateISO),
    };
  }
  return { moguce: true, slobodniPocetci: slobodni };
}

/** Prvi datum nakon neradnog razdoblja koji ujedno ima termine. */
function prviSljedeciOtvoreni(odISO: string, zatvaranja: { od: string; do: string }[]): string {
  let kandidat = odISO;
  for (let i = 0; i < 400; i++) {
    const zatvoreno = zatvaranja.find((z) => kandidat >= z.od && kandidat <= z.do);
    if (!zatvoreno) {
      const sTerminima = sljedeciDatumSTerminima(kandidat);
      if (!zatvaranja.some((z) => sTerminima >= z.od && sTerminima <= z.do)) return sTerminima;
      kandidat = sTerminima;
    }
    const sljedeci = new Date(`${kandidat}T00:00:00`);
    sljedeci.setDate(sljedeci.getDate() + 1);
    kandidat = lokalniISO(sljedeci);
  }
  return kandidat;
}

export interface IzracunCijene {
  ok: boolean;
  razlog?: string;
  ukupno?: string;
  akontacija?: string;
  stavke?: string[];
  poDogovoru?: boolean;
}

/** Cijena iz `pricing.ts` — jedini dopušteni izvor iznosa u razgovoru. */
export async function izracunajZaChat(input: {
  packageId: string;
  numChildren: number;
  dodaciIds?: string[];
}): Promise<IzracunCijene> {
  const paket = await prisma.package.findUnique({ where: { id: input.packageId } });
  if (!paket || !paket.active) return { ok: false, razlog: "Taj paket nije dostupan." };
  if (paket.cijenaPoDogovoru) {
    return { ok: true, poDogovoru: true, stavke: [`${paket.name}: cijenu dogovaramo prema željama.`] };
  }

  const odabrani = input.dodaciIds ?? [];
  const dodaci = odabrani.length
    ? await prisma.addOn.findMany({ where: { id: { in: odabrani }, active: true } })
    : [];

  const izracun = izracunajCijenu({
    paket: {
      name: paket.name,
      basePriceCents: paket.basePriceCents,
      ukljucenoDjece: paket.maxChildren,
      nadoplataPoDjetetuCents: paket.perChildCents,
    },
    brojDjece: input.numChildren,
    dodaci: dodaci.map((d) => ({ id: d.id, priceCents: d.priceCents, unit: d.unit as "per_child" | "flat" })),
    odabrani: dodaci.map((d) => ({ id: d.id, quantity: 1 })),
    spojeneSobe: false,
    depositPercent: env.depositPercent,
  });

  return {
    ok: true,
    ukupno: formatEur(izracun.totalCents),
    akontacija: formatEur(izracun.depositCents),
    stavke: izracun.stavke.map((s) => `${s.naziv}: ${formatEur(s.iznosCents)}`),
  };
}
