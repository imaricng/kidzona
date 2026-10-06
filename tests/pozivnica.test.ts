import { describe, expect, it } from "vitest";
import { predlozakUrl, provjeriPredlozak, tekstPozivnice, temaIzAdrese, whatsappBroj, whatsappPoruka } from "@/lib/pozivnica";

describe("tekstPozivnice", () => {
  const osnova = { date: new Date("2026-11-14T00:00:00"), slotStart: "17:00", slotEnd: "19:00" };

  it("sastavlja poziv s imenom slavljenika, datumom i terminom", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Mia", phone: "095 537 8559" });
    expect(t.poziv).toContain("Ja „Mia”");
    expect(t.poziv).toContain("te pozivam na svoj rođendan");
    expect(t.poziv).toContain("od 17:00 do 19:00 sati");
    expect(t.poziv).toContain("2026");
  });

  it("traži potvrdu dolaska na broj osobe koja je rezervirala", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Luka", phone: "095 537 8559" });
    expect(t.potvrda).toBe("Dolazak potvrdi na broj 095 537 8559.");
  });

  it("bez telefona ne izmišlja broj za potvrdu", () => {
    expect(tekstPozivnice({ ...osnova, childName: "Luka", phone: null }).potvrda).toBeNull();
  });

  it("bez imena slavljenika ostaje čitljiv", () => {
    expect(tekstPozivnice({ ...osnova, childName: "  ", phone: null }).poziv).toContain("Ja „Slavljenik”");
  });
});

describe("whatsappBroj", () => {
  it("domaći broj dobiva hrvatski pozivni", () => {
    expect(whatsappBroj("095 537 8559")).toBe("385955378559");
  });
  it("prihvaća +385 i 00385", () => {
    expect(whatsappBroj("+385 95 537 8559")).toBe("385955378559");
    expect(whatsappBroj("00385955378559")).toBe("385955378559");
  });
  it("prekratak ili prazan broj nije upotrebljiv", () => {
    expect(whatsappBroj("123")).toBeNull();
    expect(whatsappBroj(null)).toBeNull();
    expect(whatsappBroj("")).toBeNull();
  });
  it("poruka nosi poveznicu na pozivnicu", () => {
    expect(whatsappPoruka("https://x.hr/pozivnica/abc", "Mia")).toContain("https://x.hr/pozivnica/abc");
    expect(whatsappPoruka("https://x.hr/pozivnica/abc", "Mia")).toContain("(Mia)");
  });
});

describe("provjeriPredlozak", () => {
  it("prihvaća sliku do 4 MB", () => {
    expect(provjeriPredlozak("image/png", 1024)).toBeNull();
    expect(provjeriPredlozak("image/jpeg", 4 * 1024 * 1024)).toBeNull();
  });
  it("odbija pogrešnu vrstu, prazno i preveliko", () => {
    expect(provjeriPredlozak("application/pdf", 1024)).toMatch(/slika/i);
    expect(provjeriPredlozak("image/png", 0)).toMatch(/prazna/i);
    expect(provjeriPredlozak("image/png", 5 * 1024 * 1024)).toMatch(/4 MB/);
  });
  it("adresa predloška vodi na par tema + igraonica", () => {
    expect(predlozakUrl("t1", "r2")).toBe("/api/pozivnice/predlozak/t1/r2");
  });
  it("proslava bez teme ima generički predložak igraonice", () => {
    expect(predlozakUrl(null, "r2")).toBe("/api/pozivnice/predlozak/bez-teme/r2");
    expect(temaIzAdrese("bez-teme")).toBeNull();
    expect(temaIzAdrese("t1")).toBe("t1");
  });
});
