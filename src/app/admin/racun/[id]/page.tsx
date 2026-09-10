import { notFound, redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { formatDatumVrijeme, formatEur } from "@/lib/format";
import { PrintButton } from "@/components/PrintButton";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Račun" };

interface Stavka { naziv: string; kolicina: number; cijenaCents: number; pdvStopa: number }

export default async function RacunPage({ params }: { params: Promise<{ id: string }> }) {
  const sesija = await getSession();
  if (!sesija || sesija.role === "roditelj") redirect("/admin");

  const { id } = await params;
  const racun = await prisma.invoice.findUnique({
    where: { id },
    include: { reservation: true },
  });
  if (!racun) notFound();

  const stavke = (racun.items as unknown as Stavka[]) ?? [];
  const osnovica = Math.round(racun.totalCents / 1.25);
  const pdv = racun.totalCents - osnovica;

  return (
    <div className="mx-auto max-w-2xl bg-white p-8 text-ink-800 print:p-0">
      <div className="mb-6 flex items-start justify-between">
        <div>
          <div className="font-display text-2xl font-extrabold text-brand-600"><Logo size="sm" /></div>
          <p className="text-sm text-ink-500">{hr.brand.naziv}</p>
          <p className="text-sm text-ink-500">{hr.kontakt.adresa}</p>
          {env.fiscalOib && <p className="text-sm text-ink-500">OIB: {env.fiscalOib}</p>}
        </div>
        <div className="text-right">
          <h1 className="font-display text-xl font-bold">RAČUN</h1>
          <p className="text-sm text-ink-500">Br: {racun.number}</p>
          <p className="text-sm text-ink-500">{formatDatumVrijeme(racun.issuedAt)}</p>
        </div>
      </div>

      {racun.reservation && (
        <div className="mb-4 rounded-xl bg-brand-50 p-3 text-sm print:bg-white print:p-0">
          <p>Kupac: <span className="font-medium">{racun.reservation.parentName}</span></p>
          <p>Rezervacija: {racun.reservation.code}</p>
        </div>
      )}

      <table className="w-full text-sm">
        <thead className="border-b-2 border-ink-200 text-left">
          <tr>
            <th className="py-2">Stavka</th>
            <th className="py-2 text-center">Kol.</th>
            <th className="py-2 text-right">Cijena</th>
            <th className="py-2 text-right">Iznos</th>
          </tr>
        </thead>
        <tbody>
          {stavke.map((s, i) => (
            <tr key={i} className="border-b border-ink-100">
              <td className="py-2">{s.naziv}</td>
              <td className="py-2 text-center">{s.kolicina}</td>
              <td className="py-2 text-right">{formatEur(s.cijenaCents)}</td>
              <td className="py-2 text-right">{formatEur(s.cijenaCents * s.kolicina)}</td>
            </tr>
          ))}
        </tbody>
      </table>

      <div className="mt-4 ml-auto w-56 space-y-1 text-sm">
        <div className="flex justify-between"><span className="text-ink-500">Osnovica</span><span>{formatEur(osnovica)}</span></div>
        <div className="flex justify-between"><span className="text-ink-500">PDV (25%)</span><span>{formatEur(pdv)}</span></div>
        <div className="flex justify-between border-t border-ink-200 pt-1 text-base font-bold"><span>Ukupno</span><span>{formatEur(racun.totalCents)}</span></div>
      </div>

      <div className="mt-6 border-t border-ink-200 pt-3 text-xs text-ink-500">
        <p>Poslovni prostor: {racun.businessSpace} · Naplatni uređaj: {racun.cashRegister}</p>
        <p>JIR: {racun.jir ?? "—"}</p>
        <p>ZKI: {racun.zki ?? "—"}</p>
        <p className="mt-1">Status: {racun.status} · Fiskalizirano kroz FiscalizationService.</p>
      </div>

      <div className="mt-8 flex gap-3 print:hidden">
        <PrintButton />
        {racun.reservation && (
          <a href={`/admin/rezervacije/${racun.reservation.code}`} className="btn-secondary">← Natrag</a>
        )}
      </div>
    </div>
  );
}
