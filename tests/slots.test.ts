import { describe, it, expect } from "vitest";
import {
  jeDozvoljenPocetak,
  krajTermina,
  lokalniISO,
  pocetciZaDatum,
  preklapaSe,
  semaforDana,
  semaforTermina,
  sljedeciDatumSTerminima,
  trajanjeSati,
  uMinute,
} from "../src/lib/slots";

describe("preklapaSe", () => {
  it("isti termin se preklapa", () => {
    expect(preklapaSe({ start: "14:00", end: "16:00" }, { start: "14:00", end: "16:00" })).toBe(true);
  });

  it("Premium 14–17 i proslava u 17:00 se ne preklapaju (razmak za čišćenje ugrađen je u raspored)", () => {
    expect(preklapaSe({ start: "14:00", end: "17:00" }, { start: "17:00", end: "19:00" })).toBe(false);
  });

  it("proslava koja traje preko 17:00 blokira termin u 17:00", () => {
    expect(preklapaSe({ start: "14:00", end: "18:00" }, { start: "17:00", end: "19:00" })).toBe(true);
  });

  it("uz zadani dodatni razmak bliski se termini preklapaju", () => {
    expect(preklapaSe({ start: "14:00", end: "16:00" }, { start: "16:15", end: "18:15" }, 30)).toBe(true);
  });
});

describe("uMinute i krajTermina", () => {
  it("pretvara HH:mm u minute", () => {
    expect(uMinute("00:00")).toBe(0);
    expect(uMinute("10:30")).toBe(630);
  });
  it("računa kraj iz trajanja paketa", () => {
    expect(krajTermina("14:00", 120)).toBe("16:00");
    expect(krajTermina("17:00", 180)).toBe("20:00");
    expect(krajTermina("10:30", 90)).toBe("12:00");
  });
  it("prikazuje trajanje u satima", () => {
    expect(trajanjeSati(120)).toBe("2 h");
    expect(trajanjeSati(150)).toBe("2,5 h");
  });
});

describe("raspored po danima", () => {
  // 10. 9. 2026. je četvrtak
  it("vikend (pet–ned) ima početke u 14:00 i 17:00", () => {
    expect(pocetciZaDatum("2026-09-11")).toEqual(["14:00", "17:00"]); // petak
    expect(pocetciZaDatum("2026-09-12")).toEqual(["14:00", "17:00"]); // subota
    expect(pocetciZaDatum("2026-09-13")).toEqual(["14:00", "17:00"]); // nedjelja
  });
  it("ponedjeljak i srijeda imaju samo 17:00", () => {
    expect(pocetciZaDatum("2026-09-14")).toEqual(["17:00"]);
    expect(pocetciZaDatum("2026-09-16")).toEqual(["17:00"]);
    expect(jeDozvoljenPocetak("2026-09-14", "14:00")).toBe(false);
  });
  it("utorkom i četvrtkom nema proslava (družionica)", () => {
    expect(pocetciZaDatum("2026-09-15")).toEqual([]);
    expect(pocetciZaDatum("2026-09-10")).toEqual([]);
  });
  it("pronalazi prvi sljedeći dan s terminima", () => {
    expect(sljedeciDatumSTerminima("2026-09-10")).toBe("2026-09-11");
    expect(sljedeciDatumSTerminima("2026-09-15")).toBe("2026-09-16");
    expect(sljedeciDatumSTerminima("2026-09-12")).toBe("2026-09-12");
  });
  it("lokalni datum ne pomiče dan kao toISOString", () => {
    expect(lokalniISO(new Date(2026, 8, 10))).toBe("2026-09-10");
  });
});

describe("semaforTermina", () => {
  it("crveno kad nema slobodnih soba", () => {
    expect(semaforTermina(0, 2)).toBe("popunjeno");
  });
  it("zeleno kad su obje igraonice slobodne", () => {
    expect(semaforTermina(2, 2)).toBe("slobodno");
  });
  it("žuto kad je slobodna samo jedna igraonica", () => {
    expect(semaforTermina(1, 2)).toBe("malo");
  });
});

describe("semaforDana", () => {
  it("popunjeno kad je sve zauzeto", () => {
    expect(semaforDana(12, 12)).toBe("popunjeno");
  });
  it("slobodno kad je malo zauzeto", () => {
    expect(semaforDana(2, 12)).toBe("slobodno");
  });
});
