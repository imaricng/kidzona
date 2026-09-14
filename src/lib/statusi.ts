/**
 * Statusi rezervacije:
 *  - upit       — poslan s weba ili unesen ručno, čeka odobrenje (NE zauzima termin)
 *  - potvrdjeno — odobrena rezervacija (zauzima termin)
 *  - placeno, checkin, zavrseno — potvrđena proslava u daljnjem tijeku
 *  - odbijeno   — upit nije prihvaćen
 *  - otkazano   — otkazana rezervacija
 */

/** Statusi koji zauzimaju igraonicu u terminu (upit i odbijeni/otkazani ne zauzimaju). */
export const STATUSI_ZAUZIMAJU_TERMIN = ["potvrdjeno", "placeno", "checkin", "zavrseno"];
