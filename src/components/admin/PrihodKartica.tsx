"use client";

import { useEffect, useState } from "react";

const KLJUC = "kidzona:sakrij-prihod";

interface Props {
  naslov: string;
  vrijednost: string;
  rodjendani: string;
  dnevnaIgra: string;
}

const ikonaOka = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
    <path d="M2.062 12.348a1 1 0 0 1 0-.696 10.75 10.75 0 0 1 19.876 0 1 1 0 0 1 0 .696 10.75 10.75 0 0 1-19.876 0" />
    <circle cx="12" cy="12" r="3" />
  </svg>
);

const ikonaPrekrizenogOka = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-4 w-4" aria-hidden>
    <path d="M10.733 5.076a10.744 10.744 0 0 1 11.205 6.575 1 1 0 0 1 0 .696 10.747 10.747 0 0 1-1.444 2.49" />
    <path d="M14.084 14.158a3 3 0 0 1-4.242-4.242" />
    <path d="M17.479 17.499a10.75 10.75 0 0 1-15.417-5.151 1 1 0 0 1 0-.696 10.75 10.75 0 0 1 4.446-5.143" />
    <path d="m2 2 20 20" />
  </svg>
);

/** KPI kartica prihoda s mogućnošću skrivanja iznosa radi privatnosti u igraonici. */
export function PrihodKartica({ naslov, vrijednost, rodjendani, dnevnaIgra }: Props) {
  const [skriveno, setSkriveno] = useState<boolean | null>(null);

  useEffect(() => {
    try {
      setSkriveno(window.localStorage.getItem(KLJUC) === "1");
    } catch {
      setSkriveno(false);
    }
  }, []);

  const sakrij = skriveno !== false;

  function prebaci() {
    const novi = !sakrij;
    try {
      window.localStorage.setItem(KLJUC, novi ? "1" : "0");
    } catch {
      // Privatni način ili blokiran storage — mijenjamo barem trenutno stanje.
    }
    setSkriveno(novi);
  }

  return (
    <div className="card">
      <div className="flex items-center justify-between gap-2">
        <span className="text-sm text-ink-500">{naslov}</span>
        <div className="flex items-center gap-1.5">
          <button
            type="button"
            onClick={prebaci}
            aria-pressed={sakrij}
            aria-label={sakrij ? "Prikaži prihod" : "Sakrij prihod"}
            title={sakrij ? "Prikaži prihod" : "Sakrij prihod"}
            className="flex h-8 w-8 items-center justify-center rounded-lg text-ink-400 transition hover:bg-ink-100 hover:text-ink-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand-500"
          >
            {sakrij ? ikonaOka : ikonaPrekrizenogOka}
          </button>
          <span className="text-2xl" aria-hidden>💶</span>
        </div>
      </div>
      <p className="mt-2 font-display text-2xl font-extrabold text-ink-900">{sakrij ? "••••••" : vrijednost}</p>
      <p className="mt-1 text-xs text-ink-500">
        {sakrij ? "Rođendani •••• · Dnevna igra ••••" : `Rođendani ${rodjendani} · Dnevna igra ${dnevnaIgra}`}
      </p>
    </div>
  );
}
