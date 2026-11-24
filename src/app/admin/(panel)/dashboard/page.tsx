import { imeProslave } from "@/lib/nepotpuno";
import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hr, brojDjece } from "@/i18n/hr";
import { formatEur, formatDatum, formatDatumVrijeme } from "@/lib/format";
import { pocetciZaDan, trajanjeSati } from "@/lib/slots";
import { godineNaProslavi } from "@/lib/pozivnica";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { pokreniPodsjetnike } from "@/lib/automation";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { prihodMjeseca } from "@/lib/prihod";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { PrihodKartica } from "@/components/admin/PrihodKartica";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.nadzornaPloca };

// Proslave i popunjenost računaju se samo iz potvrđenih rezervacija (ne iz upita); prihod je u `lib/prihod`.
const AKTIVNI = STATUSI_ZAUZIMAJU_TERMIN;
// Potvrđene proslave koje tek slijede — završene se ne broje.
const POTVRDJENE = ["potvrdjeno", "placeno", "checkin"];

/** Ručni okidač automatskih podsjetnika (isto što i dnevni cron). */
async function pokreniAutomatiku() {
  "use server";
  await zahtijevajOsoblje();
  const r = await pokreniPodsjetnike();
  revalidatePath("/admin/dashboard");
  // Rezultat ide u adresu da ga stranica može prikazati — inače klik izgleda kao da ništa nije napravio.
  redirect(`/admin/dashboard?automatika=${r.podsjetniciTjedan}-${r.podsjetnici}-${r.zahvale}-${r.rodjendani}`);
}

