import { Fragment } from "react";
import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDict, getLocale } from "@/i18n";
import type { Rjecnik } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { trajanjeSati } from "@/lib/slots";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyCta } from "@/components/StickyCta";
import { FaqAccordion } from "@/components/FaqAccordion";
import { Logo } from "@/components/Logo";
import {
  BOJE,
  Balloon,
  Confetti,
  IconCircle,
  Ikona,
  Squiggle,
  Wave,
  type BojaKruga,
  type IkonaIme,
} from "@/components/Decor";

export const dynamic = "force-dynamic";

// Ikonice ponude — iste kao "ikonice za komunikaciju" iz brand vizuala.
const PONUDA: { kljuc: keyof Rjecnik["ponuda"]["stavke"]; ikona: IkonaIme; boja: BojaKruga }[] = [
  { kljuc: "rodjendani", ikona: "torta", boja: "brand" },
  { kljuc: "tematske", ikona: "balon", boja: "berry" },
  { kljuc: "slobodnaIgra", ikona: "medo", boja: "sun" },
  { kljuc: "radionice", ikona: "paleta", boja: "sky" },
  { kljuc: "superhero", ikona: "kruna", boja: "brand" },
  { kljuc: "disco", ikona: "disco", boja: "berry" },
  { kljuc: "gaming", ikona: "gamepad", boja: "sky" },
];

const ZASTO_IKONE: { ikona: IkonaIme; boja: BojaKruga }[] = [
  { ikona: "stit", boja: "brand" },
  { ikona: "iskrice", boja: "sky" },
  { ikona: "osmijeh", boja: "berry" },
  { ikona: "srce", boja: "sun" },
];

const PAKET_AKCENT = ["bg-sky2-400", "bg-berry-500", "bg-brand-500"];

// Kartice rasporeda (tekstovi su u rječniku pod `termini`).
const RASPORED_KARTICE: { kljuc: "vikend" | "tjedan" | "druzionica"; ikona: IkonaIme; boja: BojaKruga }[] = [
  { kljuc: "vikend", ikona: "torta", boja: "brand" },
  { kljuc: "tjedan", ikona: "balon", boja: "berry" },
  { kljuc: "druzionica", ikona: "medo", boja: "sun" },
];
const VRIJEDNOSTI_BOJE = ["text-brand-500", "text-berry-500", "text-sky2-600", "text-brand-700"];

// Placeholder pločice galerije — zamijeniti fotografijama prostora kad budu dostupne.
const OBJAVE_STIL = [
  { emoji: "🎂", bg: "from-berry-400 to-brand-500" },
  { emoji: "🥳", bg: "from-sun-300 to-berry-400" },
  { emoji: "🤸", bg: "from-sky2-300 to-brand-400" },
  { emoji: "🦋", bg: "from-brand-400 to-berry-400" },
  { emoji: "🦸", bg: "from-brand-600 to-sky2-400" },
  { emoji: "🎶", bg: "from-brand-800 to-berry-500" },
];

