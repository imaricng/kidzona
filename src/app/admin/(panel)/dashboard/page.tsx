import { imeProslave } from "@/lib/nepotpuno";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr, brojDjece } from "@/i18n/hr";
import { formatEur, formatDatum, formatDatumVrijeme } from "@/lib/format";
import { pocetciZaDan } from "@/lib/slots";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { pokreniPodsjetnike } from "@/lib/automation";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.nadzornaPloca };

// Prihod, proslave i popunjenost računaju se samo iz potvrđenih rezervacija (ne iz upita).
const AKTIVNI = STATUSI_ZAUZIMAJU_TERMIN;

/** Ručni okidač automatskih podsjetnika (isto što i dnevni cron). */
async function pokreniAutomatiku() {
  "use server";
  await zahtijevajOsoblje();
  await pokreniPodsjetnike();
  revalidatePath("/admin/dashboard");
}

export default async function DashboardPage() {
  const sada = new Date();
  const pocetakMjeseca = new Date(sada.getFullYear(), sada.getMonth(), 1);
  const danOd = new Date(sada); danOd.setHours(0, 0, 0, 0);
  const danDo = new Date(sada); danDo.setHours(23, 59, 59, 999);
  const za30 = new Date(danOd); za30.setDate(za30.getDate() + 30);
  const brojSoba = await prisma.room.count({ where: { active: true } });

  const [prihodAgg, ukupnoRez, danasnje, nadolazece, za30dana, upiti, brojUpita] = await Promise.all([
    prisma.reservation.aggregate({
      _sum: { paidCents: true },
      where: { createdAt: { gte: pocetakMjeseca }, status: { in: AKTIVNI } },
    }),
    prisma.reservation.count({ where: { status: { in: AKTIVNI } } }),
    prisma.reservation.findMany({
      where: { date: { gte: danOd, lte: danDo }, status: { in: AKTIVNI } },
      include: { room: true, package: true },
      orderBy: { slotStart: "asc" },
    }),
    prisma.reservation.findMany({
      where: { date: { gt: danDo }, status: { in: AKTIVNI } },
      include: { room: true, package: true, theme: true },
      orderBy: { date: "asc" },
      take: 8,
    }),
    prisma.reservation.count({ where: { date: { gte: danOd, lte: za30 }, status: { in: AKTIVNI } } }),
    prisma.reservation.findMany({
      where: { status: "upit" },
      include: { room: true, package: true },
      orderBy: { createdAt: "desc" },
      take: 6,
    }),
    prisma.reservation.count({ where: { status: "upit" } }),
  ]);

  // Kapacitet: termini po rasporedu u sljedećih 30 dana × broj igraonica.
  let terminaU30Dana = 0;
  for (let i = 0; i <= 30; i++) {
    const d = new Date(danOd);
    d.setDate(d.getDate() + i);
    terminaU30Dana += pocetciZaDan(d.getDay()).length;
  }
  const ukupnoSlotova = brojSoba * terminaU30Dana;
  const popunjenost = ukupnoSlotova > 0 ? Math.round((za30dana / ukupnoSlotova) * 100) : 0;

  // Broj poruka poslanih danas (vidljivost automatizacije)
  const porukaDanas = await prisma.notificationLog.count({ where: { createdAt: { gte: danOd, lte: danDo } } });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.nadzornaPloca}</h1>
        <div className="flex flex-wrap gap-2">
          <Link href="/admin/rezervacije/nova" className="btn-primary !py-2 !text-sm">✍️ Ručni unos</Link>
          <form action={pokreniAutomatiku}>
            <button type="submit" className="btn-secondary !py-2 !text-sm" title="Pošalji podsjetnike (dan prije), zahvale i rođendanske podsjetnike">
              ⚙️ Pokreni automatiku · danas poslano: {porukaDanas}
            </button>
          </form>
        </div>
      </div>

      {/* Upiti koji čekaju odobrenje */}
      <section className={`card mt-6 ${brojUpita > 0 ? "ring-2 ring-sun-400" : ""}`}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="font-semibold text-ink-800">📨 Upiti koji čekaju odobrenje ({brojUpita})</h2>
          <Link href="/admin/rezervacije?status=upit" className="text-sm text-brand-600 hover:underline">Svi upiti →</Link>
        </div>
        {upiti.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Nema novih upita.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {upiti.map((r) => (
              <li key={r.id}>
                <Link href={`/admin/rezervacije/${r.code}`} className="flex flex-wrap items-center justify-between gap-2 py-3">
                  <span className="min-w-0">
                    <span className="block font-medium text-ink-800">
                      {imeProslave(r)} · {formatDatum(r.date)} u {r.slotStart}
                    </span>
                    <span className="block text-xs text-ink-500">
                      {r.room.name} · {r.package.name} · {brojDjece(r.numChildren)} · poslano {formatDatumVrijeme(r.createdAt)}
                    </span>
                  </span>
                  <span className="btn-secondary !px-3 !py-1.5 !text-sm">Pregledaj →</span>
                </Link>
              </li>
            ))}
          </ul>
        )}
      </section>

      <div className="mt-6 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <KpiKartica naslov={hr.admin.prihodMjesec} vrijednost={formatEur(prihodAgg._sum.paidCents ?? 0)} ikona="💶" />
        <KpiKartica naslov={hr.admin.rezervacijaUkupno} vrijednost={String(ukupnoRez)} ikona="🎟️" />
        <KpiKartica naslov={hr.admin.danasnjeProslave} vrijednost={String(danasnje.length)} ikona="🎂" />
        <KpiKartica naslov={hr.admin.popunjenost} vrijednost={`${popunjenost}%`} ikona="📈" />
      </div>

      <div className="mt-8 grid gap-6 lg:grid-cols-2">
        {/* Današnje proslave */}
        <section className="card">
          <h2 className="font-semibold text-ink-800">{hr.admin.danasnjeProslave} — {formatDatum(sada)}</h2>
          {danasnje.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">{hr.admin.nemaProslava}</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {danasnje.map((r) => (
                <li key={r.id} className="flex items-center justify-between gap-2 rounded-2xl bg-brand-50 px-4 py-3">
                  <div className="min-w-0">
                    <p className="truncate font-medium text-ink-800">{r.slotStart} · {r.room.name}</p>
                    <p className="truncate text-xs text-ink-500">{imeProslave(r)} · {r.package.name} · {brojDjece(r.numChildren)}</p>
                  </div>
                  <StatusBadge status={r.status} />
                </li>
              ))}
            </ul>
          )}
        </section>

        {/* Nadolazeće */}
        <section className="card">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-800">{hr.admin.nadolazece}</h2>
            <Link href="/admin/rezervacije" className="text-sm text-brand-600 hover:underline">Sve →</Link>
          </div>
          {nadolazece.length === 0 ? (
            <p className="mt-4 text-sm text-ink-400">Nema nadolazećih proslava.</p>
          ) : (
            <ul className="mt-4 space-y-3">
              {nadolazece.map((r) => (
                <li key={r.id}>
                  <Link href={`/admin/rezervacije/${r.code}`} className="flex items-center justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate font-medium text-ink-800">
                        {r.theme?.emoji} {imeProslave(r)} <span className="text-ink-400">({r.code})</span>
                      </p>
                      <p className="truncate text-xs text-ink-500">{formatDatum(r.date)} · {r.slotStart} · {r.room.name}</p>
                    </div>
                    <StatusBadge status={r.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </section>
      </div>
    </div>
  );
}

function KpiKartica({ naslov, vrijednost, ikona }: { naslov: string; vrijednost: string; ikona: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">{naslov}</span>
        <span className="text-2xl" aria-hidden>{ikona}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{vrijednost}</p>
    </div>
  );
}
