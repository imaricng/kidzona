/**
 * WhatsApp poruke roditeljima.
 *
 * Poruke se ne šalju s poslužitelja — za to bi trebao službeni WhatsApp
 * Business API (zaseban broj, verifikacija tvrtke i odobreni predlošci).
 * Umjesto toga pripremamo gotovu poruku i `wa.me` poveznicu: administrator
 * klikne, WhatsApp se otvori s upisanim tekstom i on samo pošalje. Bez troška
 * i bez rizika da broj završi blokiran.
 */
import { formatDatumDugi } from "@/lib/format";

/**
 * Broj telefona u obliku koji traži `wa.me` (samo cifre, s pozivnim brojem).
 * Domaći broj bez pozivnog dobiva hrvatski (385). Vraća `null` kad broj nema
 * dovoljno cifara da bi bio upotrebljiv.
 */
export function whatsappBroj(phone: string | null | undefined): string | null {
  if (!phone) return null;
  let d = phone.replace(/[^\d+]/g, "");
  if (d.startsWith("+")) d = d.slice(1);
  else if (d.startsWith("00")) d = d.slice(2);
  else if (d.startsWith("0")) d = `385${d.slice(1)}`;
  return d.length >= 11 ? d : null;
}

/** Poveznica koja otvara WhatsApp s pripremljenom porukom; `null` bez broja. */
export function whatsappVeza(phone: string | null | undefined, poruka: string): string | null {
  const broj = whatsappBroj(phone);
  return broj ? `https://wa.me/${broj}?text=${encodeURIComponent(poruka)}` : null;
}

export interface PodaciZaPoruku {
  parentName: string;
  childName?: string | null;
  code: string;
  date: Date | string;
  slotStart: string;
  slotEnd: string;
  roomName: string;
}

function oslovi(parentName: string): string {
  const ime = parentName.trim().split(/\s+/)[0];
  return ime ? `Pozdrav ${ime}!` : "Pozdrav!";
}

function termin(r: PodaciZaPoruku): string {
  return `${formatDatumDugi(r.date)} od ${r.slotStart} do ${r.slotEnd} (${r.roomName})`;
}

/** Odgovor na novi upit — javljamo se roditelju prvi put. */
export function porukaUpita(r: PodaciZaPoruku): string {
  return [
    oslovi(r.parentName),
    `javljamo se iz Kidzone Nova Gradiška povodom vašeg upita za proslavu.`,
    `Termin: ${termin(r)}.`,
    `Je li vam termin i dalje odgovara? Rado ćemo dogovoriti sve detalje.`,
  ].join(" ");
}

/** Potvrda rezervacije. */
export function porukaPotvrde(r: PodaciZaPoruku, poveznica: string): string {
  return [
    oslovi(r.parentName),
    `rezervacija je potvrđena 🎉`,
    `${r.childName ? `${r.childName}, ` : ""}${termin(r)}.`,
    `Sve detalje i QR kod za prijavu imate ovdje: ${poveznica}`,
  ].join(" ");
}

/** Podsjetnik dan prije proslave. */
export function porukaPodsjetnika(r: PodaciZaPoruku): string {
  return [
    oslovi(r.parentName),
    `podsjećamo da je proslava sutra — ${r.slotStart} do ${r.slotEnd}, ${r.roomName}.`,
    `Dođite 10 minuta ranije da u miru dočekamo goste. Vidimo se! 🎈`,
  ].join(" ");
}

/** Zahvala i molba za recenziju nakon proslave. */
export function porukaZahvale(r: PodaciZaPoruku, recenzijaUrl: string): string {
  return [
    oslovi(r.parentName),
    `hvala što ste slavili s nama! 💛 Nadamo se da su se djeca odlično zabavila.`,
    `Ako vam nije teško, ostavite nam recenziju — puno nam znači: ${recenzijaUrl}`,
  ].join(" ");
}

/** Poruka uz digitalnu pozivnicu. */
export function porukaPozivnice(poveznica: string, childName: string | null): string {
  const ime = childName?.trim();
  return (
    `Pozdrav! Pozivnica za rođendan${ime ? ` (${ime})` : ""} je gotova 🎉 ` +
    `Otvorite je i proslijedite gostima: ${poveznica}`
  );
}
