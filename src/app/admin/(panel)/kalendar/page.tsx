import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum, isoDatum } from "@/lib/format";
import { druzionicaZaDan, krajTermina, pocetciZaDan, preklapaSe } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.kalendar };

const AKTIVNI = ["upit", "potvrdjeno", "placeno", "checkin", "zavrseno"];
const DANA = 7;

export default async function KalendarPage({ searchParams }: { searchParams: Promise<{ od?: string }> }) {
  const { od } = await searchParams;
  const start = od && /^\d{4}-\d{2}-\d{2}$/.test(od) ? new Date(`${od}T00:00:00`) : (() => { const d = new Date(); d.setHours(0, 0, 0, 0); return d; })();

  const kraj = new Date(start); kraj.setDate(kraj.getDate() + DANA); kraj.setHours(23, 59, 59, 999);
  const prethodni = new Date(start); prethodni.setDate(prethodni.getDate() - DANA);
  const sljedeci = new Date(start); sljedeci.setDate(sljedeci.getDate() + DANA);

  const [sobe, rezervacije] = await Promise.all([
    prisma.room.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
    prisma.reservation.findMany({
      where: { date: { gte: start, lte: kraj }, status: { in: AKTIVNI } },
      include: { room: true, theme: true },
    }),
  ]);

  const dani = Array.from({ length: DANA }, (_, i) => {
    const d = new Date(start); d.setDate(d.getDate() + i); return d;
  });

  /** Redovi za dan: početci po rasporedu + početci postojećih rezervacija (npr. ručno premještenih). */
  function redoviZa(dan: Date): string[] {
    const pocetci = new Set(pocetciZaDan(dan.getDay()));
    for (const r of rezervacije) {
      if (isoDatum(r.date) === isoDatum(dan)) pocetci.add(r.slotStart);
    }
    return [...pocetci].sort();
  }

  /** Rezervacija koja je u tijeku u trenutku početka reda. */
  function rezervacijaZa(dan: Date, pocetak: string, roomId: string) {
    const trenutak = { start: pocetak, end: krajTermina(pocetak, 1) };
    return rezervacije.find(
      (r) =>
        isoDatum(r.date) === isoDatum(dan) &&
        (r.roomId === roomId || r.secondRoomId === roomId) &&
        preklapaSe({ start: r.slotStart, end: r.slotEnd }, trenutak),
    );
  }

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.kalendar}</h1>
        <div className="flex items-center gap-2">
          <Link href={`/admin/kalendar?od=${isoDatum(prethodni)}`} className="btn-secondary !px-3 !py-2 !text-sm">← Prethodni</Link>
          <span className="text-sm text-ink-500">{formatDatum(start)} – {formatDatum(dani[DANA - 1])}</span>
          <Link href={`/admin/kalendar?od=${isoDatum(sljedeci)}`} className="btn-secondary !px-3 !py-2 !text-sm">Sljedeći →</Link>
        </div>
      </div>

      <p className="mt-2 text-sm text-ink-500">
        Potvrđene rezervacije automatski blokiraju termin i igraonicu. Kraj termina ovisi o paketu (Standard 2 h, Premium 3 h).
      </p>

      <div className="mt-6 space-y-6">
        {dani.map((dan) => {
          const redovi = redoviZa(dan);
          const druzionica = druzionicaZaDan(dan.getDay());
          return (
            <div key={isoDatum(dan)} className="card overflow-x-auto">
              <h2 className="font-semibold text-ink-800">{formatDatum(dan)}</h2>
              {druzionica.length > 0 && (
                <p className="mt-1 text-xs text-ink-500">🧸 Družionica: {druzionica.map((d) => `${d.od} – ${d.do}`).join(", ")}</p>
              )}
              {redovi.length === 0 ? (
                <p className="mt-3 text-sm text-ink-400">Nema termina za proslave.</p>
              ) : (
                <table className="mt-3 w-full min-w-[640px] border-separate border-spacing-1 text-sm">
                  <thead>
                    <tr>
                      <th className="w-28 text-left text-xs font-medium text-ink-400">Početak</th>
                      {sobe.map((s) => (
                        <th key={s.id} className="text-left text-xs font-medium text-ink-500">
                          <span className="inline-flex items-center gap-1">
                            <span className="h-2.5 w-2.5 rounded-full" style={{ backgroundColor: s.color }} /> {s.name}
                          </span>
                        </th>
                      ))}
                    </tr>
                  </thead>
                  <tbody>
                    {redovi.map((pocetak) => (
                      <tr key={pocetak}>
                        <td className="text-xs font-medium text-ink-500">{pocetak}</td>
                        {sobe.map((s) => {
                          const r = rezervacijaZa(dan, pocetak, s.id);
                          return (
                            <td key={s.id}>
                              {r ? (
                                <Link
                                  href={`/admin/rezervacije/${r.code}`}
                                  className="block truncate rounded-lg px-2 py-1.5 text-xs font-medium text-white"
                                  style={{ backgroundColor: s.color }}
                                  title={`${r.code} · ${r.parentName}`}
                                >
                                  {r.theme?.emoji} {r.childName ?? r.parentName} · {r.slotStart}–{r.slotEnd}
                                </Link>
                              ) : (
                                <div className="rounded-lg bg-mint-50 px-2 py-1.5 text-center text-xs text-mint-600">slobodno</div>
                              )}
                            </td>
                          );
                        })}
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>
          );
        })}
      </div>
    </div>
  );
}
