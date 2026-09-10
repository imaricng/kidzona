/**
 * Tekstualni predlošci automatskih poruka (na hrvatskom).
 * Drže se odvojeno od logike slanja radi lakše izmjene.
 */
import { formatDatumDugi, formatEur } from "@/lib/format";
import { hr, brojDjece } from "@/i18n/hr";

interface RezervacijaPodaci {
  code: string;
  parentName: string;
  childName?: string | null;
  date: Date;
  slotStart: string;
  slotEnd: string;
  roomName: string;
  packageName: string;
  numChildren: number;
  numAdults?: number;
  totalCents: number;
  depositCents: number;
  paidCents?: number;
  qrUrl?: string;
}

export function predlozakPotvrde(r: RezervacijaPodaci): { naslov: string; tijelo: string } {
  return {
    naslov: `Potvrda rezervacije ${r.code} — ${hr.brand.naziv}`,
    tijelo: [
      `Poštovani/a ${r.parentName},`,
      ``,
      `vaša je rezervacija potvrđena! 🎉`,
      ``,
      `Kod rezervacije: ${r.code}`,
      r.childName ? `Slavljenik: ${r.childName}` : null,
      `Datum: ${formatDatumDugi(r.date)}`,
      `Termin: ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName} (${brojDjece(r.numChildren)})`,
      ``,
      `Ukupno: ${formatEur(r.totalCents)}`,
      (r.paidCents ?? 0) > 0 ? `Plaćeno: ${formatEur(r.paidCents ?? 0)}` : null,
      `Za plaćanje uživo na dan proslave: ${formatEur(r.totalCents - (r.paidCents ?? 0))}`,
      ``,
      r.qrUrl ? `QR kod za prijavu dolaska: ${r.qrUrl}` : `Na ulaz ponesite QR kod iz potvrde.`,
      ``,
      `Vidimo se u Kidzoni Nova Gradiška!`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

export function predlozakPodsjetnika(r: RezervacijaPodaci): { naslov: string; tijelo: string } {
  return {
    naslov: `Podsjetnik: proslava je sutra (${r.code})`,
    tijelo: [
      `Poštovani/a ${r.parentName},`,
      ``,
      `podsjećamo vas da je vaša proslava SUTRA:`,
      `Datum: ${formatDatumDugi(r.date)}, ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      ``,
      `Ponesite QR kod za brzu prijavu dolaska. Veselimo se! 🎈`,
    ].join("\n"),
  };
}

export function predlozakOsoblje(r: RezervacijaPodaci, dodaciOpis: string): { naslov: string; tijelo: string } {
  return {
    naslov: `[OSOBLJE] Priprema proslave ${r.code}`,
    tijelo: [
      `Nova ili izmijenjena proslava za pripremu:`,
      ``,
      `Kod: ${r.code}`,
      `Datum i termin: ${formatDatumDugi(r.date)}, ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName}`,
      `Broj gostiju: ${brojDjece(r.numChildren)}${r.numAdults ? ` + ${r.numAdults} odraslih` : ""}`,
      `Dodaci / priprema hrane: ${dodaciOpis || "—"}`,
    ].join("\n"),
  };
}

export function predlozakZahvale(r: RezervacijaPodaci, recenzijaUrl: string): { naslov: string; tijelo: string } {
  return {
    naslov: `Hvala što ste slavili s nama! 💛`,
    tijelo: [
      `Poštovani/a ${r.parentName},`,
      ``,
      `hvala što ste slavili u Kidzoni Nova Gradiška! Nadamo se da su se djeca odlično zabavila.`,
      ``,
      `Ako vam nije teško, ostavite nam recenziju — mnogo nam znači:`,
      recenzijaUrl,
      ``,
      `Vidimo se ponovno! 🎉`,
    ].join("\n"),
  };
}

export function predlozakRodjendanGodina(
  parentName: string,
  childName: string,
  novaDob: number,
): { naslov: string; tijelo: string } {
  return {
    naslov: `Bliži se rođendan! 🎂 ${childName} uskoro slavi`,
    tijelo: [
      `Poštovani/a ${parentName},`,
      ``,
      `prošla je godina otkad ste slavili s nama — ${childName} uskoro puni ${novaDob}. 🎉`,
      ``,
      `Rezervirajte termin na vrijeme i osigurajte omiljenu igraonicu i temu.`,
      `Kao zahvalu za vjernost, javite nam se za poseban popust.`,
      ``,
      `Veselimo se novoj proslavi! — ${hr.brand.naziv}`,
    ].join("\n"),
  };
}
