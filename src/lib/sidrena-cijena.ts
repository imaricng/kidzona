/**
 * Sidrena (dodatna) cijena — obveza iz Zakona o zaštiti potrošača od 1. 10. 2026.
 *
 * Uz svaku aktualnu cijenu prema krajnjem potrošaču mora stajati i cijena koja
 * je za tu stavku vrijedila na referentni datum. Za usluge je to **10. 9. 2026.**;
 * stavka uvedena poslije nosi cijenu s dana kad je prvi put ponuđena.
 *
 * Propis ne traži riječi „dodatna cijena" — dovoljan je datum uz iznos
 * („10.09.2026. 200,00 €"), ali mora biti jasno, vidljivo i čitljivo istaknuta
 * svugdje gdje se cijena javno ističe. Iznos ne smije biti 0,00 €.
 */
import { formatEur } from "@/lib/format";

/** Referentni datum za usluge (cjenik proslava). */
export const REFERENTNI_DATUM = "2026-09-10";

/** Od kada obveza vrijedi — prije toga nema što prikazivati. */
export const OBVEZA_OD = "2026-10-01";

export interface SidrenaCijena {
  sidrenaCijenaCents: number | null;
  sidrenaDatum: string | null;
}

/** "2026-09-10" → "10.09.2026." */
export function formatDatumTocke(dateISO: string): string {
  const [g, m, d] = dateISO.split("-");
  return `${d}.${m}.${g}.`;
}

/**
 * Tekst za prikaz uz aktualnu cijenu, npr. „10.09.2026. 200,00 €".
 * Vraća `null` kad nema što isticati: iznos nije upisan ili je nula (propis
 * izričito ne dopušta 0,00 €).
 */
export function tekstSidrene(stavka: SidrenaCijena): string | null {
  const { sidrenaCijenaCents: iznos, sidrenaDatum: datum } = stavka;
  if (!iznos || iznos <= 0 || !datum) return null;
  return `${formatDatumTocke(datum)} ${formatEur(iznos)}`;
}
