/**
 * Odabir predloška pozivnice (pristup bazi — odvojeno od čistih pomoćnika u
 * `pozivnica.ts` radi testova).
 *
 * Pravilo: prvo predložak odabrane teme za tu igraonicu, a ako ga nema (ili
 * proslava nema temu) uzima se generički predložak igraonice.
 */
import { prisma } from "@/lib/prisma";

export interface OdabraniPredlozak {
  /** Tema predloška; `null` = generički predložak igraonice. */
  themeId: string | null;
  roomId: string;
}

/** Predložak koji vrijedi za proslavu, ili `null` ako nijedan nije postavljen. */
export async function predlozakZaProslavu(themeId: string | null, roomId: string): Promise<OdabraniPredlozak | null> {
  if (themeId) {
    const tematski = await prisma.pozivnicaPredlozak.findFirst({
      where: { themeId, roomId },
      select: { themeId: true, roomId: true },
    });
    if (tematski) return { themeId: tematski.themeId, roomId: tematski.roomId };
  }
  const genericki = await prisma.pozivnicaPredlozak.findFirst({
    where: { themeId: null, roomId },
    select: { roomId: true },
  });
  return genericki ? { themeId: null, roomId: genericki.roomId } : null;
}
