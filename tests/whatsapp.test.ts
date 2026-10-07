import { describe, expect, it } from "vitest";
import {
  porukaPodsjetnika,
  porukaPotvrde,
  porukaPozivnice,
  porukaUpita,
  porukaZahvale,
  whatsappBroj,
  whatsappVeza,
} from "@/lib/whatsapp";

const PROSLAVA = {
  parentName: "Ivana Horvat",
  childName: "Mia",
  code: "KZ-2026-0042",
  date: new Date("2030-06-01T00:00:00+02:00"),
  slotStart: "17:00",
  slotEnd: "19:00",
  roomName: "Kids Play",
};

describe("whatsappBroj", () => {
  it("domaci broj dobiva hrvatski pozivni", () => {
    expect(whatsappBroj("095 537 8559")).toBe("385955378559");
  });
  it("prihvaca +385 i 00385", () => {
    expect(whatsappBroj("+385 95 537 8559")).toBe("385955378559");
    expect(whatsappBroj("00385955378559")).toBe("385955378559");
  });
  it("prekratak ili prazan broj nije upotrebljiv", () => {
    expect(whatsappBroj("123")).toBeNull();
    expect(whatsappBroj(null)).toBeNull();
    expect(whatsappBroj("")).toBeNull();
  });
});

describe("whatsappVeza", () => {
  it("sastavlja wa.me poveznicu s porukom", () => {
    const veza = whatsappVeza("095 537 8559", "Pozdrav i bok!");
    expect(veza).toBe("https://wa.me/385955378559?text=Pozdrav%20i%20bok!");
  });
  it("bez upotrebljivog broja nema poveznice", () => {
    expect(whatsappVeza(null, "Pozdrav")).toBeNull();
  });
});

describe("poruke", () => {
  it("oslovljavaju roditelja imenom", () => {
    expect(porukaUpita(PROSLAVA)).toContain("Pozdrav Ivana!");
  });
  it("potvrda nosi termin i poveznicu", () => {
    const p = porukaPotvrde(PROSLAVA, "https://x.hr/potvrda/KZ-2026-0042?k=t");
    expect(p).toContain("od 17:00 do 19:00");
    expect(p).toContain("Kids Play");
    expect(p).toContain("https://x.hr/potvrda/KZ-2026-0042?k=t");
  });
  it("podsjetnik govori o sutrasnjoj proslavi", () => {
    expect(porukaPodsjetnika(PROSLAVA)).toContain("sutra");
  });
  it("zahvala nosi poveznicu na recenziju", () => {
    expect(porukaZahvale(PROSLAVA, "https://g.page/r/recenzija")).toContain("https://g.page/r/recenzija");
  });
  it("pozivnica nosi ime slavljenika i poveznicu", () => {
    const p = porukaPozivnice("https://x.hr/pozivnica/abc", "Mia");
    expect(p).toContain("(Mia)");
    expect(p).toContain("https://x.hr/pozivnica/abc");
  });
  it("bez imena roditelja poruka i dalje ima pozdrav", () => {
    expect(porukaUpita({ ...PROSLAVA, parentName: "  " })).toContain("Pozdrav!");
  });
});
