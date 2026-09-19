"use client";

import Script from "next/script";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { PRIVOLA_DOGADJAJ, procitajPrivolu } from "@/lib/privola";

/**
 * Google Analytics (gtag.js). Učitava se tek kad posjetitelj u banneru prihvati
 * kolačiće — mjerenje postavlja kolačiće, pa bi bez privole banner bio prazno
 * obećanje. Odbije li, ili još nije odlučio, skripta se uopće ne dohvaća.
 *
 * Administracija i portal za roditelje se ne mjere: to je rad osoblja i
 * prijavljenih korisnika, a ne promet koji zanima statistiku.
 */
const NEMJERENO = ["/admin", "/portal"];

export function GoogleAnalytics({ id }: { id: string }) {
  const [dopusteno, setDopusteno] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    const osvjezi = () => setDopusteno(procitajPrivolu() === "prihvaceno");
    osvjezi();
    window.addEventListener(PRIVOLA_DOGADJAJ, osvjezi);
    return () => window.removeEventListener(PRIVOLA_DOGADJAJ, osvjezi);
  }, []);

  if (!id || !dopusteno) return null;
  if (NEMJERENO.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  return (
    <>
      <Script src={`https://www.googletagmanager.com/gtag/js?id=${id}`} strategy="afterInteractive" />
      <Script id="google-analytics" strategy="afterInteractive">
        {`window.dataLayer = window.dataLayer || [];
function gtag(){dataLayer.push(arguments);}
gtag('js', new Date());
gtag('config', '${id}');`}
      </Script>
    </>
  );
}
