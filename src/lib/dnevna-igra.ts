/** Trajanje boravka u cijelim minutama (nikad negativno). */
export function minuteBoravka(od: Date, doVremena: Date): number {
  return Math.max(0, Math.floor((doVremena.getTime() - od.getTime()) / 60000));
}

/** Prvi sat dnevne igre (ujedno najmanja naplata). */
export const DNEVNA_IGRA_SAT_CENTS = 600;
/** Svakih daljnjih započetih 30 minuta nakon prvog sata. */
export const DNEVNA_IGRA_POLA_SATA_CENTS = 300;
/** Minute koje se ne naplaćuju prije sljedećeg polusata (obuvanje, plaćanje). */
export const DNEVNA_IGRA_TOLERANCIJA_MIN = 10;

/**
 * Cijena boravka: prvi sat se plaća uvijek, a zatim svakih započetih 30 min,
 * uz toleranciju — 1 h 10 min je još 6 €, 1 h 11 min je 9 €, 1 h 41 min 12 €.
 */
export function cijenaBoravka(minute: number): number {
  const visak = minute - 60 - DNEVNA_IGRA_TOLERANCIJA_MIN;
  const polusati = visak > 0 ? Math.ceil(visak / 30) : 0;
  return DNEVNA_IGRA_SAT_CENTS + polusati * DNEVNA_IGRA_POLA_SATA_CENTS;
}

/** Trajanje u obliku „2 h 05 min” (ili samo „45 min” ispod sat vremena). */
export function formatTrajanje(minute: number): string {
  const sati = Math.floor(minute / 60);
  const ostatak = minute % 60;
  if (sati === 0) return `${ostatak} min`;
  return `${sati} h ${String(ostatak).padStart(2, "0")} min`;
}

/** Ime djeteta za CRM i poruke: samo prvo ime („Mia Horvat” → „Mia”). */
export function imeZaCrm(imeIPrezime: string): string {
  return imeIPrezime.trim().split(/\s+/)[0] ?? "";
}
