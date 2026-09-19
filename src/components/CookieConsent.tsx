"use client";
import { useEffect, useState } from "react";
import Link from "next/link";
import { procitajPrivolu, zapisiPrivolu } from "@/lib/privola";

/**
 * GDPR cookie-consent banner. Pojavljuje se dok posjetitelj ne odabere; odluka
 * se sprema u localStorage. O njoj ovisi i Google Analytics — bez privole se
 * mjerenje uopće ne učitava (vidi `GoogleAnalytics`).
 */
export function CookieConsent() {
  const [vidljiv, setVidljiv] = useState(false);

  useEffect(() => {
    if (!procitajPrivolu()) setVidljiv(true);
  }, []);

  function odluka(vrijednost: "prihvaceno" | "odbijeno") {
    zapisiPrivolu(vrijednost);
    setVidljiv(false);
  }

  if (!vidljiv) return null;

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 p-3 sm:p-4">
      <div className="mx-auto flex max-w-3xl flex-col items-start gap-3 rounded-3xl bg-brand-900 p-4 text-sm text-white shadow-soft ring-1 ring-white/10 sm:flex-row sm:items-center">
        <p className="flex-1">
          🍪 Koristimo nužne kolačiće za rad stranice. Uz vašu privolu koristimo i kolačiće za
          poboljšanje iskustva. Više u{" "}
          <Link href="/privatnost" className="underline">pravilima privatnosti</Link>.
        </p>
        <div className="flex shrink-0 gap-2">
          <button type="button" onClick={() => odluka("odbijeno")} className="rounded-full px-4 py-2 text-white/80 hover:text-white">
            Samo nužni
          </button>
          <button type="button" onClick={() => odluka("prihvaceno")} className="rounded-full bg-sun-400 px-4 py-2 font-bold text-brand-900 hover:bg-sun-300">
            Prihvati sve
          </button>
        </div>
      </div>
    </div>
  );
}
