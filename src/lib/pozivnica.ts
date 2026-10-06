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

export interface TekstPozivnice {
  /** 1. redak — ime i prezime slavljenika (istaknuto). */
  ime: string;
  /** 2. redak — koji rođendan slavi. */
  slavi: string;
  /** 3. redak — kad se proslava održava. */
  dodji: string;
  /** Molba za potvrdu dolaska; `null` kad broj telefona nije upisan. */
  potvrda: string | null;
  /** Sva tri retka u jednom nizu (e-pošta, sažeci). */
  poziv: string;
}

const DANI_AKUZATIV = [
  "u nedjelju",
  "u ponedjeljak",
  "u utorak",
  "u srijedu",
  "u četvrtak",
  "u petak",
  "u subotu",
] as const;

/** Dan u tjednu u akuzativu („u subotu”) — pozivnica se obraća gostu. */
export function danUAkuzativu(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  // Datum proslave je zapisan kao ponoć po lokalnom vremenu, pa je dan iz
  // lokalnih metoda ispravan.
  return DANI_AKUZATIV[d.getDay()];
}

/** Ime slavljenika za pozivnicu (bez imena: neutralan oblik). */
function imeSlavljenika(childName: string | null): string {
  return childName?.trim() || "Slavljenik";
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

/**
 * Tekst pozivnice u tri retka:
 *   Mia Horvat
 *   slavi 5. rođendan i zove te da se pridružiš.
 *   Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.
 */
export function tekstPozivnice(p: PodaciPozivnice): TekstPozivnice {
  const prezime = p.childLastName?.trim();
  const ime = [imeSlavljenika(p.childName), prezime].filter(Boolean).join(" ");
  const godine = godineNaProslavi(p);
  const slavi = godine
    ? `slavi ${godine}. rođendan i zove te da se pridružiš.`
    : `slavi rođendan i zove te da se pridružiš.`;
  const dodji = `Dođi ${danUAkuzativu(p.date)}, ${formatDatum(p.date)} od ${p.slotStart} do ${p.slotEnd} sati.`;
  const telefon = p.phone?.trim();
  return {
    ime,
    slavi,
    dodji,
    potvrda: telefon ? `Dolazak potvrdi na broj ${telefon}.` : null,
    poziv: `${ime} ${slavi} ${dodji}`,
  };
}

/** Javna adresa pozivnice (token iz rezervacije — nije pogodiv). */
export function pozivnicaUrl(appUrl: string, qrToken: string): string {
  return `${appUrl.replace(/\/$/, "")}/pozivnica/${qrToken}`;
}

/**
 * Broj telefona u obliku koji traži `wa.me` (samo cifre, s pozivnim brojem).
 * Domaći broj bez pozivnog dobiva hrvatski (385). Vraća `null` kad broj nema
 * dovoljno cifara da bi bio upotrebljiv.
 */
export function whatsappBroj(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `385${d.slice(1)}`;
  return d.length >= 11 ? d : null;
}

/** Poruka koju administrator šalje roditelju WhatsAppom (poveznica na pozivnicu). */
export function whatsappPoruka(poveznica: string, childName: string | null): string {
  const ime = childName?.trim();
  return (
    `Pozdrav! Pozivnica za rođendan${ime ? ` (${ime})` : ""} je gotova 🎉 ` +
    `Otvorite je i proslijedite gostima: ${poveznica}`
  );
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
