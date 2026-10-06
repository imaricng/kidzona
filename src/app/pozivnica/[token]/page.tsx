import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatumDugi } from "@/lib/format";
import { tekstPozivnice, predlozakUrl } from "@/lib/pozivnica";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { PrintButton } from "@/components/PrintButton";
import { PodijeliPozivnicu } from "@/components/PodijeliPozivnicu";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pozivnica na rođendan" };

/**
 * Pozivnica za dijeljenje. Poveznica sadrži tajni token rezervacije, pa je
 * roditelj može slobodno poslati gostima — nitko je ne može pogoditi, a
 * nikakvi drugi podaci o rezervaciji (cijena, kod) nisu na njoj.
 */
export default async function PozivnicaPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await prisma.reservation.findUnique({
    where: { qrToken: token },
    include: { room: true, theme: true },
  });
  // Pozivnica postoji samo za potvrđenu proslavu (upit još nema siguran termin).
  if (!r || !STATUSI_ZAUZIMAJU_TERMIN.includes(r.status)) notFound();

  const tekst = tekstPozivnice(r);
  const imaPredlozak = r.themeId
    ? (await prisma.pozivnicaPredlozak.count({ where: { themeId: r.themeId, roomId: r.roomId } })) > 0
    : false;
  const gradijent = r.theme?.gradient ?? "from-brand-400 to-berry-400";

  return (
    <div className="min-h-screen bg-paper py-10">
      <div className="mx-auto max-w-xl px-4">
        <article className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-ink-100">
          {imaPredlozak && r.themeId ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={predlozakUrl(r.themeId, r.roomId)}
              alt={`Pozivnica — ${r.theme?.name ?? "proslava"}`}
              className="w-full"
            />
          ) : (
            <div className={`bg-gradient-to-br ${gradijent} px-6 py-10 text-center text-white`}>
              <div className="text-5xl" aria-hidden>{r.theme?.emoji ?? "🎉"}</div>
              <p className="mt-2 font-display text-2xl font-extrabold">Pozivnica na rođendan</p>
              {r.theme && <p className="mt-1 text-sm opacity-90">{r.theme.name}</p>}
            </div>
          )}

          <div className="px-6 py-7 text-center">
            <p className="font-display text-xl font-extrabold leading-relaxed text-ink-900">{tekst.poziv}</p>
            {tekst.potvrda && <p className="mt-4 text-ink-700">{tekst.potvrda}</p>}

            <dl className="mt-6 grid gap-2 rounded-2xl bg-brand-50 px-4 py-4 text-sm text-ink-700">
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Datum</dt>
                <dd className="font-semibold">{formatDatumDugi(r.date)}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Vrijeme</dt>
                <dd className="font-semibold">{r.slotStart} – {r.slotEnd}</dd>
              </div>
              <div className="flex justify-between gap-4">
                <dt className="text-ink-500">Mjesto</dt>
                <dd className="font-semibold">{hr.brand.naziv}, {r.room.name}</dd>
              </div>
            </dl>
            <p className="mt-3 text-xs text-ink-400">{hr.kontakt.adresa}</p>
          </div>
        </article>

        <div className="mt-6 flex flex-wrap justify-center gap-3 print:hidden">
          <PrintButton />
          <PodijeliPozivnicu />
        </div>
      </div>
    </div>
  );
}
