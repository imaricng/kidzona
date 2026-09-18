import { describe, it, expect } from "vitest";
import { slugify, jedinstvenSlug } from "../src/lib/slug";

describe("slugify", () => {
  it("pretvara naziv u slug i zamjenjuje hrvatske znakove", () => {
    expect(slugify("Glow Spa Party")).toBe("glow-spa-party");
    expect(slugify("Čarobnjaci i zmajevi")).toBe("carobnjaci-i-zmajevi");
    expect(slugify("Šećerna vata / žele bomboni")).toBe("secerna-vata-zele-bomboni");
  });

  it("naziv bez upotrebljivih znakova daje zamjenski slug", () => {
    expect(slugify("🎉🎈")).toBe("stavka");
    expect(slugify("   ")).toBe("stavka");
  });
});

describe("jedinstvenSlug", () => {
  it("slobodan slug ostaje nepromijenjen", () => {
    expect(jedinstvenSlug("Roblox", ["dinosauri", "svemir"])).toBe("roblox");
  });

  it("zauzet slug dobiva najmanji slobodan nastavak", () => {
    expect(jedinstvenSlug("Roblox", ["roblox"])).toBe("roblox-2");
    expect(jedinstvenSlug("Roblox", ["roblox", "roblox-2", "roblox-3"])).toBe("roblox-4");
  });

  it("preskače zauzete nastavke i kad među njima ima rupa", () => {
    expect(jedinstvenSlug("Roblox", ["roblox", "roblox-3"])).toBe("roblox-2");
  });

  it("i zamjenski slug se broji ako je zauzet", () => {
    expect(jedinstvenSlug("🎉", ["stavka"])).toBe("stavka-2");
  });
});
