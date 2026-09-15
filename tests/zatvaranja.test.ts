import { describe, expect, it } from "vitest";
import { prviOtvoreniDatum, rasponDatuma, zatvaranjeZaDatum, type Zatvaranje } from "../src/lib/zatvaranja";

// Raspored: pet/sub/ned 14:00 i 17:00, pon i sri 17:00; utorkom i četvrtkom nema proslava.
// Listopad 2026.: 1. je četvrtak, 2. petak, 6. utorak, 7. srijeda, 8. četvrtak, 9. petak.
const godisnji: Zatvaranje = { od: "2026-10-01", do: "2026-10-05", razlog: "Godišnji odmor" };

describe("zatvaranjeZaDatum", () => {
  it("prepoznaje dan unutar razdoblja, uključujući prvi i zadnji dan", () => {
    expect(zatvaranjeZaDatum("2026-10-01", [godisnji])).toBe(godisnji);
    expect(zatvaranjeZaDatum("2026-10-03", [godisnji])).toBe(godisnji);
    expect(zatvaranjeZaDatum("2026-10-05", [godisnji])).toBe(godisnji);
  });

  it("ne dira dane izvan razdoblja", () => {
    expect(zatvaranjeZaDatum("2026-09-30", [godisnji])).toBeUndefined();
    expect(zatvaranjeZaDatum("2026-10-06", [godisnji])).toBeUndefined();
    expect(zatvaranjeZaDatum("2026-10-03", [])).toBeUndefined();
  });
});

describe("prviOtvoreniDatum", () => {
  it("bez zatvaranja vraća prvi dan s terminima po rasporedu", () => {
    expect(prviOtvoreniDatum("2026-10-01", [])).toBe("2026-10-02");
  });

  it("preskače razdoblje zatvaranja i dane bez termina", () => {
    // Nakon 5. 10.: utorak 6. nema termina, srijeda 7. ima 17:00.
    expect(prviOtvoreniDatum("2026-10-01", [godisnji])).toBe("2026-10-07");
  });

  it("preskače više uzastopnih razdoblja", () => {
    const zatvaranja: Zatvaranje[] = [
      { od: "2026-10-02", do: "2026-10-04", razlog: "Praznik" },
      { od: "2026-10-05", do: "2026-10-07", razlog: "Uređenje" },
    ];
    expect(prviOtvoreniDatum("2026-10-02", zatvaranja)).toBe("2026-10-09");
  });
});

describe("rasponDatuma", () => {
  it("za jedan dan prikazuje samo datum, inače raspon", () => {
    expect(rasponDatuma({ od: "2026-10-03", do: "2026-10-03" })).not.toContain("–");
    expect(rasponDatuma(godisnji)).toContain("–");
  });
});
