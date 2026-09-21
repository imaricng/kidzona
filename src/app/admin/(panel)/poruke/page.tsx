import Link from "next/link";
import type { Prisma } from "@prisma/client";
import { prisma } from "@/lib/prisma";
import { formatDatumVrijeme } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Poslane poruke" };

/**
 * Pregled svega što je sustav poslao ili pokušao poslati: potvrde, obavijesti
 * osoblju, podsjetnici, zahvale, rođendanske ponude i upisi u kalendar.
 * Izvor je `NotificationLog` — isti zapis koji se vidi uz svaku rezervaciju,
 * ovdje na jednom mjestu i s filtrima.
 */

const VRSTE: Record<string, string> = {
  potvrda: "Poruka kupcu (upit / potvrda / otkazivanje)",
  osoblje: "Obavijest osoblju",
  podsjetnik: "Podsjetnik dan prije",
  zahvala: "Zahvala i molba za recenziju",
  "rodjendan-godina": "Rođendanska ponuda za sljedeću godinu",
  kalendar: "Upis u Google kalendar",
};

const STATUSI: Record<string, { tekst: string; klase: string }> = {
  poslano: { tekst: "poslano", klase: "bg-mint-500/15 text-mint-600" },
  greska: { tekst: "nije uspjelo", klase: "bg-red-50 text-red-700" },
  logirano: { tekst: "samo zapisano", klase: "bg-ink-100 text-ink-500" },
};

const PO_STRANICI = 100;

