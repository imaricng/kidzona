import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { formatDatumDugi } from "@/lib/format";
import { potvrdaDolaska, predlozakUrl } from "@/lib/pozivnica";
import { retciPozivnice } from "@/lib/pozivnica-tekst";
import { predlozakZaProslavu } from "@/lib/pozivnica-predlosci";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { PrintButton } from "@/components/PrintButton";
import { PodijeliPozivnicu } from "@/components/PodijeliPozivnicu";
import { PozivnicaSlika } from "@/components/PozivnicaSlika";

export const dynamic = "force-dynamic";

/**
 * Pretpregled poveznice (WhatsApp, Facebook, Viber) pokazuje nacrtanu
 * pozivnicu, pa gost odmah vidi o čemu je riječ.
 */
export async function generateMetadata({ params }: { params: Promise<{ token: string }> }): Promise<Metadata> {
  const { token } = await params;
  const slika = `${env.appUrl}/pozivnica/${token}/slika`;
  return {
    title: "Pozivnica na rođendan",
    openGraph: { title: "Pozivnica na rođendan 🎉", images: [slika], type: "website" },
    twitter: { card: "summary_large_image", images: [slika] },
    robots: { index: false, follow: false },
  };
}

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

  // Predložak teme, a ako ga nema — opći predložak igraonice.
  const predlozak = await predlozakZaProslavu(r.themeId, r.roomId);
  const retci = retciPozivnice({ ...r, igraonica: r.room.name }, predlozak?.tekstPredlozak);
  const potvrda = potvrdaDolaska(r.phone);
  const gradijent = r.theme?.gradient ?? "from-brand-400 to-berry-400";

  return (
    <div className="min-h-screen bg-paper py-10">
      <div className="mx-auto max-w-xl px-4">
        <article className="overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-ink-100">
          {predlozak ? (
            <PozivnicaSlika
              src={predlozakUrl(predlozak.themeId, predlozak.roomId)}
              alt={`Pozivnica — ${r.theme?.name ?? "proslava"}`}
              retci={retci}
              okvir={predlozak.okvir}
              stil={predlozak.stil}
              slikaSirina={predlozak.slikaSirina}
              slikaVisina={predlozak.slikaVisina}
            />
          ) : (
            // Bez predloška tekst nosi sam zaglavlje pozivnice.
            <div className={`bg-gradient-to-br ${gradijent} px-6 py-10 text-center text-white`}>
              <div className="text-5xl" aria-hidden>{r.theme?.emoji ?? "🎉"}</div>
              {retci.map((redak, i) => (
                <p key={i} className={i === 0 ? "mt-3 font-display text-2xl font-extrabold" : "mt-2"}>
                  {redak}
                </p>
              ))}
            </div>
          )}

          <div className="px-6 py-7 text-center">
            {potvrda && <p className="text-ink-700">{potvrda}</p>}

            <dl className="mt-5 grid gap-2 rounded-2xl bg-brand-50 px-4 py-4 text-sm text-ink-700">
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
          <a href={`/pozivnica/${token}/slika`} download="pozivnica.jpg" className="btn-secondary">
            ⬇️ Spremi kao sliku
          </a>
        </div>
      </div>
    </div>
  );
}
