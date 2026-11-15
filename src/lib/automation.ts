/**
 * Automatizacija vremenski okidanih poruka (srce automatizacije). Funkcija
 * `pokreniPodsjetnike()` namijenjena je jutarnjem cronu (ili ručnom pokretanju
 * iz administracije), a `zakljuciDan()` večernjem u 21 h. Obje su idempotentne —
 * za isti događaj neće poslati duplu poruku (provjerava `NotificationLog`).
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { isoDatum, dobGodine, satUZoni } from "@/lib/format";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { UKLJUCI, podaciZaPoruku } from "@/lib/reservations";
import {
  predlozakPodsjetnika,
  predlozakZahvale,
  predlozakRodjendanGodina,
} from "@/lib/notifications/templates";

const AKTIVNI = ["potvrdjeno", "placeno", "checkin"];

// Automatski podsjetnici roditelju: koliko dana prije proslave i pod kojim tipom se bilježe.
const PODSJETNICI = [
  { dana: 7, tip: "podsjetnik-tjedan" },
  { dana: 3, tip: "podsjetnik" },
] as const;
const TIPOVI_PODSJETNIKA = ["podsjetnik", "podsjetnik-tjedan", "podsjetnik-rucno"];

// Koliko dana prije rođendana šaljemo re-marketing podsjetnik.
const RODJENDAN_DANA_PRIJE = 21;

export interface RezultatPodsjetnika {
  podsjetniciTjedan: number; // 7 dana prije
  podsjetnici: number; // 3 dana prije
  zahvale: number; // za jučerašnje proslave koje večer prije nisu zaključene
  rodjendani: number;
}

function pocetakDana(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/**
 * Je li roditelju danas već poslan neki podsjetnik (automatski ili ručno)?
 * Ponovno pokretanje automatike isti dan ne šalje duplikat, a ručni podsjetnik
 * poslan danima ranije ne blokira automatske. Neuspjelo slanje se ne broji —
 * ponovno pokretanje ga pokuša opet.
 */
async function podsjetnikDanasPoslan(reservationId: string): Promise<boolean> {
  const n = await prisma.notificationLog.count({
    where: { reservationId, type: { in: TIPOVI_PODSJETNIKA }, status: { not: "greska" }, createdAt: { gte: pocetakDana(0) } },
  });
  return n > 0;
}

/** Je li za rezervaciju već poslana poruka danog tipa? */
async function vecPoslano(reservationId: string, type: string): Promise<boolean> {
  const n = await prisma.notificationLog.count({ where: { reservationId, type } });
  return n > 0;
}

/** Bodovi lojalnosti obitelji za završenu proslavu (dodjeljuju se jednom, pri prelasku u „završeno"). */
export async function dodijeliBodoveLojalnosti(familyId: string | null): Promise<void> {
  if (!familyId) return;
  await prisma.loyaltyAccount.upsert({
    where: { familyId },
    update: { points: { increment: env.loyaltyPointsPerParty } },
    create: { familyId, points: env.loyaltyPointsPerParty },
  });
}

/**
 * Zaključuje proslave zadanog dana (0 = danas, -1 = jučer): aktivne prelaze u
 * „završeno" (uz bodove lojalnosti), a roditelju ide zahvala i zamolba za
 * recenziju. Proslava koju je osoblje već ručno označilo završenom dobiva samo
 * zahvalu. Vraća broj poslanih zahvala.
 */
