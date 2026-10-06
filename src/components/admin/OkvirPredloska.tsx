"use client";

import { useState } from "react";
import { PozivnicaSlika } from "@/components/PozivnicaSlika";

/**
 * Namještanje bijelog okvira na predlošku pozivnice.
 *
 * Okvir se zadaje u postocima slike (gore, lijevo, širina, visina), pa tekst
 * stoji na istom mjestu bez obzira na veličinu ekrana. Pregled pokazuje stvarni
 * predložak s primjerom teksta i mijenja se dok se klizači pomiču.
 */

const PRIMJER = {
  ime: "Mia Horvat",
  slavi: "slavi 5. rođendan i zove te da se pridružiš.",
  dodji: "Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.",
};

const DUGO_IME = "Ana-Marija Kovačević-Babić";

export function OkvirPredloska({
  akcija,
  themeId,
  roomId,
  src,
  pocetni,
  pocetniSvijetli,
}: {
  akcija: (formData: FormData) => void | Promise<void>;
  themeId: string;
  roomId: string;
  src: string;
  pocetni: { top: number; lijevo: number; sirina: number; visina: number };
  pocetniSvijetli: boolean;
}) {
  const [okvir, setOkvir] = useState(pocetni);
  const [svijetli, setSvijetli] = useState(pocetniSvijetli);
  const [dugoIme, setDugoIme] = useState(false);

  function postavi(kljuc: keyof typeof okvir, v: number) {
    setOkvir((o) => ({ ...o, [kljuc]: Math.max(0, Math.min(100, v)) }));
  }

  return (
    <form action={akcija} className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <input type="hidden" name="themeId" value={themeId} />
      <input type="hidden" name="roomId" value={roomId} />
      <p className="text-xs font-medium text-ink-500">Položaj teksta na predlošku</p>

      <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-ink-100">
        <PozivnicaSlika
          src={src}
          alt="Pregled pozivnice"
          tekst={dugoIme ? { ...PRIMJER, ime: DUGO_IME } : PRIMJER}
          okvir={okvir}
          svijetliTekst={svijetli}
        />
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1">
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <input type="checkbox" checked={dugoIme} onChange={(e) => setDugoIme(e.target.checked)} className="h-3 w-3 accent-brand-500" />
          provjeri s dugim imenom
        </label>
        <label className="flex items-center gap-2 text-xs text-ink-500">
          <input
            type="checkbox"
            name="tekstSvijetli"
            checked={svijetli}
            onChange={(e) => setSvijetli(e.target.checked)}
            className="h-3 w-3 accent-brand-500"
          />
          svijetli tekst (za tamne predloške)
        </label>
      </div>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <Klizac label="Gore" vrijednost={okvir.top} postavi={(v) => postavi("top", v)} name="okvirTop" />
        <Klizac label="Lijevo" vrijednost={okvir.lijevo} postavi={(v) => postavi("lijevo", v)} name="okvirLijevo" />
        <Klizac label="Širina" vrijednost={okvir.sirina} postavi={(v) => postavi("sirina", v)} name="okvirSirina" />
        <Klizac label="Visina" vrijednost={okvir.visina} postavi={(v) => postavi("visina", v)} name="okvirVisina" />
      </div>

      <button type="submit" className="btn-secondary mt-3 !py-1 !text-xs">Spremi položaj</button>
    </form>
  );
}

function Klizac({
  label,
  vrijednost,
  postavi,
  name,
}: {
  label: string;
  vrijednost: number;
  postavi: (v: number) => void;
  name: string;
}) {
  return (
    <label className="block text-xs text-ink-500">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-semibold text-ink-700">{Math.round(vrijednost)}%</span>
      </span>
      <input
        type="range"
        min={0}
        max={100}
        step={1}
        value={vrijednost}
        onChange={(e) => postavi(Number(e.target.value))}
        className="mt-1 w-full accent-brand-500"
      />
      <input type="hidden" name={name} value={vrijednost} />
    </label>
  );
}
