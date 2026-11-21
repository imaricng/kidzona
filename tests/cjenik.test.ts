import { describe, expect, it } from "vitest";
import { csvCjenika, nazivDatoteke, stavkeIzKataloga, type PaketZaCjenik } from "@/lib/cjenik";
import { bazna } from "@/lib/pricing";

const PAKET: PaketZaCjenik = {
  name: "Basic",
  basePriceCents: 15000,
  perChildCents: 1000,
  baznaCijenaCents: null,
  baznaNadoplataCents: null,
  maxChildren: 10,
  durationMin: 120,
  cijenaPoDogovoru: false,
  room: { name: "Kids Play" },
};

describe("bazna", () => {
  it("bez zapisane bazne jednaka je trenutnoj cijeni", () => {
    expect(bazna(15000, null)).toBe(15000);
  });
  it("zapisana bazna ostaje i kad se cijena promijeni", () => {
    expect(bazna(16000, 15000)).toBe(15000);
  });
});

describe("nazivDatoteke", () => {
  it("OIB, sva prodajna mjesta, usluge, broj pohrane i vrijeme po hrvatskom vremenu", () => {
    expect(nazivDatoteke(3, new Date("2026-11-18T08:05:00Z"))).toBe("18925449183_ZA_SVA_PRODAJNA_MJESTA_USLUGE_3_20261118_0905.csv");
    // ljetno vrijeme (UTC+2) i prijelaz datuma
    expect(nazivDatoteke(1, new Date("2026-07-01T22:30:00Z"))).toBe("18925449183_ZA_SVA_PRODAJNA_MJESTA_USLUGE_1_20260702_0030.csv");
  });
});

describe("stavkeIzKataloga", () => {
  const stavke = stavkeIzKataloga(
    [PAKET, { ...PAKET, name: "Gala", cijenaPoDogovoru: true }],
    [{ name: "Torta po narudžbi", priceCents: 3000, baznaCijenaCents: null, unit: "flat" }, { name: "McDonald's meni", priceCents: 1000, baznaCijenaCents: 900, unit: "per_child" }],
  );
  it("paket, nadoplata, spajanje, dodaci i dnevna igra", () => {
    expect(stavke.map((s) => s.naziv)).toEqual([
      "Rođendanska proslava, paket Basic, Kids Play (do 10 djece, 2 h)",
      "Paket Basic, Kids Play: nadoplata za svako dijete iznad 10",
      "Spajanje dviju igraonica",
      "Torta po narudžbi",
      "McDonald's meni (po djetetu)",
      "Dnevna igra (slobodna igra), prvi sat",
      "Dnevna igra, svakih daljnjih započetih 30 min (uz 10 min tolerancije)",
    ]);
  });
  it("paket s cijenom po dogovoru nije u cjeniku", () => {
    expect(stavke.some((s) => s.naziv.includes("Gala"))).toBe(false);
  });
  it("dnevna igra: prvi sat 6 €, svakih daljnjih 30 min 3 €, bazne iste", () => {
    const [sat, polusat] = stavke.slice(-2);
    expect([sat.cijenaCents, sat.baznaCents]).toEqual([600, 600]);
    expect([polusat.cijenaCents, polusat.baznaCents]).toEqual([300, 300]);
  });
  it("zapisana bazna cijena dodatka ide u cjenik", () => {
    expect(stavke.find((s) => s.naziv.startsWith("McDonald"))?.baznaCents).toBe(900);
  });
});

describe("csvCjenika", () => {
  const csv = csvCjenika(stavkeIzKataloga([PAKET], []));
  const retci = csv.trimEnd().split("\r\n");
  it("zaglavlje i stupci redom: naziv, cijena, posebni oblik prodaje, bazna", () => {
    expect(retci[0]).toBe("Naziv usluge;Maloprodajna cijena (EUR);Posebni oblik prodaje;Bazna cijena (EUR)");
    expect(retci[1]).toBe("Rođendanska proslava, paket Basic, Kids Play (do 10 djece, 2 h);150,00;NE;150,00");
  });
  it("naziv s točkom-zarezom ili navodnikom ide u navodnike", () => {
    const c = csvCjenika([{ grupa: "x", naziv: 'Torta; "velika"', cijenaCents: 100, baznaCents: 100, akcija: true }]);
    expect(c.split("\r\n")[1]).toBe('"Torta; ""velika""";1,00;DA;1,00');
  });
});
