import Link from "next/link";
import { getDict, getLocale } from "@/i18n";
import { LanguageToggle } from "@/components/LanguageToggle";
import { Logo } from "@/components/Logo";
import { ObavijestZatvaranja } from "@/components/ObavijestZatvaranja";

/** Glavna navigacija javnog dijela stranice (dvojezično: HR/EN). */
export async function SiteHeader() {
  const locale = await getLocale();
  const t = getDict(locale);
  return (
    <>
    <ObavijestZatvaranja />
    <header className="sticky top-0 z-40 bg-white/95 shadow-[0_6px_24px_-18px_rgba(43,26,102,0.45)] backdrop-blur">
      {/* Tanka traka u četiri brand boje */}
      <div aria-hidden className="flex h-1.5">
        <span className="flex-1 bg-brand-500" />
        <span className="flex-1 bg-berry-500" />
        <span className="flex-1 bg-sun-400" />
        <span className="flex-1 bg-sky2-400" />
      </div>
      <div className="section flex h-[4.5rem] items-center justify-between gap-2 sm:gap-4">
        <Link href="/" className="shrink-0">
          <Logo size="sm" mjesto={false} />
        </Link>

        <nav className="hidden items-center gap-4 whitespace-nowrap font-display text-[0.9rem] font-semibold text-brand-900 lg:flex xl:gap-5 xl:text-[0.95rem]">
          <a href="/#paketi" className="transition hover:text-berry-600">{t.nav.paketi}</a>
          <a href="/#teme" className="transition hover:text-berry-600">{t.nav.teme}</a>
          <a href="/#galerija" className="transition hover:text-berry-600">{t.nav.galerija}</a>
          <a href="/#zasto" className="transition hover:text-berry-600">{t.nav.zasto}</a>
          <Link href="/pravila" className="transition hover:text-berry-600">{t.nav.pravila}</Link>
          <Link href="/pokloni" className="transition hover:text-berry-600">{t.pokloni.naslov}</Link>
          <a href="/#kontakt" className="transition hover:text-berry-600">{t.nav.kontakt}</a>
        </nav>

        <div className="flex items-center gap-2 whitespace-nowrap sm:gap-3">
          <LanguageToggle locale={locale} />
          {/* Na srednjim ekranima (uz punu navigaciju) nema mjesta za "Prijava" */}
          <Link href="/portal" className="hidden text-sm font-semibold text-brand-700 hover:text-berry-600 sm:inline lg:hidden xl:inline">
            {t.nav.prijava}
          </Link>
          <Link href="/rezervacija" className="btn-primary !px-3 !py-2 !text-xs sm:!px-4 sm:!text-sm">
            {t.nav.rezerviraj}
          </Link>
        </div>
      </div>
    </header>
    </>
  );
}
