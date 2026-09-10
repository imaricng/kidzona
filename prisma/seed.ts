/**
 * Seed — puni bazu realnim demo podacima tako da se aplikacija odmah može
 * testirati: 2 igraonice s paketima (iz `katalog.ts`), 7 dodataka, 4 teme,
 * demo rezervacije po rasporedu termina, 1 admin + 1 osoblje + 2 obitelji s
 * djecom (CRM).
 *
 * Pokretanje: `npm run db:seed` (ili `npm run db:reset` za čistu bazu).
 */
import { PrismaClient, type Package } from "@prisma/client";
import { createHash, randomBytes } from "crypto";
import { hashPassword } from "../src/lib/password";
import { izracunajCijenu } from "../src/lib/pricing";
import { krajTermina, lokalniISO, pocetciZaDatum } from "../src/lib/slots";
import { NEAKTIVNI_DODACI, PAKETI, SOBE, TEME } from "./katalog";
import { brojDjece } from "../src/i18n/hr";

const prisma = new PrismaClient();

// --- Pomoćnici --------------------------------------------------------
function qrToken() {
  return randomBytes(16).toString("hex");
}
function kodRezervacije(godina: number, seq: number) {
  return `KZ-${godina}-${String(seq).padStart(4, "0")}`;
}
function rodjendan(godina: number, mjesec: number, dan: number): Date {
  return new Date(godina, mjesec - 1, dan);
}
/** Nadolazeći termini prema rasporedu (od danas) — za realne demo rezervacije. */
function terminiUnaprijed(broj: number): { dateISO: string; start: string }[] {
  const termini: { dateISO: string; start: string }[] = [];
  const d = new Date();
  d.setHours(0, 0, 0, 0);
  while (termini.length < broj) {
    const iso = lokalniISO(d);
    for (const start of pocetciZaDatum(iso)) termini.push({ dateISO: iso, start });
    d.setDate(d.getDate() + 1);
  }
  return termini.slice(0, broj);
}
// Jednostavan mock fiskalizacije za demo račune (kao u FiscalizationService mocku).
function mockFiskal(number: string, totalCents: number, issuedAt: Date) {
  const osnova = `${number}|${totalCents}|${issuedAt.toISOString()}`;
  const zki = createHash("md5").update(osnova).digest("hex").slice(0, 32);
  const raw = createHash("sha1").update(osnova).digest("hex");
  const jir = [raw.slice(0, 8), raw.slice(8, 12), raw.slice(12, 16), raw.slice(16, 20), raw.slice(20, 32)].join("-");
  return { zki, jir };
}

