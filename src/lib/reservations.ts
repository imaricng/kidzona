/**
 * Domenski servis za rezervacije — upiti s weba, odobravanje i odbijanje,
 * ručni unos i izmjena u administraciji, sprječavanje dvostrukih rezervacija,
 * izračun cijene, izdavanje (fiskaliziranog) računa, povezivanje s bazom
 * obitelji i automatske poruke.
 *
 * Tok: kupac šalje UPIT (ne zauzima termin) → administrator ga odobrava (termin
 * se zauzima i kupcu ide potvrda), uređuje pa odobrava ili odbija.
 */
import { IZJAVA_RODITELJA } from "@/lib/izjava";
import { pozdrav } from "@/lib/nepotpuno";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { izracunajCijenu } from "@/lib/pricing";
import { sastaviNapomene } from "@/lib/napomene";
import { jeDozvoljenPocetak, krajTermina, lokalniISO, preklapaSe, type Termin } from "@/lib/slots";
import { upisiProslavuUKalendar, ukloniProslavuIzKalendara } from "@/lib/kalendar";
import { kodRezervacije, qrToken, brojRacuna } from "@/lib/codes";
import { getPaymentService } from "@/lib/payments";
import { getFiscalizationService } from "@/lib/fiscalization";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { brojDjece } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { rasponDatuma } from "@/lib/zatvaranja";
import {
  predlozakNovogUpita,
  predlozakOdbijenogUpita,
  predlozakOsoblje,
  predlozakPotvrde,
  predlozakZaprimljenogUpita,
} from "@/lib/notifications/templates";

// --- Greške -----------------------------------------------------------
export class TerminZauzetError extends Error {
  constructor() {
    super("Igraonica je u tom terminu već zauzeta potvrđenom rezervacijom.");
    this.name = "TerminZauzetError";
  }
}

/** Podaci ne poštuju pravila paketa ili rasporeda (poruka je za korisnika). */
export class NeispravnaRezervacijaError extends Error {
  constructor(poruka: string) {
    super(poruka);
    this.name = "NeispravnaRezervacijaError";
  }
}

export type RezultatRadnje = { ok: true } | { ok: false; poruka: string };

// --- Podaci -----------------------------------------------------------
/** Podaci proslave koje unosi kupac (upit) ili administrator (ručni unos, izmjena). */
export interface PodaciRezervacije {
  dateISO: string;
  slotStart: string; // "HH:mm"
  roomId: string;
  secondRoomId?: string | null;
  packageId: string;
  themeId?: string | null;
  temaZelja?: string; // tema izvan ponude, opisana riječima
  numChildren: number;
  numAdults?: number;
  parentName: string;
  email: string; // kod ručnog unosa može biti prazno (dogovor telefonom)
  phone?: string;
  childName?: string;
  childBirthDate?: string | null; // "YYYY-MM-DD"
  napomene?: string;
  dogovorenaCijenaCents?: number | null; // samo za pakete s cijenom po dogovoru (administracija)
}

/** Iznos rezervacije; paket s cijenom po dogovoru dobiva upisani iznos (0 = još nije dogovoren). */
function cijenaRezervacije(
  paket: { cijenaPoDogovoru: boolean },
  izracun: { totalCents: number; depositCents: number },
  dogovorenaCijenaCents?: number | null,
): { totalCents: number; depositCents: number } {
  if (!paket.cijenaPoDogovoru) return { totalCents: izracun.totalCents, depositCents: izracun.depositCents };
  return { totalCents: Math.max(0, dogovorenaCijenaCents ?? 0), depositCents: 0 };
}

export interface UpitInput extends PodaciRezervacije {
  dodaci: { id: string; quantity: number }[];
  gdprConsent: boolean;
  marketingConsent: boolean;
  waiverAccepted: boolean;
  voucherCode?: string | null;
}

const UKLJUCI = { room: true, secondRoom: true, package: true, theme: true, addOns: { include: { addOn: true } } } as const;
type RezervacijaSPovezanim = Prisma.ReservationGetPayload<{ include: typeof UKLJUCI }>;

