/**
 * Privola za kolačiće (GDPR). Odluka posjetitelja živi u `localStorage`, a
 * promjena se javlja i komponentama koje su već na stranici — tako se mjerenje
 * uključi odmah nakon klika na „Prihvati sve", bez osvježavanja stranice.
 */

export const PRIVOLA_KLJUC = "kz_cookie_consent";
export const PRIVOLA_DOGADJAJ = "kz-privola";

export type Privola = "prihvaceno" | "odbijeno" | null;

/** Odluka posjetitelja; `null` dok se nije odlučio (ili ako je spremnik nedostupan). */
export function procitajPrivolu(): Privola {
  try {
    const v = localStorage.getItem(PRIVOLA_KLJUC);
    return v === "prihvaceno" || v === "odbijeno" ? v : null;
  } catch {
    return null; // privatni prozor ili blokirani kolačići
  }
}

/** Sprema odluku i obavještava ostatak stranice. */
export function zapisiPrivolu(vrijednost: Exclude<Privola, null>): void {
  try {
    localStorage.setItem(PRIVOLA_KLJUC, vrijednost);
  } catch {
    /* bez spremnika odluka vrijedi samo za ovaj prikaz */
  }
  window.dispatchEvent(new CustomEvent(PRIVOLA_DOGADJAJ));
}