export default async function PorukePage({
  searchParams,
}: {
  searchParams: Promise<{ vrsta?: string; status?: string; trazi?: string; str?: string }>;
}) {
  const { vrsta, status, trazi, str } = await searchParams;
  const stranica = Math.max(1, Number(str) || 1);

  const where: Prisma.NotificationLogWhereInput = {
    ...(vrsta && VRSTE[vrsta] ? { type: vrsta } : {}),
    ...(status && STATUSI[status] ? { status } : {}),
    ...(trazi?.trim()
      ? {
          OR: [
            { recipient: { contains: trazi.trim(), mode: "insensitive" } },
            { subject: { contains: trazi.trim(), mode: "insensitive" } },
            { reservation: { code: { contains: trazi.trim(), mode: "insensitive" } } },
          ],
        }
      : {}),
  };

  const [poruke, ukupno, neuspjelih] = await Promise.all([
    prisma.notificationLog.findMany({
      where,
      orderBy: { createdAt: "desc" },
      skip: (stranica - 1) * PO_STRANICI,
      take: PO_STRANICI,
      include: { reservation: { select: { code: true } } },
    }),
    prisma.notificationLog.count({ where }),
    prisma.notificationLog.count({ where: { status: "greska" } }),
  ]);
  const stranica_ukupno = Math.max(1, Math.ceil(ukupno / PO_STRANICI));

  // Poveznica na drugu stranicu uz zadržane filtre.
  const uz = (izmjene: Record<string, string | undefined>) => {
    const q = new URLSearchParams();
    const sve = { vrsta, status, trazi, ...izmjene };
    for (const [k, v] of Object.entries(sve)) if (v) q.set(k, v);
    const s = q.toString();
    return `/admin/poruke${s ? `?${s}` : ""}`;
  };

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Poslane poruke</h1>
      <p className="mt-1 text-sm text-ink-500">
        Sve što je sustav poslao kupcima i osoblju te upisao u kalendar. Klik na redak otvara sadržaj poruke.
      </p>

      {neuspjelih > 0 && status !== "greska" && (
        <Link
          href={uz({ status: "greska", str: undefined })}
          className="mt-4 block rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200 hover:bg-red-100"
        >
          ⚠️ {neuspjelih} {neuspjelih === 1 ? "poruka nije uspjela" : "poruka nije uspjelo"} — prikaži samo njih →
        </Link>
      )}

      <form className="card mt-4 flex flex-wrap items-end gap-3" action="/admin/poruke">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Vrsta</span>
          <select name="vrsta" defaultValue={vrsta ?? ""} className="input !py-2">
            <option value="">Sve vrste</option>
            {Object.entries(VRSTE).map(([k, v]) => (
              <option key={k} value={k}>{v}</option>
            ))}
          </select>
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Status</span>
          <select name="status" defaultValue={status ?? ""} className="input !py-2">
            <option value="">Svi</option>
            {Object.entries(STATUSI).map(([k, v]) => (
              <option key={k} value={k}>{v.tekst}</option>
            ))}
          </select>
        </label>
        <label className="block flex-1">
          <span className="mb-1 block text-xs font-medium text-ink-500">Traži (adresa, naslov ili kod rezervacije)</span>
          <input name="trazi" defaultValue={trazi ?? ""} placeholder="npr. KZ-2026-0004 ili ime@gmail.com" className="input !py-2" />
        </label>
        <button type="submit" className="btn-primary !py-2 !text-sm">Filtriraj</button>
        {(vrsta || status || trazi) && (
          <Link href="/admin/poruke" className="pb-2 text-sm text-ink-500 hover:text-ink-800">Poništi</Link>
        )}
      </form>

      <p className="mt-4 text-sm text-ink-500">
        {ukupno} {ukupno === 1 ? "zapis" : "zapisa"}
        {stranica_ukupno > 1 && ` · stranica ${stranica} od ${stranica_ukupno}`}
      </p>

      <div className="mt-2 space-y-2">
        {poruke.map((p) => {
          const s = STATUSI[p.status] ?? { tekst: p.status, klase: "bg-ink-100 text-ink-500" };
          return (
            <details key={p.id} className="card !p-0 group">
              <summary className="flex cursor-pointer list-none flex-wrap items-center gap-x-4 gap-y-1 px-4 py-3 text-sm">
                <span className="w-32 shrink-0 text-xs text-ink-400">{formatDatumVrijeme(p.createdAt)}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate font-medium text-ink-800">{p.subject ?? VRSTE[p.type] ?? p.type}</span>
                  <span className="block text-xs text-ink-500">
                    {VRSTE[p.type] ?? p.type} → {p.recipient || "—"}
                  </span>
                </span>
                {p.reservation && (
                  <Link href={`/admin/rezervacije/${p.reservation.code}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">
                    {p.reservation.code}
                  </Link>
                )}
                <span className={`chip !text-xs ${s.klase}`}>{s.tekst}</span>
              </summary>
              <pre className="whitespace-pre-wrap border-t border-black/5 px-4 py-3 font-sans text-xs text-ink-700">{p.body}</pre>
            </details>
          );
        })}
        {poruke.length === 0 && <p className="card text-sm text-ink-400">Nema zapisa za odabrane filtre.</p>}
      </div>

      {stranica_ukupno > 1 && (
        <div className="mt-4 flex justify-between text-sm">
          {stranica > 1 ? <Link href={uz({ str: String(stranica - 1) })} className="text-brand-600">← Novije</Link> : <span />}
          {stranica < stranica_ukupno ? <Link href={uz({ str: String(stranica + 1) })} className="text-brand-600">Starije →</Link> : <span />}
        </div>
      )}

      <div className="card mt-8 text-sm text-ink-600">
        <h2 className="font-semibold text-ink-800">Što šalje automatika</h2>
        <p className="mt-1">
          Svaki dan ujutro sustav sam pregledava rezervacije i šalje (samo kupcima s upisanom e-poštom):
        </p>
        <ul className="mt-2 list-disc space-y-1 pl-5">
          <li><strong>podsjetnik</strong> dan prije proslave;</li>
          <li><strong>zahvalu i molbu za recenziju</strong> dan nakon proslave (proslava se tada označi završenom);</li>
          <li><strong>rođendansku ponudu</strong> 21 dan prije sljedećeg rođendana djeteta — samo obiteljima koje su dale privolu za marketing.</li>
        </ul>
        <p className="mt-2 text-xs text-ink-500">
          Svaka se poruka šalje samo jednom. Gumb „Pokreni automatiku" na nadzornoj ploči radi isto, odmah — korisno ako
          jutarnje pokretanje iz nekog razloga nije prošlo.
        </p>
      </div>
    </div>
  );
}
