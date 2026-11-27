/**
 * Tjedni e-mail izvještaj „Rođendani ovaj tjedan“ za administraciju.
 * Šalje se svakog ponedjeljka u 08:00 po hrvatskom vremenu (`Europe/Zagreb`)
 * na `env.staffEmail` (`kidzonang@gmail.com`).
 *
 * Vercel Cron radi u UTC-u, pa se ruta okida u 06:00 UTC (ljeti = 08:00 CEST)
 * i 07:00 UTC (zimi = 08:00 CET). Guard po satu (`satUZoni < 8`) i provjera u
 * `NotificationLog` jamče da se izvještaj pošalje točno jednom svakog ponedjeljka.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { brojDjece } from "@/i18n/hr";
import { datumUZoni, formatDatum, formatDatumDugi, formatEur, imeVelikimSlovom, satUZoni } from "@/lib/format";
import { pomakniDatum } from "@/lib/dostupnost";
import { imeProslave } from "@/lib/nepotpuno";
import { godineNaProslavi } from "@/lib/pozivnica";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";

const SAT_SLANJA = 8;

export interface RasponTjedna {
  odISO: string; // ponedjeljak "YYYY-MM-DD"
  doISO: string; // nedjelja "YYYY-MM-DD"
}

export interface StavkaTjednogIzvjestaja {
  code: string;
  date: Date;
  slotStart: string;
  slotEnd: string;
  slavljenik: string;
  roditelj: string;
  telefon: string | null;
  dob: number | null;
  tema: string | null;
  soba: string;
  sobaBoja: string;
  paket: string;
  cijenaCents: number;
  napomene: string | null;
  adminUrl: string;
}

export interface RezultatTjednogIzvjestaja {
  poslano: boolean;
  razlog?: "prerano" | "vec-poslano";
  brojProslava: number;
  primatelj: string;
  raspon: RasponTjedna;
}

/** Računa ponedjeljak i nedjelju tjedna kojem pripada zadani datum (u zoni Europe/Zagreb). */
export function rasponTjedna(sada: Date = new Date()): RasponTjedna {
  const danasISO = datumUZoni(sada);
  const [y, m, d] = danasISO.split("-").map(Number);
  // getUTCDay(): 0 = nedjelja, 1 = ponedjeljak … 6 = subota → ponedjeljak = 0 … nedjelja = 6
  const danOdPonedjeljka = (new Date(Date.UTC(y, m - 1, d)).getUTCDay() + 6) % 7;
  const odISO = pomakniDatum(danasISO, -danOdPonedjeljka);
  const doISO = pomakniDatum(odISO, 6);
  return { odISO, doISO };
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

function formatCijena(cents: number): string {
  return cents > 0 ? formatEur(cents) : "Po dogovoru";
}

function formatDob(dob: number | null): string {
  if (!dob) return "—";
  return `${dob}. rođendan`;
}

/** Sastavlja tekstualnu i HTML verziju e-mail izvještaja „Rođendani ovaj tjedan“. */
export function predlozakTjednogIzvjestaja(
  stavke: StavkaTjednogIzvjestaja[],
  raspon: RasponTjedna,
): { naslov: string; tijelo: string; html: string } {
  const odTekst = formatDatum(`${raspon.odISO}T12:00:00Z`);
  const doTekst = formatDatum(`${raspon.doISO}T12:00:00Z`);
  const ukupnoCents = stavke.reduce((sum, s) => sum + Math.max(0, s.cijenaCents), 0);
  const naslov = "Rođendani ovaj tjedan";

  // --- Običan tekst (za klijente bez HTML-a i dnevnik poruka) ---
  const redoviTeksta: string[] = [
    `ROĐENDANI OVAJ TJEDAN (${odTekst} – ${doTekst})`,
    `Ukupno proslava: ${stavke.length}${ukupnoCents > 0 ? ` · Ukupno: ${formatEur(ukupnoCents)}` : ""}`,
    ``,
  ];

  if (stavke.length === 0) {
    redoviTeksta.push("Ovaj tjedan nema potvrđenih rođendana.");
  } else {
    stavke.forEach((s, i) => {
      redoviTeksta.push(
        `${i + 1}. ${formatDatumDugi(s.date)}, ${s.slotStart} – ${s.slotEnd} (${s.soba})`,
        `   Slavljenik: ${s.slavljenik}`,
        `   Dob: ${formatDob(s.dob)}`,
        `   Roditelj: ${s.roditelj}${s.telefon ? ` (${s.telefon})` : ""}`,
        `   Soba: ${s.soba}`,
        `   Paket: ${s.paket}`,
        `   Tema: ${s.tema ?? "Bez teme"}`,
        `   Cijena: ${formatCijena(s.cijenaCents)}`,
        `   Napomene: ${s.napomene?.trim() || "—"}`,
        `   Detalji: ${s.adminUrl}`,
        ``,
      );
    });
  }

  // --- HTML verzija (tablični raspored za Gmail i mobilne klijente) ---
  const e = escapeHtml;
  const red = (oznaka: string, vrijednost: string) =>
    `<tr><td style="padding:5px 0;color:#7a7194;font-size:13px;width:120px;vertical-align:top">${e(oznaka)}</td>` +
    `<td style="padding:5px 0;color:#2b2340;font-size:14px;font-weight:600;vertical-align:top">${vrijednost}</td></tr>`;

  const karticeHtml =
    stavke.length === 0
      ? `<p style="margin:8px 0 0;font-size:15px;color:#5d5575">Ovaj tjedan nema potvrđenih rođendana.</p>`
      : stavke
          .map((s) => {
            const napomeneHtml = s.napomene?.trim()
              ? e(s.napomene.trim()).replace(/\n/g, "<br>")
              : `<span style="color:#9a93b0;font-weight:400">—</span>`;
            const roditeljTekst = s.telefon ? `${e(s.roditelj)} <span style="color:#7a7194;font-weight:400">(${e(s.telefon)})</span>` : e(s.roditelj);

            return `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="margin:0 0 16px;border:1px solid #ece7fb;border-radius:14px;overflow:hidden;background:#ffffff">
<tr><td style="padding:12px 16px;background:#f7f4ff;border-bottom:1px solid #ece7fb">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0"><tr>
    <td style="font-size:15px;font-weight:700;color:#2b2340">${e(formatDatumDugi(s.date))} &middot; ${e(s.slotStart)} &ndash; ${e(s.slotEnd)}</td>
    <td align="right"><span style="display:inline-block;padding:4px 10px;border-radius:999px;font-size:12px;font-weight:700;color:#ffffff;background:${e(s.sobaBoja)}">${e(s.soba)}</span></td>
  </tr></table>
</td></tr>
<tr><td style="padding:12px 16px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0">
    ${red("Slavljenik", e(s.slavljenik))}
    ${red("Dob", e(formatDob(s.dob)))}
    ${red("Roditelj", roditeljTekst)}
    ${red("Soba", e(s.soba))}
    ${red("Paket", e(s.paket))}
    ${red("Tema", s.tema ? e(s.tema) : `<span style="color:#9a93b0;font-weight:400">Bez teme</span>`)}
    ${red("Cijena", e(formatCijena(s.cijenaCents)))}
    ${red("Napomene", napomeneHtml)}
  </table>
  <p style="margin:10px 0 0;font-size:12px"><a href="${e(s.adminUrl)}" style="color:#6a3de8;text-decoration:none;font-weight:600">Otvori rezervaciju ${e(s.code)} &rarr;</a></p>
</td></tr>
</table>`;
          })
          .join("");

  const html = `<table role="presentation" width="100%" cellpadding="0" cellspacing="0" bgcolor="#f4f0ff"><tr><td align="center" style="padding:24px 12px">
<table role="presentation" width="620" cellpadding="0" cellspacing="0" bgcolor="#ffffff" style="max-width:620px;border-radius:20px;font-family:Arial,Helvetica,sans-serif;color:#2b2340">
<tr><td bgcolor="#6a3de8" style="padding:24px 28px;border-radius:20px 20px 0 0;color:#ffffff">
  <p style="margin:0;font-size:12px;letter-spacing:0.6px;text-transform:uppercase;opacity:0.85">Party Kidzona Nova Gradiška</p>
  <h1 style="margin:6px 0 0;font-size:24px;line-height:1.25">🎂 Rođendani ovaj tjedan</h1>
  <p style="margin:6px 0 0;font-size:14px;opacity:0.92">${e(odTekst)} &ndash; ${e(doTekst)}</p>
</td></tr>
<tr><td style="padding:18px 28px 6px">
  <table role="presentation" width="100%" cellpadding="0" cellspacing="0" style="background:#fdf2f8;border-radius:12px;margin-bottom:18px"><tr>
    <td style="padding:12px 16px;font-size:14px;color:#2b2340">Ukupno proslava: <b>${stavke.length}</b></td>
    <td align="right" style="padding:12px 16px;font-size:14px;color:#2b2340">${ukupnoCents > 0 ? `Ukupna cijena: <b>${e(formatEur(ukupnoCents))}</b>` : ""}</td>
  </tr></table>
  ${karticeHtml}
</td></tr>
<tr><td bgcolor="#f7f4ff" align="center" style="padding:14px 24px;font-size:12px;color:#7a7194;border-radius:0 0 20px 20px">
  Automatski tjedni izvještaj &middot; <a href="${e(env.appUrl)}/admin/kalendar" style="color:#6a3de8;text-decoration:none;font-weight:600">Otvori kalendar</a>
</td></tr>
</table>
</td></tr></table>`;

  return { naslov, tijelo: redoviTeksta.join("\n").trim(), html };
}

/**
 * Dohvaća potvrđene rođendane za tekući tjedan (pon–ned) i šalje e-mail
 * izvještaj na `env.staffEmail` (`kidzonang@gmail.com`).
 */
export async function posaljiTjedniIzvjestaj(
  sada: Date = new Date(),
  opcije: { forsiraj?: boolean } = {},
): Promise<RezultatTjednogIzvjestaja> {
  const primatelj = env.staffEmail;
  const raspon = rasponTjedna(sada);

  if (!opcije.forsiraj) {
    if (satUZoni(sada) < SAT_SLANJA) {
      return { poslano: false, razlog: "prerano", brojProslava: 0, primatelj, raspon };
    }
    const pocetakDanas = new Date(`${datumUZoni(sada)}T00:00:00Z`);
    // Sigurnosni pomak -2h zbog CET/CEST da pokrije početak dana u Hrvatskoj.
    pocetakDanas.setUTCHours(pocetakDanas.getUTCHours() - 2);
    const vecPoslano = await prisma.notificationLog.count({
      where: {
        type: "tjedni-izvjestaj",
        status: { not: "greska" },
        createdAt: { gte: pocetakDanas },
      },
    });
    if (vecPoslano > 0) {
      return { poslano: false, razlog: "vec-poslano", brojProslava: 0, primatelj, raspon };
    }
  }

  // Upit s ±1 dan rezerve zbog vremenske zone, zatim točno filtriranje po `datumUZoni`.
  const odDb = new Date(`${pomakniDatum(raspon.odISO, -1)}T00:00:00Z`);
  const doDb = new Date(`${pomakniDatum(raspon.doISO, 2)}T00:00:00Z`);

  const rezervacije = await prisma.reservation.findMany({
    where: {
      date: { gte: odDb, lt: doDb },
      status: { in: STATUSI_ZAUZIMAJU_TERMIN },
    },
    include: { room: true, secondRoom: true, package: true, theme: true },
    orderBy: [{ date: "asc" }, { slotStart: "asc" }, { room: { sortOrder: "asc" } }],
  });

  const uTjednu = rezervacije.filter((r) => {
    const iso = datumUZoni(r.date);
    return iso >= raspon.odISO && iso <= raspon.doISO;
  });

  const stavke: StavkaTjednogIzvjestaja[] = uTjednu.map((r) => {
    const imeDjeteta = r.childName
      ? [imeVelikimSlovom(r.childName), r.childLastName ? imeVelikimSlovom(r.childLastName) : null].filter(Boolean).join(" ")
      : imeProslave(r);

    return {
      code: r.code,
      date: r.date,
      slotStart: r.slotStart,
      slotEnd: r.slotEnd,
      slavljenik: imeDjeteta,
      roditelj: r.parentName ? imeVelikimSlovom(r.parentName) : "—",
      telefon: r.phone ?? null,
      dob: godineNaProslavi(r),
      tema: r.theme ? `${r.theme.emoji} ${r.theme.name}` : null,
      soba: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name,
      sobaBoja: r.room.color || "#6a3de8",
      paket: `${r.package.name} (${brojDjece(r.numChildren)})`,
      cijenaCents: r.totalCents,
      napomene: r.notes,
      adminUrl: `${env.appUrl}/admin/rezervacije/${r.code}`,
    };
  });

  const poruka = predlozakTjednogIzvjestaja(stavke, raspon);
  await posaljiIZabiljezi({
    tip: opcije.forsiraj ? "tjedni-izvjestaj-test" : "tjedni-izvjestaj",
    kanal: "email",
    primatelj,
    naslov: poruka.naslov,
    tijelo: poruka.tijelo,
    html: poruka.html,
  });

  return { poslano: true, brojProslava: stavke.length, primatelj, raspon };
}
