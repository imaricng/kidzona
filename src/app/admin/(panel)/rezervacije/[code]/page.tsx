import Link from "next/link";
import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr, brojDjece } from "@/i18n/hr";
import { formatDatumDugi, formatDatumVrijeme, formatEur } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { predlozakPodsjetnika, predlozakZahvale } from "@/lib/notifications/templates";
import { otkaziRezervaciju, izmijeniTermin, izdajRacun } from "@/lib/reservations";
import { SVI_POCETCI, krajTermina } from "@/lib/slots";

export const dynamic = "force-dynamic";

// --- Server actions ---------------------------------------------------
async function promijeniStatus(code: string, status: string) {
  "use server";
  const r = await prisma.reservation.findUniqueOrThrow({ where: { code } });
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
  await otkaziRezervaciju(code, true);
  revalidatePath(`/admin/rezervacije/${code}`);
}

async function izmijeniTerminAction(formData: FormData) {
  "use server";
  const code = String(formData.get("code"));
  const [slotStart, slotEnd] = String(formData.get("slot")).split("|");
  await izmijeniTermin({
    code,
    dateISO: String(formData.get("date")),
    slotStart,
    slotEnd,
    roomId: String(formData.get("roomId")),
  });
  revalidatePath(`/admin/rezervacije/${code}`);
}

export default async function RezervacijaDetalj({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const sobe = await prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } });
  const r = await prisma.reservation.findUnique({
    where: { code },
    include: {
      room: true, secondRoom: true, package: true, theme: true,
      addOns: { include: { addOn: true } },
      invoices: true, payments: true, waiver: true, checkIn: true,
      staff: { include: { staff: true } },
      notifications: { orderBy: { createdAt: "desc" } },
      family: { include: { children: true } },
    },
  });
  if (!r) notFound();
  const racun = r.invoices[0];

  return (
    <div className="mx-auto max-w-4xl">
      <Link href="/admin/rezervacije" className="text-sm text-ink-500 hover:text-ink-800">← {hr.admin.rezervacije}</Link>
      <div className="mt-2 flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">
          {r.theme?.emoji} {r.code}
        </h1>
        <StatusBadge status={r.status} />
      </div>

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
              <Red n="E-pošta" v={r.email} />
              <Red n="Telefon" v={r.phone ?? "—"} />
              {r.family && <Red n="Obitelj u bazi" v={`${brojDjece(r.family.children.length)} u bazi`} />}
            </dl>
          </div>
          <div className="card">
            <h2 className="font-semibold text-ink-800">Naplata</h2>
            <dl className="mt-3 space-y-2 text-sm">
              <Red n="Ukupno" v={formatEur(r.totalCents)} />
              <Red n="Akontacija" v={formatEur(r.depositCents)} />
              <Red n="Plaćeno" v={formatEur(r.paidCents)} />
              <Red n="Ostatak" v={formatEur(r.totalCents - r.paidCents)} />
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

      {/* Akcije */}
      <section className="card mt-6">
        <h2 className="font-semibold text-ink-800">Radnje</h2>
        <div className="mt-3 flex flex-wrap gap-2">
          <Akcija action={promijeniStatus.bind(null, code, "placeno")} label="Označi plaćeno" />
          <Akcija action={promijeniStatus.bind(null, code, "zavrseno")} label="Označi završeno" />
          <Akcija action={posaljiPodsjetnik.bind(null, code)} label="📨 Pošalji podsjetnik" />
          <Akcija action={posaljiZahvalu.bind(null, code)} label="💛 Pošalji zahvalu i molbu za recenziju" />
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

      {/* Izmjena termina */}
      {r.status !== "otkazano" && (
        <section className="card mt-6">
          <h2 className="font-semibold text-ink-800">Izmjena termina</h2>
          <form action={izmijeniTerminAction} className="mt-3 flex flex-wrap items-end gap-3">
            <input type="hidden" name="code" value={code} />
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Datum</span>
              <input name="date" type="date" defaultValue={r.date.toISOString().slice(0, 10)} className="input !py-2" />
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Termin</span>
              <select name="slot" defaultValue={`${r.slotStart}|${r.slotEnd}`} className="input !py-2">
                {[...new Set([r.slotStart, ...SVI_POCETCI])].sort().map((start) => {
                  // Kraj prema trajanju paketa rezervacije (trenutni termin ostaje kakav jest).
                  const end = start === r.slotStart ? r.slotEnd : krajTermina(start, r.package.durationMin);
                  return <option key={start} value={`${start}|${end}`}>{start}–{end}</option>;
                })}
              </select>
            </label>
            <label className="block">
              <span className="mb-1 block text-xs font-medium text-ink-500">Igraonica</span>
              <select name="roomId" defaultValue={r.roomId} className="input !py-2">
                {sobe.map((s) => <option key={s.id} value={s.id}>{s.name}</option>)}
              </select>
            </label>
            <button type="submit" className="btn-primary !py-2">Premjesti</button>
          </form>
          <p className="mt-2 text-xs text-ink-400">Provjerava dostupnost; ako je novi termin zauzet, izmjena se neće izvršiti.</p>
        </section>
      )}

      {/* Log poruka */}
      <section className="card mt-6">
        <h2 className="font-semibold text-ink-800">Automatske poruke ({r.notifications.length})</h2>
        <ul className="mt-3 space-y-2 text-sm">
          {r.notifications.map((n) => (
            <li key={n.id} className="flex items-center justify-between gap-2 border-b border-black/5 pb-2">
              <span className="text-ink-700">{n.subject ?? n.type}</span>
              <span className="text-xs text-ink-400">{n.type} · {n.channel === "email" ? "e-pošta" : n.channel.toUpperCase()} · {formatDatumVrijeme(n.createdAt)}</span>
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
      <dd className="text-right font-medium text-ink-800">{v}</dd>
    </div>
  );
}
