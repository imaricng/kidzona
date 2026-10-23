/** Trajanje boravka u cijelim minutama (nikad negativno). */
export function minuteBoravka(od: Date, doVremena: Date): number {
  return Math.max(0, Math.floor((doVremena.getTime() - od.getTime()) / 60000));
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
