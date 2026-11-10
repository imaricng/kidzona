/**
 * Tekstualni predlošci automatskih poruka (na hrvatskom).
 * Drže se odvojeno od logike slanja radi lakše izmjene.
 */
import { pozdrav } from "@/lib/nepotpuno";
import { formatDatumDugi, formatEur, imeVelikimSlovom, kadaJe } from "@/lib/format";
import { hr, brojDjece } from "@/i18n/hr";
import { env } from "@/lib/env";

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
  themeName?: string | null;
  dodaci?: string[]; // npr. ["Torta ×1", "Pizza ×2"]
  pozivnicaUrl?: string | null; // samo kad je roditelj zatražio digitalne pozivnice
}

const KONTAKT = `${hr.kontakt.telefon} (i WhatsApp) ili ${hr.kontakt.email}`;

/** Iznos ili "po dogovoru" (paket s cijenom po dogovoru prije upisa dogovorenog iznosa). */
function iznos(cents: number): string {
  return cents > 0 ? formatEur(cents) : "po dogovoru";
}

export function predlozakZaprimljenogUpita(r: RezervacijaPodaci): { naslov: string; tijelo: string } {
  return {
    naslov: `Zaprimili smo vaš upit ${r.code} — ${hr.brand.naziv}`,
    tijelo: [
      pozdrav(r.parentName),
      ``,
      `hvala na upitu! Zaprimili smo sljedeće podatke:`,
      ``,
      `Broj upita: ${r.code}`,
      r.childName ? `Slavljenik: ${imeVelikimSlovom(r.childName)}` : null,
      `Datum: ${formatDatumDugi(r.date)}`,
      `Termin: ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName} (${brojDjece(r.numChildren)})`,
      `Okvirna cijena: ${iznos(r.totalCents)}`,
      ``,
      `Ovo još nije potvrđena rezervacija. Provjerit ćemo termin i javiti vam se s potvrdom u najkraćem roku.`,
      `Za pitanja: ${KONTAKT}.`,
      ``,
      `Veselimo se! — ${hr.brand.naziv}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

export function predlozakNovogUpita(
  r: RezervacijaPodaci,
  kontakt: { email: string; phone?: string | null; notes?: string | null },
  adminUrl: string,
): { naslov: string; tijelo: string } {
  return {
    naslov: `[UPIT] Novi upit ${r.code} — ${formatDatumDugi(r.date)}, ${r.slotStart}`,
    tijelo: [
      `Stigao je novi upit za proslavu:`,
      ``,
      `Broj: ${r.code}`,
      `Datum i termin: ${formatDatumDugi(r.date)}, ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName} (${brojDjece(r.numChildren)}${r.numAdults ? ` + ${r.numAdults} odraslih` : ""})`,
      r.childName ? `Slavljenik: ${imeVelikimSlovom(r.childName)}` : null,
      `Roditelj: ${imeVelikimSlovom(r.parentName)}`,
      `E-pošta: ${kontakt.email || "—"}`,
      `Telefon: ${kontakt.phone || "—"}`,
      kontakt.notes ? `Napomene: ${kontakt.notes}` : null,
      `Okvirna cijena: ${iznos(r.totalCents)}`,
      ``,
      `Odobrite, uredite ili odbijte upit: ${adminUrl}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

export function predlozakOdbijenogUpita(r: RezervacijaPodaci, razlog?: string): { naslov: string; tijelo: string } {
  return {
    naslov: `Vaš upit ${r.code} — ${hr.brand.naziv}`,
    tijelo: [
      pozdrav(r.parentName),
      ``,
      `hvala na upitu za proslavu (${formatDatumDugi(r.date)}, ${r.slotStart}).`,
      `Nažalost, upit u ovom obliku ne možemo prihvatiti.`,
      razlog ? `Razlog: ${razlog}` : null,
      ``,
      `Rado ćemo pronaći drugi termin — javite nam se na ${KONTAKT}.`,
      ``,
      `Srdačan pozdrav, ${hr.brand.naziv}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

export function predlozakPotvrde(r: RezervacijaPodaci): { naslov: string; tijelo: string } {
  return {
    naslov: `Potvrda rezervacije ${r.code} — ${hr.brand.naziv}`,
    tijelo: [
      pozdrav(r.parentName),
      ``,
      `vaša je rezervacija potvrđena! 🎉`,
      ``,
      `Kod rezervacije: ${r.code}`,
      r.childName ? `Slavljenik: ${imeVelikimSlovom(r.childName)}` : null,
      `Datum: ${formatDatumDugi(r.date)}`,
      `Termin: ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName} (${brojDjece(r.numChildren)})`,
      r.numAdults ? `Odrasli gosti: ${r.numAdults}` : null,
      r.themeName ? `Tema: ${r.themeName}` : null,
      r.dodaci?.length ? `Dodaci: ${r.dodaci.join(", ")}` : null,
      ``,
      `Ukupno: ${iznos(r.totalCents)}`,
      (r.paidCents ?? 0) > 0 ? `Plaćeno: ${formatEur(r.paidCents ?? 0)}` : null,
      r.totalCents > (r.paidCents ?? 0) ? `Za plaćanje uživo na dan proslave: ${formatEur(r.totalCents - (r.paidCents ?? 0))}` : null,
      ``,
      r.qrUrl ? `QR kod za prijavu dolaska: ${r.qrUrl}` : `Na ulaz ponesite QR kod iz potvrde.`,
      ``,
      `Vidimo se u Kidzoni Nova Gradiška!`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
  };
}

/**
 * Podsjetnik roditelju sa svim odabranim pojedinostima proslave. `dana` je
 * broj dana do proslave (0 = danas, 1 = sutra) — tekst se ravna prema njemu,
 * pa je isti predložak ispravan i tjedan dana prije i dan prije.
 */
export function predlozakPodsjetnika(r: RezervacijaPodaci, dana: number): { naslov: string; tijelo: string } {
  const kada = kadaJe(dana);
  const blizu = dana <= 1;
  const placeno = r.paidCents ?? 0;
  return {
    naslov: `Podsjetnik: proslava je ${kada} — ${formatDatumDugi(r.date)} (${r.code})`,
    tijelo: [
      pozdrav(r.parentName),
      ``,
      `podsjećamo vas da je vaša proslava ${blizu ? kada.toUpperCase() : kada}! Evo svih pojedinosti:`,
      ``,
      `Kod rezervacije: ${r.code}`,
      r.childName ? `Slavljenik: ${imeVelikimSlovom(r.childName)}` : null,
      `Datum: ${formatDatumDugi(r.date)}`,
      `Termin: ${r.slotStart} – ${r.slotEnd}`,
      `Igraonica: ${r.roomName}`,
      `Paket: ${r.packageName} (${brojDjece(r.numChildren)})`,
      r.numAdults ? `Odrasli gosti: ${r.numAdults}` : null,
      r.themeName ? `Tema: ${r.themeName}` : null,
      r.dodaci?.length ? `Dodaci: ${r.dodaci.join(", ")}` : null,
      ``,
      `Ukupno: ${iznos(r.totalCents)}`,
      placeno > 0 ? `Plaćeno: ${formatEur(placeno)}` : null,
      r.totalCents > 0 && r.totalCents > placeno ? `Za plaćanje uživo na dan proslave: ${formatEur(r.totalCents - placeno)}` : null,
      ``,
      r.pozivnicaUrl ? `Digitalna pozivnica za goste: ${r.pozivnicaUrl}` : null,
      r.qrUrl ? `QR kod za prijavu dolaska: ${r.qrUrl}` : null,
      r.pozivnicaUrl || r.qrUrl ? `` : null,
      blizu
        ? `Dođite 10-ak minuta ranije i ponesite QR kod za brzu prijavu dolaska.`
        : `Ako se nešto promijenilo (broj djece, dodaci, tema), javite nam se na vrijeme.`,
      `Za pitanja: ${KONTAKT}.`,
      ``,
      `Veselimo se! 🎈 — ${hr.brand.naziv}`,
    ]
      .filter((l) => l !== null)
      .join("\n"),
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
      pozdrav(r.parentName),
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
): { naslov: string; tijelo: string; html: string } {
  const dijete = imeVelikimSlovom(childName);
  const roditelj = imeVelikimSlovom(parentName.trim().split(/\s+/)[0] ?? "");
  const pozdravRed = roditelj ? `Pozdrav, ${roditelj}! 👋` : `Pozdrav! 👋`;
  const rezervacijaUrl = `${env.appUrl}/rezervacija`;
  const recenice = {
    uvod: `kako vrijeme brzo leti! 🥳 Za nekoliko tjedana ${dijete} slavi svoj ${novaDob}. rođendan, a mi bismo ga jako voljeli ponovno ugostiti u Party Kidzoni.`,
    sve: `Animatori, igre, torta, smijeh i gomila prijatelja: vi samo dovedite slavljenika, a za sve ostalo se brinemo mi. 💜`,
    termini: `Najtraženiji vikend-termini brzo se popune, zato vam predlažemo da termin rezervirate na vrijeme.`,
  };
  const e = escapeHtml;
  return {
    naslov: `${dijete} uskoro puni ${novaDob}! 🎂 Proslavimo zajedno?`,
    tijelo: [
      pozdravRed,
      ``,
      recenice.uvod,
      ``,
      recenice.sve,
      ``,
      recenice.termini,
      ``,
      `Rezervirajte termin: ${rezervacijaUrl}`,
      `ili nas nazovite / pišite na WhatsApp: ${hr.kontakt.telefon}`,
      ``,
      `Veselimo se novoj proslavi! 🎊 — Party Kidzona`,
    ].join("\n"),
    // Tablice i atributi bgcolor/font: tako izgled drže i stroži klijenti e-pošte.
    html: `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f0ff"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="560" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:560px;border-radius:20px;font-family:Arial,Helvetica,sans-serif;color:#2b2340">
<tr><td bgcolor="#ffe3f1" align="center" style="padding:26px 24px 20px;border-radius:20px 20px 0 0">
<img src="${e(env.appUrl)}/brand/logo.png" alt="Party Kidzona" width="220" style="display:block;margin:0 auto 12px;max-width:70%;height:auto">
<div style="font-size:40px;line-height:1">🎈🎂🎈</div>
<h1 style="margin:12px 0 0;font-size:26px;color:#6a3de8">${e(dijete)} uskoro puni ${novaDob}!</h1>
</td></tr>
<tr><td style="padding:24px 30px 6px;font-size:16px;line-height:1.6">
<p style="margin:0 0 14px">${e(pozdravRed)}</p>
<p style="margin:0 0 14px">kako vrijeme brzo leti! 🥳 Za nekoliko tjedana <b>${e(dijete)}</b> slavi svoj <b>${novaDob}. rođendan</b>, a mi bismo ga jako voljeli ponovno ugostiti u <b>Party Kidzoni</b>.</p>
<p style="margin:0 0 14px">${recenice.sve}</p>
<p style="margin:0 0 6px">${recenice.termini}</p>
</td></tr>
<tr><td align="center" style="padding:16px 30px 24px">
<table role="presentation" cellpadding="0" cellspacing="0"><tr><td bgcolor="#ec3f8c" align="center" style="padding:14px 34px;border-radius:30px">
<a href="${e(rezervacijaUrl)}" style="color:#ffffff;text-decoration:none;font-weight:bold;font-size:17px">🎉 Rezerviraj termin</a>
</td></tr></table>
<p style="margin:12px 0 0;font-size:13px;color:#7a7194">ili nas nazovite / pišite na WhatsApp: <b>${e(hr.kontakt.telefon)}</b></p>
</td></tr>
<tr><td bgcolor="#6a3de8" align="center" style="padding:16px;font-size:14px;color:#ffffff;border-radius:0 0 20px 20px">Veselimo se novoj proslavi! 🎊<br>Party Kidzona · Strossmayerova 3, Nova Gradiška</td></tr>
</table>
<p style="margin:10px 0 0;font-size:11px;color:#9a93b0">Ovu poruku primate jer ste pristali na obavijesti Party Kidzone. Odjava: ${e(hr.kontakt.email)}</p>
</td></tr></table>`,
  };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

/**
 * Digitalna pozivnica roditelju. Šalje se samo kad administrator potvrdi
 * rezervaciju: pozivnica nosi datum i termin koji tada više ne mijenjamo.
 */
export function predlozakPozivnice(
  r: RezervacijaPodaci,
  poveznica: string,
  tekstPoziva: string,
): { naslov: string; tijelo: string } {
  return {
    naslov: `Pozivnica za rođendan ${r.childName ? `— ${imeVelikimSlovom(r.childName)} ` : ""}je gotova! 🎉`,
    tijelo: [
      pozdrav(r.parentName),
      ``,
      `pozivnica za proslavu je spremna. Otvorite je i pošaljite gostima:`,
      poveznica,
      ``,
      `Na pozivnici stoji:`,
      `„${tekstPoziva}”`,
      ``,
      `Poveznicu možete slobodno poslati WhatsAppom, e-poštom ili je ispisati.`,
      `Ako želite promjenu teksta ili teme, javite nam se na ${KONTAKT}.`,
      ``,
      `Vidimo se ${formatDatumDugi(r.date)} u ${r.slotStart}! — ${hr.brand.naziv}`,
    ].join("\n"),
  };
}
