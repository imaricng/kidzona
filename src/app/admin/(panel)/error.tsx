"use client";

import { useEffect } from "react";

/**
 * Greška u administraciji (najčešće u spremanju obrasca). Bez ovoga Next
 * prikaže samo „Application error" i digest, pa osoblje ne zna ni što je pošlo
 * po zlu ni kako dalje — ovdje barem ostaje put natrag na posao.
 */
export default function AdminError({ error, reset }: { error: Error & { digest?: string }; reset: () => void }) {
  useEffect(() => {
    console.error("Greška u administraciji:", error);
  }, [error]);

  return (
    <div className="card mx-auto mt-10 max-w-lg text-center">
      <h1 className="font-display text-xl font-extrabold text-ink-900">Nešto nije uspjelo</h1>
      <p className="mt-2 text-sm text-ink-600">
        Zadnja radnja nije spremljena. Pokušajte ponovno — ako se ponovi, javite razvojnom timu oznaku greške.
      </p>
      {error.digest && <p className="mt-2 text-xs text-ink-400">Oznaka: {error.digest}</p>}
      <button type="button" onClick={reset} className="btn-primary mt-5">
        Pokušaj ponovno
      </button>
    </div>
  );
}
