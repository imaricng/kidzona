/**
 * Pozivnica: slika predloška s tekstom ispisanim u bijelom okviru na njoj.
 *
 * Okvir nije na istom mjestu na svakom predlošku, pa se njegov položaj čuva uz
 * predložak u postocima slike. Tekst se postavlja apsolutno preko slike, a
 * veličina slova mjeri se u `cqw` (postotak širine okvira) — tako izgleda isto
 * na mobitelu i na velikom ekranu.
 *
 * Komponenta nema stanja, pa je koriste i javna pozivnica i pregled u
 * administraciji.
 */

export interface OkvirPozivnice {
  top: number;
  lijevo: number;
  sirina: number;
  visina: number;
}

export interface TekstNaPozivnici {
  ime: string;
  slavi: string;
  dodji: string;
}

/** Duža imena dobivaju manja slova da ostanu unutar okvira. */
function velicinaImena(ime: string): number {
  if (ime.length > 26) return 7;
  if (ime.length > 18) return 8.5;
  return 10.5;
}

export function PozivnicaSlika({
  src,
  alt,
  tekst,
  okvir,
}: {
  src: string;
  alt: string;
  tekst: TekstNaPozivnici;
  okvir: OkvirPozivnice;
}) {
  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
      <div
        className="absolute flex flex-col items-center justify-center overflow-hidden text-center text-ink-900"
        style={{
          top: `${okvir.top}%`,
          left: `${okvir.lijevo}%`,
          width: `${okvir.sirina}%`,
          height: `${okvir.visina}%`,
          padding: "4%",
          containerType: "inline-size",
          // Zamjenska veličina za preglednike bez `cqw` jedinica.
          fontSize: "clamp(10px, 2.4vw, 20px)",
          overflowWrap: "anywhere",
        }}
      >
        <p
          className="font-display font-extrabold"
          style={{ fontSize: `${velicinaImena(tekst.ime)}cqw`, lineHeight: 1.1 }}
        >
          {tekst.ime}
        </p>
        <p className="mt-[3%] font-medium" style={{ fontSize: "5cqw", lineHeight: 1.25 }}>
          {tekst.slavi}
        </p>
        <p className="mt-[2%]" style={{ fontSize: "5cqw", lineHeight: 1.25 }}>
          {tekst.dodji}
        </p>
      </div>
    </div>
  );
}
