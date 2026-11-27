import { describe, expect, it } from "vitest";
import { izracunajDostupnost, pomakniDatum, type UpitZaProvjeru, type ZauzetiTermin } from "@/lib/dostupnost";

// Referentni vikend u budućnosti:
// 2026-09-11 petak (14:00, 17:00)
// 2026-09-12 subota (14:00, 17:00)
// 2026-09-13 nedjelja (14:00, 17:00)
// 2026-09-14 ponedjeljak (17:00)
// 2026-09-15 utorak (družionica — nema proslava)
// 2026-09-16 srijeda (17:00)
const DANAS = "2026-09-01";

const UPIT_PLAY_SUB_14: UpitZaProvjeru = {
  id: "upit-1",
  dateISO: "2026-09-12",
  slotStart: "14:00",
  slotEnd: "16:00",
  durationMin: 120,
  roomId: "play",
};

describe("pomakniDatum", () => {
  it("pomiče datum unatrag i unaprijed preko granice mjeseca", () => {
    expect(pomakniDatum("2026-09-01", -1)).toBe("2026-08-31");
    expect(pomakniDatum("2026-09-30", 2)).toBe("2026-10-02");
  });
});

describe("izracunajDostupnost", () => {
  it("vraća slobodan termin kad nema preklapanja u traženoj sobi", () => {
    const zauzeti: ZauzetiTermin[] = [
      // Zauzeta je druga soba (Challenge) u isto vrijeme — Play je i dalje slobodan.
      {
        id: "r-1",
        code: "KZ-2026-0001",
        dateISO: "2026-09-12",
        slotStart: "14:00",
        slotEnd: "16:00",
        roomId: "challenge",
        childName: "Luka",
        parentName: "Marko",
      },
    ];

    const res = izracunajDostupnost(UPIT_PLAY_SUB_14, zauzeti, [], { danasISO: DANAS });
    expect(res.slobodan).toBe(true);
    expect(res.razlog).toBe("slobodan");
    expect(res.prijedlozi).toEqual([]);
  });

  it("prepoznaje zauzet termin u istoj sobi i predlaže najbliže slobodne termine za tu sobu", () => {
    const zauzeti: ZauzetiTermin[] = [
      {
        id: "r-1",
        code: "KZ-2026-0010",
        dateISO: "2026-09-12",
        slotStart: "14:00",
        slotEnd: "17:00", // Premium u Playu
        roomId: "play",
        childName: "Mia",
        parentName: "Ivana",
      },
    ];

    const res = izracunajDostupnost(UPIT_PLAY_SUB_14, zauzeti, [], { danasISO: DANAS });
    expect(res.slobodan).toBe(false);
    expect(res.razlog).toBe("rezervacija");
    expect(res.zauzetoOd?.code).toBe("KZ-2026-0010");
    expect(res.zauzetoOd?.naziv).toBe("Mia");

    // Najbliži slobodni: subota 17:00 (isti dan, +3h), petak 17:00 (-21h), nedjelja 14:00 (+24h), petak 14:00 (-24h)
    expect(res.prijedlozi).toEqual([
      { dateISO: "2026-09-12", slotStart: "17:00", slotEnd: "19:00", razlikaDana: 0 },
      { dateISO: "2026-09-11", slotStart: "17:00", slotEnd: "19:00", razlikaDana: -1 },
      { dateISO: "2026-09-13", slotStart: "14:00", slotEnd: "16:00", razlikaDana: 1 },
      { dateISO: "2026-09-11", slotStart: "14:00", slotEnd: "16:00", razlikaDana: -1 },
    ]);
  });

  it("poštuje spojene sobe (secondRoomId) pri provjeri zauzetosti", () => {
    const zauzeti: ZauzetiTermin[] = [
      {
        id: "r-spojena",
        code: "KZ-2026-0011",
        dateISO: "2026-09-12",
        slotStart: "14:00",
        slotEnd: "16:00",
        roomId: "challenge",
        secondRoomId: "play",
        parentName: "Ana",
      },
    ];

    const res = izracunajDostupnost(UPIT_PLAY_SUB_14, zauzeti, [], { danasISO: DANAS });
    expect(res.slobodan).toBe(false);
    expect(res.zauzetoOd?.code).toBe("KZ-2026-0011");
  });

  it("preskače neradne dane (zatvaranja) i datume u prošlosti", () => {
    const zauzeti: ZauzetiTermin[] = [
      {
        id: "r-1",
        code: "KZ-2026-0012",
        dateISO: "2026-09-12",
        slotStart: "14:00",
        slotEnd: "16:00",
        roomId: "play",
      },
    ];
    // Danas je subota 2026-09-12 (pa petak 11. ne smije biti predložen), a nedjelja 13. je zatvorena.
    const res = izracunajDostupnost(
      UPIT_PLAY_SUB_14,
      zauzeti,
      [{ od: "2026-09-13", do: "2026-09-13", razlog: "Godišnji" }],
      { danasISO: "2026-09-12" },
    );

    expect(res.slobodan).toBe(false);
    expect(res.prijedlozi.every((p) => p.dateISO >= "2026-09-12")).toBe(true);
    expect(res.prijedlozi.some((p) => p.dateISO === "2026-09-13")).toBe(false);
    // Prvi je subota 17:00, drugi ponedjeljak 17:00 (utorak nema termina), treći srijeda 17:00
    expect(res.prijedlozi[0]).toMatchObject({ dateISO: "2026-09-12", slotStart: "17:00" });
    expect(res.prijedlozi[1]).toMatchObject({ dateISO: "2026-09-14", slotStart: "17:00" });
    expect(res.prijedlozi[2]).toMatchObject({ dateISO: "2026-09-16", slotStart: "17:00" });
  });

  it("označava termin zauzetim kad je igraonica zatvorena na traženi datum", () => {
    const res = izracunajDostupnost(
      UPIT_PLAY_SUB_14,
      [],
      [{ od: "2026-09-12", do: "2026-09-12", razlog: "Blagdan" }],
      { danasISO: DANAS },
    );
    expect(res.slobodan).toBe(false);
    expect(res.razlog).toBe("zatvoreno");
    expect(res.zatvaranje?.razlog).toBe("Blagdan");
    expect(res.prijedlozi.every((p) => p.dateISO !== "2026-09-12")).toBe(true);
  });

  it("proširuje pretragu izvan ±2 dana kad su svi termini u ±2 dana zauzeti", () => {
    // Svi termini od petka 11. do ponedjeljka 14. u Playu zauzeti
    const zauzeti: ZauzetiTermin[] = [
      { id: "1", code: "A", dateISO: "2026-09-11", slotStart: "14:00", slotEnd: "16:00", roomId: "play" },
      { id: "2", code: "B", dateISO: "2026-09-11", slotStart: "17:00", slotEnd: "19:00", roomId: "play" },
      { id: "3", code: "C", dateISO: "2026-09-12", slotStart: "14:00", slotEnd: "16:00", roomId: "play" },
      { id: "4", code: "D", dateISO: "2026-09-12", slotStart: "17:00", slotEnd: "19:00", roomId: "play" },
      { id: "5", code: "E", dateISO: "2026-09-13", slotStart: "14:00", slotEnd: "16:00", roomId: "play" },
      { id: "6", code: "F", dateISO: "2026-09-13", slotStart: "17:00", slotEnd: "19:00", roomId: "play" },
      { id: "7", code: "G", dateISO: "2026-09-14", slotStart: "17:00", slotEnd: "19:00", roomId: "play" },
    ];

    const res = izracunajDostupnost(UPIT_PLAY_SUB_14, zauzeti, [], { danasISO: DANAS });
    expect(res.slobodan).toBe(false);
    expect(res.prijedlozi.length).toBeGreaterThan(0);
    // Najbliži izvan ±2 dana su srijeda 2026-09-09 (-3 dana) i srijeda 2026-09-16 (+4 dana)
    expect(res.prijedlozi[0].dateISO).toBe("2026-09-09");
  });
});
