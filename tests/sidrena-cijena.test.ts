import { describe, it, expect } from "vitest";
import { tekstSidrene, formatDatumTocke, REFERENTNI_DATUM } from "../src/lib/sidrena-cijena";

/** `formatEur` dijeli iznos i € tvrdim razmakom; za usporedbu ga izjednačimo. */
const razmaci = (s: string | null) => s?.replace(/ /g, " ") ?? null;

describe("sidrena (dodatna) cijena", () => {
  it("prikazuje datum i iznos, bez dodatnih riječi", () => {
    expect(razmaci(tekstSidrene({ sidrenaCijenaCents: 20000, sidrenaDatum: "2026-09-10" }))).toBe("10.09.2026. 200,00 €");
  });

  it("nula se ne prikazuje — propis ne dopušta dodatnu cijenu 0,00 €", () => {
    expect(tekstSidrene({ sidrenaCijenaCents: 0, sidrenaDatum: "2026-09-10" })).toBeNull();
  });

  it("nepotpuni podaci ne daju polovičnu oznaku", () => {
    expect(tekstSidrene({ sidrenaCijenaCents: 20000, sidrenaDatum: null })).toBeNull();
    expect(tekstSidrene({ sidrenaCijenaCents: null, sidrenaDatum: "2026-09-10" })).toBeNull();
    expect(tekstSidrene({ sidrenaCijenaCents: null, sidrenaDatum: null })).toBeNull();
  });

  it("negativan iznos se ne prikazuje", () => {
    expect(tekstSidrene({ sidrenaCijenaCents: -500, sidrenaDatum: "2026-09-10" })).toBeNull();
  });

  it("datum je u obliku koji propis navodi kao dovoljan", () => {
    expect(formatDatumTocke("2026-09-10")).toBe("10.09.2026.");
    expect(formatDatumTocke("2027-01-05")).toBe("05.01.2027.");
  });

  it("referentni datum za usluge je 10. rujna 2026.", () => {
    expect(REFERENTNI_DATUM).toBe("2026-09-10");
  });
});
