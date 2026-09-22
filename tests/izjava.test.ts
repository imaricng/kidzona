import { describe, it, expect } from "vitest";
import { IZJAVA_RODITELJA } from "../src/lib/izjava";
import { hr } from "../src/i18n/hr";

describe("izjava roditelja", () => {
  it("odgovara pravilu 2: roditelj ne preuzima nadzor, nego je dostupan na telefon", () => {
    expect(IZJAVA_RODITELJA).not.toMatch(/odgovornost za nadzor/);
    expect(IZJAVA_RODITELJA).toMatch(/dostupan\/na na telefon/);
    expect(IZJAVA_RODITELJA).toMatch(/pravilima ponašanja/);
  });

  it("spremljeni tekst je točno onaj koji roditelj vidi (dijelovi bez praznina i dvostrukih razmaka)", () => {
    expect(IZJAVA_RODITELJA).toBe(
      "Potvrđujem da je moje dijete zdravstveno sposobno za igru u igraonici, da sam upoznat/a s pravilima ponašanja Kidzone te da ću tijekom proslave biti dostupan/na na telefon.",
    );
    expect(IZJAVA_RODITELJA).not.toMatch(/\s{2}/);
    expect(hr.booking.waiverPoveznica).toBe("pravilima ponašanja");
  });
});
