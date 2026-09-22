import Link from "next/link";
import type { Metadata } from "next";
import { getDict, getLocale } from "@/i18n";
import { hr as hrDefault } from "@/i18n/hr";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { SectionNaslov } from "@/components/SectionNaslov";

export const metadata: Metadata = {
  title: hrDefault.pravila.naslov,
  description: `${hrDefault.pravila.podnaslov}. ${hrDefault.pravila.uvod}`,
  alternates: { canonical: "/pravila" },
};

/** Boje krugova izmjenjuju se kao na ostatku stranice (brand, roza, žuta, plava). */
const KRUGOVI = ["bg-brand-500", "bg-berry-500", "bg-sun-400", "bg-sky2-400"];

/** Kućni red — 10 zlatnih pravila. Tekstovi su u rječniku (`pravila`). */
export default async function PravilaPage() {
  const t = getDict(await getLocale());
  const p = t.pravila;

  return (
    <>
      <SiteHeader />
      <main className="bg-paper py-12 sm:py-16">
        <div className="section">
          <SectionNaslov naslov={p.naslov} podnaslov={p.podnaslov} />
          <p className="mx-auto mt-6 max-w-2xl text-center text-ink-600">{p.uvod}</p>

          <ol className="mx-auto mt-10 grid max-w-5xl gap-5 sm:grid-cols-2">
            {p.stavke.map((s, i) => (
              <li key={s.naslov} className="card flex items-start gap-4">
                <span
                  aria-hidden
                  className={`inline-flex h-14 w-14 shrink-0 items-center justify-center rounded-full text-2xl shadow-pop ring-4 ring-white ${KRUGOVI[i % KRUGOVI.length]}`}
                >
                  {s.ikona}
                </span>
                <div>
                  <h2 className="font-display text-lg font-bold text-brand-900">
                    <span className="mr-1.5 text-berry-500">{i + 1}.</span>
                    {s.naslov}
                  </h2>
                  <p className="mt-1 text-sm text-ink-600">{s.opis}</p>
                </div>
              </li>
            ))}
          </ol>

          <div className="mx-auto mt-10 max-w-2xl rounded-3xl bg-brand-500 px-6 py-8 text-center text-white shadow-soft">
            <p className="font-display text-2xl font-bold">{p.zakljucakNaslov}</p>
            <p className="mt-2 text-white/90">{p.zakljucak}</p>
            <p className="mt-4 text-sm font-semibold">
              <a href={`tel:${t.kontakt.telefon.replace(/\s/g, "")}`} className="underline underline-offset-2">
                {t.kontakt.telefon}
              </a>
              {" · "}
              <a href={`mailto:${t.kontakt.email}`} className="underline underline-offset-2">
                {t.kontakt.email}
              </a>
            </p>
            <Link href="/rezervacija" className="btn mt-6 bg-sun-400 font-bold text-brand-900 hover:bg-sun-300">
              {t.nav.rezerviraj}
            </Link>
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
