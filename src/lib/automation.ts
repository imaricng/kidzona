/**
 * Automatizacija vremenski okidanih poruka (srce automatizacije). Funkcija
 * `pokreniPodsjetnike()` namijenjena je pozivu iz cron jobova (npr. Vercel Cron
 * jednom dnevno) ili ručno iz administracije. Idempotentna je — za isti događaj
 * neće poslati duplu poruku (provjerava `NotificationLog`).
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { isoDatum, dobGodine } from "@/lib/format";
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
  { dana: 1, tip: "podsjetnik" },
] as const;
const TIPOVI_PODSJETNIKA = ["podsjetnik", "podsjetnik-tjedan", "podsjetnik-rucno"];

// Koliko dana prije rođendana šaljemo re-marketing podsjetnik.
const RODJENDAN_DANA_PRIJE = 21;

export interface RezultatPodsjetnika {
  podsjetniciTjedan: number; // 7 dana prije
  podsjetnici: number; // dan prije
  zahvale: number;
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

export async function pokreniPodsjetnike(): Promise<RezultatPodsjetnika> {
  const rezultat: RezultatPodsjetnika = { podsjetniciTjedan: 0, podsjetnici: 0, zahvale: 0, rodjendani: 0 };

  // --- 1) Podsjetnici 7 dana i dan prije proslave ---------------------
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
      if (dana === 1) rezultat.podsjetnici++;
      else rezultat.podsjetniciTjedan++;
    }
  }

  // --- 2) Zahvala + zamolba za recenziju (dan nakon proslave) ---------
  const jučerOd = pocetakDana(-1);
  const jučerDo = pocetakDana(0);
  const jučerašnje = await prisma.reservation.findMany({
    where: { date: { gte: jučerOd, lt: jučerDo }, status: { in: [...AKTIVNI, "zavrseno"] } },
    include: { room: true, package: true },
  });
  for (const r of jučerašnje) {
    if (await vecPoslano(r.id, "zahvala")) continue;
    const p = predlozakZahvale(
      { code: r.code, parentName: r.parentName, childName: r.childName, date: r.date, slotStart: r.slotStart, slotEnd: r.slotEnd, roomName: r.room.name, packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents },
      env.reviewUrl,
    );
    // Bez e-pošte se zahvala preskače, ali proslava se svejedno zaključuje.
    if (r.email) {
      await posaljiIZabiljezi({ tip: "zahvala", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
    }
    // Označi proslavu završenom nakon zahvale
    await prisma.reservation.update({ where: { id: r.id }, data: { status: "zavrseno" } });
    // Dodijeli bodove lojalnosti obitelji (ako postoji)
    if (r.familyId) {
      await prisma.loyaltyAccount.upsert({
        where: { familyId: r.familyId },
        update: { points: { increment: env.loyaltyPointsPerParty } },
        create: { familyId: r.familyId, points: env.loyaltyPointsPerParty },
      });
    }
    rezultat.zahvale++;
  }

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
    const novaDob = dobGodine(c.birthDate) + 1;
    const p = predlozakRodjendanGodina(c.family.parentName, c.firstName, novaDob);
    await posaljiIZabiljezi({ tip: "rodjendan-godina", kanal: "email", primatelj: c.family.email, naslov: p.naslov, tijelo: p.tijelo });
    rezultat.rodjendani++;
  }

  return rezultat;
}
