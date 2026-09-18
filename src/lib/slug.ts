/**
 * Slugovi za zapise koje osoblje dodaje u administraciji (teme, dodaci,
 * igraonice, paketi). Slug je u bazi jedinstven, pa se pri dodavanju mora
 * provjeriti je li zauzet — inače unos pukne na ograničenju baze.
 */

/** "Glow Spa Party" → "glow-spa-party"; hrvatski znakovi prelaze u osnovne. */
export function slugify(s: string): string {
  return (
    s
      .toLowerCase()
      .normalize("NFD")
      .replace(/[̀-ͯ]/g, "")
      .replace(/[čć]/g, "c")
      .replace(/đ/g, "d")
      .replace(/š/g, "s")
      .replace(/ž/g, "z")
      .replace(/[^a-z0-9]+/g, "-")
      .replace(/^-+|-+$/g, "") || "stavka"
  );
}

/**
 * Slug iz naziva koji ne sudara postojeće: zauzet dobiva najmanji slobodan
 * brojčani nastavak ("roblox" → "roblox-2"), pa slugovi ostaju čitljivi.
 */
export function jedinstvenSlug(naziv: string, zauzeti: readonly string[]): string {
  const osnova = slugify(naziv);
  if (!zauzeti.includes(osnova)) return osnova;
  let n = 2;
  while (zauzeti.includes(`${osnova}-${n}`)) n++;
  return `${osnova}-${n}`;
}
