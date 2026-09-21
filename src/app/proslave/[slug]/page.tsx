import Link from "next/link";
import { notFound } from "next/navigation";
import type { Metadata } from "next";
import { prisma } from "@/lib/prisma";
import { getDict, getLocale } from "@/i18n";
import { hr as hrDefault } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { igraonicaJsonLd, slugIgraonice } from "@/lib/seo";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { StickyCta } from "@/components/StickyCta";
import { FaqAccordion } from "@/components/FaqAccordion";
import { JsonLd } from "@/components/JsonLd";
import { PaketKartica } from "@/components/PaketKartica";
import { SectionNaslov } from "@/components/SectionNaslov";
import { Confetti, IconCircle, Ikona, Wave, WhatsAppLogo } from "@/components/Decor";

export const dynamic = "force-dynamic";

/** Aktivna igraonica prema adresi (npr. "kids-play"), s paketima koji vrijede za nju. */
async function dohvatiIgraonicu(slug: string) {
  const [sobe, opciPaketi, teme] = await Promise.all([
    prisma.room.findMany({
      where: { active: true },
      orderBy: { sortOrder: "asc" },
      include: { packages: { where: { active: true }, orderBy: { sortOrder: "asc" } } },
    }),
    prisma.package.findMany({ where: { active: true, roomId: null }, orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ where: { active: true }, orderBy: { sortOrder: "asc" } }),
  ]);
  const soba = sobe.find((s) => slugIgraonice(s.name) === slug);
  if (!soba) return null;
  return { soba, ostale: sobe.filter((s) => s.id !== soba.id), opciPaketi, teme };
}

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const { slug } = await params;
  const podaci = await dohvatiIgraonicu(slug);
  if (!podaci) return {};
  const { soba, opciPaketi } = podaci;
  const paketi = [...soba.packages, ...opciPaketi];
  const cijene = paketi.filter((p) => !p.cijenaPoDogovoru).map((p) => p.basePriceCents);
  const naslov = `${soba.name} — ${hrDefault.proslave.naslovSufiks}`;
  const opis = [
    soba.description,
    `Paketi ${paketi.map((p) => p.name).join(", ")}${cijene.length ? ` od ${formatEur(Math.min(...cijene))}` : ""}, slavljenik gratis.`,
    "Pošaljite upit online ili putem WhatsAppa.",
  ]
    .filter(Boolean)
    .join(" ");
  return {
    title: naslov,
    description: opis,
    alternates: { canonical: `/proslave/${slug}` },
    openGraph: { title: naslov, description: opis, siteName: "Party Kidzona Nova Gradiška", locale: "hr_HR", type: "website" },
  };
}

