"use client";

import { useState } from "react";

/** Dijeljenje pozivnice: sustavno dijeljenje na mobitelu, inače kopiranje poveznice. */
export function PodijeliPozivnicu() {
  const [kopirano, setKopirano] = useState(false);

  async function podijeli() {
    const url = window.location.href;
    const tekst = "Pozivnica na rođendan 🎉";
    if (navigator.share) {
      try {
        await navigator.share({ title: tekst, text: tekst, url });
        return;
      } catch {
        // Korisnik je odustao ili dijeljenje nije dostupno — pada na kopiranje.
      }
    }
    try {
      await navigator.clipboard.writeText(url);
      setKopirano(true);
      setTimeout(() => setKopirano(false), 2500);
    } catch {
      window.prompt("Kopirajte poveznicu na pozivnicu:", url);
    }
  }

  return (
    <button type="button" className="btn-secondary" onClick={podijeli}>
      {kopirano ? "✅ Poveznica kopirana" : "🔗 Podijeli pozivnicu"}
    </button>
  );
}
