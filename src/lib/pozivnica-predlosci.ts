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
  /** Bijeli okvir za tekst na slici, u postocima. */
  okvir: { top: number; lijevo: number; sirina: number; visina: number };
}

const POLJA = {
  themeId: true,
  roomId: true,
  okvirTop: true,
  okvirLijevo: true,
  okvirSirina: true,
  okvirVisina: true,
} as const;

type Zapis = { themeId: string | null; roomId: string; okvirTop: number; okvirLijevo: number; okvirSirina: number; okvirVisina: number };

function uPredlozak(z: Zapis): OdabraniPredlozak {
  return {
    themeId: z.themeId,
    roomId: z.roomId,
    okvir: { top: z.okvirTop, lijevo: z.okvirLijevo, sirina: z.okvirSirina, visina: z.okvirVisina },
  };
}

/** Predložak koji vrijedi za proslavu, ili `null` ako nijedan nije postavljen. */
export async function predlozakZaProslavu(themeId: string | null, roomId: string): Promise<OdabraniPredlozak | null> {
  if (themeId) {
    const tematski = await prisma.pozivnicaPredlozak.findFirst({ where: { themeId, roomId }, select: POLJA });
    if (tematski) return uPredlozak(tematski);
  }
  const genericki = await prisma.pozivnicaPredlozak.findFirst({ where: { themeId: null, roomId }, select: POLJA });
  return genericki ? uPredlozak(genericki) : null;
}
