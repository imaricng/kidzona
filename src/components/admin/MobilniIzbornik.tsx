"use client";

import { useEffect, useState } from "react";
import { usePathname } from "next/navigation";
import { AdminNav } from "@/components/admin/AdminNav";

/**
 * Glavni izbornik administracije na mobitelu. Dosad je stajao kao vodoravna
 * traka koja se morala listati postrance; sada se otvara iz „sendvič" ikone,
 * pa naslovna traka ostaje čista (logo na sredini).
 */
export function MobilniIzbornik() {
  const [otvoren, setOtvoren] = useState(false);
  const pathname = usePathname();

  // Odabir stavke vodi na drugu stranicu — izbornik se tada zatvara sam.
  useEffect(() => {
    setOtvoren(false);
  }, [pathname]);

  // Dok je izbornik otvoren, pozadina se ne pomiče pod prstom.
  useEffect(() => {
    if (!otvoren) return;
    const prije = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    function tipka(e: KeyboardEvent) {
      if (e.key === "Escape") setOtvoren(false);
    }
    document.addEventListener("keydown", tipka);
    return () => {
      document.body.style.overflow = prije;
      document.removeEventListener("keydown", tipka);
    };
  }, [otvoren]);

  return (
    <>
      <button
        type="button"
        onClick={() => setOtvoren(true)}
        aria-label="Otvori izbornik"
        aria-expanded={otvoren}
        className="-ml-1 flex h-10 w-10 items-center justify-center rounded-xl text-ink-700 transition hover:bg-brand-50"
      >
        <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-6 w-6" aria-hidden>
          <path d="M4 7h16M4 12h16M4 17h16" />
        </svg>
      </button>

      {otvoren && (
        <div className="fixed inset-0 z-50 md:hidden">
          <button
            type="button"
            aria-label="Zatvori izbornik"
            onClick={() => setOtvoren(false)}
            className="absolute inset-0 h-full w-full cursor-default bg-ink-900/40"
          />
          <div role="dialog" aria-label="Izbornik administracije" className="absolute inset-y-0 left-0 flex w-72 max-w-[85%] flex-col bg-white p-4 shadow-soft">
            <div className="mb-3 flex items-center justify-between">
              <span className="font-display font-extrabold text-brand-600">Izbornik</span>
              <button
                type="button"
                onClick={() => setOtvoren(false)}
                aria-label="Zatvori izbornik"
                className="flex h-9 w-9 items-center justify-center rounded-xl text-xl leading-none text-ink-500 transition hover:bg-ink-100"
              >
                ×
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto">
              <AdminNav />
            </div>
          </div>
        </div>
      )}
    </>
  );
}
