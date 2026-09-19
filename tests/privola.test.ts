import { describe, it, expect, beforeEach, vi } from "vitest";
import { procitajPrivolu, zapisiPrivolu, PRIVOLA_KLJUC, PRIVOLA_DOGADJAJ } from "../src/lib/privola";

/** Minimalni localStorage; `neispravan` glumi preglednik koji ga blokira. */
function postaviSpremnik(pocetno: Record<string, string> = {}, neispravan = false) {
  const podaci = new Map(Object.entries(pocetno));
  vi.stubGlobal("localStorage", {
    getItem: (k: string) => {
      if (neispravan) throw new Error("blokirano");
      return podaci.get(k) ?? null;
    },
    setItem: (k: string, v: string) => {
      if (neispravan) throw new Error("blokirano");
      podaci.set(k, v);
    },
  });
  return podaci;
}

describe("privola za kolačiće", () => {
  beforeEach(() => {
    vi.unstubAllGlobals();
    vi.stubGlobal("window", { dispatchEvent: vi.fn() });
  });

  it("dok posjetitelj nije odlučio, privole nema (mjerenje se ne smije uključiti)", () => {
    postaviSpremnik();
    expect(procitajPrivolu()).toBeNull();
  });

  it("čita spremljenu odluku", () => {
    postaviSpremnik({ [PRIVOLA_KLJUC]: "prihvaceno" });
    expect(procitajPrivolu()).toBe("prihvaceno");
    postaviSpremnik({ [PRIVOLA_KLJUC]: "odbijeno" });
    expect(procitajPrivolu()).toBe("odbijeno");
  });

  it("neprepoznata vrijednost se ne tumači kao pristanak", () => {
    postaviSpremnik({ [PRIVOLA_KLJUC]: "da" });
    expect(procitajPrivolu()).toBeNull();
  });

  it("blokiran localStorage ne ruši stranicu i ne daje pristanak", () => {
    postaviSpremnik({}, true);
    expect(procitajPrivolu()).toBeNull();
    expect(() => zapisiPrivolu("prihvaceno")).not.toThrow();
  });

  it("zapis sprema odluku i javlja je stranici", () => {
    const podaci = postaviSpremnik();
    const dispatch = vi.fn();
    vi.stubGlobal("window", { dispatchEvent: dispatch });
    vi.stubGlobal("CustomEvent", class {
      type: string;
      constructor(type: string) {
        this.type = type;
      }
    });

    zapisiPrivolu("prihvaceno");

    expect(podaci.get(PRIVOLA_KLJUC)).toBe("prihvaceno");
    expect(dispatch).toHaveBeenCalledTimes(1);
    expect(dispatch.mock.calls[0][0].type).toBe(PRIVOLA_DOGADJAJ);
  });
});
