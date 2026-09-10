import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum, formatEur } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.rezervacije };

const FILTERI = [
  { key: "sve", label: "Sve" },
  { key: "potvrdjeno", label: hr.status.potvrdjeno },
  { key: "placeno", label: hr.status.placeno },
  { key: "checkin", label: hr.status.checkin },
  { key: "zavrseno", label: hr.status.zavrseno },
  { key: "otkazano", label: hr.status.otkazano },
];

export default async function RezervacijePage({ searchParams }: { searchParams: Promise<{ status?: string }> }) {
  const { status } = await searchParams;
  const filter = status && status !== "sve" ? { status } : {};

  const rezervacije = await prisma.reservation.findMany({
    where: filter,
    include: { room: true, secondRoom: true, package: true, theme: true },
    orderBy: { date: "desc" },
    take: 100,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.rezervacije}</h1>

      <div className="mt-4 flex flex-wrap gap-2">
        {FILTERI.map((f) => {
          const aktivno = (status ?? "sve") === f.key;
          return (
            <Link
              key={f.key}
              href={f.key === "sve" ? "/admin/rezervacije" : `/admin/rezervacije?status=${f.key}`}
              className={`chip ${aktivno ? "bg-brand-500 text-white" : "bg-white text-ink-600 ring-1 ring-ink-200"}`}
            >
              {f.label}
            </Link>
          );
        })}
      </div>

      <div className="mt-6 card overflow-x-auto p-0">
        <table className="w-full min-w-[760px] text-sm">
          <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Datum / termin</th>
              <th className="px-4 py-3">Slavljenik / roditelj</th>
              <th className="px-4 py-3">Igraonica</th>
              <th className="px-4 py-3">Paket</th>
              <th className="px-4 py-3 text-right">Iznos</th>
              <th className="px-4 py-3">Status</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {rezervacije.map((r) => (
              <tr key={r.id} className="hover:bg-brand-50/60">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">
                  <Link href={`/admin/rezervacije/${r.code}`}>{r.code}</Link>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDatum(r.date)}<span className="text-ink-400"> · {r.slotStart}</span></td>
                <td className="px-4 py-3">
                  <span className="font-medium text-ink-800">{r.theme?.emoji} {r.childName ?? "—"}</span>
                  <span className="block text-xs text-ink-400">{r.parentName}</span>
                </td>
                <td className="px-4 py-3 whitespace-nowrap">{r.secondRoom ? `${r.room.name} +1` : r.room.name}</td>
                <td className="px-4 py-3">{r.package.name}</td>
                <td className="px-4 py-3 text-right font-medium">{formatEur(r.totalCents)}</td>
                <td className="px-4 py-3"><StatusBadge status={r.status} /></td>
              </tr>
            ))}
            {rezervacije.length === 0 && (
              <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">Nema rezervacija.</td></tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
