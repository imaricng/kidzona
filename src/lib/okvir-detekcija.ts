/**
 * Pronalazak bijelog polja za tekst na predlošku pozivnice.
 *
 * Predlošci su crteži s praznim svijetlim okvirom u koji ide tekst. Umjesto da
 * administrator pogađa postotke, okvir se izmjeri iz same slike: traži se
 * najveći pravokutnik svijetlih piksela. Rezultat je polazna vrijednost koju se
 * u administraciji još može dotjerati klizačima.
 */

export interface Okvir {
  top: number;
  lijevo: number;
  sirina: number;
  visina: number;
}

/** Zadani okvir kad se ništa upotrebljivo ne pronađe. */
export const ZADANI_OKVIR: Okvir = { top: 34, lijevo: 10, sirina: 80, visina: 32 };

/** Piksel se broji kao svijetao (bijelo polje je gotovo bijelo). */
function svijetao(d: Uint8ClampedArray | Uint8Array, i: number): boolean {
  return d[i] > 228 && d[i + 1] > 228 && d[i + 2] > 228;
}

/**
 * Maska svijetlih piksela, očišćena od točkastih rubova i šuma: piksel ostaje
 * svijetao samo ako je takva i većina njegovih susjeda.
 */
function maska(podaci: Uint8ClampedArray | Uint8Array, sirina: number, visina: number, kanali: number): Uint8Array {
  const sirovo = new Uint8Array(sirina * visina);
  for (let y = 0; y < visina; y++) {
    for (let x = 0; x < sirina; x++) {
      sirovo[y * sirina + x] = svijetao(podaci, (y * sirina + x) * kanali) ? 1 : 0;
    }
  }
  const glatko = new Uint8Array(sirina * visina);
  for (let y = 0; y < visina; y++) {
    for (let x = 0; x < sirina; x++) {
      let zbroj = 0;
      let ukupno = 0;
      for (let dy = -1; dy <= 1; dy++) {
        for (let dx = -1; dx <= 1; dx++) {
          const ny = y + dy;
          const nx = x + dx;
          if (ny < 0 || nx < 0 || ny >= visina || nx >= sirina) continue;
          ukupno++;
          zbroj += sirovo[ny * sirina + nx];
        }
      }
      glatko[y * sirina + x] = zbroj * 2 >= ukupno ? 1 : 0;
    }
  }
  return glatko;
}

/** Najveći pravokutnik jedinica u maski (klasični pristup s histogramom). */
function najveciPravokutnik(m: Uint8Array, sirina: number, visina: number) {
  const stupci = new Int32Array(sirina);
  let naj = { povrsina: 0, x: 0, y: 0, w: 0, h: 0 };
  for (let y = 0; y < visina; y++) {
    for (let x = 0; x < sirina; x++) stupci[x] = m[y * sirina + x] ? stupci[x] + 1 : 0;
    const stog: { x: number; v: number }[] = [];
    for (let x = 0; x <= sirina; x++) {
      const v = x === sirina ? 0 : stupci[x];
      let pocetak = x;
      while (stog.length > 0 && stog[stog.length - 1].v >= v) {
        const t = stog.pop() as { x: number; v: number };
        const povrsina = t.v * (x - t.x);
        if (povrsina > naj.povrsina) naj = { povrsina, x: t.x, y: y - t.v + 1, w: x - t.x, h: t.v };
        pocetak = t.x;
      }
      stog.push({ x: pocetak, v });
    }
  }
  return naj;
}

/**
 * Okvir za tekst iz sirovih piksela slike (RGB ili RGBA). Vraća `null` kad
 * nađeni pravokutnik nije upotrebljiv (premalen ili preuzak za tri retka).
 */
export function nadjiOkvir(
  podaci: Uint8ClampedArray | Uint8Array,
  sirina: number,
  visina: number,
  kanali = 4,
): Okvir | null {
  if (sirina < 8 || visina < 8) return null;
  const naj = najveciPravokutnik(maska(podaci, sirina, visina, kanali), sirina, visina);
  const udioSirine = naj.w / sirina;
  const udioVisine = naj.h / visina;
  // Polje mora biti dovoljno veliko da u njega stanu tri retka teksta.
  if (udioSirine < 0.25 || udioVisine < 0.08 || udioSirine * udioVisine < 0.04) return null;

  const zaokruzi = (v: number) => Math.round(v * 10) / 10;
  return {
    top: zaokruzi((naj.y / visina) * 100),
    lijevo: zaokruzi((naj.x / sirina) * 100),
    sirina: zaokruzi(udioSirine * 100),
    visina: zaokruzi(udioVisine * 100),
  };
}
