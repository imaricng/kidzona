/**
 * Pozivnice za proslavu.
 *
 * Administrator za svaku temu postavi dva predloška (sliku): jedan za Kids Play,
 * jedan za Kids Challenge. Tekst se ne crta u sliku — ispisuje se preko nje na
 * stranici pozivnice, pa isti predložak vrijedi za sve proslave te teme.
 *
 * Digitalna pozivnica šalje se roditelju samo kad administrator potvrdi
 * rezervaciju (prije potvrde termin još nije siguran).
 */
import { dobGodine, formatDatum } from "@/lib/format";

export interface PodaciPozivnice {
  childName: string | null;
  childLastName?: string | null;
  /** Koju godinu slavljenik puni; prazno = računa se iz datuma rođenja. */
  childTurning?: number | null;
  childBirthDate?: Date | string | null;
  date: Date | string;
  slotStart: string;
  slotEnd: string;
  phone: string | null;
}

const AKUZATIV: Record<string, string> = {
  ponedjeljak: "u ponedjeljak",
  utorak: "u utorak",
  srijeda: "u srijedu",
  četvrtak: "u četvrtak",
  petak: "u petak",
  subota: "u subotu",
  nedjelja: "u nedjelju",
};

/**
 * Dan u tjednu u akuzativu („u subotu”) — pozivnica se obraća gostu.
 *
 * Dan se mora čitati po zagrebačkoj zoni: datum proslave zapisan je kao ponoć
 * po lokalnom vremenu, pa bi ga poslužitelj u UTC-u inače svrstao u prethodni
 * dan.
 */
export function danUAkuzativu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  const naziv = new Intl.DateTimeFormat("hr-HR", { weekday: "long", timeZone: "Europe/Zagreb" }).format(d);
  return AKUZATIV[naziv.toLowerCase()] ?? `u ${naziv.toLowerCase()}`;
}

/** Ime slavljenika na pozivnici: puno (s prezimenom) i samo ime. */
export function imeNaPozivnici(p: PodaciPozivnice): { puno: string; kratko: string } {
  const kratko = p.childName?.trim() || "Slavljenik";
  const prezime = p.childLastName?.trim();
  return { kratko, puno: prezime ? `${kratko} ${prezime}` : kratko };
}

/**
 * Koju godinu slavljenik puni na dan proslave: upisana vrijednost ima prednost,
 * inače se računa iz datuma rođenja. `null` kad se ne zna.
 */
export function godineNaProslavi(p: PodaciPozivnice): number | null {
  if (p.childTurning && p.childTurning > 0) return p.childTurning;
  if (!p.childBirthDate) return null;
  const datum = typeof p.date === "string" ? new Date(p.date) : p.date;
  const godine = dobGodine(p.childBirthDate, datum);
  return godine > 0 && godine < 30 ? godine : null;
}

/** Javna adresa pozivnice (token iz rezervacije — nije pogodiv). */
export function pozivnicaUrl(appUrl: string, qrToken: string): string {
  return `${appUrl.replace(/\/$/, "")}/pozivnica/${qrToken}`;
}

/** Molba za potvrdu dolaska; `null` kad broj telefona nije upisan. */
export function potvrdaDolaska(phone: string | null | undefined): string | null {
  const telefon = phone?.trim();
  return telefon ? `Dolazak potvrdi na broj ${telefon}.` : null;
}

/** Oznaka generičkog predloška (bez teme) u adresi slike. */
export const BEZ_TEME = "bez-teme";

/** Adresa slike predloška; `null` tema znači generički predložak igraonice. */
export function predlozakUrl(themeId: string | null, roomId: string): string {
  return `/api/pozivnice/predlozak/${themeId ?? BEZ_TEME}/${roomId}`;
}

/** Tema iz adrese slike (`bez-teme` → generički predložak). */
export function temaIzAdrese(segment: string): string | null {
  return segment === BEZ_TEME ? null : segment;
}

/** Dopuštene vrste slika za predložak. */
export const VRSTE_PREDLOSKA = ["image/png", "image/jpeg", "image/webp"] as const;

/** Najveća veličina predloška (4 MB — slika se čuva u bazi). */
export const NAJVECI_PREDLOZAK = 4 * 1024 * 1024;

/** Provjera učitane datoteke; vraća poruku o grešci ili `null`. */
export function provjeriPredlozak(mime: string, velicina: number): string | null {
  if (!(VRSTE_PREDLOSKA as readonly string[]).includes(mime)) {
    return "Predložak mora biti slika (PNG, JPG ili WebP).";
  }
  if (velicina > NAJVECI_PREDLOZAK) return "Predložak može biti najviše 4 MB.";
  if (velicina === 0) return "Datoteka je prazna.";
  return null;
}
