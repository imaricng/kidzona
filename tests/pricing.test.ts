import { describe, it, expect } from "vitest";
import { izracunajCijenu, SPAJANJE_SOBE_CENTS } from "../src/lib/pricing";

const paket = { name: "Standard", basePriceCents: 22000 }; // fiksna cijena paketa
const dodaci = [
  { id: "pizza", priceCents: 800, unit: "flat" as const },
  { id: "pokloni", priceCents: 500, unit: "per_child" as const },
];

describe("izracunajCijenu", () => {
  it("paket bez nadoplate ima FIKSNU cijenu (ne ovisi o broju djece)", () => {
    const r10 = izracunajCijenu({ paket, brojDjece: 10, dodaci, odabrani: [], depositPercent: 30 });
    const r20 = izracunajCijenu({ paket, brojDjece: 20, dodaci, odabrani: [], depositPercent: 30 });
    expect(r10.paketCents).toBe(22000);
    expect(r10.totalCents).toBe(22000);
    // ista cijena bez obzira na broj djece
    expect(r20.totalCents).toBe(22000);
  });

  it("ispravno zbraja fiksne dodatke i dodatke po djetetu", () => {
    const r = izracunajCijenu({
      paket,
      brojDjece: 10,
      dodaci,
      odabrani: [
        { id: "pizza", quantity: 2 }, // 800 * 1 * 2 = 1600
        { id: "pokloni", quantity: 1 }, // 500 * 10 * 1 = 5000 (dodatak je po djetetu)
      ],
      depositPercent: 30,
    });
    expect(r.dodaciCents).toBe(1600 + 5000);
    expect(r.totalCents).toBe(22000 + 6600);
  });

  it("dodaje doplatu za spajanje soba", () => {
    const r = izracunajCijenu({ paket, brojDjece: 8, dodaci, odabrani: [], spojeneSobe: true, depositPercent: 30 });
    expect(r.spajanjeSobeCents).toBe(SPAJANJE_SOBE_CENTS);
    expect(r.totalCents).toBe(22000 + SPAJANJE_SOBE_CENTS);
  });

  it("ispravno računa akontaciju i ostatak", () => {
    const r = izracunajCijenu({ paket, brojDjece: 10, dodaci, odabrani: [], depositPercent: 30 });
    expect(r.depositCents).toBe(Math.round(22000 * 0.3)); // 6600
    expect(r.depositCents + r.ostatakCents).toBe(r.totalCents);
  });

  it("zanemaruje dodatke s količinom 0 i nepostojeće oznake", () => {
    const r = izracunajCijenu({
      paket,
      brojDjece: 5,
      dodaci,
      odabrani: [{ id: "pizza", quantity: 0 }, { id: "ne-postoji", quantity: 3 }],
      depositPercent: 30,
    });
    expect(r.dodaciCents).toBe(0);
  });
});

describe("nadoplata po djetetu iznad paketa", () => {
  // Mini Kidzona Standard: 200 €, do 15 djece (slavljenik gratis), 10 € po dodatnom djetetu
  const mini = { name: "Standard", basePriceCents: 20000, ukljucenoDjece: 15, nadoplataPoDjetetuCents: 1000 };

  it("nema nadoplate do uključenog broja djece", () => {
    const r = izracunajCijenu({ paket: mini, brojDjece: 15, dodaci, odabrani: [], depositPercent: 30 });
    expect(r.nadoplataCents).toBe(0);
    expect(r.totalCents).toBe(20000);
  });

  it("naplaćuje 10 € za svako dijete iznad uključenog broja", () => {
    const r = izracunajCijenu({ paket: mini, brojDjece: 18, dodaci, odabrani: [], depositPercent: 30 });
    expect(r.nadoplataCents).toBe(3000);
    expect(r.totalCents).toBe(23000);
    expect(r.stavke.some((s) => s.naziv.includes("Nadoplata") && s.iznosCents === 3000)).toBe(true);
  });

  it("nadoplata ulazi u akontaciju", () => {
    const r = izracunajCijenu({ paket: mini, brojDjece: 18, dodaci, odabrani: [], depositPercent: 30 });
    expect(r.depositCents).toBe(Math.round(23000 * 0.3));
  });
});
