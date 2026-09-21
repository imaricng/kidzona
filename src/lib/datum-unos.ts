/**
 * Unos datuma i vremena u hrvatskom obliku (DD.MM.GGGG., 24-satno vrijeme).
 *
 * Polja `type="date"` i `type="time"` preglednik iscrtava prema jeziku
 * *preglednika*, ne stranice — Chrome na engleskom pokaže „11/01/2026" i
 * „05:00 PM" bez obzira na `lang="hr"`. Zato unosimo tekst i sami ga
 * raščlanjujemo; vrijednost koja ide dalje uvijek je ISO („GGGG-MM-DD", „HH:mm").
 */

/** "2026-11-01" → "01.11.2026."; prazno ili neispravno → "". */
export function isoUHr(iso: string | null | undefined): string {
  const m = /^(\d{4})-(\d{2})-(\d{2})$/.exec(iso ?? "");
  return m ? `${m[3]}.${m[2]}.${m[1]}.` : "";
}

/**
 * Datum kako ga ljudi upisuju → ISO. Prihvaća „1.11.2026", „01.11.2026.",
 * „1. 11. 2026.", „1/11/2026" i „1-11-2026". Godina mora imati četiri
 * znamenke — „1.11.26" je dvosmisleno. Nepostojeći datum (31.02.) → null.
 */
export function hrUIso(tekst: string): string | null {
  const dijelovi = tekst.trim().replace(/\.$/, "").split(/[.\/\-\s]+/).filter(Boolean);
  if (dijelovi.length !== 3) return null;
  const [d, m, g] = dijelovi;
  if (!/^\d{1,2}$/.test(d) || !/^\d{1,2}$/.test(m) || !/^\d{4}$/.test(g)) return null;
  const dan = Number(d);
  const mjesec = Number(m);
  const godina = Number(g);
  const provjera = new Date(Date.UTC(godina, mjesec - 1, dan));
  if (provjera.getUTCFullYear() !== godina || provjera.getUTCMonth() !== mjesec - 1 || provjera.getUTCDate() !== dan) {
    return null;
  }
  return `${g}-${String(mjesec).padStart(2, "0")}-${String(dan).padStart(2, "0")}`;
}

/**
 * Vrijeme → „HH:mm" u 24-satnom obliku. Prihvaća „17", „17:30", „17.30",
 * „17,30", „1730" i „9:05". Izvan 00:00–23:59 → null.
 */
export function normalizirajVrijeme(tekst: string): string | null {
  const t = tekst.trim();
  let sat: number;
  let minuta: number;
  const odvojeno = /^(\d{1,2})[:.,](\d{2})$/.exec(t);
  const spojeno = /^(\d{3,4})$/.exec(t);
  if (odvojeno) {
    sat = Number(odvojeno[1]);
    minuta = Number(odvojeno[2]);
  } else if (spojeno) {
    sat = Number(t.slice(0, -2));
    minuta = Number(t.slice(-2));
  } else if (/^\d{1,2}$/.test(t)) {
    sat = Number(t);
    minuta = 0;
  } else {
    return null;
  }
  if (sat > 23 || minuta > 59) return null;
  return `${String(sat).padStart(2, "0")}:${String(minuta).padStart(2, "0")}`;
}
