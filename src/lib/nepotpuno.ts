/**
 * Rezervacija se u administraciji može spremiti i bez podataka koje osoblje
 * još ne zna (ime slavljenika, e-pošta…), da se termin odmah zauzme. Ovdje je
 * ono što takvu rezervaciju čini upotrebljivom dok se ne dopuni: ime za
 * popise i popis onoga što treba doznati.
 */

interface OsobniPodaci {
  parentName: string;
  email: string;
  phone: string | null;
  childName: string | null;
  childBirthDate: Date | string | null;
}

/** Naziv proslave u popisima: slavljenik, pa roditelj, pa jasna oznaka. */
export function imeProslave(r: Pick<OsobniPodaci, "parentName" | "childName">): string {
  return r.childName?.trim() || r.parentName.trim() || "Ime nije upisano";
}

/** Pozdrav u e-poruci; bez imena ostaje uljudan umjesto „Poštovani/a ,". */
export function pozdrav(parentName: string): string {
  return parentName.trim() ? `Poštovani/a ${parentName.trim()},` : "Poštovani/a,";
}

/** Što još treba doznati, redom kako se pita. Prazno = rezervacija je potpuna. */
export function nedostajuciPodaci(r: OsobniPodaci): string[] {
  return [
    r.parentName.trim() ? null : "ime roditelja",
    r.email.trim() ? null : "e-pošta",
    r.phone?.trim() ? null : "telefon",
    r.childName?.trim() ? null : "ime slavljenika",
    r.childBirthDate ? null : "datum rođenja slavljenika",
  ].filter((x): x is string => x !== null);
}

/** Bez e-pošte i telefona kupca se ne može ni obavijestiti ni nazvati. */
export function bezKontakta(r: Pick<OsobniPodaci, "email" | "phone">): boolean {
  return !r.email.trim() && !r.phone?.trim();
}
