/**
 * Neradni dani (godišnji odmor, prije otvorenja…): pomoćnice bez pristupa bazi,
 * pa se koriste i u pregledniku (obrazac za rezervaciju) i na poslužitelju.
 */
import { formatDatum } from "./format";
import { lokalniISO, sljedeciDatumSTerminima } from "./slots";

/** Razdoblje zatvaranja; datumi su "YYYY-MM-DD" i uključivi. */
export interface Zatvaranje {
  od: string;
  do: string;
  razlog: string;
}

export function zatvaranjeZaDatum(dateISO: string, zatvaranja: Zatvaranje[]): Zatvaranje | undefined {
  return zatvaranja.find((z) => z.od <= dateISO && dateISO <= z.do);
}

function danNakon(dateISO: string): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + 1);
  return lokalniISO(d);
}

/** Prvi datum od zadanog koji ima termine po rasporedu i nije u razdoblju zatvaranja. */
export function prviOtvoreniDatum(odISO: string, zatvaranja: Zatvaranje[]): string {
  let datum = sljedeciDatumSTerminima(odISO);
  for (let i = 0; i < 100; i++) {
    const z = zatvaranjeZaDatum(datum, zatvaranja);
    if (!z) return datum;
    datum = sljedeciDatumSTerminima(danNakon(z.do));
  }
  return datum;
}

/** Raspon za prikaz, npr. "01. 08. 2026. – 15. 08. 2026." (jedan dan: samo datum). */
export function rasponDatuma(z: Pick<Zatvaranje, "od" | "do">): string {
  const od = formatDatum(new Date(`${z.od}T00:00:00`));
  return z.od === z.do ? od : `${od} – ${formatDatum(new Date(`${z.do}T00:00:00`))}`;
}
