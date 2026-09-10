import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { getFiscalizationService } from "@/lib/fiscalization";
import { formatDatumVrijeme, formatEur } from "@/lib/format";
import { PosTerminal, type PosArtikl } from "@/components/admin/PosTerminal";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.pos };

// Brza ponuda blagajne (sitna prodaja). Cijene u EUR-centima.
const ARTIKLI: PosArtikl[] = [
  { naziv: "Kava", priceCents: 200 },
  { naziv: "Sok", priceCents: 250 },
  { naziv: "Voda", priceCents: 150 },
  { naziv: "Grickalice", priceCents: 300 },
  { naziv: "Sladoled", priceCents: 280 },
  { naziv: "Palačinka", priceCents: 450 },
  { naziv: "Balon", priceCents: 200 },
  { naziv: "Ulaz (slobodna igra)", priceCents: 600 },
];

/** Server action: zabilježi prodaju i izdaj fiskalizirani račun. */
async function naplatiPos(stavke: { naziv: string; priceCents: number; quantity: number }[]) {
  "use server";
  const valjane = stavke.filter((s) => s.quantity > 0);
  if (valjane.length === 0) return { ok: false as const };
  const total = valjane.reduce((s, a) => s + a.priceCents * a.quantity, 0);

  const sale = await prisma.pOSSale.create({
    data: { totalCents: total, items: { create: valjane.map((s) => ({ name: s.naziv, priceCents: s.priceCents, quantity: s.quantity })) } },
  });

  const godina = new Date().getFullYear();
  const broj = await prisma.invoice.count({ where: { issuedAt: { gte: new Date(`${godina}-01-01`) } } });
  const number = `${broj + 1}/${env.fiscalBusinessSpace}/${env.fiscalCashRegister}`;

  const racun = await prisma.invoice.create({
    data: {
      number, posSaleId: sale.id, totalCents: total,
      items: valjane.map((s) => ({ naziv: s.naziv, kolicina: s.quantity, cijenaCents: s.priceCents, pdvStopa: 25 })),
      businessSpace: env.fiscalBusinessSpace, cashRegister: env.fiscalCashRegister, status: "izdan",
    },
  });
  const fiskal = getFiscalizationService();
  const rez = await fiskal.fiscalizeInvoice({
    invoiceId: racun.id, number: racun.number, issuedAt: racun.issuedAt, totalCents: total,
    businessSpace: racun.businessSpace, cashRegister: racun.cashRegister, oib: env.fiscalOib || undefined,
    stavke: valjane.map((s) => ({ naziv: s.naziv, kolicina: s.quantity, cijenaCents: s.priceCents, pdvStopa: 25 })),
  });
  await prisma.invoice.update({ where: { id: racun.id }, data: { jir: rez.jir, zki: rez.zki, fiscalizedAt: rez.fiscalizedAt, status: "fiskaliziran" } });

  return { ok: true as const, number: racun.number, jir: rez.jir, zki: rez.zki, total };
}

export default async function PosPage() {
  const zadnji = await prisma.invoice.findMany({
    where: { posSaleId: { not: null } },
    orderBy: { issuedAt: "desc" },
    take: 5,
  });

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.pos}</h1>
      <p className="mt-1 text-sm text-ink-500">Brza prodaja — svaki se račun fiskalizira (JIR i ZKI).</p>

      <div className="mt-6 grid gap-6 lg:grid-cols-[1fr,300px]">
        <PosTerminal artikli={ARTIKLI} naplati={naplatiPos} />

        <aside className="card">
          <h2 className="font-semibold text-ink-800">Zadnji računi</h2>
          <ul className="mt-3 space-y-2 text-sm">
            {zadnji.map((r) => (
              <li key={r.id} className="border-b border-black/5 pb-2">
                <p className="font-medium text-ink-800">{r.number} · {formatEur(r.totalCents)}</p>
                <p className="text-xs text-ink-400">{formatDatumVrijeme(r.issuedAt)}</p>
                <p className="truncate text-xs text-ink-400">JIR: {r.jir ?? "—"}</p>
              </li>
            ))}
            {zadnji.length === 0 && <li className="text-ink-400">Još nema računa s blagajne.</li>}
          </ul>
        </aside>
      </div>
    </div>
  );
}