export default async function IgraonicaPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const podaci = await dohvatiIgraonicu(slug);
  if (!podaci) notFound();
  const { soba, ostale, opciPaketi, teme } = podaci;
  const t = getDict(await getLocale());
  const paketi = [...soba.packages, ...opciPaketi];
  const gaming = soba.slug.includes("game");

  return (
    <>
      <SiteHeader />
      <main className="pb-24 md:pb-0">
        <JsonLd data={igraonicaJsonLd(soba, opciPaketi)} />

        {/* Uvod */}
        <section className="relative overflow-hidden bg-brand-500 text-white">
          <Confetti gustoca="mala" />
          <div className="section relative pb-24 pt-8 md:pb-32 md:pt-12">
            <nav aria-label="Putanja" className="text-sm text-white/80">
              <Link href="/" className="hover:text-white hover:underline">Party Kidzona</Link>
              <span aria-hidden className="mx-2">/</span>
              <span className="text-white">{soba.name}</span>
            </nav>
            <div className="mt-8 flex flex-col items-start gap-5 md:flex-row md:items-center">
              <IconCircle ikona={gaming ? "gamepad" : "medo"} boja={gaming ? "sky" : "berry"} className="h-20 w-20 shrink-0" iconClassName="h-10 w-10" />
              <div>
                <h1 className="font-display text-4xl font-bold leading-tight sm:text-5xl">
                  {soba.name}
                  <span className="block text-2xl text-sun-400 sm:text-3xl">{t.proslave.naslovSufiks}</span>
                </h1>
              </div>
            </div>
            {soba.description && <p className="mt-6 max-w-2xl text-lg font-semibold text-white/95">{soba.description}</p>}
            <p className="mt-2 max-w-2xl text-lg text-white/85">{t.proslave.uvod}</p>
            <div className="mt-8 flex flex-wrap gap-3">
              <Link href="/rezervacija" className="btn-sun text-lg">{t.proslave.cta}</Link>
              <a
                href={`https://wa.me/${t.kontakt.whatsapp}?text=${encodeURIComponent(t.hero.whatsappPoruka)}`}
                target="_blank"
                rel="noopener noreferrer"
                className="btn-whatsapp text-lg"
              >
                <WhatsAppLogo className="h-6 w-6" />
                {t.hero.ctaWhatsapp}
              </a>
            </div>
          </div>
          <Wave className="absolute inset-x-0 -bottom-px h-14 w-full text-paper sm:h-20" />
        </section>

        {/* Paketi */}
        <section id="paketi" className="section py-16">
          <SectionNaslov naslov={t.proslave.paketi} podnaslov={t.paketi.podnaslov} />
          <div className="mt-10 flex flex-wrap justify-center gap-8">
            {paketi.map((p, i) => (
              <PaketKartica key={p.id} paket={p} indeks={i} t={t} />
            ))}
          </div>
          <p className="mt-8 text-center text-xs text-ink-400">{t.paketi.sidrenaNapomena}</p>
        </section>

        {/* Termini */}
        <section className="bg-white py-16">
          <div className="section">
            <SectionNaslov naslov={t.proslave.termini} podnaslov={t.termini.podnaslov} />
            <div className="mt-10 grid gap-6 md:grid-cols-2">
              {(["vikend", "tjedan"] as const).map((kljuc) => {
                const kartica = t.termini[kljuc];
                return (
                  <div key={kljuc} className="card">
                    <h3 className="font-display text-xl font-bold text-brand-900">{kartica.naslov}</h3>
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
            <p className="mx-auto mt-8 max-w-2xl text-center text-sm text-ink-500">{t.termini.napomena}</p>
          </div>
        </section>

        {/* Teme */}
        {teme.length > 0 && (
          <section className="section py-16">
            <SectionNaslov naslov={t.proslave.teme} podnaslov={t.teme.podnaslov} />
            <ul className="mt-10 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
              {teme.map((tema) => (
                <li key={tema.id} className={`rounded-3xl bg-gradient-to-br ${tema.gradient} p-5 text-white shadow-soft [text-shadow:0_1px_2px_rgba(29,24,64,0.35)]`}>
                  <span aria-hidden className="text-3xl">{tema.emoji}</span>
                  <h3 className="mt-2 font-display text-lg font-bold">{tema.name}</h3>
                  {tema.description && <p className="mt-1 text-sm text-white/95">{tema.description}</p>}
                </li>
              ))}
            </ul>
          </section>
        )}

        {/* Česta pitanja */}
        <section className="bg-white py-16">
          <div className="section">
            <SectionNaslov naslov={t.faq.naslov} />
            <div className="mt-10">
              <FaqAccordion pitanja={t.faq.pitanja} />
            </div>
          </div>
        </section>

        {/* Ostale igraonice */}
        {ostale.length > 0 && (
          <section className="section py-12 text-center">
            <p className="font-display text-lg font-bold text-brand-900">{t.proslave.ostale}</p>
            <div className="mt-4 flex flex-wrap justify-center gap-3">
              {ostale.map((s) => (
                <Link key={s.id} href={`/proslave/${slugIgraonice(s.name)}`} className="btn-secondary">
                  {s.name} →
                </Link>
              ))}
              <Link href="/" className="btn-secondary">Party Kidzona →</Link>
            </div>
          </section>
        )}
      </main>
      <SiteFooter />
      <StickyCta />
    </>
  );
}
