"use client";
import { useState, useTransition } from "react";
import { formatEur } from "@/lib/format";

export interface PosArtikl {
  naziv: string;
  priceCents: number;
}

interface NaplataRezultat {
  ok: boolean;
  number?: string;
  jir?: string | null;
  zki?: string | null;
  total?: number;
}

export function PosTerminal({
  artikli,
  naplati,
}: {
  artikli: PosArtikl[];
  naplati: (stavke: { naziv: string; priceCents: number; quantity: number }[]) => Promise<NaplataRezultat>;
}) {
  const [kolicine, setKolicine] = useState<Record<string, number>>({});
  const [rezultat, setRezultat] = useState<NaplataRezultat | null>(null);
  const [pending, startTransition] = useTransition();

  const total = artikli.reduce((s, a) => s + a.priceCents * (kolicine[a.naziv] ?? 0), 0);

  function dodaj(naziv: string, delta: number) {
    setKolicine((k) => {
      const nova = Math.max(0, (k[naziv] ?? 0) + delta);
      return { ...k, [naziv]: nova };
    });
  }

  function naplatiSada() {
    const stavke = artikli.map((a) => ({ naziv: a.naziv, priceCents: a.priceCents, quantity: kolicine[a.naziv] ?? 0 }));
    startTransition(async () => {
      const r = await naplati(stavke);
      setRezultat(r);
      if (r.ok) setKolicine({});
    });
  }

  return (
    <div className="card">
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3">
        {artikli.map((a) => {
          const q = kolicine[a.naziv] ?? 0;
          return (
            <div key={a.naziv} className={`rounded-2xl border p-3 ${q > 0 ? "border-brand-400 bg-brand-50" : "border-ink-200"}`}>
              <p className="font-medium text-ink-800">{a.naziv}</p>
              <p className="text-sm text-ink-500">{formatEur(a.priceCents)}</p>
              <div className="mt-2 flex items-center justify-between">
                <button type="button" className="h-8 w-8 rounded-lg bg-ink-100 text-lg" onClick={() => dodaj(a.naziv, -1)}>−</button>
                <span className="font-bold">{q}</span>
                <button type="button" className="h-8 w-8 rounded-lg bg-brand-500 text-lg text-white" onClick={() => dodaj(a.naziv, 1)}>+</button>
              </div>
            </div>
          );
        })}
      </div>

      <div className="mt-4 flex items-center justify-between border-t border-black/5 pt-4">
        <span className="text-lg font-bold text-ink-900">Ukupno: {formatEur(total)}</span>
        <button type="button" className="btn-primary" disabled={total === 0 || pending} onClick={naplatiSada}>
          {pending ? "Naplata…" : "Naplati i fiskaliziraj"}
        </button>
      </div>

      {rezultat?.ok && (
        <div className="mt-4 rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-700">
          ✅ Račun {rezultat.number} izdan i fiskaliziran. Iznos {formatEur(rezultat.total ?? 0)}.
          <span className="block text-xs text-mint-600">JIR: {rezultat.jir} · ZKI: {rezultat.zki}</span>
        </div>
      )}
    </div>
  );
}
