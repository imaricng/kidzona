/**
 * Odabir predloška pozivnice (pristup bazi — odvojeno od čistih pomoćnika u
 * `pozivnica.ts` radi testova).
 *
 * Pravilo: prvo predložak odabrane teme za tu igraonicu, a ako ga nema (ili
 * proslava nema temu) uzima se generički predložak igraonice.
 */
import { prisma } from "@/lib/prisma";
import type { Podloga } from "@/lib/okvir-detekcija";
import type { StilPozivnice } from "@/components/PozivnicaSlika";

export interface OdabraniPredlozak {
  /** Tema predloška; `null` = generički predložak igraonice. */
  themeId: string | null;
  roomId: string;
  /** Bijeli okvir za tekst na slici, u postocima. */
  okvir: { top: number; lijevo: number; sirina: number; visina: number };
  /** Izgled teksta na toj slici. */
  stil: StilPozivnice;
  slikaSirina: number;
  slikaVisina: number;
  /** Tekst pozivnice s varijablama; `null` = zadani tekst. */
  tekstPredlozak: string | null;
}

const POLJA = {
  themeId: true,
  roomId: true,
  okvirTop: true,
  okvirLijevo: true,
  okvirSirina: true,
  okvirVisina: true,
  tekstSvijetli: true,
  podloga: true,
  podlogaProzirnost: true,
  velicinaSkala: true,
  font: true,
  poravnanje: true,
  slikaSirina: true,
  slikaVisina: true,
  tekstPredlozak: true,
} as const;

type Zapis = {
  themeId: string | null;
  roomId: string;
  okvirTop: number;
  okvirLijevo: number;
  okvirSirina: number;
  okvirVisina: number;
  tekstSvijetli: boolean;
  podloga: string;
  podlogaProzirnost: number;
  velicinaSkala: number;
  font: string;
  poravnanje: string;
  slikaSirina: number;
  slikaVisina: number;
  tekstPredlozak: string | null;
};

function uPredlozak(z: Zapis): OdabraniPredlozak {
  return {
    themeId: z.themeId,
    roomId: z.roomId,
    okvir: { top: z.okvirTop, lijevo: z.okvirLijevo, sirina: z.okvirSirina, visina: z.okvirVisina },
    stil: {
      svijetliTekst: z.tekstSvijetli,
      podloga: (z.podloga === "svijetla" || z.podloga === "tamna" ? z.podloga : "nema") as Podloga,
      podlogaProzirnost: z.podlogaProzirnost,
      velicinaSkala: z.velicinaSkala,
      font: z.font,
      poravnanje: z.poravnanje,
    },
    slikaSirina: z.slikaSirina,
    slikaVisina: z.slikaVisina,
    tekstPredlozak: z.tekstPredlozak,
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
