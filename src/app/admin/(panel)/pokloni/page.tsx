import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum, formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.pokloni.naslov };

const STIL: Record<string, string> = {
  aktivan: "bg-mint-100 text-mint-700",
  iskoristen: "bg-ink-200 text-ink-600",
  istekao: "bg-red-100 text-red-700",
};

export default async function AdminPokloniPage() {
  const [bonovi, agg] = await Promise.all([
    prisma.voucher.findMany({ orderBy: { createdAt: "desc" } }),
    prisma.voucher.aggregate({ _sum: { initialCents: true, balanceCents: true }, _count: true }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.pokloni.naslov}</h1>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <Kpi naslov="Izdano bonova" v={String(agg._count)} />
        <Kpi naslov="Ukupna vrijednost" v={formatEur(agg._sum.initialCents ?? 0)} />
        <Kpi naslov="Neiskorišteno stanje" v={formatEur(agg._sum.balanceCents ?? 0)} />
      </div>

      <div className="mt-6 card overflow-x-auto p-0">
        <table className="w-full min-w-[640px] text-sm">
          <thead className="border-b border-black/5 text-left text-xs uppercase tracking-wide text-ink-400">
            <tr>
              <th className="px-4 py-3">Kod</th>
              <th className="px-4 py-3">Darovatelj</th>
              <th className="px-4 py-3">Obdarenik</th>
              <th className="px-4 py-3 text-right">Vrijednost</th>
              <th className="px-4 py-3 text-right">Stanje</th>
              <th className="px-4 py-3">Status</th>
              <th className="px-4 py-3">Izdan</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-black/5">
            {bonovi.map((b) => (
              <tr key={b.id} className="hover:bg-brand-50/60">
                <td className="px-4 py-3 font-mono text-xs font-semibold text-brand-600">{b.code}</td>
                <td className="px-4 py-3">{b.purchaserName ?? "—"}<span className="block text-xs text-ink-400">{b.purchaserEmail}</span></td>
                <td className="px-4 py-3">{b.recipientName ?? "—"}</td>
                <td className="px-4 py-3 text-right">{formatEur(b.initialCents)}</td>
                <td className="px-4 py-3 text-right font-medium">{formatEur(b.balanceCents)}</td>
                <td className="px-4 py-3"><span className={`chip text-xs ${STIL[b.status] ?? "bg-ink-100"}`}>{b.status}</span></td>
                <td className="px-4 py-3 whitespace-nowrap">{formatDatum(b.createdAt)}</td>
              </tr>
            ))}
            {bonovi.length === 0 && <tr><td colSpan={7} className="px-4 py-10 text-center text-ink-400">Nema bonova.</td></tr>}
          </tbody>
        </table>
      </div>
    </div>
  );
}

function Kpi({ naslov, v }: { naslov: string; v: string }) {
  return (
    <div className="card">
      <p className="text-sm text-ink-500">{naslov}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v}</p>
    </div>
  );
}
