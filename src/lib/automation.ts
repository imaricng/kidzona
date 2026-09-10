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
import {
  predlozakPodsjetnika,
  predlozakZahvale,
  predlozakRodjendanGodina,
} from "@/lib/notifications/templates";

const AKTIVNI = ["potvrdjeno", "placeno", "checkin"];

// Koliko dana prije rođendana šaljemo re-marketing podsjetnik.
const RODJENDAN_DANA_PRIJE = 21;

export interface RezultatPodsjetnika {
  podsjetnici: number;
  zahvale: number;
  rodjendani: number;
}

function pocetakDana(offset: number): Date {
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  d.setDate(d.getDate() + offset);
  return d;
}

/** Je li za rezervaciju već poslana poruka danog tipa? */
async function vecPoslano(reservationId: string, type: string): Promise<boolean> {
  const n = await prisma.notificationLog.count({ where: { reservationId, type } });
  return n > 0;
}

export async function pokreniPodsjetnike(): Promise<RezultatPodsjetnika> {
  const rezultat: RezultatPodsjetnika = { podsjetnici: 0, zahvale: 0, rodjendani: 0 };

  // --- 1) Podsjetnik dan prije proslave -------------------------------
  const sutraOd = pocetakDana(1);
  const sutraDo = pocetakDana(2);
  const sutrasnje = await prisma.reservation.findMany({
    where: { date: { gte: sutraOd, lt: sutraDo }, status: { in: AKTIVNI } },
    include: { room: true, secondRoom: true, package: true },
  });
  for (const r of sutrasnje) {
    if (await vecPoslano(r.id, "podsjetnik")) continue;
    const p = predlozakPodsjetnika({
      code: r.code, parentName: r.parentName, childName: r.childName, date: r.date,
      slotStart: r.slotStart, slotEnd: r.slotEnd,
      roomName: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name,
      packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents,
    });
    await posaljiIZabiljezi({ tip: "podsjetnik", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
    rezultat.podsjetnici++;
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
      `${env.appUrl}/recenzija`,
    );
    await posaljiIZabiljezi({ tip: "zahvala", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
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
