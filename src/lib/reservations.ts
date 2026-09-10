/**
 * Domenski servis za rezervacije — dostupnost, sprječavanje dvostrukih
 * rezervacija, izračun cijene, izdavanje (fiskaliziranog) računa, povezivanje s
 * CRM-om i okidanje automatskih poruka.
 */
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { izracunajCijenu } from "@/lib/pricing";
import { jeDozvoljenPocetak, krajTermina, pocetciZaDatum, preklapaSe, semaforTermina, type Semafor } from "@/lib/slots";
import { kodRezervacije, qrToken, brojRacuna } from "@/lib/codes";
import { getPaymentService } from "@/lib/payments";
import { getFiscalizationService } from "@/lib/fiscalization";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { brojDjece } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import {
  predlozakPotvrde,
  predlozakOsoblje,
} from "@/lib/notifications/templates";

const AKTIVNI_STATUSI = ["upit", "potvrdjeno", "placeno", "checkin", "zavrseno"];

// --- Dostupnost -------------------------------------------------------
export interface TerminDostupnost {
  start: string;
  slobodneSobeIds: string[];
  semafor: Semafor;
}

export interface DostupnostDana {
  termini: TerminDostupnost[];
  // Zauzeti intervali po igraonici (bez osobnih podataka) — klijent iz njih
  // računa koji paketi (2 h / 3 h) stanu u odabrani početak.
  zauzeto: { roomId: string; start: string; end: string }[];
}

/** Granice dana (lokalno) za zadani ISO datum "YYYY-MM-DD". */
function rasponDana(dateISO: string): { od: Date; do: Date } {
  const od = new Date(`${dateISO}T00:00:00`);
  const doo = new Date(`${dateISO}T23:59:59`);
  return { od, do: doo };
}

/**
 * Vraća dostupnost za zadani datum: početke po rasporedu tog dana (traffic-light
 * po početku) i zauzete intervale igraonica.
 */
export async function dohvatiDostupnostDana(dateISO: string): Promise<DostupnostDana> {
  const { od, do: doo } = rasponDana(dateISO);
  const [sobe, paketi, rezervacije] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, select: { roomId: true, durationMin: true } }),
    prisma.reservation.findMany({
      where: { date: { gte: od, lte: doo }, status: { in: AKTIVNI_STATUSI } },
      select: { roomId: true, secondRoomId: true, slotStart: true, slotEnd: true },
    }),
  ]);

  const zauzeto = rezervacije.flatMap((r) =>
    [r.roomId, ...(r.secondRoomId ? [r.secondRoomId] : [])].map((roomId) => ({ roomId, start: r.slotStart, end: r.slotEnd })),
  );

  const termini = pocetciZaDatum(dateISO).map((start) => {
    // Igraonica je slobodna ako u nju stane barem njezin najkraći paket
    // (paket bez igraonice vrijedi za sve).
    const slobodneSobeIds = sobe
      .filter((s) => {
        const trajanja = paketi.filter((p) => p.roomId === null || p.roomId === s.id).map((p) => p.durationMin);
        if (trajanja.length === 0) return false;
        const termin = { start, end: krajTermina(start, Math.min(...trajanja)) };
        return !zauzeto.some((z) => z.roomId === s.id && preklapaSe(z, termin));
      })
      .map((s) => s.id);
    return { start, slobodneSobeIds, semafor: semaforTermina(slobodneSobeIds.length, sobe.length) };
  });

  return { termini, zauzeto };
}

/** Provjera je li određena soba slobodna za zadani datum+termin (s bufferom). */
async function jeSobaSlobodna(
  dateISO: string,
  termin: { start: string; end: string },
  roomIds: string[],
  tx: typeof prisma = prisma,
): Promise<boolean> {
  const { od, do: doo } = rasponDana(dateISO);
  const rezervacije = await tx.reservation.findMany({
    where: {
      date: { gte: od, lte: doo },
      status: { in: AKTIVNI_STATUSI },
      OR: [{ roomId: { in: roomIds } }, { secondRoomId: { in: roomIds } }],
    },
    select: { slotStart: true, slotEnd: true },
  });
  return !rezervacije.some((r) => preklapaSe({ start: r.slotStart, end: r.slotEnd }, termin));
}

