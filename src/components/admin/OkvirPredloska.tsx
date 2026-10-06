"use client";

import { useState } from "react";
import { PozivnicaSlika, type OkvirPozivnice, type StilPozivnice } from "@/components/PozivnicaSlika";

/**
 * Namještanje teksta na predlošku pozivnice: položaj okvira i njegov izgled.
 *
 * Okvir se zadaje u postocima slike, pa tekst stoji na istom mjestu bez obzira
 * na veličinu ekrana. Gotovi stilovi pokrivaju tri česta slučaja (prazno bijelo
 * polje, tamna slika, šarena slika), a ispod njih je fino podešavanje. Pregled
 * pokazuje stvarni predložak s primjerom teksta i mijenja se odmah.
 */

const PRIMJER = {
  ime: "Mia Horvat",
  slavi: "slavi 5. rođendan i zove te da se pridružiš.",
  dodji: "Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.",
};

const DUGO_IME = "Ana-Marija Kovačević-Babić";

const STILOVI: { naziv: string; opis: string; stil: Partial<StilPozivnice> }[] = [
  { naziv: "Na bijelom polju", opis: "prazan okvir na predlošku", stil: { svijetliTekst: false, podloga: "nema" } },
  { naziv: "Na tamnoj slici", opis: "bijeli tekst sa sjenom", stil: { svijetliTekst: true, podloga: "nema" } },
  { naziv: "S podlogom", opis: "šarena slika ispod teksta", stil: { svijetliTekst: false, podloga: "svijetla", podlogaProzirnost: 85 } },
];

