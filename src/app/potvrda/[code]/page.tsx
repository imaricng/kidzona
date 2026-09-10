import Link from "next/link";
import { notFound } from "next/navigation";
import QRCode from "qrcode";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { formatDatumDugi, formatEur } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { brojDjece } from "@/i18n/hr";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.booking.koraci.potvrda };

export default async function PotvrdaPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  const r = await prisma.reservation.findUnique({
    where: { code },
    include: {
      room: true,
      secondRoom: true,
      package: true,
      theme: true,
      addOns: { include: { addOn: true } },
      invoices: true,
    },
  });
  if (!r) notFound();

  // QR kod nosi token za prijavu dolaska na ulazu (skenira ga osoblje).
  const checkinUrl = `${env.appUrl}/checkin/${r.qrToken}`;
  const qrDataUrl = await QRCode.toDataURL(checkinUrl, { width: 240, margin: 1 });
  const racun = r.invoices[0];

  return (
    <div className="min-h-screen bg-paper py-10">
      <div className="mx-auto max-w-2xl px-4">
        <div className="card text-center">
          <div className="text-6xl" aria-hidden>🎉</div>
          <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-900">{hr.booking.potvrdaNaslov}</h1>
          <p className="mt-2 text-ink-500">{hr.booking.potvrdaTekst}</p>

          <div className="mt-6 inline-flex flex-col items-center rounded-3xl bg-brand-50 p-6">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={qrDataUrl} alt="QR kod za prijavu" width={200} height={200} className="rounded-xl bg-white p-2" />
            <p className="mt-2 text-xs text-ink-500">{hr.booking.qrUputa}</p>
          </div>

          <div className="mt-6 rounded-2xl bg-brand-50 px-4 py-3">
            <p className="text-sm text-ink-500">{hr.booking.vasKod}</p>
            <p className="font-display text-2xl font-extrabold tracking-wider text-brand-600">{r.code}</p>
          </div>
        </div>

        <div className="card mt-6">
          <h2 className="font-semibold text-ink-800">Detalji proslave</h2>
          <dl className="mt-4 space-y-2 text-sm">
            <Red naziv="Datum" v={formatDatumDugi(r.date)} />
            <Red naziv="Termin" v={`${r.slotStart} – ${r.slotEnd}`} />
            <Red naziv="Igraonica" v={r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name} />
            <Red naziv="Paket" v={`${r.package.name} (${brojDjece(r.numChildren)}${r.numAdults ? `, ${r.numAdults} odraslih` : ""})`} />
            {r.theme && <Red naziv="Tema" v={`${r.theme.emoji} ${r.theme.name}`} />}
            {r.childName && <Red naziv="Slavljenik" v={r.childName} />}
            {r.addOns.length > 0 && <Red naziv="Dodaci" v={r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ")} />}
          </dl>
          <div className="mt-4 space-y-1 border-t border-black/5 pt-4 text-sm">
            <div className="flex justify-between"><span className="text-ink-500">{hr.booking.ukupno}</span><span className="font-bold text-ink-900">{formatEur(r.totalCents)}</span></div>
            {r.paidCents > 0 && <div className="flex justify-between"><span className="text-ink-500">Plaćeno</span><span className="text-mint-600">{formatEur(r.paidCents)}</span></div>}
            {r.totalCents - r.paidCents > 0 && (
              <div className="flex justify-between font-semibold"><span className="text-ink-700">{hr.booking.zaPlatitiUzivo}</span><span className="text-brand-600">{formatEur(r.totalCents - r.paidCents)}</span></div>
            )}
          </div>
          {r.totalCents - r.paidCents > 0 && (
            <p className="mt-3 rounded-2xl bg-mint-50 px-4 py-2 text-xs text-mint-700">
              💶 {hr.booking.placanjeUzivoNapomena}
            </p>
          )}
          {racun && (
            <p className="mt-4 rounded-2xl bg-ink-50 px-4 py-2 text-xs text-ink-500">
              Račun br. {racun.number} · JIR: {racun.jir ?? "—"} · ZKI: {racun.zki ?? "—"}
            </p>
          )}
        </div>

        <div className="mt-6 flex flex-wrap justify-center gap-3">
          <Link href="/" className="btn-secondary">← Početna</Link>
          <PrintButton />
        </div>
        <p className="mt-4 text-center text-xs text-ink-400">
          Potvrda je poslana na {r.email}. Pohranite ovu stranicu ili je ispišite.
        </p>
      </div>
    </div>
  );
}

function Red({ naziv, v }: { naziv: string; v: string }) {
  return (
    <div className="flex justify-between gap-3">
      <dt className="text-ink-400">{naziv}</dt>
      <dd className="text-right font-medium text-ink-800">{v}</dd>
    </div>
  );
}
