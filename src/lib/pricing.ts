/**
 * Motor za automatski izračun cijene. Čista funkcija — koristi se i na klijentu
 * (live ažuriranje sažetka) i na serveru (mjerodavni izračun pri rezervaciji).
 * Sav novac je u EUR-centima.
 */
// Relativni import (ne "@/") da modul radi i u testovima i u seed skripti.
import { brojDjece as brojDjeceTekst } from "../i18n/hr";

export interface PaketCijena {
  basePriceCents: number; // fiksna cijena paketa
  ukljucenoDjece?: number; // broj djece uključen u cijenu (slavljenik se ne broji)
  nadoplataPoDjetetuCents?: number; // za svako dijete iznad uključenog broja
}

export interface DodatakCijena {
  id: string;
  priceCents: number;
  unit: "per_child" | "flat";
}

export interface OdabraniDodatak {
  id: string;
  quantity: number;
}

export interface IzracunStavka {
  naziv: string;
  iznosCents: number;
}

export interface RezultatIzracuna {
  paketCents: number;
  nadoplataCents: number;
  dodaciCents: number;
  spajanjeSobeCents: number;
  totalCents: number;
  depositCents: number;
  ostatakCents: number;
  stavke: IzracunStavka[];
}

/** Doplata za spajanje druge igraonice (veće proslave). */
export const SPAJANJE_SOBE_CENTS = 5000; // 50,00 €

export interface IzracunInput {
  paket: PaketCijena & { name: string };
  brojDjece: number;
  dodaci: DodatakCijena[]; // katalog dostupnih dodataka
  odabrani: OdabraniDodatak[];
  spojeneSobe?: boolean;
  depositPercent: number; // npr. 30
}

export function izracunajCijenu(input: IzracunInput): RezultatIzracuna {
  const { paket, brojDjece, dodaci, odabrani, spojeneSobe, depositPercent } = input;
  const stavke: IzracunStavka[] = [];

  // Cijena paketa je fiksna do uključenog broja djece.
  const paketCents = paket.basePriceCents;
  stavke.push({
    naziv: `${paket.name} (${brojDjeceTekst(brojDjece)})`,
    iznosCents: paketCents,
  });

  // Nadoplata za djecu iznad broja uključenog u paket
  const dodatnaDjeca = paket.ukljucenoDjece !== undefined ? Math.max(0, brojDjece - paket.ukljucenoDjece) : 0;
  const nadoplataCents = dodatnaDjeca * (paket.nadoplataPoDjetetuCents ?? 0);
  if (nadoplataCents > 0) {
    stavke.push({ naziv: `Nadoplata: ${brojDjeceTekst(dodatnaDjeca)} iznad paketa`, iznosCents: nadoplataCents });
  }

  // Dodaci
  let dodaciCents = 0;
  const katalog = new Map(dodaci.map((d) => [d.id, d]));
  for (const sel of odabrani) {
    const d = katalog.get(sel.id);
    if (!d || sel.quantity <= 0) continue;
    const mnozitelj = d.unit === "per_child" ? brojDjece : 1;
    const iznos = d.priceCents * mnozitelj * sel.quantity;
    dodaciCents += iznos;
    stavke.push({ naziv: nazivDodatka(d, sel.quantity, brojDjece), iznosCents: iznos });
  }

  // Spajanje soba
  const spajanjeSobeCents = spojeneSobe ? SPAJANJE_SOBE_CENTS : 0;
  if (spajanjeSobeCents > 0) {
    stavke.push({ naziv: "Spajanje druge igraonice", iznosCents: spajanjeSobeCents });
  }

  const totalCents = paketCents + nadoplataCents + dodaciCents + spajanjeSobeCents;
  const depositCents = Math.round((totalCents * depositPercent) / 100);
  const ostatakCents = totalCents - depositCents;

  return { paketCents, nadoplataCents, dodaciCents, spajanjeSobeCents, totalCents, depositCents, ostatakCents, stavke };
}

function nazivDodatka(d: DodatakCijena & { id: string }, qty: number, brojDjece: number): string {
  // naziv se dohvaća izvana u UI-u; ovdje generiramo neutralan zapis za stavku računa
  const opisKol = d.unit === "per_child" ? `×${brojDjeceTekst(brojDjece)}` : qty > 1 ? `×${qty}` : "";
  return `Dodatak ${d.id} ${opisKol}`.trim();
}