async function zakljuciProslave(offset: number): Promise<number> {
  const proslave = await prisma.reservation.findMany({
    where: { date: { gte: pocetakDana(offset), lt: pocetakDana(offset + 1) }, status: { in: [...AKTIVNI, "zavrseno"] } },
    include: { room: true, package: true },
  });
  let zahvale = 0;
  for (const r of proslave) {
    if (r.status !== "zavrseno") {
      await prisma.reservation.update({ where: { id: r.id }, data: { status: "zavrseno" } });
      await dodijeliBodoveLojalnosti(r.familyId);
    }
    // Bez e-pošte se zahvala preskače, ali proslava se svejedno zaključuje.
    if (!r.email || (await vecPoslano(r.id, "zahvala"))) continue;
    const p = predlozakZahvale(
      { code: r.code, parentName: r.parentName, childName: r.childName, date: r.date, slotStart: r.slotStart, slotEnd: r.slotEnd, roomName: r.room.name, packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents },
      env.reviewUrl,
    );
    await posaljiIZabiljezi({ tip: "zahvala", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
    zahvale++;
  }
  return zahvale;
}

// Od kojeg sata (po hrvatskom vremenu) se smije zaključiti radni dan.
const KRAJ_RADNOG_DANA = 21;

/**
 * Kraj radnog dana: današnje proslave prelaze u „završeno" i roditeljima ide
 * zahvala s molbom za recenziju. Cron se pokreće u dva UTC termina (zimsko i
 * ljetno vrijeme), a raniji poziv prije 21 h po našem vremenu ne radi ništa.
 */
export async function zakljuciDan(sada: Date = new Date()): Promise<{ zakljuceno: boolean; zahvale: number }> {
  if (satUZoni(sada) < KRAJ_RADNOG_DANA) return { zakljuceno: false, zahvale: 0 };
  return { zakljuceno: true, zahvale: await zakljuciProslave(0) };
}

export async function pokreniPodsjetnike(): Promise<RezultatPodsjetnika> {
  const rezultat: RezultatPodsjetnika = { podsjetniciTjedan: 0, podsjetnici: 0, zahvale: 0, rodjendani: 0 };

  // --- 1) Podsjetnici 7 i 3 dana prije proslave ----------------------
  for (const { dana, tip } of PODSJETNICI) {
    const proslave = await prisma.reservation.findMany({
      where: { date: { gte: pocetakDana(dana), lt: pocetakDana(dana + 1) }, status: { in: AKTIVNI } },
      include: UKLJUCI,
    });
    for (const r of proslave) {
      // Ručno unesena rezervacija može još biti bez e-pošte — tad nema kome poslati.
      if (!r.email) continue;
      if (await podsjetnikDanasPoslan(r.id)) continue;
      const p = predlozakPodsjetnika(podaciZaPoruku(r), dana);
      await posaljiIZabiljezi({ tip, kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
      if (dana === 7) rezultat.podsjetniciTjedan++;
      else rezultat.podsjetnici++;
    }
  }

  // --- 2) Zahvale za jučer, ako večernje zaključivanje dana nije prošlo --
  rezultat.zahvale = await zakljuciProslave(-1);

  // --- 3) Podsjetnik za sljedeći rođendan (godinu dana kasnije) -------
  const ciljOd = pocetakDana(RODJENDAN_DANA_PRIJE);
  const ciljDo = pocetakDana(RODJENDAN_DANA_PRIJE + 1);
  const ciljIso = isoDatum(ciljOd);
  // Dohvati djecu čiji je (mjesec, dan) jednak ciljnom danu, uz marketing privolu.
  const djeca = await prisma.child.findMany({
    include: { family: true },
  });
  for (const c of djeca) {
    if (!c.family.marketingConsent) continue;
    const ovogodisnji = new Date(ciljOd.getFullYear(), c.birthDate.getMonth(), c.birthDate.getDate());
    if (isoDatum(ovogodisnji) !== ciljIso) continue;
    // Idempotencija: jedna takva poruka po djetetu godišnje (provjeri zadnjih 60 dana)
    const prije60 = pocetakDana(-60);
    const vec = await prisma.notificationLog.count({
      where: { type: "rodjendan-godina", recipient: c.family.email, createdAt: { gte: prije60 } },
    });
    if (vec > 0) continue;
    // Obitelj koja već ima dogovorenu ili traženu proslavu ne treba poziv da rezervira.
    const dogovoreno = await prisma.reservation.count({
      where: {
        OR: [{ familyId: c.familyId }, { email: c.family.email }],
        status: { in: ["upit", ...AKTIVNI] },
        date: { gte: pocetakDana(0) },
      },
    });
    if (dogovoreno > 0) continue;
    const novaDob = dobGodine(c.birthDate) + 1;
    const p = predlozakRodjendanGodina(c.family.parentName, c.firstName, novaDob);
    await posaljiIZabiljezi({ tip: "rodjendan-godina", kanal: "email", primatelj: c.family.email, naslov: p.naslov, tijelo: p.tijelo, html: p.html });
    rezultat.rodjendani++;
  }

  return rezultat;
}
