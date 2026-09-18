import { describe, it, expect } from "vitest";
import { idDogadjaja } from "../src/lib/kalendar";

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
