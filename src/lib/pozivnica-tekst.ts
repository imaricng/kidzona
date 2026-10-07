/**
 * Tekst pozivnice kao predložak s varijablama.
 *
 * Administrator piše tekst po svom ukusu (i s emotikonima), a varijable u
 * vitičastim zagradama popunjavaju se podacima proslave. Svaki redak teksta je
 * jedan redak na pozivnici; prvi je naslovni (veći i podebljan).
 */
import { formatDatum } from "@/lib/format";
import { danUAkuzativu, godineNaProslavi, imeNaPozivnici, type PodaciPozivnice } from "@/lib/pozivnica";

/** Zadani tekst — koristi se dok administrator ne upiše svoj. */
export const ZADANI_TEKST = [
  "{ime}",
  "slavi {godine}. rođendan i zove te da se pridružiš.",
  "Dođi {dan}, {datum} od {od} do {do} sati.",
].join("\n");

export interface Varijabla {
  kljuc: string;
  opis: string;
  primjer: string;
}

/** Popis varijabli za pomoć u administraciji. */
export const VARIJABLE: Varijabla[] = [
  { kljuc: "ime", opis: "ime i prezime slavljenika", primjer: "Mia Horvat" },
  { kljuc: "imeKratko", opis: "samo ime slavljenika", primjer: "Mia" },
  { kljuc: "godine", opis: "koju godinu puni", primjer: "5" },
  { kljuc: "dan", opis: "dan u tjednu", primjer: "u subotu" },
  { kljuc: "datum", opis: "datum proslave", primjer: "01. 06. 2030." },
  { kljuc: "od", opis: "početak", primjer: "17:00" },
  { kljuc: "do", opis: "kraj", primjer: "19:00" },
  { kljuc: "igraonica", opis: "naziv igraonice", primjer: "Kids Play" },
  { kljuc: "telefon", opis: "broj za potvrdu dolaska", primjer: "095 537 8559" },
];

export interface VrijednostiPozivnice {
  ime: string;
  imeKratko: string;
  godine: string;
  dan: string;
  datum: string;
  od: string;
  do: string;
  igraonica: string;
  telefon: string;
}

/** Vrijednosti varijabli za jednu proslavu. */
export function vrijednostiPozivnice(p: PodaciPozivnice & { igraonica?: string | null }): VrijednostiPozivnice {
  const godine = godineNaProslavi(p);
  const ime = imeNaPozivnici(p);
  return {
    ime: ime.puno,
    imeKratko: ime.kratko,
    godine: godine ? String(godine) : "",
    dan: danUAkuzativu(p.date),
    datum: formatDatum(p.date),
    od: p.slotStart,
    do: p.slotEnd,
    igraonica: p.igraonica ?? "",
    telefon: p.phone?.trim() ?? "",
  };
}

/** Primjer vrijednosti za pregled u administraciji. */
export const PRIMJER_VRIJEDNOSTI: VrijednostiPozivnice = {
  ime: "Mia Horvat",
  imeKratko: "Mia",
  godine: "5",
  dan: "u subotu",
  datum: "01. 06. 2030.",
  od: "17:00",
  do: "19:00",
  igraonica: "Kids Play",
  telefon: "095 537 8559",
};

/**
 * Popunjava predložak i vraća retke pozivnice.
 *
 * Nepoznata varijabla ostaje kakva jest (da se vidi tipfeler). Redak čija je
 * varijabla prazna izostavlja se cijeli — tako rečenica „slavi 5. rođendan”
 * sama nestane kad se ne zna koju godinu dijete puni, umjesto da ostane
 * nakaradna rečenica s rupom.
 */
export function popuniTekst(predlozak: string | null | undefined, v: VrijednostiPozivnice): string[] {
  const tekst = (predlozak ?? "").trim() ? (predlozak as string) : ZADANI_TEKST;
  const retci: string[] = [];
  for (const redak of tekst.split("\n")) {
    let prazna = false;
    const popunjen = redak.replace(/\{(\w+)\}/g, (cijeli, kljuc: string) => {
      if (!(kljuc in v)) return cijeli;
      const vrijednost = v[kljuc as keyof VrijednostiPozivnice];
      if (!vrijednost) prazna = true;
      return vrijednost;
    });
    const cist = popunjen.replace(/\s{2,}/g, " ").trim();
    if (!prazna && cist.length > 0) retci.push(cist);
  }
  return retci;
}

/** Retci pozivnice za proslavu, uz predložak teksta (prazno = zadani tekst). */
export function retciPozivnice(
  p: PodaciPozivnice & { igraonica?: string | null },
  predlozak: string | null | undefined,
): string[] {
  return popuniTekst(predlozak, vrijednostiPozivnice(p));
}
