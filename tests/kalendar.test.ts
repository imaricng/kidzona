import { describe, it, expect } from "vitest";
import { idDogadjaja, naslovDogadjaja, pemKljuc } from "../src/lib/kalendar";

/** Google dopušta samo base32hex: znamenke i slova a–v, najmanje 5 znakova. */
const DOPUSTEN_ID = /^[0-9a-v]{5,}$/;

describe("idDogadjaja", () => {
  it("isti kod uvijek daje isti ID (ponovni upis ažurira, ne duplicira)", () => {
    expect(idDogadjaja("KZ-2026-0042")).toBe(idDogadjaja("KZ-2026-0042"));
  });

  it("izbacuje znakove koje Google ne dopušta (crtice i slovo z)", () => {
    expect(idDogadjaja("KZ-2026-0042")).toBe("k20260042");
    expect(idDogadjaja("KZ-2026-0042")).toMatch(DOPUSTEN_ID);
  });

  it("različite rezervacije dobivaju različite ID-eve", () => {
    expect(idDogadjaja("KZ-2026-0042")).not.toBe(idDogadjaja("KZ-2026-0043"));
    expect(idDogadjaja("KZ-2026-0042")).not.toBe(idDogadjaja("KZ-2027-0042"));
  });

  it("i vrlo kratak kod daje valjan ID dovoljne duljine", () => {
    expect(idDogadjaja("KZ-1")).toMatch(DOPUSTEN_ID);
    expect(idDogadjaja("")).toMatch(DOPUSTEN_ID);
  });
});

describe("pemKljuc", () => {
  const PEM = "-----BEGIN PRIVATE KEY-----\nMIIEv\n-----END PRIVATE KEY-----\n";

  it("pretvara dvoznakovni \\n iz JSON-a u stvarne prijelome redaka", () => {
    const izJsona = String.raw`-----BEGIN PRIVATE KEY-----\nMIIEv\n-----END PRIVATE KEY-----\n`;
    expect(izJsona).toContain("\\n"); // ulaz doista ima backslash + n, ne prijelom
    expect(pemKljuc(izJsona)).toBe(PEM.trim());
  });

  it("skida navodnike koji se zalijepe zajedno s vrijednošću iz JSON-a", () => {
    expect(pemKljuc(`"${PEM}"`)).toBe(PEM.trim());
    expect(pemKljuc(`'${PEM}'`)).toBe(PEM.trim());
  });

  it("ispravno zalijepljen ključ ostaje nepromijenjen", () => {
    expect(pemKljuc(PEM)).toBe(PEM.trim());
  });
});

describe("naslovDogadjaja", () => {
  const PROSLAVA = {
    slotStart: "14:00",
    date: new Date("2026-11-15T00:00:00Z"),
    childName: "bruno",
    childTurning: 7,
    room: { name: "Kids Challenge" },
    package: { name: "Premium" },
    theme: { name: "Minecraft" },
  };

  it("početak - igraonica - paket - slavljenik - tema - rođendan", () => {
    expect(naslovDogadjaja(PROSLAVA)).toBe("14:00 - Challenge - Premium - Bruno - Minecraft - 7. rođendan");
  });

  it("ime slavljenika bez prezimena", () => {
    expect(naslovDogadjaja({ ...PROSLAVA, childName: "Bruno Tvorek" })).toContain("- Bruno - ");
  });

  it("izostavlja temu, ime i rođendan kad nisu poznati", () => {
    expect(naslovDogadjaja({ ...PROSLAVA, theme: null, childName: null, childTurning: null, room: { name: "Kids Play" } })).toBe(
      "14:00 - Play - Premium",
    );
  });

  it("rođendan se računa iz datuma rođenja kad nije upisan", () => {
    expect(naslovDogadjaja({ ...PROSLAVA, childTurning: null, childBirthDate: new Date("2019-11-20T00:00:00Z") })).toMatch(/- 7\. rođendan$/);
  });
});
