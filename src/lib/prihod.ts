import { prisma } from "@/lib/prisma";
import { cijenaBoravka, minuteBoravka } from "@/lib/dnevna-igra";

/** Rođendani koji su odrađeni (ili već naplaćeni) — tek tada ulaze u prihod. */
const STATUSI_PRIHODA = ["placeno", "checkin", "zavrseno"];

export interface PrihodMjeseca {
  rodjendaniCents: number;
  dnevnaIgraCents: number;
  ukupnoCents: number;
}

/**
 * Prihod od početka tekućeg mjeseca do kraja danas: rođendani po datumu
 * proslave (dogovorena cijena, ili uplaćeno ako je više) i završeni boravci
 * dnevne igre po datumu odlaska. Blagajna (POS) se zasad ne broji.
 */
export async function prihodMjeseca(sada: Date = new Date()): Promise<PrihodMjeseca> {
  const od = new Date(sada.getFullYear(), sada.getMonth(), 1);
  const doKraja = new Date(sada); doKraja.setHours(23, 59, 59, 999);

  const [proslave, boravci] = await Promise.all([
    prisma.reservation.findMany({
      where: { date: { gte: od, lte: doKraja }, status: { in: STATUSI_PRIHODA } },
      select: { totalCents: true, paidCents: true },
    }),
    prisma.dailyPlay.findMany({
      where: { leftAt: { gte: od, lte: doKraja } },
      select: { arrivedAt: true, leftAt: true },
    }),
  ]);

  const rodjendaniCents = proslave.reduce((s, r) => s + Math.max(r.totalCents, r.paidCents), 0);
  const dnevnaIgraCents = boravci.reduce(
    (s, b) => s + cijenaBoravka(minuteBoravka(b.arrivedAt, b.leftAt!)),
    0,
  );
  return { rodjendaniCents, dnevnaIgraCents, ukupnoCents: rodjendaniCents + dnevnaIgraCents };
}