async function main() {
  console.log("🌱 Brišem postojeće podatke…");
  // Redoslijed zbog stranih ključeva
  await prisma.notificationLog.deleteMany();
  await prisma.checkIn.deleteMany();
  await prisma.consentWaiver.deleteMany();
  await prisma.staffAssignment.deleteMany();
  await prisma.payment.deleteMany();
  await prisma.invoice.deleteMany();
  await prisma.reservationAddOn.deleteMany();
  await prisma.reservation.deleteMany();
  await prisma.pOSItem.deleteMany();
  await prisma.pOSSale.deleteMany();
  await prisma.voucher.deleteMany();
  await prisma.loyaltyAccount.deleteMany();
  await prisma.membership.deleteMany();
  await prisma.child.deleteMany();
  await prisma.family.deleteMany();
  await prisma.addOn.deleteMany();
  await prisma.package.deleteMany();
  await prisma.theme.deleteMany();
  await prisma.room.deleteMany();
  await prisma.user.deleteMany();

  // --- Korisnici ------------------------------------------------------
  console.log("👤 Korisnici…");
  const admin = await prisma.user.create({
    data: {
      email: process.env.ADMIN_EMAIL ?? "admin@kidzona.hr",
      passwordHash: hashPassword(process.env.ADMIN_PASSWORD ?? "admin123"),
      name: "Administrator",
      role: "admin",
      phone: "095 537 8559",
    },
  });
  const osoblje = await prisma.user.create({
    data: {
      email: "osoblje@kidzona.hr",
      passwordHash: hashPassword("osoblje123"),
      name: "Ana Anić (animator)",
      role: "osoblje",
    },
  });

  // --- Igraonice i paketi (iz kataloga) ------------------------------
  console.log("🏠 Igraonice i paketi…");
  const sobaIds = new Map<string, string>();
  for (const { slug, ...s } of SOBE) {
    const soba = await prisma.room.create({ data: { slug, ...s } });
    sobaIds.set(slug, soba.id);
  }
  const paketi = new Map<string, Package>();
  for (const { slug, roomSlug, ...p } of PAKETI) {
    paketi.set(slug, await prisma.package.create({ data: { slug, ...p, roomId: sobaIds.get(roomSlug)! } }));
  }

  // --- Dodaci ---------------------------------------------------------
  console.log("➕ Dodaci…");
  const dPizza = await prisma.addOn.create({ data: { name: "Dodatna pizza", slug: "pizza", category: "hrana", priceCents: 800, unit: "flat", sortOrder: 1 } });
  const dTorta = await prisma.addOn.create({ data: { name: "Veća rođendanska torta", slug: "torta", category: "hrana", priceCents: 3500, unit: "flat", sortOrder: 2 } });
  await prisma.addOn.create({ data: { name: "Tematska dekoracija (puna)", slug: "dekoracija", category: "dekoracija", priceCents: 4000, unit: "flat", sortOrder: 3 } });
  const dPokloni = await prisma.addOn.create({ data: { name: "Pokloni za goste", slug: "pokloni", category: "ostalo", priceCents: 500, unit: "per_child", sortOrder: 4 } });
  const dAnimator = await prisma.addOn.create({ data: { name: "Dodatni animator", slug: "animator", category: "zabava", priceCents: 5000, unit: "flat", sortOrder: 5 } });
  await prisma.addOn.create({ data: { name: "Dodatnih 30 min", slug: "dodatno-vrijeme", category: "ostalo", priceCents: 3000, unit: "flat", sortOrder: 6, active: !NEAKTIVNI_DODACI.includes("dodatno-vrijeme") } });
  const dFotograf = await prisma.addOn.create({ data: { name: "Profesionalni fotograf", slug: "fotograf", category: "ostalo", priceCents: 6000, unit: "flat", sortOrder: 7 } });
  const katalogDodataka = [dPizza, dTorta, dPokloni, dAnimator, dFotograf];

  // --- Teme -----------------------------------------------------------
  console.log("🦕 Teme…");
  const teme = new Map<string, { id: string }>();
  for (const t of TEME) teme.set(t.slug, await prisma.theme.create({ data: t }));
  const tDino = teme.get("dinosauri")!;
  const tSvemir = teme.get("svemir")!;
  const tJednorozi = teme.get("jednorozi")!;

  // --- Obitelji + djeca (CRM) ----------------------------------------
  console.log("👨‍👩‍👧 Obitelji i djeca…");
  const obiteljHorvat = await prisma.family.create({
    data: {
      parentName: "Ivana Horvat", email: "ivana.horvat@example.com", phone: "+385 91 111 2222",
      city: "Nova Gradiška", marketingConsent: true, gdprConsentAt: new Date(), source: "booking",
      children: {
        create: [
          { firstName: "Marko", birthDate: rodjendan(2018, 7, 12), allergies: "Bez orašastih plodova" },
          { firstName: "Lucija", birthDate: rodjendan(2020, 3, 5) },
        ],
      },
      loyalty: { create: { points: 120 } },
    },
    include: { children: true },
  });
  // Demo roditelj s pristupom portalu (povezan s obitelji Horvat)
  const roditelj = await prisma.user.create({
    data: { email: "ivana.horvat@example.com", passwordHash: hashPassword("roditelj123"), name: "Ivana Horvat", role: "roditelj", phone: "+385 91 111 2222" },
  });
  await prisma.family.update({ where: { id: obiteljHorvat.id }, data: { userId: roditelj.id } });

  const obiteljKovac = await prisma.family.create({
    data: {
      parentName: "Petar Kovač", email: "petar.kovac@example.com", phone: "+385 98 333 4444",
      city: "Nova Gradiška", marketingConsent: false, gdprConsentAt: new Date(), source: "rucni-unos",
      children: {
        create: [{ firstName: "Ena", birthDate: rodjendan(2017, 9, 28), allergies: "Laktoza" }],
      },
      loyalty: { create: { points: 40 } },
    },
    include: { children: true },
  });

  // --- Demo rezervacije ----------------------------------------------
  console.log("📅 Probne rezervacije…");
  const godina = new Date().getFullYear();
  const termini = terminiUnaprijed(6);
  let seq = 1;
  let invSeq = 1;

  interface DemoRez {
    termin: { dateISO: string; start: string };
    paket: string; // slug iz kataloga
    theme?: string;
    broj: number;
    obitelj: { id: string; parentName: string; email: string; phone: string | null };
    childName: string; childBirth: Date; status: string;
    addons: { id: string; qty: number }[];
    checkin?: boolean;
  }

  const demo: DemoRez[] = [
    {
      termin: termini[0], paket: "mini-standard", theme: tDino.id,
      broj: 12, obitelj: obiteljHorvat, childName: "Marko", childBirth: obiteljHorvat.children[0].birthDate,
      status: "checkin", checkin: true,
      addons: [{ id: dPizza.id, qty: 2 }, { id: dPokloni.id, qty: 1 }],
    },
    {
      termin: termini[1], paket: "game-standard",
      broj: 14, obitelj: obiteljKovac, childName: "Ena", childBirth: obiteljKovac.children[0].birthDate,
      status: "potvrdjeno",
      addons: [{ id: dTorta.id, qty: 1 }],
    },
    {
      termin: termini[3], paket: "mini-premium", theme: tJednorozi.id,
      broj: 18, obitelj: obiteljHorvat, childName: "Lucija", childBirth: obiteljHorvat.children[1].birthDate,
      status: "placeno",
      addons: [{ id: dFotograf.id, qty: 1 }, { id: dAnimator.id, qty: 1 }],
    },
    {
      termin: termini[5], paket: "game-premium", theme: tSvemir.id,
      broj: 15, obitelj: obiteljKovac, childName: "Ena", childBirth: obiteljKovac.children[0].birthDate,
      status: "potvrdjeno",
      addons: [],
    },
  ];

  for (const d of demo) {
    const paket = paketi.get(d.paket)!;
    const izracun = izracunajCijenu({
      paket: { name: paket.name, basePriceCents: paket.basePriceCents, ukljucenoDjece: paket.maxChildren, nadoplataPoDjetetuCents: paket.perChildCents },
      brojDjece: d.broj,
      dodaci: katalogDodataka.map((a) => ({ id: a.id, priceCents: a.priceCents, unit: a.unit as "per_child" | "flat" })),
      odabrani: d.addons.map((a) => ({ id: a.id, quantity: a.qty })),
      depositPercent: 30,
    });
    const total = izracun.totalCents;
    const deposit = izracun.depositCents;
    const paid = d.status === "placeno" ? total : deposit;
    const code = kodRezervacije(godina, seq++);
    const dodatak = (id: string) => katalogDodataka.find((a) => a.id === id)!;

    const rez = await prisma.reservation.create({
      data: {
        code, date: new Date(`${d.termin.dateISO}T00:00:00`),
        slotStart: d.termin.start, slotEnd: krajTermina(d.termin.start, paket.durationMin),
        roomId: paket.roomId!, packageId: paket.id, themeId: d.theme, numChildren: d.broj, numAdults: Math.ceil(d.broj / 4) + 2,
        familyId: d.obitelj.id, parentName: d.obitelj.parentName, email: d.obitelj.email, phone: d.obitelj.phone,
        childName: d.childName, childBirthDate: d.childBirth, status: d.status,
        totalCents: total, depositCents: deposit, paidCents: paid,
        gdprConsent: true, marketingConsent: true, qrToken: qrToken(), source: "web",
        addOns: { create: d.addons.map((a) => ({ addOnId: a.id, quantity: a.qty, unitPriceCents: dodatak(a.id).priceCents })) },
        waiver: { create: { signedByName: d.obitelj.parentName, content: "Probna privola roditelja." } },
        payments: { create: { provider: "mock", providerRef: `mock_demo_${code}`, amountCents: paid, kind: d.status === "placeno" ? "puni-iznos" : "akontacija", status: "uspjesno" } },
        staff: { create: { staffId: osoblje.id, roleNote: "animator", notifiedAt: new Date() } },
        checkIn: d.checkin ? { create: { by: osoblje.name } } : undefined,
      },
    });

    // Račun + (mock) fiskalizacija
    const number = `${invSeq++}/POSL1/1`;
    const issuedAt = new Date();
    const { zki, jir } = mockFiskal(number, total, issuedAt);
    await prisma.invoice.create({
      data: {
        number, reservationId: rez.id, totalCents: total, issuedAt,
        items: [
          { naziv: `${paket.name} (${brojDjece(d.broj)})`, kolicina: 1, cijenaCents: total - izracun.dodaciCents, pdvStopa: 25 },
          ...d.addons.map((a) => ({ naziv: dodatak(a.id).name, kolicina: a.qty, cijenaCents: dodatak(a.id).priceCents, pdvStopa: 25 })),
        ],
        jir, zki, fiscalizedAt: issuedAt, businessSpace: "POSL1", cashRegister: "1", status: "fiskaliziran",
      },
    });

    // Log potvrde (kao da je automatika poslala)
    await prisma.notificationLog.create({
      data: { type: "potvrda", channel: "email", recipient: d.obitelj.email, subject: `Potvrda rezervacije ${code}`, body: `Probna potvrda za ${code}.`, reservationId: rez.id, status: "logirano" },
    });
  }

  // --- Poklon-bon -----------------------------------------------------
  await prisma.voucher.create({
    data: { code: "KZ-GIFT-DEMO01", initialCents: 5000, balanceCents: 5000, status: "aktivan", purchaserName: "Baka Maja", recipientName: "Marko Horvat", message: "Sretan rođendan!" },
  });

  // --- Članstvo (demo) -----------------------------------------------
  const obnova = new Date(); obnova.setMonth(obnova.getMonth() + 1);
  await prisma.membership.create({
    data: { familyId: obiteljHorvat.id, plan: "mjesecno", status: "aktivno", renewsAt: obnova, autoRenew: true },
  });

  // --- Ulaznice za slobodnu igru (probne) -------------------------------------
  await prisma.openPlaySession.create({
    data: { childName: "Marko", durationMin: 60, priceCents: 600, status: "aktivna", expiresAt: new Date(Date.now() + 45 * 60000) },
  });
  await prisma.openPlaySession.create({
    data: { childName: "Ena", durationMin: 30, priceCents: 300, status: "istekla", expiresAt: new Date(Date.now() - 10 * 60000) },
  });

  console.log("✅ Baza je napunjena.");
  console.log(`   Prijava administratora: ${admin.email} / ${process.env.ADMIN_PASSWORD ?? "admin123"}`);
  console.log(`   Osoblje: ${osoblje.email} / osoblje123`);
  console.log(`   Roditelj (portal): ${roditelj.email} / roditelj123`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
