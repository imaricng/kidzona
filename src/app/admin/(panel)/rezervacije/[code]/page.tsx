import Link from "next/link";
import { notFound, redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr, brojDjece } from "@/i18n/hr";
import { formatDatumDugi, formatDatumVrijeme, formatEur } from "@/lib/format";
import { lokalniISO } from "@/lib/slots";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { RezervacijaForma } from "@/components/admin/RezervacijaForma";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { predlozakPodsjetnika, predlozakZahvale } from "@/lib/notifications/templates";
import { otkaziRezervaciju, izdajRacun } from "@/lib/reservations";
import { odbijUpitAkcija, odobriUpitAkcija, spremiIzmjene } from "../akcije";

export const dynamic = "force-dynamic";

const PORUKE: Record<string, string> = {
  odobreno: "✅ Upit je odobren — termin je zauzet, a kupac je dobio potvrdu.",
  odbijeno: "Upit je odbijen i kupac je obaviješten.",
  spremljeno: "✅ Rezervacija je spremljena.",
};

// --- Server actions ---------------------------------------------------
async function promijeniStatus(code: string, status: string) {
  "use server";
  await zahtijevajOsoblje();
  const r = await prisma.reservation.findUniqueOrThrow({ where: { code } });
  // Paket s cijenom po dogovoru: bez upisanog iznosa nema što naplatiti ni fiskalizirati.
  if (status === "placeno" && r.totalCents <= 0) {
    redirect(`/admin/rezervacije/${code}?greska=${encodeURIComponent("Najprije upišite dogovorenu cijenu (uređivanje niže), pa označite plaćeno.")}`);
  }
  // Kod plaćanja uživo: kad osoblje označi "plaćeno", evidentira se uplata,
  // bilježi se plaćanje i izdaje fiskalizirani račun.
  if (status === "placeno") {
    const preostalo = r.totalCents - r.paidCents;
    if (preostalo > 0) {
      await prisma.payment.create({
        data: { reservationId: r.id, provider: "gotovina", amountCents: preostalo, kind: "puni-iznos", status: "uspjesno" },
      });
    }
    await prisma.reservation.update({ where: { code }, data: { status, paidCents: r.totalCents } });
    await izdajRacun(r.id);
  } else {
    await prisma.reservation.update({ where: { code }, data: { status } });
  }
  revalidatePath(`/admin/rezervacije/${code}`);
}

