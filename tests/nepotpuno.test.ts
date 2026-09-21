import { describe, it, expect } from "vitest";
import { imeProslave, nedostajuciPodaci, pozdrav, bezKontakta } from "../src/lib/nepotpuno";
import { adminRezervacijaSchema } from "../src/lib/validation";

const PRAZNO = { parentName: "", email: "", phone: null, childName: null, childBirthDate: null };

describe("nepotpuna rezervacija", () => {
  it("ime u popisima: slavljenik, pa roditelj, pa jasna oznaka", () => {
    expect(imeProslave({ parentName: "Ivana", childName: "Mia" })).toBe("Mia");
    expect(imeProslave({ parentName: "Ivana", childName: null })).toBe("Ivana");
    expect(imeProslave({ parentName: "", childName: "" })).toBe("Ime nije upisano");
  });

  it("popis onoga što nedostaje, redom kako se pita", () => {
    expect(nedostajuciPodaci(PRAZNO)).toEqual([
      "ime roditelja",
      "e-pošta",
      "telefon",
      "ime slavljenika",
      "datum rođenja slavljenika",
    ]);
    expect(
      nedostajuciPodaci({ parentName: "Ivana", email: "i@x.hr", phone: "0911", childName: "Mia", childBirthDate: "2019-01-01" }),
    ).toEqual([]);
  });

  it("razmaci se ne računaju kao upisan podatak", () => {
    expect(nedostajuciPodaci({ ...PRAZNO, parentName: "   " })).toContain("ime roditelja");
  });

  it("pozdrav bez imena ostaje uljudan", () => {
    expect(pozdrav("Ivana")).toBe("Poštovani/a Ivana,");
    expect(pozdrav("")).toBe("Poštovani/a,");
  });

  it("bez e-pošte i telefona nema kontakta", () => {
    expect(bezKontakta({ email: "", phone: null })).toBe(true);
    expect(bezKontakta({ email: "", phone: "0911" })).toBe(false);
  });
});

describe("ručni unos u administraciji", () => {
  const TERMIN = { dateISO: "2026-11-07", slotStart: "14:00", roomId: "s1", packageId: "p1", numChildren: "8" };

  it("sprema se samo s terminom — osobni podaci mogu doći naknadno", () => {
    const r = adminRezervacijaSchema.safeParse(TERMIN);
    expect(r.success).toBe(true);
  });

  it("upisani podaci i dalje moraju biti ispravni", () => {
    expect(adminRezervacijaSchema.safeParse({ ...TERMIN, email: "nije-adresa" }).success).toBe(false);
    expect(adminRezervacijaSchema.safeParse({ ...TERMIN, childBirthDate: "31.02.2020" }).success).toBe(false);
  });

  it("termin je i dalje obvezan", () => {
    const { dateISO: _, ...bezDatuma } = TERMIN;
    expect(adminRezervacijaSchema.safeParse(bezDatuma).success).toBe(false);
  });
});
