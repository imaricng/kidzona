/**
 * Cjenik usluga i bazne cijene — usklađeno s Pravilnikom o isticanju bazne
 * cijene proizvoda i Pravilnikom o načinu objave cjenika proizvoda (NN 132/2026,
 * oba na snazi od 17.11.2026.).
 *
 *  - Bazna cijena usluge je cijena na dan 10.9.2026., a za uslugu uvedenu
 *    kasnije cijena na dan uvođenja. U bazi je prazna dok se cijena ne
 *    promijeni (tada je jednaka trenutnoj); pri prvoj promjeni cijene zapisuje
 *    se stara cijena (`bazna` u `pricing.ts`, unos u administraciji paketa).
 *  - Cjenik se objavljuje na webu kao CSV (UTF-8, ";"), s nazivom datoteke po
 *    propisu. Svaka promjena je nova verzija s brojem pohrane, a prethodne
 *    ostaju dostupne kao arhiva (propis traži barem 15 dana).
 *  - Paketi s cijenom po dogovoru nisu u cjeniku: cijena se oblikuje za
 *    pojedinog kupca (iznimka iz čl. 4. Pravilnika o isticanju bazne cijene).
 */
import { prisma } from "@/lib/prisma";
import { formatEurBroj } from "@/lib/format";
import { BAZNA_SPAJANJE_SOBE_CENTS, SPAJANJE_SOBE_CENTS, bazna } from "@/lib/pricing";
import { trajanjeSati } from "@/lib/slots";

export { bazna } from "@/lib/pricing";

/** OIB obrta — dio naziva datoteke cjenika. */
export const OIB = "18925449183";

/** Dnevna igra (slobodna igra): cijena po satu, naplata razmjerno vremenu. */
export const DNEVNA_IGRA_SAT_CENTS = 600;

// Bazne cijene usluga koje nisu u bazi (cijene na dan 10.9.2026.).
const BAZNA_DNEVNA_IGRA_SAT_CENTS = 600;

export interface StavkaCjenika {
  grupa: string;
  naziv: string;
  cijenaCents: number;
  baznaCents: number;
  akcija: boolean; // posebni oblik prodaje (akcija, rasprodaja…)
}

export interface PaketZaCjenik {
  name: string;
  basePriceCents: number;
  perChildCents: number;
  baznaCijenaCents: number | null;
  baznaNadoplataCents: number | null;
  maxChildren: number;
  durationMin: number;
  cijenaPoDogovoru: boolean;
  room: { name: string } | null;
}

export interface DodatakZaCjenik {
  name: string;
  priceCents: number;
  baznaCijenaCents: number | null;
  unit: string;
}

const GRUPA_DODACI = "Dodaci uz proslavu";

/** Stavke cjenika iz aktivnih paketa i dodataka (redoslijed kao u ponudi). */
export function stavkeIzKataloga(paketi: PaketZaCjenik[], dodaci: DodatakZaCjenik[]): StavkaCjenika[] {
  const stavke: StavkaCjenika[] = [];
  for (const p of paketi) {
    if (p.cijenaPoDogovoru) continue;
    const soba = p.room?.name ?? "sve igraonice";
    const grupa = `Rođendanske proslave — ${soba}`;
    stavke.push({
      grupa,
      naziv: `Rođendanska proslava, paket ${p.name}, ${soba} (do ${p.maxChildren} djece, ${trajanjeSati(p.durationMin)})`,
      cijenaCents: p.basePriceCents,
      baznaCents: bazna(p.basePriceCents, p.baznaCijenaCents),
      akcija: false,
    });
    if (p.perChildCents > 0) {
      stavke.push({
        grupa,
        naziv: `Paket ${p.name}, ${soba}: nadoplata za svako dijete iznad ${p.maxChildren}`,
        cijenaCents: p.perChildCents,
        baznaCents: bazna(p.perChildCents, p.baznaNadoplataCents),
        akcija: false,
      });
    }
  }
  stavke.push({ grupa: GRUPA_DODACI, naziv: "Spajanje dviju igraonica", cijenaCents: SPAJANJE_SOBE_CENTS, baznaCents: BAZNA_SPAJANJE_SOBE_CENTS, akcija: false });
  for (const d of dodaci) {
    stavke.push({
      grupa: GRUPA_DODACI,
      naziv: d.unit === "per_child" ? `${d.name} (po djetetu)` : d.name,
      cijenaCents: d.priceCents,
      baznaCents: bazna(d.priceCents, d.baznaCijenaCents),
      akcija: false,
    });
  }
  stavke.push({
    grupa: "Dnevna igra",
    naziv: "Dnevna igra (slobodna igra), 1 sat",
    cijenaCents: DNEVNA_IGRA_SAT_CENTS,
    baznaCents: BAZNA_DNEVNA_IGRA_SAT_CENTS,
    akcija: false,
  });
  return stavke;
}

