import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { formatDatumDugi, formatDatumVrijeme } from "@/lib/format";
import { lokalniISO } from "@/lib/slots";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { pozivnicaUrl } from "@/lib/pozivnica";
import { predlozakZaProslavu } from "@/lib/pozivnica-predlosci";
import { porukaPozivnice, whatsappVeza } from "@/lib/whatsapp";
import { posaljiPozivnicu } from "@/lib/reservations";
import { PosaljiPozivnicuWhatsapp } from "@/components/admin/PosaljiPozivnicuWhatsapp";
import { oznaciWhatsappPozivnicu } from "./akcije";

export const dynamic = "force-dynamic";
export const metadata = { title: "Pozivnice" };

const UKLJUCI = { room: true, secondRoom: true, package: true, theme: true, addOns: { include: { addOn: true } } } as const;

/** Ručno slanje pozivnice e-poštom — radi i za rezervacije dogovorene prije uvođenja pozivnica. */
async function posaljiAkcija(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const code = String(formData.get("code"));
  const r = await prisma.reservation.findUniqueOrThrow({ where: { code }, include: UKLJUCI });
  const ishod = await posaljiPozivnicu(r, true);
  revalidatePath("/admin/pozivnice");
  redirect(ishod.ok ? "/admin/pozivnice?poruka=poslano" : `/admin/pozivnice?greska=${encodeURIComponent(ishod.poruka)}`);
}

export default async function AdminPozivnicePage({
  searchParams,
}: {
  searchParams: Promise<{ poruka?: string; greska?: string }>;
}) {
  const { poruka, greska } = await searchParams;
  const danas = new Date(`${lokalniISO(new Date())}T00:00:00`);
  const rezervacije = await prisma.reservation.findMany({
    where: { date: { gte: danas }, status: { in: STATUSI_ZAUZIMAJU_TERMIN } },
    orderBy: [{ date: "asc" }, { slotStart: "asc" }],
    include: { room: true, secondRoom: true, theme: true },
  });

  // Za svaku proslavu: ima li predložak (tema ili opći) i gotove poveznice.
  const redovi = await Promise.all(
    rezervacije.map(async (r) => {
      const predlozak = await predlozakZaProslavu(r.themeId, r.roomId);
      const veza = pozivnicaUrl(env.appUrl, r.qrToken);
      return {
        r,
        imaPredlozak: !!predlozak,
        tematski: !!predlozak?.themeId,
        veza,
        poruka: porukaPozivnice(veza, r.childName),
        wa: whatsappVeza(r.phone, porukaPozivnice(veza, r.childName)),
      };
    }),
  );

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">💌 Pozivnice</h1>
      <p className="mt-1 text-sm text-ink-500">
        Nadolazeće potvrđene proslave. Pozivnica prati temu proslave; ako tema nema svoj predložak, koristi se opći.
        WhatsApp poruku šalje račun na kojem ste prijavljeni — za poslovni broj {hr.kontakt.whatsappPoslovni} otvorite
        WhatsApp Business. Predlošci se postavljaju u{" "}
        <Link href="/admin/paketi" className="font-semibold text-brand-600 hover:underline">Paketi, dodaci i teme</Link>.
      </p>

      {poruka === "poslano" && (
        <p className="mt-4 rounded-2xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">
          ✅ Pozivnica je poslana e-poštom.
        </p>
      )}
      {greska && (
        <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{greska}</p>
      )}

      {redovi.length === 0 ? (
        <p className="mt-6 text-sm text-ink-500">Nema nadolazećih potvrđenih proslava.</p>
      ) : (
        <div className="mt-6 space-y-3">
          {redovi.map(({ r, imaPredlozak, tematski, veza, poruka: tekstPoruke, wa }) => (
            <div key={r.id} className="card">
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-semibold text-ink-800">
                    {r.theme?.emoji ?? "🎈"} {r.childName || "—"}{" "}
                    <Link href={`/admin/rezervacije/${r.code}`} className="text-sm font-normal text-ink-400 hover:text-brand-600">
                      {r.code}
                    </Link>
                  </p>
                  <p className="text-sm text-ink-500">
                    {formatDatumDugi(r.date)} · {r.slotStart}–{r.slotEnd} · {r.room.name}
                    {r.theme ? ` · ${r.theme.name}` : " · bez teme"}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    {r.parentName || "—"} · {r.phone || "bez telefona"} · {r.email || "bez e-pošte"}
                  </p>
                </div>
                <div className="flex flex-wrap items-center gap-2">
                  {r.pozivnicaWhatsappAt && (
                    <span className="chip bg-mint-500/15 text-mint-600">💬 {formatDatumVrijeme(r.pozivnicaWhatsappAt)}</span>
                  )}
                  {r.pozivnicaPoslanaAt && (
                    <span className="chip bg-mint-500/15 text-mint-600">📨 {formatDatumVrijeme(r.pozivnicaPoslanaAt)}</span>
                  )}
                  {!r.pozivnicaWhatsappAt && !r.pozivnicaPoslanaAt &&
                    (r.pozivniceDigitalne ? (
                      <span className="chip bg-sun-100 text-brand-900">traženo, nije poslano</span>
                    ) : (
                      <span className="chip bg-ink-100 text-ink-500">nije traženo</span>
                    ))}
                  {r.pozivniceFizicke && <span className="chip bg-brand-50 text-brand-600">tiskane</span>}
                  {!imaPredlozak && <span className="chip bg-red-50 text-red-700">nema predloška</span>}
                  {imaPredlozak && !tematski && r.theme && (
                    <span className="chip bg-ink-100 text-ink-500">opći predložak</span>
                  )}
                </div>
              </div>

              <div className="mt-3 flex flex-wrap gap-2">
                <a href={veza} target="_blank" rel="noopener noreferrer" className="btn-secondary !py-1 !text-xs">
                  👀 Otvori
                </a>
                <PosaljiPozivnicuWhatsapp
                  slikaUrl={`/pozivnica/${r.qrToken}/slika`}
                  waVeza={wa}
                  poruka={tekstPoruke}
                  nazivDatoteke={`pozivnica-${r.childName?.trim().replace(/\s+/g, "-").toLowerCase() || r.code}.jpg`}
                  oznaci={oznaciWhatsappPozivnicu.bind(null, r.code)}
                  malen
                />
                {r.email && (
                  <form action={posaljiAkcija}>
                    <input type="hidden" name="code" value={r.code} />
                    <button type="submit" className="btn-secondary !py-1 !text-xs">
                      {r.pozivnicaPoslanaAt ? "📨 Pošalji ponovno" : "📨 Pošalji e-poštom"}
                    </button>
                  </form>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
