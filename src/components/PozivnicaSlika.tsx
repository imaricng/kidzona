import { omjerOkvira, rasporedTeksta } from "@/lib/pozivnica-raspored";
import type { Podloga } from "@/lib/okvir-detekcija";

/**
 * Pozivnica: slika predloška s tekstom ispisanim u okviru na njoj.
 *
 * Okvir nije na istom mjestu ni iste veličine na svakom predlošku, a nije ni
 * uvijek bijel — zato se uz predložak čuva njegov položaj i izgled (boja
 * teksta, podloga ispod teksta, veličina, font, poravnanje). Tekst se
 * postavlja apsolutno preko slike, a veličina slova računa se iz duljine
 * teksta i oblika okvira (`pozivnica-raspored.ts`) u `cqw` jedinicama, pa
 * izgleda isto na svakom ekranu.
 *
 * Komponenta nema stanja, pa je koriste javna pozivnica, pregled u
 * administraciji i crtanje PNG pozivnice.
 */

export interface OkvirPozivnice {
  top: number;
  lijevo: number;
  sirina: number;
  visina: number;
}

export interface StilPozivnice {
  svijetliTekst: boolean;
  podloga: Podloga;
  podlogaProzirnost: number; // 0–100
  velicinaSkala: number;
  font: string; // "display" | "sans"
  poravnanje: string; // "gore" | "sredina" | "dolje"
}

export interface TekstNaPozivnici {
  ime: string;
  slavi: string;
  dodji: string;
}

export const ZADANI_STIL_POZIVNICE: StilPozivnice = {
  svijetliTekst: false,
  podloga: "nema",
  podlogaProzirnost: 85,
  velicinaSkala: 1,
  font: "display",
  poravnanje: "sredina",
};

/** Boja podloge ispod teksta (prozirnost dolazi iz postavke predloška). */
function bojaPodloge(stil: StilPozivnice): string | undefined {
  if (stil.podloga === "nema") return undefined;
  const a = Math.max(0, Math.min(100, stil.podlogaProzirnost)) / 100;
  return stil.podloga === "svijetla" ? `rgba(255,255,255,${a})` : `rgba(29,24,64,${a})`;
}

function poravnanjeKlasa(poravnanje: string): string {
  if (poravnanje === "gore") return "justify-start";
  if (poravnanje === "dolje") return "justify-end";
  return "justify-center";
}

export function PozivnicaSlika({
  src,
  alt,
  tekst,
  okvir,
  stil = ZADANI_STIL_POZIVNICE,
  slikaSirina = 1000,
  slikaVisina = 1414,
}: {
  src: string;
  alt: string;
  tekst: TekstNaPozivnici;
  okvir: OkvirPozivnice;
  stil?: StilPozivnice;
  slikaSirina?: number;
  slikaVisina?: number;
}) {
  const raspored = rasporedTeksta(tekst, omjerOkvira(okvir, slikaSirina, slikaVisina), stil.velicinaSkala);
  const podloga = bojaPodloge(stil);
  const fontKlasa = stil.font === "sans" ? "" : "font-display";

  return (
    <div className="relative">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src={src} alt={alt} className="block w-full" />
      <div
        className={`absolute flex flex-col items-center overflow-hidden text-center ${poravnanjeKlasa(stil.poravnanje)} ${
          stil.svijetliTekst ? "text-white" : "text-ink-900"
        }`}
        style={{
          top: `${okvir.top}%`,
          left: `${okvir.lijevo}%`,
          width: `${okvir.sirina}%`,
          height: `${okvir.visina}%`,
          padding: "3%",
          containerType: "inline-size",
          // Zamjenska veličina za preglednike bez `cqw` jedinica.
          fontSize: "clamp(10px, 2.4vw, 20px)",
          overflowWrap: "anywhere",
          textShadow: stil.svijetliTekst && !podloga ? "0 1px 3px rgba(0,0,0,0.55)" : undefined,
          backgroundColor: podloga,
          borderRadius: podloga ? "4cqw" : undefined,
        }}
      >
        <p className={`${fontKlasa} font-extrabold`} style={{ fontSize: `${raspored.ime}cqw`, lineHeight: 1.1 }}>
          {tekst.ime}
        </p>
        <p
          className={fontKlasa}
          style={{ fontSize: `${raspored.slavi}cqw`, lineHeight: 1.3, marginTop: `${raspored.razmak}cqw` }}
        >
          {tekst.slavi}
        </p>
        <p
          className={fontKlasa}
          style={{ fontSize: `${raspored.dodji}cqw`, lineHeight: 1.3, marginTop: `${raspored.razmak * 0.6}cqw` }}
        >
          {tekst.dodji}
        </p>
      </div>
    </div>
  );
}