export function OkvirPredloska({
  akcija,
  themeId,
  roomId,
  src,
  pocetniOkvir,
  pocetniStil,
  slikaSirina,
  slikaVisina,
}: {
  akcija: (formData: FormData) => void | Promise<void>;
  themeId: string;
  roomId: string;
  src: string;
  pocetniOkvir: OkvirPozivnice;
  pocetniStil: StilPozivnice;
  slikaSirina: number;
  slikaVisina: number;
}) {
  const [okvir, setOkvir] = useState(pocetniOkvir);
  const [stil, setStil] = useState(pocetniStil);
  const [dugoIme, setDugoIme] = useState(false);

  function postavi(kljuc: keyof OkvirPozivnice, v: number) {
    setOkvir((o) => ({ ...o, [kljuc]: Math.max(0, Math.min(100, v)) }));
  }

  return (
    <form action={akcija} className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <input type="hidden" name="themeId" value={themeId} />
      <input type="hidden" name="roomId" value={roomId} />
      <p className="text-xs font-medium text-ink-500">Tekst na predlošku</p>

      <div className="mt-2 overflow-hidden rounded-xl ring-1 ring-ink-100">
        <PozivnicaSlika
          src={src}
          alt="Pregled pozivnice"
          tekst={dugoIme ? { ...PRIMJER, ime: DUGO_IME } : PRIMJER}
          okvir={okvir}
          stil={stil}
          slikaSirina={slikaSirina}
          slikaVisina={slikaVisina}
        />
      </div>

      <div className="mt-2 flex flex-wrap gap-1">
        {STILOVI.map((s) => (
          <button
            key={s.naziv}
            type="button"
            title={s.opis}
            onClick={() => setStil((p) => ({ ...p, ...s.stil }))}
            className="chip bg-ink-100 text-ink-600 hover:bg-brand-50 hover:text-brand-600"
          >
            {s.naziv}
          </button>
        ))}
      </div>

      <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
        <input type="checkbox" checked={dugoIme} onChange={(e) => setDugoIme(e.target.checked)} className="h-3 w-3 accent-brand-500" />
        provjeri s dugim imenom
      </label>

      <div className="mt-2 grid grid-cols-2 gap-x-3 gap-y-2">
        <Klizac label="Gore" vrijednost={okvir.top} postavi={(v) => postavi("top", v)} name="okvirTop" />
        <Klizac label="Lijevo" vrijednost={okvir.lijevo} postavi={(v) => postavi("lijevo", v)} name="okvirLijevo" />
        <Klizac label="Širina" vrijednost={okvir.sirina} postavi={(v) => postavi("sirina", v)} name="okvirSirina" />
        <Klizac label="Visina" vrijednost={okvir.visina} postavi={(v) => postavi("visina", v)} name="okvirVisina" />
      </div>

      <div className="mt-3 grid gap-2 sm:grid-cols-2">
        <Izbor
          label="Boja teksta"
          vrijednost={stil.svijetliTekst ? "svijetli" : "tamni"}
          postavi={(v) => setStil((p) => ({ ...p, svijetliTekst: v === "svijetli" }))}
          opcije={[
            ["tamni", "tamni tekst"],
            ["svijetli", "svijetli tekst"],
          ]}
        />
        <Izbor
          label="Podloga ispod teksta"
          vrijednost={stil.podloga}
          postavi={(v) => setStil((p) => ({ ...p, podloga: v as StilPozivnice["podloga"] }))}
          opcije={[
            ["nema", "bez podloge"],
            ["svijetla", "svijetla"],
            ["tamna", "tamna"],
          ]}
        />
        <Izbor
          label="Font"
          vrijednost={stil.font}
          postavi={(v) => setStil((p) => ({ ...p, font: v }))}
          opcije={[
            ["display", "naslovni"],
            ["sans", "obični"],
          ]}
        />
        <Izbor
          label="Poravnanje"
          vrijednost={stil.poravnanje}
          postavi={(v) => setStil((p) => ({ ...p, poravnanje: v }))}
          opcije={[
            ["gore", "uz vrh"],
            ["sredina", "sredina"],
            ["dolje", "uz dno"],
          ]}
        />
      </div>

      {stil.podloga !== "nema" && (
        <div className="mt-2">
          <Klizac
            label="Prekrivanje podloge"
            vrijednost={stil.podlogaProzirnost}
            postavi={(v) => setStil((p) => ({ ...p, podlogaProzirnost: v }))}
            name="podlogaProzirnost"
          />
        </div>
      )}
      {stil.podloga === "nema" && <input type="hidden" name="podlogaProzirnost" value={stil.podlogaProzirnost} />}

      <label className="mt-2 block text-xs text-ink-500">
        <span className="flex items-center justify-between">
          Veličina slova
          <span className="font-semibold text-ink-700">{Math.round(stil.velicinaSkala * 100)}%</span>
        </span>
        <input
          type="range"
          min={60}
          max={160}
          step={5}
          value={Math.round(stil.velicinaSkala * 100)}
          onChange={(e) => setStil((p) => ({ ...p, velicinaSkala: Number(e.target.value) / 100 }))}
          className="mt-1 w-full accent-brand-500"
        />
      </label>

      <input type="hidden" name="tekstSvijetli" value={stil.svijetliTekst ? "on" : ""} />
      <input type="hidden" name="podloga" value={stil.podloga} />
      <input type="hidden" name="font" value={stil.font} />
      <input type="hidden" name="poravnanje" value={stil.poravnanje} />
      <input type="hidden" name="velicinaSkala" value={stil.velicinaSkala} />

      <button type="submit" className="btn-secondary mt-3 !py-1 !text-xs">Spremi izgled</button>
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

function Izbor({
  label,
  vrijednost,
  postavi,
  opcije,
}: {
  label: string;
  vrijednost: string;
  postavi: (v: string) => void;
  opcije: [string, string][];
}) {
  return (
    <label className="block text-xs text-ink-500">
      {label}
      <select value={vrijednost} onChange={(e) => postavi(e.target.value)} className="input mt-1 !py-1 !text-xs">
        {opcije.map(([v, naziv]) => (
          <option key={v} value={v}>{naziv}</option>
        ))}
      </select>
    </label>
  );
}
