import { describe, expect, it } from "vitest";
import { predlozakTjednogIzvjestaja, rasponTjedna, type StavkaTjednogIzvjestaja } from "@/lib/tjedni-izvjestaj";

describe("rasponTjedna", () => {
  it("za ponedjeljak vraća pon–ned istog tjedna", () => {
    // 2026-11-23 je ponedjeljak
    expect(rasponTjedna(new Date("2026-11-23T08:00:00+01:00"))).toEqual({
      odISO: "2026-11-23",
      doISO: "2026-11-29",
    });
  });

  it("za petak i nedjelju vraća isti pon–ned tjedan", () => {
    expect(rasponTjedna(new Date("2026-11-27T12:00:00+01:00"))).toEqual({
      odISO: "2026-11-23",
      doISO: "2026-11-29",
    });
    expect(rasponTjedna(new Date("2026-11-29T20:00:00+01:00"))).toEqual({
      odISO: "2026-11-23",
      doISO: "2026-11-29",
    });
  });
});

describe("predlozakTjednogIzvjestaja", () => {
  const RASPON = { odISO: "2026-11-23", doISO: "2026-11-29" };

  it("sadrži traženi naslov i sve detalje proslave u tekstu i HTML-u", () => {
    const stavka: StavkaTjednogIzvjestaja = {
      code: "KZ-2026-0053",
      date: new Date("2026-11-27T00:00:00+01:00"),
      slotStart: "17:00",
      slotEnd: "19:00",
      slavljenik: "Vito Horvat",
      roditelj: "Ivana Horvat",
      telefon: "095 537 8559",
      dob: 7,
      tema: "🦖 Dinosaur",
      soba: "Kids Play",
      sobaBoja: "#f97316",
      paket: "Standard (12 djece)",
      cijenaCents: 18000,
      napomene: "Alergija na kikiriki",
      adminUrl: "https://partykidzona.com/admin/rezervacije/KZ-2026-0053",
    };

    const p = predlozakTjednogIzvjestaja([stavka], RASPON);
    expect(p.naslov).toBe("Rođendani ovaj tjedan");

    for (const ocekivano of [
      "Vito Horvat",
      "Ivana Horvat",
      "7. rođendan",
      "Dinosaur",
      "Kids Play",
      "Standard (12 djece)",
      "180,00",
      "Alergija na kikiriki",
    ]) {
      expect(p.tijelo).toContain(ocekivano);
      expect(p.html).toContain(ocekivano);
    }
  });

  it("uredno prikazuje prazan tjedan bez proslava", () => {
    const p = predlozakTjednogIzvjestaja([], RASPON);
    expect(p.naslov).toBe("Rođendani ovaj tjedan");
    expect(p.tijelo).toContain("nema potvrđenih rođendana");
    expect(p.html).toContain("nema potvrđenih rođendana");
  });
});
