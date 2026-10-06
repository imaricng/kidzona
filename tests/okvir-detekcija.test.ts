import { describe, expect, it } from "vitest";
import { nadjiOkvir, ZADANI_OKVIR } from "@/lib/okvir-detekcija";

/** Crna slika sa svijetlim pravokutnikom na zadanom mjestu (RGBA). */
function slika(sirina: number, visina: number, polje: { x: number; y: number; w: number; h: number }) {
  const d = new Uint8ClampedArray(sirina * visina * 4);
  for (let y = 0; y < visina; y++) {
    for (let x = 0; x < sirina; x++) {
      const i = (y * sirina + x) * 4;
      const unutra = x >= polje.x && x < polje.x + polje.w && y >= polje.y && y < polje.y + polje.h;
      const v = unutra ? 255 : 20;
      d[i] = v;
      d[i + 1] = v;
      d[i + 2] = v;
      d[i + 3] = 255;
    }
  }
  return d;
}

describe("nadjiOkvir", () => {
  it("pronalazi svijetlo polje i vraca ga u postocima", () => {
    const okvir = nadjiOkvir(slika(100, 100, { x: 20, y: 30, w: 60, h: 40 }), 100, 100, 4);
    expect(okvir).not.toBeNull();
    expect(okvir!.lijevo).toBeGreaterThanOrEqual(19);
    expect(okvir!.lijevo).toBeLessThanOrEqual(23);
    expect(okvir!.top).toBeGreaterThanOrEqual(29);
    expect(okvir!.top).toBeLessThanOrEqual(33);
    expect(okvir!.sirina).toBeGreaterThan(50);
    expect(okvir!.visina).toBeGreaterThan(30);
  });

  it("ravnu sliku bez izdvojenog polja ostavlja bez okvira", () => {
    expect(nadjiOkvir(slika(100, 100, { x: 0, y: 0, w: 0, h: 0 }), 100, 100, 4)).toBeNull();
  });

  it("pronalazi i tamno polje na šarenoj podlozi", () => {
    const n = 100;
    const d = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        const uPolju = x >= 15 && x < 85 && y >= 30 && y < 70;
        // Izvan polja: jak uzorak; u polju: mirna tamna ploha.
        const v = uPolju ? 35 : (x * 7 + y * 13) % 255;
        d[i] = v; d[i + 1] = uPolju ? 30 : (v + 60) % 255; d[i + 2] = uPolju ? 60 : (v + 120) % 255; d[i + 3] = 255;
      }
    }
    const okvir = nadjiOkvir(d, n, n, 4);
    expect(okvir).not.toBeNull();
    expect(okvir!.top).toBeGreaterThanOrEqual(28);
    expect(okvir!.top).toBeLessThanOrEqual(34);
    expect(okvir!.sirina).toBeGreaterThan(55);
  });

  it("premaleno polje na šarenoj podlozi ne prolazi kao okvir", () => {
    const n = 100;
    const d = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        const uPolju = x >= 10 && x < 25 && y >= 10 && y < 16;
        d[i] = uPolju ? 255 : (x * 11 + y * 29) % 255;
        d[i + 1] = uPolju ? 255 : (x * 23 + y * 7) % 255;
        d[i + 2] = uPolju ? 255 : (x * 5 + y * 41) % 255;
        d[i + 3] = 255;
      }
    }
    expect(nadjiOkvir(d, n, n, 4)).toBeNull();
  });

  it("zadani okvir je razuman (unutar slike)", () => {
    expect(ZADANI_OKVIR.lijevo + ZADANI_OKVIR.sirina).toBeLessThanOrEqual(100);
    expect(ZADANI_OKVIR.top + ZADANI_OKVIR.visina).toBeLessThanOrEqual(100);
  });
});