// --- Kreiranje rezervacije -------------------------------------------
export interface KreirajRezervacijuInput {
  dateISO: string;
  slotStart: string;
  slotEnd: string;
  roomId: string;
  secondRoomId?: string | null;
  packageId: string;
  themeId?: string | null;
  numChildren: number;
  numAdults?: number;
  dodaci: { id: string; quantity: number }[];
  parentName: string;
  email: string;
  phone?: string;
  childName?: string;
  childBirthDate?: string | null; // ISO
  napomene?: string;
  gdprConsent: boolean;
  marketingConsent: boolean;
  waiverAccepted: boolean;
  platiPuniIznos?: boolean;
  voucherCode?: string | null;
}

export class TerminZauzetError extends Error {
  constructor() {
    super("Termin je zauzet");
    this.name = "TerminZauzetError";
  }
}

/** Rezervacija ne poštuje raspored ili pravila paketa (poruka je za korisnika). */
export class NeispravnaRezervacijaError extends Error {
  constructor(poruka: string) {
    super(poruka);
    this.name = "NeispravnaRezervacijaError";
  }
}

export async function kreirajRezervaciju(input: KreirajRezervacijuInput) {
  const datum = new Date(`${input.dateISO}T00:00:00`);
  const godina = datum.getFullYear();

  // 1) Mjerodavni podaci o igraonici, paketu i dodacima iz baze
  const [soba, paket, dodaciKatalog] = await Promise.all([
    prisma.room.findUniqueOrThrow({ where: { id: input.roomId } }),
    prisma.package.findUniqueOrThrow({ where: { id: input.packageId } }),
    prisma.addOn.findMany({ where: { active: true } }),
  ]);

  // 2) Pravila rasporeda i paketa. Kraj termina računa server iz trajanja
  //    paketa (klijentov slotEnd se ne koristi).
  if (!soba.active || !paket.active) {
    throw new NeispravnaRezervacijaError("Odabrana igraonica ili paket više nisu dostupni.");
  }
  if (!jeDozvoljenPocetak(input.dateISO, input.slotStart)) {
    throw new NeispravnaRezervacijaError("Odabrani dan i početak nisu u rasporedu proslava.");
  }
  if (paket.roomId && paket.roomId !== soba.id) {
    throw new NeispravnaRezervacijaError("Odabrani paket ne vrijedi za tu igraonicu.");
  }
  if (input.numChildren < paket.minChildren || input.numChildren > soba.maxChildren) {
    throw new NeispravnaRezervacijaError(`Broj djece za ${soba.name} mora biti između ${paket.minChildren} i ${soba.maxChildren}.`);
  }
  const termin = { start: input.slotStart, end: krajTermina(input.slotStart, paket.durationMin) };

  // 3) Izračun cijene na serveru (mjerodavno)
  const izracun = izracunajCijenu({
    paket: {
      name: paket.name,
      basePriceCents: paket.basePriceCents,
      ukljucenoDjece: paket.maxChildren,
      nadoplataPoDjetetuCents: paket.perChildCents,
    },
    brojDjece: input.numChildren,
    dodaci: dodaciKatalog.map((d) => ({ id: d.id, priceCents: d.priceCents, unit: d.unit as "per_child" | "flat" })),
    odabrani: input.dodaci,
    spojeneSobe: !!input.secondRoomId,
    depositPercent: env.depositPercent,
  });

  const roomIds = [input.roomId, ...(input.secondRoomId ? [input.secondRoomId] : [])];

  // 3) Transakcija: ponovno provjeri slobodnost (guard protiv double-bookinga) i kreiraj
  const rezervacija = await prisma.$transaction(async (tx) => {
    const slobodno = await jeSobaSlobodna(input.dateISO, termin, roomIds, tx as typeof prisma);
    if (!slobodno) throw new TerminZauzetError();

    // Redni broj rezervacije u godini PROSLAVE → čitljiv kod (KZ-{godina}-NNNN).
    // Brojimo po prefiksu koda (a ne po createdAt) da kod bude jedinstven i kad se
    // rezervira za sljedeću godinu.
    const brojUGodini = await tx.reservation.count({ where: { code: { startsWith: `KZ-${godina}-` } } });
    const code = kodRezervacije(godina, brojUGodini + 1);

    // CRM: pronađi ili kreiraj obitelj po emailu; dodaj dijete (rođendan)
    const family = await tx.family.upsert({
      where: { email: input.email },
      update: {
        parentName: input.parentName,
        phone: input.phone ?? undefined,
        marketingConsent: input.marketingConsent,
        gdprConsentAt: input.gdprConsent ? new Date() : undefined,
      },
      create: {
        parentName: input.parentName,
        email: input.email,
        phone: input.phone,
        marketingConsent: input.marketingConsent,
        gdprConsentAt: input.gdprConsent ? new Date() : null,
        source: "booking",
      },
    });

    if (input.childName && input.childBirthDate) {
      const postoji = await tx.child.findFirst({
        where: { familyId: family.id, firstName: input.childName },
      });
      if (!postoji) {
        await tx.child.create({
          data: {
            familyId: family.id,
            firstName: input.childName,
            birthDate: new Date(input.childBirthDate),
            allergies: input.napomene ?? null,
          },
        });
      }
    }

    const r = await tx.reservation.create({
      data: {
        code,
        date: datum,
        slotStart: termin.start,
        slotEnd: termin.end,
        roomId: input.roomId,
        secondRoomId: input.secondRoomId ?? null,
        packageId: input.packageId,
        themeId: input.themeId ?? null,
        numChildren: input.numChildren,
        numAdults: input.numAdults ?? 0,
        familyId: family.id,
        parentName: input.parentName,
        email: input.email,
        phone: input.phone,
        childName: input.childName,
        childBirthDate: input.childBirthDate ? new Date(input.childBirthDate) : null,
        status: "potvrdjeno",
        totalCents: izracun.totalCents,
        depositCents: izracun.depositCents,
        paidCents: 0,
        gdprConsent: input.gdprConsent,
        marketingConsent: input.marketingConsent,
        qrToken: qrToken(),
        source: "web",
        notes: input.napomene,
        addOns: {
          create: input.dodaci
            .filter((d) => d.quantity > 0)
            .map((d) => {
              const cat = dodaciKatalog.find((c) => c.id === d.id);
              return {
                addOnId: d.id,
                quantity: d.quantity,
                unitPriceCents: cat?.priceCents ?? 0,
              };
            }),
        },
        waiver: input.waiverAccepted
          ? {
              create: {
                signedByName: input.parentName,
                content:
                  "Roditelj/skrbnik potvrđuje zdravstvenu sposobnost djeteta i preuzima odgovornost nadzora prema pravilima Kidzone.",
              },
            }
          : undefined,
      },
      include: { room: true, secondRoom: true, package: true, theme: true, addOns: { include: { addOn: true } } },
    });

    return { r };
  });

  const { r } = rezervacija;

  const total = izracun.totalCents;

  // 4) Iskorištenje poklon-bona (ako je unesen) — umanjuje ukupni iznos
  let bonPrimijenjeno = 0;
  if (input.voucherCode) {
    const kod = input.voucherCode.trim().toUpperCase();
    bonPrimijenjeno = await prisma.$transaction(async (tx) => {
      const bon = await tx.voucher.findUnique({ where: { code: kod } });
      if (!bon || bon.status !== "aktivan" || bon.balanceCents <= 0) return 0;
      const primijeni = Math.min(bon.balanceCents, total);
      const noviSaldo = bon.balanceCents - primijeni;
      await tx.voucher.update({
        where: { id: bon.id },
        data: { balanceCents: noviSaldo, status: noviSaldo <= 0 ? "iskoristen" : "aktivan" },
      });
      await tx.payment.create({
        data: { reservationId: r.id, provider: "voucher", providerRef: bon.code, amountCents: primijeni, kind: "bon", status: "uspjesno" },
      });
      return primijeni;
    });
  }

  let karticaUspjesna = false;
  let clientSecret: string | undefined;

  // 5) Online naplata — SAMO ako je uključena (env.onlinePayments). Inače se
  //    plaćanje vrši uživo pa se kartica ne tereti.
  if (env.onlinePayments) {
    const ciljSada = input.platiPuniIznos ? total : izracun.depositCents;
    const zaNaplatu = Math.max(0, ciljSada - bonPrimijenjeno);
    karticaUspjesna = zaNaplatu <= 0;
    if (zaNaplatu > 0) {
      const placanje = getPaymentService();
      const naplata = await placanje.naplati({
        amountCents: zaNaplatu,
        kind: input.platiPuniIznos ? "puni-iznos" : "akontacija",
        opis: `Rezervacija ${r.code}`,
        email: input.email,
        reservationCode: r.code,
      });
      karticaUspjesna = naplata.status === "uspjesno";
      clientSecret = naplata.clientSecret; // Stripe: za potvrdu karticom na frontu
      await prisma.payment.create({
        data: {
          reservationId: r.id,
          provider: naplata.provider,
          providerRef: naplata.providerRef,
          amountCents: zaNaplatu,
          kind: input.platiPuniIznos ? "puni-iznos" : "akontacija",
          status: naplata.status,
        },
      });
    }
  }

  // Naplaćeno online sada = bon + (kartica ako je uspjela). Ostatak se plaća uživo.
  const onlineNaplataCents = env.onlinePayments && karticaUspjesna ? Math.max(0, (input.platiPuniIznos ? total : izracun.depositCents) - bonPrimijenjeno) : 0;
  const naplacenoSada = bonPrimijenjeno + onlineNaplataCents;
  // Rezervacija je uvijek POTVRĐENA (blokira termin); "placeno" tek kad je sve plaćeno.
  const noviStatus = naplacenoSada >= total ? "placeno" : "potvrdjeno";
  await prisma.reservation.update({
    where: { id: r.id },
    data: { paidCents: naplacenoSada, status: noviStatus },
  });

  // 6) Račun + fiskalizacija — izdaje se TEK kad je rezervacija u cijelosti
  //    plaćena. Kod plaćanja uživo račun se izdaje kad osoblje označi "plaćeno"
  //    (admin) ili kroz POS na blagajni.
  if (naplacenoSada >= total) {
    await izdajRacun(r.id);
  }

  // 6) Automatske poruke: potvrda kupcu + obavijest osoblju
  const qrUrl = `${env.appUrl}/potvrda/${r.code}`;
  const podaci = {
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
    paidCents: naplacenoSada,
    qrUrl,
  };
  const potvrda = predlozakPotvrde(podaci);
  await posaljiIZabiljezi({
    tip: "potvrda",
    kanal: "email",
    primatelj: r.email,
    naslov: potvrda.naslov,
    tijelo: potvrda.tijelo,
    reservationId: r.id,
  });

  const dodaciOpis = r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ");
  const osoblje = predlozakOsoblje(podaci, dodaciOpis);
  await posaljiIZabiljezi({
    tip: "osoblje",
    kanal: "email",
    primatelj: env.staffEmail,
    naslov: osoblje.naslov,
    tijelo: osoblje.tijelo,
    reservationId: r.id,
  });

  return { ...r, clientSecret };
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

  // Obavijest kupcu
  await posaljiIZabiljezi({
    tip: "potvrda",
    kanal: "email",
    primatelj: r.email,
    naslov: `Otkazivanje rezervacije ${r.code}`,
    tijelo: [
      `Poštovani/a ${r.parentName},`,
      ``,
      `vaša rezervacija ${r.code} je otkazana.`,
      vraceno > 0 ? `Povrat sredstava od ${formatEur(vraceno)} bit će vidljiv na vašoj kartici u nekoliko radnih dana.` : ``,
      ``,
      `Termin je oslobođen. Za novu rezervaciju posjetite našu stranicu.`,
    ].filter(Boolean).join("\n"),
    reservationId: r.id,
  });

  return { ok: true, vraceno };
}