export async function stavkeCjenika(): Promise<StavkaCjenika[]> {
  const [paketi, dodaci] = await Promise.all([
    prisma.package.findMany({ where: { active: true }, include: { room: true }, orderBy: [{ room: { sortOrder: "asc" } }, { sortOrder: "asc" }] }),
    prisma.addOn.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  return stavkeIzKataloga(paketi, dodaci);
}

// --- Datoteka cjenika ---------------------------------------------------
export const ZAGLAVLJE_CJENIKA = ["Naziv usluge", "Maloprodajna cijena (EUR)", "Posebni oblik prodaje", "Bazna cijena (EUR)"];

/** Polje CSV-a; navodnici samo kad ih sadržaj traži (";", navodnik, novi red). */
function poljeCsv(v: string): string {
  return /[;"\r\n]/.test(v) ? `"${v.replace(/"/g, '""')}"` : v;
}

/** CSV cjenika usluga: stupci redom kako ih navodi čl. 3. st. 3. Pravilnika. */
export function csvCjenika(stavke: StavkaCjenika[]): string {
  const retci = [
    ZAGLAVLJE_CJENIKA,
    ...stavke.map((s) => [s.naziv, formatEurBroj(s.cijenaCents), s.akcija ? "DA" : "NE", formatEurBroj(s.baznaCents)]),
  ];
  return retci.map((r) => r.map(poljeCsv).join(";")).join("\r\n") + "\r\n";
}

/**
 * Naziv datoteke po čl. 6. st. 4. Pravilnika: OIB, ZA_SVA_PRODAJNA_MJESTA,
 * vrsta cjenika, broj pohrane i vrijeme objave (GGGGMMDD_SSMM, hrvatsko vrijeme).
 */
export function nazivDatoteke(broj: number, objavljeno: Date): string {
  const dijelovi = Object.fromEntries(
    new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Zagreb",
      year: "numeric",
      month: "2-digit",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
      hourCycle: "h23",
    })
      .formatToParts(objavljeno)
      .map((d) => [d.type, d.value]),
  );
  const vrijeme = `${dijelovi.year}${dijelovi.month}${dijelovi.day}_${dijelovi.hour}${dijelovi.minute}`;
  return `${OIB}_ZA_SVA_PRODAJNA_MJESTA_USLUGE_${broj}_${vrijeme}.csv`;
}

/**
 * Objavljuje cjenik ako se promijenio od zadnje objave i vraća važeću verziju.
 * Poziva se nakon izmjene cijena u administraciji i pri svakom otvaranju
 * cjenika, pa objavljeni cjenik uvijek odgovara stvarnim cijenama.
 */
export async function objaviCjenik(sada: Date = new Date()) {
  const sadrzaj = csvCjenika(await stavkeCjenika());
  const zadnja = await prisma.cjenikVerzija.findFirst({ orderBy: { broj: "desc" } });
  if (zadnja?.sadrzaj === sadrzaj) return zadnja;
  const broj = (zadnja?.broj ?? 0) + 1;
  try {
    return await prisma.cjenikVerzija.create({ data: { broj, datoteka: nazivDatoteke(broj, sada), sadrzaj, objavljeno: sada } });
  } catch {
    // Dvije istodobne objave: vrijedi ona koja je prva upisana.
    return prisma.cjenikVerzija.findFirstOrThrow({ orderBy: { broj: "desc" } });
  }
}
