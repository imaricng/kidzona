import Link from "next/link";
import { getDict, getLocale } from "@/i18n";
import { Logo } from "@/components/Logo";
import { Confetti, Wave } from "@/components/Decor";

export async function SiteFooter() {
  const t = getDict(await getLocale());
  return (
    <footer className="relative mt-28 bg-brand-700 text-white">
      {/* Šareni val (cijan, žuta, roza, ljubičasta) kao na dnu brand ploče */}
      <Wave
        fills={["#4DD6FF", "#FFD93B", "#FF4DA6", "#4A25AD"]}
        className="absolute inset-x-0 bottom-[calc(100%-1px)] h-14 w-full sm:h-20"
      />
      <Confetti gustoca="mala" />
      <div className="section relative grid gap-10 pb-10 pt-10 sm:grid-cols-2 md:grid-cols-4">
        <div>
          <span className="inline-block rounded-3xl bg-white px-4 py-3 shadow-pop">
            <Logo size="sm" />
          </span>
          <p className="mt-4 text-sm text-white/80">{t.brand.slogan}</p>
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-sun-400">{t.nav.paketi}</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li><a href="/#paketi" className="hover:text-white">{t.nav.paketi}</a></li>
            <li><a href="/#termini" className="hover:text-white">{t.nav.termini}</a></li>
            <li><a href="/#teme" className="hover:text-white">{t.nav.teme}</a></li>
            <li><a href="/#faq" className="hover:text-white">{t.nav.faq}</a></li>
            <li><Link href="/rezervacija" className="hover:text-white">{t.nav.rezerviraj}</Link></li>
            <li><Link href="/pokloni" className="hover:text-white">{t.pokloni.naslov}</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-sun-400">{t.kontakt.naslov}</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>{t.kontakt.adresa}</li>
            <li>{t.kontakt.telefon}</li>
            <li>{t.kontakt.email}</li>
            <li><Link href="/privatnost" className="hover:text-white">Pravila privatnosti</Link></li>
          </ul>
        </div>
        <div>
          <h3 className="font-display text-base font-bold text-sun-400">{t.kontakt.radnoVrijeme}</h3>
          <ul className="mt-3 space-y-2 text-sm text-white/80">
            <li>{t.kontakt.radniDani}</li>
            <li>{t.kontakt.vikend}</li>
          </ul>
          <Link href="/admin" className="mt-4 inline-block text-sm text-white/50 hover:text-white">
            {t.nav.admin}
          </Link>
        </div>
      </div>
      <div className="relative border-t border-white/10">
        <div className="section flex flex-col items-center justify-between gap-2 py-5 sm:flex-row">
          <p className="-rotate-3 font-script text-2xl text-sun-300">Party Kidzona Nova Gradiška</p>
          <p className="text-xs text-white/60">
            © {new Date().getFullYear()} {t.brand.naziv}. {t.nav.admin === "Admin" ? "All rights reserved." : "Sva prava pridržana."}
          </p>
        </div>
      </div>
    </footer>
  );
}
