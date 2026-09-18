import { describe, it, expect } from "vitest";
import { sastaviNapomene } from "../src/lib/napomene";

describe("sastaviNapomene", () => {
  it("zapisuje želju za temom izvan ponude", () => {
    expect(sastaviNapomene({ temaZelja: "Paw Patrol, plavo-zlatno" })).toBe(
      "Želja za temom: Paw Patrol, plavo-zlatno",
    );
  });

  it("želja dolazi prije poruke kupca i koda bona, svaka u svom retku", () => {
    expect(
      sastaviNapomene({ temaZelja: "Pirati", napomene: "Dijete ima alergiju na orahe.", bon: "KZ-BON-1" }),
    ).toBe("Želja za temom: Pirati\nDijete ima alergiju na orahe.\nPoklon-bon: KZ-BON-1");
  });

  it("prazna i razmacima ispunjena želja ne ostavlja trag", () => {
    expect(sastaviNapomene({ temaZelja: "   ", napomene: "Dolazimo ranije." })).toBe("Dolazimo ranije.");
    expect(sastaviNapomene({ temaZelja: "" })).toBeNull();
  });

  it("bez ijednog podatka napomene ostaju prazne", () => {
    expect(sastaviNapomene({})).toBeNull();
  });
});
