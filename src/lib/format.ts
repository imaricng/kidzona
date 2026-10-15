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

/** Kalendarski datum (YYYY-MM-DD) kakav je u Hrvatskoj, neovisno o zoni poslužitelja. */
export function datumUZoni(date: Date | string): string {
  const d = typeof date === "string" ? new Date(date) : date;
  return new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", day: "2-digit", timeZone: TZ }).format(d);
}

/** Koliko je kalendarskih dana do datuma: 0 = danas, 1 = sutra, negativno = prošlo. */
export function danaDo(date: Date | string, sada: Date = new Date()): number {
  const [cilj, danas] = [datumUZoni(date), datumUZoni(sada)].map((iso) => Date.parse(`${iso}T00:00:00Z`));
  return Math.round((cilj - danas) / 86_400_000);
}

/** Kad je nešto, riječima: "danas", "sutra", "prekosutra", "za 7 dana", "za 21 dan". */
export function kadaJe(dana: number): string {
  if (dana === 0) return "danas";
  if (dana === 1) return "sutra";
  if (dana === 2) return "prekosutra";
  return `za ${dana} ${dana % 10 === 1 && dana % 100 !== 11 ? "dan" : "dana"}`;
}

/**
 * Ime za ispis s velikim početnim slovom svake riječi: "ivan marić" → "Ivan Marić",
 * "ana-marija" → "Ana-Marija". Ostala slova ostaju kako su upisana ("McDonald").
 */
export function imeVelikimSlovom(ime: string): string {
  return ime.trim().replace(/(^|[\s-])(\p{Ll})/gu, (_, prije: string, slovo: string) => prije + slovo.toLocaleUpperCase("hr"));
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