// --- Pomoćnici --------------------------------------------------------
/** Postoji li u igraonicama POTVRĐENA rezervacija koja se preklapa s terminom (osim zadane)? */
async function imaPreklapanje(datum: Date, termin: Termin, roomIds: string[], izuzmiId?: string): Promise<boolean> {
  const sljedeciDan = new Date(datum.getTime() + 24 * 60 * 60 * 1000);
  const rezervacije = await prisma.reservation.findMany({
    where: {
      ...(izuzmiId ? { id: { not: izuzmiId } } : {}),
      date: { gte: datum, lt: sljedeciDan },
      status: { in: STATUSI_ZAUZIMAJU_TERMIN },
      OR: [{ roomId: { in: roomIds } }, { secondRoomId: { in: roomIds } }],
    },
    select: { slotStart: true, slotEnd: true },
  });
  return rezervacije.some((r) => preklapaSe({ start: r.slotStart, end: r.slotEnd }, termin));
}

/** Učitava igraonicu i paket, provjerava pravila i računa termin (kraj iz trajanja paketa). */
async function provjeriPodatke(p: PodaciRezervacije, poRasporedu: boolean) {
  const [soba, paket] = await Promise.all([
    prisma.room.findUnique({ where: { id: p.roomId } }),
    prisma.package.findUnique({ where: { id: p.packageId } }),
  ]);
  if (!soba || !paket || !soba.active || !paket.active) {
    throw new NeispravnaRezervacijaError("Odabrana igraonica ili paket nisu dostupni.");
  }
  if (paket.roomId && paket.roomId !== soba.id) {
    throw new NeispravnaRezervacijaError("Odabrani paket ne vrijedi za tu igraonicu.");
  }
  if (poRasporedu && !jeDozvoljenPocetak(p.dateISO, p.slotStart)) {
    throw new NeispravnaRezervacijaError("Odabrani dan i početak nisu u rasporedu proslava.");
  }
  if (p.numChildren < paket.minChildren || p.numChildren > soba.maxChildren) {
    throw new NeispravnaRezervacijaError(`Broj djece za ${soba.name} mora biti između ${paket.minChildren} i ${soba.maxChildren}.`);
  }
  const termin: Termin = { start: p.slotStart, end: krajTermina(p.slotStart, paket.durationMin) };
  return { soba, paket, termin };
}

/** Sljedeći čitljiv kod u godini proslave (KZ-{godina}-NNNN), nastavlja se na najveći postojeći. */
async function noviKod(tx: Prisma.TransactionClient, godina: number): Promise<string> {
  const zadnja = await tx.reservation.findFirst({
    where: { code: { startsWith: `KZ-${godina}-` } },
    orderBy: { code: "desc" },
    select: { code: true },
  });
  const zadnjiBroj = zadnja ? Number(zadnja.code.split("-")[2]) || 0 : 0;
  return kodRezervacije(godina, zadnjiBroj + 1);
}

/** Baza obitelji: pronađi ili stvori obitelj po e-pošti i dodaj dijete (rođendan). */
async function poveziObitelj(
  tx: Prisma.TransactionClient,
  p: PodaciRezervacije,
  izvor: string,
  privole?: { gdpr: boolean; marketing: boolean },
): Promise<string | null> {
  if (!p.email) return null;
  const family = await tx.family.upsert({
    where: { email: p.email },
    update: {
      // Prazno ime (još nije upisano) ne briše ime koje obitelj već ima.
      parentName: p.parentName || undefined,
      phone: p.phone || undefined,
      ...(privole ? { marketingConsent: privole.marketing, gdprConsentAt: privole.gdpr ? new Date() : undefined } : {}),
    },
    create: {
      parentName: p.parentName,
      email: p.email,
      phone: p.phone || null,
      marketingConsent: privole?.marketing ?? false,
      gdprConsentAt: privole?.gdpr ? new Date() : null,
      source: izvor,
    },
  });
  if (p.childName && p.childBirthDate) {
    const postoji = await tx.child.findFirst({ where: { familyId: family.id, firstName: p.childName } });
    if (!postoji) {
      await tx.child.create({
        data: { familyId: family.id, firstName: p.childName, birthDate: new Date(p.childBirthDate), allergies: p.napomene ?? null },
      });
    }
  }
  return family.id;
}

