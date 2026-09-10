/**
 * Termini i dostupnost. Raspored proslava ovisi o danu u tjednu (fiksni početci),
 * a kraj termina o trajanju paketa. Uključuje "traffic-light" indikatore i
 * provjeru preklapanja (sprječavanje dvostrukih rezervacija).
 *
 * Tekstualni prikaz rasporeda za posjetitelje je u rječniku (`termini`) —
 * uskladiti ga pri svakoj izmjeni rasporeda ovdje.
 */

export interface Termin {
  start: string; // "HH:mm"
  end: string;
}

/**
 * Početci proslava po danu u tjednu (0 = nedjelja … 6 = subota).
 * Vikend (pet–ned): 14:00 i 17:00; ponedjeljak i srijeda: 17:00.
 * Standard traje 2 h, Premium 3 h. Kad je u 14:00 Standard (14–16), ostaje sat
 * vremena za čišćenje i provjetravanje prije termina u 17:00.
 */
export const POCETCI_PO_DANU: Record<number, string[]> = {
  0: ["14:00", "17:00"],
  1: ["17:00"],
  3: ["17:00"],
  5: ["14:00", "17:00"],
  6: ["14:00", "17:00"],
};

/** Svi mogući početci proslava (npr. za ručnu izmjenu termina u administraciji). */
export const SVI_POCETCI = ["14:00", "17:00"];

/** Slobodna igraonica / Družionica — tada nema proslava. */
export const DRUZIONICA: { dan: number; od: string; do: string }[] = [
  { dan: 2, od: "16:00", do: "19:00" },
  { dan: 4, od: "16:00", do: "19:00" },
  { dan: 6, od: "10:00", do: "12:00" },
];

// Razmak za čišćenje je već ugrađen u fiksne početke, pa se dodatni buffer ne
// traži: Premium 14–17 i proslava u 17:00 mogu slijediti jedna drugu.
export const BUFFER_MIN = 0;

export type Semafor = "slobodno" | "malo" | "popunjeno";

/** Pretvara "HH:mm" u minute od ponoći. */
export function uMinute(hhmm: string): number {
  const [h, m] = hhmm.split(":").map(Number);
  return h * 60 + m;
}

/** Pretvara minute od ponoći u "HH:mm". */
export function izMinuta(minute: number): string {
  const h = Math.floor(minute / 60);
  const m = minute % 60;
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}`;
}

/** Kraj termina za zadani početak i trajanje paketa. */
export function krajTermina(start: string, trajanjeMin: number): string {
  return izMinuta(uMinute(start) + trajanjeMin);
}

/** Trajanje u satima za prikaz, npr. 120 → "2 h", 150 → "2,5 h". */
export function trajanjeSati(trajanjeMin: number): string {
  const sati = trajanjeMin / 60;
  return `${Number.isInteger(sati) ? sati : sati.toFixed(1).replace(".", ",")} h`;
}

/** Lokalni datum kao "YYYY-MM-DD" (bez pomaka u UTC kao kod toISOString). */
export function lokalniISO(d: Date): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(d.getDate()).padStart(2, "0")}`;
}

export function pocetciZaDan(danUTjednu: number): string[] {
  return POCETCI_PO_DANU[danUTjednu] ?? [];
}

export function druzionicaZaDan(danUTjednu: number): { od: string; do: string }[] {
  return DRUZIONICA.filter((d) => d.dan === danUTjednu);
}

function danUTjednu(dateISO: string): number {
  return new Date(`${dateISO}T00:00:00`).getDay();
}

export function pocetciZaDatum(dateISO: string): string[] {
  return pocetciZaDan(danUTjednu(dateISO));
}

export function druzionicaZaDatum(dateISO: string): { od: string; do: string }[] {
  return druzionicaZaDan(danUTjednu(dateISO));
}

export function jeDozvoljenPocetak(dateISO: string, start: string): boolean {
  return pocetciZaDatum(dateISO).includes(start);
}

/** Prvi datum (od zadanog, uključivo) na koji postoje termini proslava. */
export function sljedeciDatumSTerminima(odISO: string): string {
  const d = new Date(`${odISO}T00:00:00`);
  for (let i = 0; i < 7; i++) {
    const iso = lokalniISO(d);
    if (pocetciZaDatum(iso).length > 0) return iso;
    d.setDate(d.getDate() + 1);
  }
  return odISO;
}

/**
 * Provjera preklapanja dvaju termina uz buffer. Vraća true ako se preklapaju
 * (tj. ne mogu oba postojati u istoj sobi).
 */
export function preklapaSe(a: Termin, b: Termin, bufferMin = BUFFER_MIN): boolean {
  const aStart = uMinute(a.start) - bufferMin;
  const aEnd = uMinute(a.end) + bufferMin;
  const bStart = uMinute(b.start);
  const bEnd = uMinute(b.end);
  return aStart < bEnd && bStart < aEnd;
}

/**
 * Semafor dostupnosti za cijeli dan na razini cijelog objekta:
 * koliko je od ukupnog broja (sobe × termini) zauzeto.
 */
export function semaforDana(zauzeto: number, ukupno: number): Semafor {
  if (ukupno <= 0) return "popunjeno";
  const udio = zauzeto / ukupno;
  if (udio >= 1) return "popunjeno";
  if (udio >= 0.6) return "malo";
  return "slobodno";
}

/** Semafor za jedan termin: koliko je soba slobodno u tom terminu. */
export function semaforTermina(slobodnoSoba: number, ukupnoSoba: number): Semafor {
  if (slobodnoSoba <= 0) return "popunjeno";
  if (slobodnoSoba <= Math.max(1, Math.floor(ukupnoSoba * 0.34))) return "malo";
  return "slobodno";
}
