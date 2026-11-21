import { describe, it, expect } from "vitest";
import { cijenaBoravka, formatTrajanje, imeZaCrm, minuteBoravka } from "../src/lib/dnevna-igra";

describe("dnevna igra — trajanje boravka", () => {
  it("računa cijele minute", () => {
    expect(minuteBoravka(new Date("2026-10-23T10:00:00Z"), new Date("2026-10-23T11:35:59Z"))).toBe(95);
    expect(minuteBoravka(new Date("2026-10-23T10:00:00Z"), new Date("2026-10-23T09:00:00Z"))).toBe(0);
  });
  it("formatira sate i minute", () => {
    expect(formatTrajanje(45)).toBe("45 min");
    expect(formatTrajanje(60)).toBe("1 h 00 min");
    expect(formatTrajanje(125)).toBe("2 h 05 min");
  });
});

describe("dnevna igra — ime za CRM", () => {
  it("uzima samo prvo ime", () => {
    expect(imeZaCrm("Mia Horvat")).toBe("Mia");
    expect(imeZaCrm("  Ana-Marija   Kovač ")).toBe("Ana-Marija");
  });
});

describe("dnevna igra — cijena (prvi sat, pa polusati uz 10 min tolerancije)", () => {
  it("prvi sat je najmanja naplata", () => {
    expect(cijenaBoravka(0)).toBe(600);
    expect(cijenaBoravka(45)).toBe(600);
    expect(cijenaBoravka(70)).toBe(600);
  });
  it("svakih daljnjih započetih 30 min nakon tolerancije", () => {
    expect(cijenaBoravka(71)).toBe(900);
    expect(cijenaBoravka(100)).toBe(900);
    expect(cijenaBoravka(101)).toBe(1200);
    expect(cijenaBoravka(130)).toBe(1200);
    expect(cijenaBoravka(131)).toBe(1500);
  });
});
