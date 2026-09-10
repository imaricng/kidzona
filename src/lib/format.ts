/**
 * Formatiranje za hrvatsko tržište: EUR valuta, datum dd.mm.gggg., 24h sat,
 * vremenska zona Europe/Zagreb. Sav novac u sustavu sprema se kao cijeli broj
 * EUR-centi; ovdje se pretvara u čitljiv oblik.
 */

const TZ = "Europe/Zagreb";

/** Pretvara EUR-cente u čitljiv iznos, npr. 4500 -> "45,00 €". */
export function formatEur(cents: number): string {
  return new Intl.NumberFormat("hr-HR", {
    style: "currency",
    currency: "EUR",
  }).format(cents / 100);
}

/** Iznos bez simbola valute, npr. 4500 -> "45,00". */
export function formatEurBroj(cents: number): string {
  return new Intl.NumberFormat("hr-HR", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  }).format(cents / 100);
}

/** Datum u obliku dd.mm.gggg. (hrvatski standard). */
export function formatDatum(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

/** Dan u tjednu + datum, npr. "subota, 26.06.2026.". */
export function formatDatumDugi(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("hr-HR", {
    weekday: "long",
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    timeZone: TZ,
  }).format(d);
}

/** Datum + vrijeme, 24h. */
export function formatDatumVrijeme(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("hr-HR", {
    day: "2-digit",
    month: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    hour12: false,
    timeZone: TZ,
  }).format(d);
}

/** ISO datum (YYYY-MM-DD) bez vremenske komponente — za input[type=date] i ključeve. */
export function isoDatum(date: Date): string {
  return date.toISOString().slice(0, 10);
}

/** Dob u godinama iz datuma rođenja (na zadani referentni datum). */
export function dobGodine(birthDate: Date | string, ref: Date = new Date()): number {
  const b = typeof birthDate === "string" ? new Date(birthDate) : birthDate;
  let dob = ref.getFullYear() - b.getFullYear();
  const m = ref.getMonth() - b.getMonth();
  if (m < 0 || (m === 0 && ref.getDate() < b.getDate())) dob--;
  return dob;
}
