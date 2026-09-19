/**
 * Tekst poruke → HTML tijelo e-pošte.
 *
 * Predlošci su pisani kao običan tekst, pa se poveznice (potvrda s QR kodom,
 * zamolba za recenziju, poveznica na rezervaciju) moraju pretvoriti u `<a>` da
 * budu klikabilne — unutar `<pre>` ih klijenti e-pošte ne prepoznaju sami.
 */

const BOJA_POVEZNICE = "#6a3de8"; // brand-500

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Interpunkcija na kraju rečenice nije dio poveznice: "…/potvrda/KZ-1." ne
 * smije završiti s točkom u `href`. Zagrada se odbacuje samo ako u poveznici
 * nema otvorene parice (npr. Wikipedijine poveznice sa zagradama ostaju cijele).
 */
function odvojiZavrsnuInterpunkciju(url: string): [string, string] {
  let rez = url;
  let rep = "";
  while (rez.length > 0) {
    const zadnji = rez[rez.length - 1];
    if (".,;:!?".includes(zadnji) || (zadnji === ")" && !rez.includes("("))) {
      rep = zadnji + rep;
      rez = rez.slice(0, -1);
    } else break;
  }
  return [rez, rep];
}

/** Sigurno HTML tijelo poruke: escapean tekst s klikabilnim poveznicama. */
export function tijeloUHtml(tekst: string): string {
  const escapean = escapeHtml(tekst);
  const sPoveznicama = escapean
    // Web adrese.
    .replace(/https?:\/\/[^\s<]+/g, (url) => {
      const [cilj, rep] = odvojiZavrsnuInterpunkciju(url);
      return `<a href="${cilj}" style="color:${BOJA_POVEZNICE}">${cilj}</a>${rep}`;
    })
    // Adrese e-pošte (preskaču se one koje su već dio poveznice iznad).
    .replace(/(^|[\s(])([\w.+-]+@[\w-]+\.[\w.-]+)/g, (_, prije: string, adresa: string) => {
      const [cilj, rep] = odvojiZavrsnuInterpunkciju(adresa);
      return `${prije}<a href="mailto:${cilj}" style="color:${BOJA_POVEZNICE}">${cilj}</a>${rep}`;
    });

  return `<pre style="font-family:inherit;white-space:pre-wrap;margin:0">${sPoveznicama}</pre>`;
}