/** „1-2-1-0" → čitljiv sažetak onoga što je automatika upravo poslala. */
function sazetakAutomatike(kod: string | undefined): string | null {
  const m = /^(\d+)-(\d+)-(\d+)-(\d+)$/.exec(kod ?? "");
  if (!m) return null;
  const [t, p, z, r] = [Number(m[1]), Number(m[2]), Number(m[3]), Number(m[4])];
  if (t + p + z + r === 0) return "Automatika je pokrenuta — danas nije bilo ničega za poslati.";
  const dijelovi = [
    t ? `${t} podsjetnik(a) za proslave za 7 dana` : null,
    p ? `${p} podsjetnik(a) za proslave za 3 dana` : null,
    z ? `${z} zahvala za jučerašnje proslave` : null,
    r ? `${r} rođendanskih ponuda` : null,
  ].filter(Boolean);
  return `Automatika je poslala: ${dijelovi.join(", ")}.`;
}

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ automatika?: string }> }) {
  const { automatika } = await searchParams;
  const porukaAutomatike = sazetakAutomatike(automatika);
  const sada = new Date();
  const danOd = new Date(sada); danOd.setHours(0, 0, 0, 0);
  const danDo = new Date(sada); danDo.setHours(23, 59, 59, 999);
  const za30 = new Date(danOd); za30.setDate(za30.getDate() + 30);
  const pocetakIducegMjeseca = new Date(sada.getFullYear(), sada.getMonth() + 1, 1);
  const pocetakZaDvaMjeseca = new Date(sada.getFullYear(), sada.getMonth() + 2, 1);
  const brojSoba = await prisma.room.count({ where: { active: true } });

  const [prihod, potvrdjeneUkupno, potvrdjeneOvajMjesec, potvrdjeneIduciMjesec, danasnje, nadolazece, za30dana, upiti, brojUpita] = await Promise.all([
    prihodMjeseca(sada),
    prisma.reservation.count({ where: { date: { gte: danOd }, status: { in: POTVRDJENE } } }),
    prisma.reservation.count({ where: { date: { gte: danOd, lt: pocetakIducegMjeseca }, status: { in: POTVRDJENE } } }),
    prisma.reservation.count({ where: { date: { gte: pocetakIducegMjeseca, lt: pocetakZaDvaMjeseca }, status: { in: POTVRDJENE } } }),
    prisma.reservation.findMany({
      where: { date: { gte: danOd, lte: danDo }, status: { in: AKTIVNI } },
      include: { room: true, secondRoom: true, package: true, theme: true, addOns: { include: { addOn: true } } },
      orderBy: [{ slotStart: "asc" }, { room: { sortOrder: "asc" } }],
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

  // Današnje e-poruke (potvrde, obavijesti osoblju, podsjetnici…) — upisi u kalendar se ne broje.
  const porukaDanas = await prisma.notificationLog.count({
    where: { createdAt: { gte: danOd, lte: danDo }, channel: "email", status: "poslano" },
  });

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.nadzornaPloca}</h1>
        {/* Na mobitelu skriveno — iste su radnje u izborniku, a traka ostaje čista. */}
        <div className="hidden flex-wrap gap-2 sm:flex">
          <Link href="/admin/rezervacije/nova" className="btn-primary !py-2 !text-sm">✍️ Ručni unos</Link>
          <Link href="/admin/poruke" className="btn-secondary !py-2 !text-sm" title="Pregled svega što je poslano kupcima i osoblju">
            📨 Poslane poruke · danas {porukaDanas}
          </Link>
          <form action={pokreniAutomatiku}>
            <button
              type="submit"
              className="btn-secondary !py-2 !text-sm"
              title="Odmah pošalji ono što inače ide svako jutro: podsjetnike za proslave za 7 i za 3 dana, zaostale zahvale za jučerašnje i rođendanske ponude"
            >
              ⚙️ Pokreni automatiku
            </button>
          </form>
        </div>
      </div>

      {porukaAutomatike && (
        <p className="mt-4 rounded-2xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">
          {porukaAutomatike}{" "}
          <Link href="/admin/poruke" className="underline">Pogledaj poslane poruke</Link>
        </p>
      )}

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
        <PrihodKartica
          naslov={hr.admin.prihodMjesec}
          vrijednost={formatEur(prihod.ukupnoCents)}
          rodjendani={formatEur(prihod.rodjendaniCents)}
          dnevnaIgra={formatEur(prihod.dnevnaIgraCents)}
        />
        <KpiKartica
          naslov={hr.admin.rezervacijaUkupno}
          vrijednost={String(potvrdjeneUkupno)}
          ikona="🎟️"
          napomena={`Još ovaj mjesec ${potvrdjeneOvajMjesec} · Idući mjesec ${potvrdjeneIduciMjesec}`}
        />
        <KpiKartica naslov={hr.admin.danasnjeProslave} vrijednost={String(danasnje.length)} ikona="🎂" />
        <KpiKartica naslov={hr.admin.popunjenost} vrijednost={`${popunjenost}%`} ikona="📈" />
      </div>

      {/* Današnje proslave — kartice za pripremu igraonica */}
      <section className="card mt-8">
        <h2 className="font-semibold text-ink-800">{hr.admin.danasnjeProslave} — {formatDatum(sada)}</h2>
        {danasnje.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">{hr.admin.nemaProslava}</p>
        ) : (
          <ul className="mt-4 grid gap-4 sm:grid-cols-2 xl:grid-cols-3">
            {danasnje.map((r) => {
              const godine = godineNaProslavi(r);
              const dodaci = r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ");
              return (
                <li key={r.id}>
                  <Link
                    href={`/admin/rezervacije/${r.code}`}
                    className="flex h-full flex-col rounded-2xl bg-brand-50 p-4 ring-1 ring-brand-100 transition hover:ring-brand-300"
                  >
                    <div className="flex items-start justify-between gap-2">
                      <p className="font-display text-lg font-extrabold text-brand-700">
                        {r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name}
                      </p>
                      <StatusBadge status={r.status} />
                    </div>
                    <p className="mt-1 text-2xl font-bold tabular-nums text-ink-900">
                      {r.slotStart} – {r.slotEnd}
                    </p>
                    <p className="text-xs text-ink-500">{trajanjeSati(r.package.durationMin)}</p>
                    <p className="mt-3 font-semibold text-ink-800">
                      🎂 {imeProslave(r)}
                      {godine ? ` · ${godine}. rođendan` : ""}
                    </p>
                    <dl className="mt-2 space-y-1 text-sm">
                      <KarticaRed n="Paket" v={`${r.package.name} · ${brojDjece(r.numChildren)}`} />
                      <KarticaRed n="Tema" v={r.theme ? `${r.theme.emoji} ${r.theme.name}` : "bez teme"} />
                      {dodaci && <KarticaRed n="Dodaci" v={dodaci} />}
                      {r.notes && <KarticaRed n="Napomene" v={r.notes} />}
                    </dl>
                  </Link>
                </li>
              );
            })}
          </ul>
        )}
      </section>

      {/* Nadolazeće */}
      <section className="card mt-8">
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
  );
}

function KarticaRed({ n, v }: { n: string; v: string }) {
  return (
    <div className="flex gap-2">
      <dt className="w-20 shrink-0 text-ink-500">{n}</dt>
      <dd className="min-w-0 break-words text-ink-800">{v}</dd>
    </div>
  );
}

function KpiKartica({ naslov, vrijednost, ikona, napomena }: { naslov: string; vrijednost: string; ikona: string; napomena?: string }) {
  return (
    <div className="card">
      <div className="flex items-center justify-between">
        <span className="text-sm text-ink-500">{naslov}</span>
        <span className="text-2xl" aria-hidden>{ikona}</span>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{vrijednost}</p>
      {napomena && <p className="mt-1 text-xs text-ink-500">{napomena}</p>}
    </div>
  );
}