// --- Izmjena termina (reschedule) ------------------------------------
export interface IzmjenaTerminaInput {
  code: string;
  dateISO: string;
  slotStart: string;
  slotEnd: string;
  roomId: string;
  secondRoomId?: string | null;
}

/** Mijenja datum/termin/sobu rezervacije uz provjeru dostupnosti (bez sebe). */
export async function izmijeniTermin(input: IzmjenaTerminaInput): Promise<{ ok: boolean }> {
  const termin = { start: input.slotStart, end: input.slotEnd };
  const r = await prisma.reservation.findUnique({ where: { code: input.code } });
  if (!r) return { ok: false };

  const { od, do: doo } = rasponDana(input.dateISO);
  const roomIds = [input.roomId, ...(input.secondRoomId ? [input.secondRoomId] : [])];
  const konflikti = await prisma.reservation.findMany({
    where: {
      id: { not: r.id },
      date: { gte: od, lte: doo },
      status: { in: AKTIVNI_STATUSI },
      OR: [{ roomId: { in: roomIds } }, { secondRoomId: { in: roomIds } }],
    },
    select: { slotStart: true, slotEnd: true },
  });
  if (konflikti.some((k) => preklapaSe({ start: k.slotStart, end: k.slotEnd }, termin))) {
    return { ok: false };
  }

  await prisma.reservation.update({
    where: { id: r.id },
    data: {
      date: new Date(`${input.dateISO}T00:00:00`),
      slotStart: input.slotStart,
      slotEnd: input.slotEnd,
      roomId: input.roomId,
      secondRoomId: input.secondRoomId ?? null,
    },
  });
  return { ok: true };
}