async function posaljiPodsjetnik(code: string) {
  "use server";
  await zahtijevajOsoblje();
  const r = await prisma.reservation.findUniqueOrThrow({ where: { code }, include: { room: true, secondRoom: true, package: true } });
  const p = predlozakPodsjetnika({
    code: r.code, parentName: r.parentName, childName: r.childName, date: r.date,
    slotStart: r.slotStart, slotEnd: r.slotEnd,
    roomName: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name,
    packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents,
  });
  await posaljiIZabiljezi({ tip: "podsjetnik", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
  revalidatePath(`/admin/rezervacije/${code}`);
}

async function posaljiZahvalu(code: string) {
  "use server";
  await zahtijevajOsoblje();
  const r = await prisma.reservation.findUniqueOrThrow({ where: { code }, include: { room: true, secondRoom: true, package: true } });
  const p = predlozakZahvale(
    { code: r.code, parentName: r.parentName, childName: r.childName, date: r.date, slotStart: r.slotStart, slotEnd: r.slotEnd, roomName: r.room.name, packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents },
    `${env.appUrl}/recenzija`,
  );
  await posaljiIZabiljezi({ tip: "zahvala", kanal: "email", primatelj: r.email, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
  revalidatePath(`/admin/rezervacije/${code}`);
}

async function otkaziUzPovrat(code: string) {
  "use server";
  await zahtijevajOsoblje();
  await otkaziRezervaciju(code, true);
  revalidatePath(`/admin/rezervacije/${code}`);
}

export default async function RezervacijaDetalj({
  params,
  searchParams,
}: {
  params: Promise<{ code: string }>;
  searchParams: Promise<{ poruka?: string; greska?: string }>;
}) {
  const { code } = await params;
  const { poruka, greska } = await searchParams;
  const [r, sobe, paketi, teme] = await Promise.all([
    prisma.reservation.findUnique({
      where: { code },
      include: {
        room: true, secondRoom: true, package: true, theme: true,
        addOns: { include: { addOn: true } },
        invoices: true, payments: true, waiver: true, checkIn: true,
        staff: { include: { staff: true } },
        notifications: { orderBy: { createdAt: "desc" } },
        family: { include: { children: true } },
      },
    }),
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.package.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  if (!r) notFound();
  const racun = r.invoices[0];
  const jeUpit = r.status === "upit";
  const potvrdjena = STATUSI_ZAUZIMAJU_TERMIN.includes(r.status);
  const mozeUredivati = r.status !== "otkazano" && r.status !== "odbijeno";

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rezervacije" className="text-sm text-ink-500 hover:text-ink-800">← {hr.admin.rezervacije}</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {r.theme?.emoji} {r.code}
        </h1>
        <StatusBadge status={r.status} />
      </div>

      {poruka && PORUKE[poruka] && (
        <p className="mt-4 rounded-2xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">{PORUKE[poruka]}</p>
      )}
      {greska && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{greska}</p>
      )}

      {/* Upit čeka odluku */}
      {jeUpit && (
        <section className="card mt-6 ring-2 ring-sun-400">
          <h2 className="font-display text-xl font-bold text-brand-900">📨 Upit čeka odobrenje</h2>
          <p className="mt-1 text-sm text-ink-500">
            Poslan {formatDatumVrijeme(r.createdAt)}. Upit još ne zauzima termin. Po potrebi ga najprije uredite (niže),
            zatim odobrite ili odbijte — kupac dobiva obavijest e-poštom.
          </p>
          <div className="mt-4 grid gap-4 md:grid-cols-2">
            <form action={odobriUpitAkcija} className="flex flex-col rounded-2xl bg-mint-500/10 p-4">
              <input type="hidden" name="code" value={r.code} />
              <p className="flex-1 text-sm text-ink-700">Odobrenjem se termin zauzima, a kupcu se šalje potvrda s QR kodom.</p>
              <button type="submit" className="btn-primary mt-3 w-full">✅ Odobri upit</button>
            </form>
            <form action={odbijUpitAkcija} className="rounded-2xl bg-red-50 p-4">
              <input type="hidden" name="code" value={r.code} />
              <label className="label" htmlFor="razlog">Razlog (šalje se kupcu, nije obvezno)</label>
              <textarea id="razlog" name="razlog" rows={2} className="input" placeholder="npr. termin je već zauzet" />
              <ConfirmSubmit poruka={`Odbiti upit ${r.code}? Kupac će dobiti obavijest.`} className="btn-secondary mt-3 w-full !text-red-600">
                Odbij upit
              </ConfirmSubmit>
            </form>
          </div>
        </section>
      )}

      <div className="mt-6 grid gap-6 md:grid-cols-2">
        {/* Detalji */}
        <section className="card">
          <h2 className="font-semibold text-ink-800">Proslava</h2>
          <dl className="mt-3 space-y-2 text-sm">
            <Red n="Datum" v={formatDatumDugi(r.date)} />
            <Red n="Termin" v={`${r.slotStart} – ${r.slotEnd}`} />
            <Red n="Igraonica" v={r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name} />
            <Red n="Paket" v={`${r.package.name} (${brojDjece(r.numChildren)})`} />
            <Red n="Broj odraslih" v={String(r.numAdults)} />
            {r.theme && <Red n="Tema" v={`${r.theme.emoji} ${r.theme.name}`} />}
            <Red n="Slavljenik" v={r.childName ?? "—"} />
            <Red n="Dodaci" v={r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ") || "—"} />
            <Red n="Napomene" v={r.notes || "—"} />
            <Red n="Izvor" v={r.source === "admin" ? "ručni unos" : r.source === "web" ? "web upit" : r.source ?? "—"} />
            <Red n="Privola za obradu podataka" v={r.gdprConsent ? "da" : "ne"} />
            <Red n="Privola za marketing" v={r.marketingConsent ? "da" : "ne"} />
            <Red n="Izjava roditelja" v={r.waiver ? `potpisana (${r.waiver.signedByName})` : "—"} />
            <Red n="Prijava dolaska" v={r.checkIn ? formatDatumVrijeme(r.checkIn.checkedInAt) : "—"} />
          </dl>
        </section>

        {/* Kontakt + naplata */}
        <section className="space-y-6">
          <div className="card">
            <h2 className="font-semibold text-ink-800">Kontakt</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Red n="Roditelj" v={r.parentName} />
              <Red n="E-pošta" v={r.email || "—"} />
              <Red n="Telefon" v={r.phone ?? "—"} />
              {r.family && <Red n="Obitelj u bazi" v={`${brojDjece(r.family.children.length)} u bazi`} />}
            </dl>
          </div>
          <div className="card">
            <h2 className="font-semibold text-ink-800">Naplata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Red n={jeUpit ? "Okvirna cijena" : "Ukupno"} v={r.totalCents > 0 ? formatEur(r.totalCents) : "Po dogovoru (upišite iznos)"} />
              <Red n="Akontacija" v={formatEur(r.depositCents)} />
              <Red n="Plaćeno" v={formatEur(r.paidCents)} />
              <Red n="Ostatak" v={r.totalCents > 0 ? formatEur(r.totalCents - r.paidCents) : "—"} />
            </dl>
            {racun && (
              <div className="mt-3 rounded-2xl bg-ink-50 px-4 py-3 text-xs text-ink-600">
                <p className="font-semibold text-ink-800">Račun {racun.number} ({racun.status})</p>
                <p>JIR: {racun.jir ?? "—"}</p>
                <p>ZKI: {racun.zki ?? "—"}</p>
                <p className="mt-1 text-ink-400">Račun je fiskaliziran.</p>
              </div>
            )}
          </div>
        </section>
      </div>

      {/* Radnje za potvrđenu rezervaciju */}
      {potvrdjena && (
        <section className="card mt-6">
          <h2 className="font-semibold text-ink-800">Radnje</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            <Akcija action={promijeniStatus.bind(null, code, "placeno")} label="Označi plaćeno" />
            <Akcija action={promijeniStatus.bind(null, code, "zavrseno")} label="Označi završeno" />
            {r.email && <Akcija action={posaljiPodsjetnik.bind(null, code)} label="📨 Pošalji podsjetnik" />}
            {r.email && <Akcija action={posaljiZahvalu.bind(null, code)} label="💛 Pošalji zahvalu i molbu za recenziju" />}
            {racun && <a href={`/admin/racun/${racun.id}`} target="_blank" className="btn-secondary">🧾 Ispis računa (PDF)</a>}
            <form action={otkaziUzPovrat.bind(null, code)}>
              <ConfirmSubmit poruka={`Otkazati ${code} uz povrat uplaćenog iznosa?`} className="btn-secondary !text-red-600">
                Otkaži i vrati uplatu
              </ConfirmSubmit>
            </form>
          </div>
          {r.staff.length > 0 && (
            <p className="mt-4 text-sm text-ink-500">
              Dodijeljeno osoblje: {r.staff.map((s) => s.staff.name).join(", ")}
            </p>
          )}
        </section>
      )}

      {/* Uređivanje */}
      {mozeUredivati && (
        <section className="card mt-6">
          <h2 className="font-semibold text-ink-800">✏️ Uredi {jeUpit ? "upit" : "rezervaciju"}</h2>
          <p className="mt-1 text-sm text-ink-500">
            Kraj termina i cijena računaju se iz paketa; dodaci i uplate ostaju.{" "}
            {jeUpit
              ? "Nakon izmjena upit možete odmah odobriti gumbom „Spremi i odobri”."
              : "Za potvrđenu rezervaciju provjerava se je li novi termin slobodan."}
          </p>
          <div className="mt-4">
            <RezervacijaForma
              akcija={spremiIzmjene}
              code={r.code}
              jeUpit={jeUpit}
              sobe={sobe.map((s) => ({ id: s.id, name: s.name, maxChildren: s.maxChildren }))}
              paketi={paketi.map((p) => ({
                id: p.id,
                name: p.name,
                roomId: p.roomId,
                durationMin: p.durationMin,
                basePriceCents: p.basePriceCents,
                perChildCents: p.perChildCents,
                cijenaPoDogovoru: p.cijenaPoDogovoru,
                minChildren: p.minChildren,
                maxChildren: p.maxChildren,
              }))}
              teme={teme.map((t) => ({ id: t.id, name: t.name, emoji: t.emoji }))}
              pocetno={{
                dateISO: lokalniISO(r.date),
                slotStart: r.slotStart,
                roomId: r.roomId,
                packageId: r.packageId,
                themeId: r.themeId ?? "",
                numChildren: String(r.numChildren),
                numAdults: String(r.numAdults),
                parentName: r.parentName,
                email: r.email,
                phone: r.phone ?? "",
                childName: r.childName ?? "",
                childBirthDate: r.childBirthDate ? r.childBirthDate.toISOString().slice(0, 10) : "",
                napomene: r.notes ?? "",
                dogovorenaCijena: r.package.cijenaPoDogovoru && r.totalCents > 0 ? (r.totalCents / 100).toFixed(2) : "",
              }}
            />
          </div>
        </section>
      )}

      {/* Log poruka */}
      <section className="card mt-6">
        <h2 className="font-semibold text-ink-800">Automatske poruke ({r.notifications.length})</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {r.notifications.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 border-b border-black/5 pb-2">
              <span className="text-ink-700">{n.subject ?? n.type}</span>
              <span className="text-xs text-ink-400">{n.recipient || "—"} · {n.channel === "email" ? "e-pošta" : n.channel.toUpperCase()} · {formatDatumVrijeme(n.createdAt)}</span>
            </li>
          ))}
          {r.notifications.length === 0 && <li className="text-ink-400">Nema poruka.</li>}
        </ul>
      </section>
    </div>
  );
}

function Akcija({ action, label, opasno }: { action: () => Promise<void>; label: string; opasno?: boolean }) {
  return (
    <form action={action}>
      <button type="submit" className={opasno ? "btn-secondary !text-red-600" : "btn-secondary"}>{label}</button>
    </form>
  );
}

function Red({ n, v }: { n: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{n}</dt>
      <dd className="whitespace-pre-line text-right font-medium text-ink-800">{v}</dd>
    </div>
  );
}
