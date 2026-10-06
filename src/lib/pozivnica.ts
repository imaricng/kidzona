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
import { formatDatumDugi } from "@/lib/format";

export interface PodaciPozivnice {
  childName: string | null;
  date: Date | string;
  slotStart: string;
  slotEnd: string;
  phone: string | null;
}

export interface TekstPozivnice {
  /** Glavni poziv ispisan na pozivnici. */
  poziv: string;
  /** Molba za potvrdu dolaska; `null` kad broj telefona nije upisan. */
  potvrda: string | null;
}

/** Ime slavljenika za pozivnicu (bez imena: neutralan oblik). */
function imeSlavljenika(childName: string | null): string {
  return childName?.trim() || "Slavljenik";
}

/**
 * Tekst pozivnice po dogovoru:
 * „Ja „Mia” te pozivam na svoj rođendan koji će se održati dana … od … do … sati.”
 */
export function tekstPozivnice(p: PodaciPozivnice): TekstPozivnice {
  const poziv =
    `Ja „${imeSlavljenika(p.childName)}” te pozivam na svoj rođendan ` +
    `koji će se održati dana ${formatDatumDugi(p.date)} ` +
    `od ${p.slotStart} do ${p.slotEnd} sati.`;
  const telefon = p.phone?.trim();
  return {
    poziv,
    potvrda: telefon ? `Dolazak potvrdi na broj ${telefon}.` : null,
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