function podaciZaPoruku(r: RezervacijaSPovezanim) {
  return {
    code: r.code,
    parentName: r.parentName,
    childName: r.childName,
    date: r.date,
    slotStart: r.slotStart,
    slotEnd: r.slotEnd,
    roomName: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name,
    packageName: r.package.name,
    numChildren: r.numChildren,
    numAdults: r.numAdults,
    totalCents: r.totalCents,
    depositCents: r.depositCents,
    paidCents: r.paidCents,
    qrUrl: `${env.appUrl}/potvrda/${r.code}?k=${r.qrToken}`,
  };
}

/**
 * Potvrđena proslava u kalendaru igraonice. Kalendar je pomoćni sustav — ako
 * upis ne uspije (ili nije konfiguriran), rezervacija svejedno vrijedi.
 */
export async function sinkronizirajKalendar(r: RezervacijaSPovezanim): Promise<void> {
  const dodaciOpis = r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ");
  const ishod = await upisiProslavuUKalendar({
    code: r.code,
    datumISO: lokalniISO(r.date),
    slotStart: r.slotStart,
    slotEnd: r.slotEnd,
    naslov: `${r.childName ? `${r.childName} — ` : ""}${r.package.name} (${brojDjece(r.numChildren)})`,
    opis: [
      `Kod: ${r.code}`,
      `Paket: ${r.package.name}`,
      `Roditelj: ${r.parentName}`,
      r.phone ? `Telefon: ${r.phone}` : null,
      r.email ? `E-pošta: ${r.email}` : null,
      r.theme ? `Tema: ${r.theme.name}` : null,
      dodaciOpis ? `Dodaci: ${dodaciOpis}` : null,
      r.notes ? `Napomene: ${r.notes}` : null,
      `Rezervacija: ${env.appUrl}/admin/rezervacije/${r.code}`,
    ]
      .filter(Boolean)
      .join("\n"),
    lokacija: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name,
  });

  // Ishod se bilježi uz rezervaciju: bez toga neuspjeh ostaje samo u logovima
  // poslužitelja, a osoblje vidi prazan kalendar i ne zna zašto.
  await prisma.notificationLog.create({
    data: {
      type: "kalendar",
      channel: "kalendar",
      recipient: env.googleCalendarId || "—",
      subject: ishod.ok ? "Proslava upisana u kalendar" : "Upis u kalendar nije uspio",
      body: ishod.razlog ?? `Termin ${lokalniISO(r.date)} ${r.slotStart}–${r.slotEnd}.`,
      reservationId: r.id,
      status: ishod.ok ? "poslano" : "greska",
    },
  });
}

