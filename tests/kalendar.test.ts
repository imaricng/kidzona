import { describe, it, expect } from "vitest";
import { idDogadjaja, pemKljuc } from "../src/lib/kalendar";

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
