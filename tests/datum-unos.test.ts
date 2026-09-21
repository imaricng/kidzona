import { describe, it, expect } from "vitest";
import { isoUHr, hrUIso, normalizirajVrijeme } from "../src/lib/datum-unos";

describe("isoUHr", () => {
  it("ISO datum prikazuje u hrvatskom obliku", () => {
    expect(isoUHr("2026-11-01")).toBe("01.11.2026.");
  });
  it("prazno i neispravno daju prazan prikaz", () => {
    expect(isoUHr("")).toBe("");
    expect(isoUHr(null)).toBe("");
    expect(isoUHr("11/01/2026")).toBe("");
  });
});

describe("hrUIso", () => {
  it.each([
    ["1.11.2026", "2026-11-01"],
    ["01.11.2026.", "2026-11-01"],
    ["1. 11. 2026.", "2026-11-01"],
    ["1/11/2026", "2026-11-01"],
    ["1-11-2026", "2026-11-01"],
    [" 30.01.2027. ", "2027-01-30"],
  ])("„%s\" → %s", (unos, iso) => {
    expect(hrUIso(unos)).toBe(iso);
  });

  it("dan dolazi prvi — 01.11. je studeni, ne siječanj", () => {
    expect(hrUIso("01.11.2026")).toBe("2026-11-01");
  });

  it("nepostojeći datumi se odbijaju", () => {
    expect(hrUIso("31.02.2026")).toBeNull();
    expect(hrUIso("29.02.2026")).toBeNull(); // 2026. nije prijestupna
    expect(hrUIso("13.13.2026")).toBeNull();
    expect(hrUIso("00.05.2026")).toBeNull();
  });

  it("prijestupna godina je u redu", () => {
    expect(hrUIso("29.02.2028")).toBe("2028-02-29");
  });

  it("dvoznamenkasta godina i nepotpun unos se odbijaju", () => {
    expect(hrUIso("1.11.26")).toBeNull();
    expect(hrUIso("1.11")).toBeNull();
    expect(hrUIso("")).toBeNull();
    expect(hrUIso("sutra")).toBeNull();
  });
});

describe("normalizirajVrijeme", () => {
  it.each([
    ["17", "17:00"],
    ["17:30", "17:30"],
    ["17.30", "17:30"],
    ["17,30", "17:30"],
    ["1730", "17:30"],
    ["9:05", "09:05"],
    ["905", "09:05"],
    ["0", "00:00"],
    ["23:59", "23:59"],
  ])("„%s\" → %s", (unos, vrijeme) => {
    expect(normalizirajVrijeme(unos)).toBe(vrijeme);
  });

  it("vrijeme izvan dana i AM/PM oblik se odbijaju", () => {
    expect(normalizirajVrijeme("24:00")).toBeNull();
    expect(normalizirajVrijeme("17:60")).toBeNull();
    expect(normalizirajVrijeme("5:00 PM")).toBeNull();
    expect(normalizirajVrijeme("")).toBeNull();
  });
});