/** Potvrda kupcu (ako je traženo i ima e-poštu) i obavijest osoblju za pripremu. */
async function posaljiPotvrdu(r: RezervacijaSPovezanim, kupcu: boolean): Promise<void> {
  const podaci = podaciZaPoruku(r);
  if (kupcu && r.email) {
    const p = predlozakPotvrde(podaci);
    await posaljiIZabiljezi({ tip: "potvrda", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
  }
  const dodaciOpis = r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ");
  const o = predlozakOsoblje(podaci, dodaciOpis);
  await posaljiIZabiljezi({ tip: "osoblje", kanal: "email", primatelj: env.staffEmail, naslov: o.naslov, tijelo: o.tijelo, reservationId: r.id });
  await sinkronizirajKalendar(r);
}

// --- Upit s weba ------------------------------------------------------
/**
 * Sprema upit kupca. Upit ne zauzima termin i ne naplaćuje se — administrator ga
 * odobrava ili odbija. Kod poklon-bona zapisuje se u napomene (primjenjuje se pri
 * potvrdi).
 */
export async function posaljiUpit(input: UpitInput): Promise<RezervacijaSPovezanim> {
  const { soba, paket, termin } = await provjeriPodatke(input, true);
  // Neradni dani (godišnji odmor, prije otvorenja…) — web upit nije moguć.
  const zatvoreno = await prisma.closedPeriod.findFirst({ where: { startDate: { lte: input.dateISO }, endDate: { gte: input.dateISO } } });
  if (zatvoreno) {
    throw new NeispravnaRezervacijaError(
      `Na odabrani datum ne radimo (${zatvoreno.reason}, ${rasponDatuma({ od: zatvoreno.startDate, do: zatvoreno.endDate })}). Odaberite drugi datum.`,
    );
  }
  const dodaciKatalog = await prisma.addOn.findMany({ where: { active: true } });
  const izracun = izracunajCijenu({
    paket: { name: paket.name, basePriceCents: paket.basePriceCents, ukljucenoDjece: paket.maxChildren, nadoplataPoDjetetuCents: paket.perChildCents },
    brojDjece: input.numChildren,
    dodaci: dodaciKatalog.map((d) => ({ id: d.id, priceCents: d.priceCents, unit: d.unit as "per_child" | "flat" })),
    odabrani: input.dodaci,
    spojeneSobe: !!input.secondRoomId,
    depositPercent: env.depositPercent,
  });
  const datum = new Date(`${input.dateISO}T00:00:00`);
  const bon = input.voucherCode?.trim().toUpperCase();
  const napomene = sastaviNapomene({ temaZelja: input.temaZelja, napomene: input.napomene, bon });

  const r = await prisma.$transaction(async (tx) => {
    const code = await noviKod(tx, datum.getFullYear());
    const familyId = await poveziObitelj(tx, input, "booking", { gdpr: input.gdprConsent, marketing: input.marketingConsent });
    return tx.reservation.create({
      data: {
        code,
        date: datum,
        slotStart: termin.start,
        slotEnd: termin.end,
        roomId: soba.id,
        secondRoomId: input.secondRoomId ?? null,
        packageId: paket.id,
        themeId: input.themeId ?? null,
        numChildren: input.numChildren,
        numAdults: input.numAdults ?? 0,
        familyId,
        parentName: input.parentName,
        email: input.email,
        phone: input.phone,
        childName: input.childName,
        childBirthDate: input.childBirthDate ? new Date(input.childBirthDate) : null,
        status: "upit",
        ...cijenaRezervacije(paket, izracun),
        paidCents: 0,
        gdprConsent: input.gdprConsent,
        marketingConsent: input.marketingConsent,
        qrToken: qrToken(),
        source: "web",
        notes: napomene,
        addOns: {
          create: input.dodaci
            .filter((d) => d.quantity > 0)
            .map((d) => ({ addOnId: d.id, quantity: d.quantity, unitPriceCents: dodaciKatalog.find((c) => c.id === d.id)?.priceCents ?? 0 })),
        },
        waiver: input.waiverAccepted
          ? {
              create: {
                signedByName: input.parentName,
                // Doslovno tekst koji je roditelj vidio i prihvatio.
                content: IZJAVA_RODITELJA,
              },
            }
          : undefined,
      },
      include: UKLJUCI,
    });
  });

  const podaci = podaciZaPoruku(r);
  const kupac = predlozakZaprimljenogUpita(podaci);
  await posaljiIZabiljezi({ tip: "potvrda", kanal: "email", primatelj: r.email, naslov: kupac.naslov, tijelo: kupac.tijelo, reservationId: r.id });
  const osoblje = predlozakNovogUpita(podaci, { email: r.email, phone: r.phone, notes: r.notes }, `${env.appUrl}/admin/rezervacije/${r.code}`);
  await posaljiIZabiljezi({ tip: "osoblje", kanal: "email", primatelj: env.staffEmail, naslov: osoblje.naslov, tijelo: osoblje.tijelo, reservationId: r.id });
  return r;
}

// --- Odobravanje i odbijanje upita -----------------------------------
/** Odobrava upit: provjerava je li termin slobodan, zauzima ga i šalje potvrdu. */
export async function odobriUpit(code: string): Promise<RezultatRadnje> {
  const r = await prisma.reservation.findUnique({ where: { code }, include: UKLJUCI });
  if (!r) return { ok: false, poruka: "Rezervacija ne postoji." };
  if (r.status !== "upit") return { ok: false, poruka: "Odobriti se može samo upit." };
  const roomIds = [r.roomId, ...(r.secondRoomId ? [r.secondRoomId] : [])];
  if (await imaPreklapanje(r.date, { start: r.slotStart, end: r.slotEnd }, roomIds, r.id)) {
    return { ok: false, poruka: "Igraonica je u tom terminu već zauzeta potvrđenom rezervacijom. Uredite termin ili odbijte upit." };
  }
  const odobrena = await prisma.reservation.update({ where: { id: r.id }, data: { status: "potvrdjeno" }, include: UKLJUCI });
  await posaljiPotvrdu(odobrena, true);
  return { ok: true };
}

/** Odbija upit i obavještava kupca (razlog se zapisuje i u napomene). */
export async function odbijUpit(code: string, razlog?: string): Promise<RezultatRadnje> {
  const r = await prisma.reservation.findUnique({ where: { code }, include: UKLJUCI });
  if (!r) return { ok: false, poruka: "Rezervacija ne postoji." };
  if (r.status !== "upit") return { ok: false, poruka: "Odbiti se može samo upit." };
  const razlogTekst = razlog?.trim() || undefined;
  await prisma.reservation.update({
    where: { id: r.id },
    data: {
      status: "odbijeno",
      notes: [r.notes, razlogTekst ? `Razlog odbijanja: ${razlogTekst}` : null].filter(Boolean).join("\n") || null,
    },
  });
  if (r.email) {
    const p = predlozakOdbijenogUpita(podaciZaPoruku(r), razlogTekst);
    await posaljiIZabiljezi({ tip: "potvrda", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
  }
  return { ok: true };
}

// --- Ručni unos i izmjena (administracija) ----------------------------
/**
 * Ručni unos proslave (npr. dogovor telefonom ili WhatsAppom). Početak nije vezan
 * uz raspored; potvrđena rezervacija ne smije se preklapati s drugom potvrđenom.
 */
export async function unesiRucno(
  input: PodaciRezervacije & { status: "upit" | "potvrdjeno"; posaljiPotvrdu: boolean },
): Promise<RezervacijaSPovezanim> {
  const { soba, paket, termin } = await provjeriPodatke(input, false);
  const datum = new Date(`${input.dateISO}T00:00:00`);
  if (input.status === "potvrdjeno" && (await imaPreklapanje(datum, termin, [soba.id]))) {
    throw new TerminZauzetError();
  }
  const izracun = izracunajCijenu({
    paket: { name: paket.name, basePriceCents: paket.basePriceCents, ukljucenoDjece: paket.maxChildren, nadoplataPoDjetetuCents: paket.perChildCents },
    brojDjece: input.numChildren,
    dodaci: [],
    odabrani: [],
    depositPercent: env.depositPercent,
  });

  const r = await prisma.$transaction(async (tx) => {
    const code = await noviKod(tx, datum.getFullYear());
    const familyId = await poveziObitelj(tx, input, "rucni-unos");
    return tx.reservation.create({
      data: {
        code,
        date: datum,
        slotStart: termin.start,
        slotEnd: termin.end,
        roomId: soba.id,
        packageId: paket.id,
        themeId: input.themeId ?? null,
        numChildren: input.numChildren,
        numAdults: input.numAdults ?? 0,
        familyId,
        parentName: input.parentName,
        email: input.email,
        phone: input.phone || null,
        childName: input.childName || null,
        childBirthDate: input.childBirthDate ? new Date(input.childBirthDate) : null,
        status: input.status,
        ...cijenaRezervacije(paket, izracun, input.dogovorenaCijenaCents),
        paidCents: 0,
        qrToken: qrToken(),
        source: "admin",
        notes: input.napomene || null,
      },
      include: UKLJUCI,
    });
  });

  if (r.status === "potvrdjeno") await posaljiPotvrdu(r, input.posaljiPotvrdu);
  return r;
}

/**
 * Izmjena rezervacije ili upita: datum, početak, igraonica, paket, tema, broj
 * djece i kontakt. Kraj termina i cijena računaju se iznova; dodaci i uplate
 * ostaju. Potvrđena rezervacija ne smije se preklapati s drugom potvrđenom.
 */
export async function urediRezervaciju(code: string, input: PodaciRezervacije): Promise<void> {
  const postojeca = await prisma.reservation.findUnique({ where: { code }, include: { addOns: { include: { addOn: true } } } });
  if (!postojeca) throw new NeispravnaRezervacijaError("Rezervacija ne postoji.");
  if (postojeca.status === "otkazano" || postojeca.status === "odbijeno") {
    throw new NeispravnaRezervacijaError("Otkazana ili odbijena rezervacija ne može se uređivati.");
  }
  const { soba, paket, termin } = await provjeriPodatke(input, false);
  const datum = new Date(`${input.dateISO}T00:00:00`);
  const secondRoomId = postojeca.secondRoomId && postojeca.secondRoomId !== soba.id ? postojeca.secondRoomId : null;
  const roomIds = [soba.id, ...(secondRoomId ? [secondRoomId] : [])];
  if (STATUSI_ZAUZIMAJU_TERMIN.includes(postojeca.status) && (await imaPreklapanje(datum, termin, roomIds, postojeca.id))) {
    throw new TerminZauzetError();
  }
  const izracun = izracunajCijenu({
    paket: { name: paket.name, basePriceCents: paket.basePriceCents, ukljucenoDjece: paket.maxChildren, nadoplataPoDjetetuCents: paket.perChildCents },
    brojDjece: input.numChildren,
    dodaci: postojeca.addOns.map((a) => ({ id: a.addOnId, priceCents: a.unitPriceCents, unit: a.addOn.unit as "per_child" | "flat" })),
    odabrani: postojeca.addOns.map((a) => ({ id: a.addOnId, quantity: a.quantity })),
    spojeneSobe: !!secondRoomId,
    depositPercent: env.depositPercent,
  });

  await prisma.$transaction(async (tx) => {
    const familyId = (await poveziObitelj(tx, input, "rucni-unos")) ?? postojeca.familyId;
    await tx.reservation.update({
      where: { id: postojeca.id },
      data: {
        date: datum,
        slotStart: termin.start,
        slotEnd: termin.end,
        roomId: soba.id,
        secondRoomId,
        packageId: paket.id,
        themeId: input.themeId ?? null,
        numChildren: input.numChildren,
        numAdults: input.numAdults ?? 0,
        familyId,
        parentName: input.parentName,
        email: input.email,
        phone: input.phone || null,
        childName: input.childName || null,
        childBirthDate: input.childBirthDate ? new Date(input.childBirthDate) : null,
        notes: input.napomene || null,
        ...cijenaRezervacije(paket, izracun, input.dogovorenaCijenaCents),
      },
    });
  });

  // Termin koji zauzima igraonicu prati i kalendar (novo vrijeme, soba, paket).
  if (STATUSI_ZAUZIMAJU_TERMIN.includes(postojeca.status)) {
    const azurirana = await prisma.reservation.findUnique({ where: { id: postojeca.id }, include: UKLJUCI });
    if (azurirana) await sinkronizirajKalendar(azurirana);
  }
}

// --- Račun + fiskalizacija -------------------------------------------
export async function izdajRacun(reservationId: string) {
  const r = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { package: true, addOns: { include: { addOn: true } }, invoices: true },
  });
  if (r.invoices.length > 0) return r.invoices[0]; // već izdan

  const godina = r.date.getFullYear();
  const brojUGodini = await prisma.invoice.count({
    where: { issuedAt: { gte: new Date(`${godina}-01-01`), lte: new Date(`${godina}-12-31T23:59:59`) } },
  });
  const number = brojRacuna(brojUGodini + 1, env.fiscalBusinessSpace, env.fiscalCashRegister);

  const stavke = [
    { naziv: `${r.package.name} (${brojDjece(r.numChildren)})`, kolicina: 1, cijenaCents: r.totalCents - r.addOns.reduce((s, a) => s + a.unitPriceCents * a.quantity, 0), pdvStopa: 25 },
    ...r.addOns.map((a) => ({ naziv: a.addOn.name, kolicina: a.quantity, cijenaCents: a.unitPriceCents, pdvStopa: 25 })),
  ];

  // Kreiraj račun s praznim JIR/ZKI, zatim fiskaliziraj kroz interface
  const racun = await prisma.invoice.create({
    data: {
      number,
      reservationId: r.id,
      totalCents: r.totalCents,
      items: stavke,
      businessSpace: env.fiscalBusinessSpace,
      cashRegister: env.fiscalCashRegister,
      status: "izdan",
    },
  });

  const fiskal = getFiscalizationService();
  const rezultat = await fiskal.fiscalizeInvoice({
    invoiceId: racun.id,
    number: racun.number,
    issuedAt: racun.issuedAt,
    totalCents: racun.totalCents,
    businessSpace: racun.businessSpace,
    cashRegister: racun.cashRegister,
    oib: env.fiscalOib || undefined,
    stavke,
  });

  return prisma.invoice.update({
    where: { id: racun.id },
    data: {
      jir: rezultat.jir,
      zki: rezultat.zki,
      fiscalizedAt: rezultat.fiscalizedAt,
      status: "fiskaliziran",
    },
  });
}

// --- Otkazivanje + povrat --------------------------------------------
export interface OtkazivanjeRezultat {
  ok: boolean;
  vraceno: number;
}

/** Otkazuje rezervaciju (oslobađa termin) i opcijski izvršava povrat sredstava. */
export async function otkaziRezervaciju(code: string, refund = true): Promise<OtkazivanjeRezultat> {
  const r = await prisma.reservation.findUnique({
    where: { code },
    include: { payments: true, room: true, secondRoom: true, package: true },
  });
  if (!r || r.status === "otkazano") return { ok: false, vraceno: 0 };

  let vraceno = 0;
  if (refund && r.paidCents > 0) {
    const placanje = getPaymentService();
    // Pronađi uspješnu karticnu naplatu za referencu povrata.
    const kartica = r.payments.find((p) => (p.provider === "stripe" || p.provider === "mock") && p.status === "uspjesno" && p.providerRef);
    const rezultat = kartica
      ? await placanje.refundiraj({ providerRef: kartica.providerRef!, amountCents: r.paidCents })
      : { ok: true };
    if (rezultat.ok) {
      vraceno = r.paidCents;
      await prisma.payment.create({
        data: { reservationId: r.id, provider: kartica?.provider ?? "mock", providerRef: kartica?.providerRef, amountCents: vraceno, kind: "povrat", status: "uspjesno" },
      });
    }
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: { status: "otkazano", paidCents: refund ? 0 : r.paidCents },
  });
  // Oslobođen termin nestaje i iz kalendara igraonice.
  await ukloniProslavuIzKalendara(r.code);

  // Obavijest kupcu
  if (r.email) {
    await posaljiIZabiljezi({
      tip: "potvrda",
      kanal: "email",
      primatelj: r.email,
      naslov: `Otkazivanje rezervacije ${r.code}`,
      tijelo: [
        pozdrav(r.parentName),
        ``,
        `vaša rezervacija ${r.code} je otkazana.`,
        vraceno > 0 ? `Povrat sredstava od ${formatEur(vraceno)} bit će vidljiv na vašoj kartici u nekoliko radnih dana.` : ``,
        ``,
        `Termin je oslobođen. Za novu rezervaciju posjetite našu stranicu.`,
      ].filter(Boolean).join("\n"),
      reservationId: r.id,
    });
  }

  return { ok: true, vraceno };
}