export default async function HomePage() {
  const hr = getDict(await getLocale()); // `hr` = aktivni rječnik (HR ili EN)
  const [sobe, opciPaketi, teme] = await Promise.all([
    prisma.room.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { packages: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    // Paketi bez igraonice vrijede za sve igraonice.
    prisma.package.findMany({ where: { active: true, roomId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <>
      <SiteHeader />
      <main className="pb-24 md:pb-0">
        {/* HERO — ljubičasta podloga, konfeti, baloni i logotip s maskotom */}
        <section className="relative overflow-hidden bg-brand-500 text-white">
          <div
            aria-hidden
            className="absolute inset-0 bg-[radial-gradient(circle_at_15%_10%,rgba(255,255,255,0.16),transparent_40%),radial-gradient(circle_at_90%_80%,rgba(255,77,166,0.45),transparent_45%)]"
          />
          <Confetti />
          <div className="section relative grid items-center gap-14 pb-28 pt-12 md:grid-cols-2 md:pb-36 md:pt-20">
            <div>
              <span className="chip bg-white/15 font-semibold text-white ring-1 ring-white/25">📍 {hr.brand.lokacija}</span>
              <h1 className="mt-5 font-display text-[2.6rem] font-bold leading-[1.05] sm:text-6xl">
                {hr.hero.naslovDijelovi.map((dio, i) => (
                  <span key={i} className={`block ${i === 1 ? "-rotate-1 text-sun-400" : ""}`}>
                    {dio}
                  </span>
                ))}
              </h1>
              <p className="mt-5 max-w-lg text-lg text-white/85">{hr.hero.podnaslov}</p>
              <div className="mt-8 flex flex-wrap gap-3">
                <Link href="/rezervacija" className="btn-sun text-lg">
                  {hr.hero.cta}
                </Link>
                <a href="#paketi" className="btn bg-white/10 text-lg text-white ring-2 ring-white/40 hover:bg-white/20">
                  {hr.hero.ctaSekundarno}
                </a>
              </div>
              <ul className="mt-8 flex flex-wrap gap-2 text-sm font-semibold">
                {[hr.hero.znacajka1, hr.hero.znacajka2, hr.hero.znacajka3].map((z) => (
                  <li key={z} className="chip bg-white/15 ring-1 ring-white/20">
                    <Ikona ime="kvacica" className="h-4 w-4 text-sun-400" /> {z}
                  </li>
                ))}
              </ul>
            </div>

            <div className="relative mx-auto w-full max-w-md">
              <div className="relative rotate-2 rounded-[2.5rem] bg-white px-6 pb-16 pt-10 text-center shadow-[0_24px_60px_-20px_rgba(29,24,64,0.6)] ring-8 ring-white/20">
                <Logo size="lg" subtitle />
              </div>
              <Balloon className="absolute -right-3 -top-12 h-28 w-16 motion-safe:animate-float" />
              <Balloon
                color={BOJE.cijan}
                className="absolute -left-5 top-1/4 h-20 w-12 [animation-delay:1.3s] motion-safe:animate-float"
              />
              <div className="absolute -bottom-6 -left-3 -rotate-6 rounded-2xl bg-berry-600 px-4 py-3 shadow-soft">
                <p className="font-display text-base font-bold">{hr.hero.bedz}</p>
                <p className="text-xs text-white/90">{hr.hero.bedzOpis}</p>
              </div>
            </div>
          </div>
          <Wave className="absolute inset-x-0 -bottom-px h-14 w-full text-paper sm:h-20" />
        </section>

        {/* PONUDA — ikonice u krugovima */}
        <section id="ponuda" className="section pb-6 pt-8">
          <SectionNaslov naslov={hr.ponuda.naslov} podnaslov={hr.ponuda.podnaslov} />
          <ul className="mt-10 flex flex-wrap justify-center gap-x-4 gap-y-8 sm:gap-x-8">
            {PONUDA.map((s) => (
              <li key={s.kljuc} className="w-28">
                <Link href="/rezervacija" className="group flex flex-col items-center gap-3 text-center">
                  <IconCircle
                    ikona={s.ikona}
                    boja={s.boja}
                    className="h-20 w-20 transition group-hover:-translate-y-1 group-hover:rotate-6"
                    iconClassName="h-9 w-9"
                  />
                  <span className="font-display text-sm font-bold uppercase leading-tight tracking-wide text-brand-900">
                    {hr.ponuda.stavke[s.kljuc]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        {/* IGRA · ZABAVA · PRIJATELJSTVO · USPOMENE */}
        <div className="overflow-hidden py-8">
          <div className="-mx-8 -rotate-1 bg-white py-5 shadow-soft ring-1 ring-brand-100">
            <p className="section flex flex-wrap items-center justify-center gap-x-5 gap-y-1 font-display text-2xl font-bold uppercase sm:text-4xl">
              {hr.vrijednosti.map((v, i) => (
                <Fragment key={v}>
                  {i > 0 && <span aria-hidden className="text-sun-400">★</span>}
                  <span className={VRIJEDNOSTI_BOJE[i % VRIJEDNOSTI_BOJE.length]}>{v}</span>
                </Fragment>
              ))}
            </p>
          </div>
        </div>

        {/* PAKETI — po igraonicama */}
        <section id="paketi" className="section py-16">
          <SectionNaslov naslov={hr.paketi.naslov} podnaslov={hr.paketi.podnaslov} />
          <div className="mt-12 space-y-16">
            {sobe.map((soba) => {
              const paketiSobe = [...soba.packages, ...opciPaketi];
              if (paketiSobe.length === 0) return null;
              const gaming = soba.slug.includes("game");
              return (
                <div key={soba.id}>
                  <div className="flex flex-col items-center gap-3 text-center">
                    <IconCircle
                      ikona={gaming ? "gamepad" : "medo"}
                      boja={gaming ? "sky" : "berry"}
                      className="h-14 w-14"
                      iconClassName="h-7 w-7"
                    />
                    <div>
                      <h3 className="font-display text-3xl font-bold text-brand-900">{soba.name}</h3>
                      {soba.description && <p className="text-ink-500">{soba.description}</p>}
                    </div>
                  </div>
                  {/* Kartice u centriranom redu — i treći paket (npr. Platinum) ostaje uravnotežen */}
                  <div className="mt-8 flex flex-wrap justify-center gap-8">
                    {paketiSobe.map((p, i) => {
                      const stavke = (p.includedItems as string[]) ?? [];
                      return (
                        <div
                          key={p.id}
                          className={`card relative flex w-full flex-col overflow-hidden pt-9 sm:w-[21rem] ${p.popular ? "ring-4 ring-sun-400" : ""}`}
                        >
                          <span aria-hidden className={`absolute inset-x-0 top-0 h-3 ${PAKET_AKCENT[i % PAKET_AKCENT.length]}`} />
                          {p.popular && (
                            <span className="chip mb-2 w-fit bg-sun-400 font-bold text-brand-900">★ {hr.paketi.popularno}</span>
                          )}
                          <h4 className="font-display text-2xl font-bold text-brand-900">{p.name}</h4>
                          {p.description && <p className="mt-1 text-sm text-ink-500">{p.description}</p>}
                          <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
                            <span className="font-display text-4xl font-bold text-brand-600">{formatEur(p.basePriceCents)}</span>
                            <span className="text-sm text-ink-500">{hr.paketi.fiksnaCijena}</span>
                          </div>
                          <ul className="mt-4 flex flex-wrap gap-2 font-semibold">
                            <li className="chip bg-brand-50 !text-xs text-brand-700">⏱ {trajanjeSati(p.durationMin)}</li>
                            <li className="chip bg-berry-50 !text-xs text-berry-700">
                              {hr.paketi.doBroj} {p.maxChildren} {hr.paketi.odDjece} · {hr.paketi.slavljenikGratis}
                            </li>
                            {p.perChildCents > 0 && (
                              <li className="chip bg-sun-100 !text-xs text-brand-900">
                                +{formatEur(p.perChildCents)} {hr.paketi.poDodatnomDjetetu}
                              </li>
                            )}
                          </ul>
                          <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-600">
                            {stavke.map((s, j) => (
                              <li key={j} className="flex items-start gap-2.5">
                                <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                                  <Ikona ime="kvacica" className="h-3.5 w-3.5" />
                                </span>
                                <span>{s}</span>
                              </li>
                            ))}
                          </ul>
                          <Link href={`/rezervacija?paket=${p.slug}`} className="btn-primary mt-6 w-full">
                            {hr.paketi.odabir}
                          </Link>
                        </div>
                      );
                    })}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* TERMINI I RASPORED */}
        <section id="termini" className="bg-white py-16">
          <div className="section">
            <SectionNaslov naslov={hr.termini.naslov} podnaslov={hr.termini.podnaslov} />
            <div className="mt-10 grid gap-6 md:grid-cols-3">
              {RASPORED_KARTICE.map((k) => {
                const kartica = hr.termini[k.kljuc];
                return (
                  <div key={k.kljuc} className="card">
                    <IconCircle ikona={k.ikona} boja={k.boja} className="h-14 w-14" iconClassName="h-7 w-7" />
                    <h3 className="mt-4 font-display text-xl font-bold text-brand-900">{kartica.naslov}</h3>
                    <p className="text-sm font-bold uppercase tracking-wide text-berry-600">{kartica.dani}</p>
                    <ul className="mt-4 space-y-2.5 text-sm text-ink-700">
                      {kartica.stavke.map((s) => (
                        <li key={s} className="flex items-start gap-2.5">
                          <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
                            <Ikona ime="kvacica" className="h-3.5 w-3.5" />
                          </span>
                          <span>{s}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                );
              })}
            </div>
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-500">{hr.termini.napomena}</p>
            <div className="mt-6 flex justify-center">
              <Link href="/rezervacija" className="btn-primary">{hr.hero.cta}</Link>
            </div>
          </div>
        </section>

        {/* TEME */}
        <section id="teme" className="py-16">
          <div className="section">
            <SectionNaslov naslov={hr.teme.naslov} podnaslov={hr.teme.podnaslov} />
            <div className="mt-10 grid gap-5 sm:grid-cols-2 lg:grid-cols-4">
              {teme.map((t) => (
                <div
                  key={t.id}
                  className={`relative overflow-hidden rounded-3xl bg-gradient-to-br ${t.gradient} p-6 text-white shadow-soft [text-shadow:0_1px_2px_rgba(29,24,64,0.35)]`}
                >
                  <span aria-hidden className="absolute -right-6 -top-6 h-24 w-24 rounded-full bg-white/15" />
                  <span aria-hidden className="absolute -bottom-8 -left-4 h-20 w-20 rounded-full bg-white/10" />
                  <div aria-hidden className="relative flex h-16 w-16 items-center justify-center rounded-full bg-white/25 text-4xl ring-4 ring-white/30">
                    {t.emoji}
                  </div>
                  <h3 className="relative mt-4 font-display text-xl font-bold">{t.name}</h3>
                  <p className="relative mt-1 text-sm text-white/95">{t.description}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* GALERIJA — pločice u stilu Instagram objava */}
        <section id="galerija" className="section py-16">
          <SectionNaslov naslov={hr.galerija.naslov} podnaslov={hr.galerija.podnaslov} />
          <div className="mt-10 grid grid-cols-2 gap-4 sm:grid-cols-3 sm:gap-5">
            {hr.objave.map((o, i) => {
              const stil = OBJAVE_STIL[i % OBJAVE_STIL.length];
              return (
                <figure
                  key={i}
                  className={`relative flex aspect-[4/5] flex-col overflow-hidden rounded-3xl bg-gradient-to-br ${stil.bg} p-3 shadow-soft sm:aspect-[6/5] sm:p-4`}
                >
                  <Confetti gustoca="mala" />
                  <span aria-hidden className="relative flex flex-1 items-center justify-center text-6xl drop-shadow sm:text-8xl">
                    {stil.emoji}
                  </span>
                  <figcaption
                    className={`relative ${i % 2 ? "rotate-2" : "-rotate-2"} rounded-2xl bg-white px-3 py-2.5 font-display leading-tight text-brand-900 shadow-pop sm:px-4 sm:py-3`}
                  >
                    <span className="block text-sm font-semibold sm:text-lg">{o.tekst}</span>
                    <span className="block text-base font-bold text-berry-600 sm:text-xl">{o.istaknuto}</span>
                  </figcaption>
                </figure>
              );
            })}
          </div>
        </section>

        {/* ZAŠTO KIDZONA */}
        <section id="zasto" className="bg-white py-16">
          <div className="section">
            <SectionNaslov naslov={hr.zasto.naslov} />
            <div className="mt-10 grid gap-6 sm:grid-cols-2 lg:grid-cols-4">
              {[hr.zasto.sigurnost, hr.zasto.cistoca, hr.zasto.zabava, hr.zasto.bezbriznost].map((z, i) => (
                <div key={i} className="card text-center">
                  <IconCircle ikona={ZASTO_IKONE[i].ikona} boja={ZASTO_IKONE[i].boja} />
                  <h3 className="mt-4 font-display text-lg font-bold text-brand-900">{z.naslov}</h3>
                  <p className="mt-2 text-sm text-ink-500">{z.opis}</p>
                </div>
              ))}
            </div>
          </div>
        </section>

        {/* RECENZIJE */}
        <section className="section py-16">
          <SectionNaslov naslov={hr.recenzije.naslov} />
          <div className="mt-10 grid gap-6 md:grid-cols-3">
            {[
              { ime: "Marija K.", tekst: "Najbolji rođendan do sada! Djeca su bila oduševljena, a mi se nismo morali ni za što brinuti.", zvj: 5 },
              { ime: "Ivan P.", tekst: "Rezervacija putem interneta u nekoliko minuta, sve organizirano i čisto. Toplo preporučujem.", zvj: 5 },
              { ime: "Sara M.", tekst: "Tematska dekoracija jednoroga bila je predivna. Hvala cijeloj ekipi!", zvj: 5 },
            ].map((r, i) => (
              <div key={i} className="card relative">
                <span aria-hidden className="absolute right-5 top-1 font-display text-7xl leading-none text-brand-100">”</span>
                <div className="text-xl tracking-wider text-sun-500" aria-label={`${r.zvj} od 5`}>{"★".repeat(r.zvj)}</div>
                <p className="relative mt-3 text-ink-700">„{r.tekst}"</p>
                <p className="mt-4 font-display font-bold text-brand-700">{r.ime}</p>
              </div>
            ))}
          </div>
        </section>

        {/* FAQ */}
        <section id="faq" className="bg-white py-16">
          <div className="section">
            <SectionNaslov naslov={hr.faq.naslov} />
            <div className="mt-10">
              <FaqAccordion pitanja={hr.faq.pitanja} />
            </div>
          </div>
        </section>

        {/* KONTAKT */}
        <section id="kontakt" className="section py-16">
          <SectionNaslov naslov={hr.kontakt.naslov} />
          <div className="mt-10 grid gap-6 md:grid-cols-2">
            <div className="card space-y-3">
              <p className="flex items-center gap-3 text-ink-700">📍 {hr.kontakt.adresa}</p>
              <p className="flex items-center gap-3 text-ink-700">📞 {hr.kontakt.telefon}</p>
              <p className="flex items-center gap-3 text-ink-700">✉️ {hr.kontakt.email}</p>
              <div className="border-t border-brand-100 pt-3">
                <p className="font-display font-bold text-brand-900">{hr.kontakt.radnoVrijeme}</p>
                <p className="text-sm text-ink-500">{hr.kontakt.radniDani}</p>
                <p className="text-sm text-ink-500">{hr.kontakt.vikend}</p>
              </div>
              <Link href="/rezervacija" className="btn-primary mt-2 w-full">{hr.hero.cta}</Link>
            </div>
            <div className="overflow-hidden rounded-3xl shadow-soft ring-4 ring-white">
              <iframe
                title="Karta — Nova Gradiška"
                src="https://www.google.com/maps?q=Strossmayerova+3,+35400+Nova+Gradi%C5%A1ka,+Croatia&output=embed"
                className="h-full min-h-[280px] w-full border-0"
                loading="lazy"
                referrerPolicy="no-referrer-when-downgrade"
              />
            </div>
          </div>
        </section>
      </main>
      <SiteFooter />
      <StickyCta label={hr.hero.cta} />
    </>
  );
}

function SectionNaslov({ naslov, podnaslov }: { naslov: string; podnaslov?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl font-bold text-brand-900 sm:text-4xl">{naslov}</h2>
      <Squiggle className="mx-auto mt-2 h-3 w-24 text-berry-500" />
      {podnaslov && <p className="mt-3 text-ink-500">{podnaslov}</p>}
    </div>
  );
}
