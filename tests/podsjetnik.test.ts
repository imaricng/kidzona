import { describe, expect, it } from "vitest";
import { danaDo, kadaJe } from "@/lib/format";
import { predlozakPodsjetnika } from "@/lib/notifications/templates";

const PROSLAVA = {
  code: "KZ-2027-0005",
  parentName: "Ivana Horvat",
  childName: "Niko",
  date: new Date("2027-11-01T00:00:00+01:00"),
  slotStart: "17:00",
  slotEnd: "19:00",
  roomName: "Kids Play",
  packageName: "Basic",
  numChildren: 10,
  numAdults: 4,
  totalCents: 15000,
  depositCents: 0,
  paidCents: 5000,
  qrUrl: "https://x.hr/potvrda/KZ-2027-0005?k=t",
  themeName: "Dinosauri",
  dodaci: ["Torta ×1", "Pizza ×2"],
  pozivnicaUrl: "https://x.hr/pozivnica/abc",
};

describe("danaDo", () => {
  it("broji kalendarske dane po hrvatskom vremenu", () => {
    const sada = new Date("2026-10-15T13:28:00+02:00");
    expect(danaDo(new Date("2026-10-15T00:00:00+02:00"), sada)).toBe(0);
    expect(danaDo(new Date("2026-10-16T00:00:00+02:00"), sada)).toBe(1);
    expect(danaDo(new Date("2026-10-22T00:00:00+02:00"), sada)).toBe(7);
    expect(danaDo(new Date("2026-10-14T00:00:00+02:00"), sada)).toBe(-1);
    expect(danaDo(PROSLAVA.date, sada)).toBe(382);
  });
  it("ne griješi oko ponoći ni kad je proslava spremljena kao UTC ponoć", () => {
    // 23:30 u Zagrebu je već sljedeći dan u odnosu na UTC datum od 21:30.
    const kasnoNavecer = new Date("2026-10-15T23:30:00+02:00");
    expect(danaDo(new Date("2026-10-16T00:00:00Z"), kasnoNavecer)).toBe(1);
  });
  it("prelazak na zimsko vrijeme ne pomiče broj dana", () => {
    expect(danaDo(new Date("2026-10-26T00:00:00+01:00"), new Date("2026-10-24T12:00:00+02:00"))).toBe(2);
  });
});

describe("kadaJe", () => {
  it("piše dane hrvatskim riječima", () => {
    expect(kadaJe(0)).toBe("danas");
    expect(kadaJe(1)).toBe("sutra");
    expect(kadaJe(2)).toBe("prekosutra");
    expect(kadaJe(7)).toBe("za 7 dana");
    expect(kadaJe(11)).toBe("za 11 dana");
    expect(kadaJe(21)).toBe("za 21 dan");
  });
});

describe("predlozakPodsjetnika", () => {
  it("dan prije kaže SUTRA", () => {
    const p = predlozakPodsjetnika(PROSLAVA, 1);
    expect(p.naslov).toContain("proslava je sutra");
    expect(p.tijelo).toContain("proslava SUTRA");
    expect(p.tijelo).toContain("ponesite QR kod");
  });
  it("tjedan prije ne spominje sutra", () => {
    const p = predlozakPodsjetnika(PROSLAVA, 7);
    expect(p.naslov).toContain("za 7 dana");
    expect(p.naslov).toMatch(/01\.\s?11\.\s?2027\./);
    expect(p.tijelo.toLowerCase()).not.toContain("sutra");
  });
  it("nosi sve pojedinosti koje je roditelj odabrao", () => {
    const t = predlozakPodsjetnika(PROSLAVA, 7).tijelo;
    for (const dio of ["KZ-2027-0005", "Slavljenik: Niko", "17:00 – 19:00", "Kids Play", "Basic", "Odrasli gosti: 4", "Tema: Dinosauri", "Torta ×1, Pizza ×2", "https://x.hr/pozivnica/abc", "https://x.hr/potvrda/KZ-2027-0005?k=t"]) {
      expect(t).toContain(dio);
    }
    expect(t).toMatch(/Ukupno: 150,00\s€/);
    expect(t).toMatch(/Za plaćanje uživo na dan proslave: 100,00\s€/);
  });
  it("izostavlja ono što nije odabrano", () => {
    const t = predlozakPodsjetnika({ ...PROSLAVA, themeName: null, dodaci: [], pozivnicaUrl: null, numAdults: 0 }, 1).tijelo;
    expect(t).not.toContain("Tema:");
    expect(t).not.toContain("Dodaci:");
    expect(t).not.toContain("pozivnica");
    expect(t).not.toContain("Odrasli");
  });
});
