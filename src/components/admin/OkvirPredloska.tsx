"use client";

import { useRef, useState } from "react";
import { PozivnicaSlika, type OkvirPozivnice, type StilPozivnice } from "@/components/PozivnicaSlika";
import { popuniTekst, PRIMJER_VRIJEDNOSTI, VARIJABLE, ZADANI_TEKST } from "@/lib/pozivnica-tekst";

/**
 * Uređivanje pozivnice na jednom predlošku: tekst, položaj okvira i izgled.
 *
 * Okvir se povlači i razvlači mišem (ili prstom) izravno po pregledu, a sprema
 * se u postocima slike, pa stoji jednako na svakom ekranu. Tekst je predložak s
 * varijablama ({ime}, {datum}…) koje se popunjavaju podacima proslave; pregled
 * pokazuje primjer.
 */

const DUGO_IME = "Ana-Marija Kovačević-Babić";

const EMOTIKONI = ["🎉", "🎂", "🎈", "🥳", "🎁", "🦄", "⭐", "💛", "🍰", "🎊"];

const STILOVI: { naziv: string; opis: string; stil: Partial<StilPozivnice> }[] = [
  { naziv: "Na bijelom polju", opis: "prazan okvir na predlošku", stil: { svijetliTekst: false, podloga: "nema" } },
  { naziv: "Na tamnoj slici", opis: "bijeli tekst sa sjenom", stil: { svijetliTekst: true, podloga: "nema" } },
  { naziv: "S podlogom", opis: "šarena slika ispod teksta", stil: { svijetliTekst: false, podloga: "svijetla", podlogaProzirnost: 85 } },
];

type Hvatiste = "pomak" | "velicina";

export function OkvirPredloska({
  akcija,
  themeId,
  roomId,
  src,
  pocetniOkvir,
  pocetniStil,
  pocetniTekst,
  slikaSirina,
  slikaVisina,
}: {
  akcija: (formData: FormData) => void | Promise<void>;
  themeId: string;
  roomId: string;
  src: string;
  pocetniOkvir: OkvirPozivnice;
  pocetniStil: StilPozivnice;
  pocetniTekst: string | null;
  slikaSirina: number;
  slikaVisina: number;
}) {
  const [okvir, setOkvir] = useState(pocetniOkvir);
  const [stil, setStil] = useState(pocetniStil);
  const [tekst, setTekst] = useState(pocetniTekst ?? ZADANI_TEKST);
  const [dugoIme, setDugoIme] = useState(false);
  const pregled = useRef<HTMLDivElement>(null);
  const polje = useRef<HTMLTextAreaElement>(null);

  const vrijednosti = dugoIme ? { ...PRIMJER_VRIJEDNOSTI, ime: DUGO_IME } : PRIMJER_VRIJEDNOSTI;
  const retci = popuniTekst(tekst, vrijednosti);

  /** Povlačenje okvira: pomak cijelog okvira ili razvlačenje donjeg desnog kuta. */
  function zapocniPovlacenje(e: React.PointerEvent, sto: Hvatiste) {
    e.preventDefault();
    e.stopPropagation();
    const kutija = pregled.current?.getBoundingClientRect();
    if (!kutija) return;
    const pocetak = { x: e.clientX, y: e.clientY, ...okvir };
    const cilj = e.currentTarget as HTMLElement;
    cilj.setPointerCapture(e.pointerId);

    const pomak = (ev: PointerEvent) => {
      const dx = ((ev.clientX - pocetak.x) / kutija.width) * 100;
      const dy = ((ev.clientY - pocetak.y) / kutija.height) * 100;
      if (sto === "pomak") {
        setOkvir({
          ...pocetak,
          lijevo: Math.max(0, Math.min(100 - pocetak.sirina, pocetak.lijevo + dx)),
          top: Math.max(0, Math.min(100 - pocetak.visina, pocetak.top + dy)),
        });
      } else {
        setOkvir({
          ...pocetak,
          sirina: Math.max(10, Math.min(100 - pocetak.lijevo, pocetak.sirina + dx)),
          visina: Math.max(5, Math.min(100 - pocetak.top, pocetak.visina + dy)),
        });
      }
    };
    const kraj = () => {
      cilj.releasePointerCapture(e.pointerId);
      window.removeEventListener("pointermove", pomak);
      window.removeEventListener("pointerup", kraj);
    };
    window.addEventListener("pointermove", pomak);
    window.addEventListener("pointerup", kraj);
  }

  /** Umetanje varijable ili emotikona na mjesto pokazivača u tekstu. */
  function umetni(sadrzaj: string) {
    const t = polje.current;
    if (!t) {
      setTekst((p) => p + sadrzaj);
      return;
    }
    const { selectionStart: od, selectionEnd: do_ } = t;
    const novi = tekst.slice(0, od) + sadrzaj + tekst.slice(do_);
    setTekst(novi);
    requestAnimationFrame(() => {
      t.focus();
      t.setSelectionRange(od + sadrzaj.length, od + sadrzaj.length);
    });
  }

  return (
    <form action={akcija} className="mt-3 rounded-2xl bg-white p-3 ring-1 ring-ink-100">
      <input type="hidden" name="themeId" value={themeId} />
      <input type="hidden" name="roomId" value={roomId} />

      {/* Pregled s okvirom koji se povlači */}
      <p className="text-xs font-medium text-ink-500">Pozivnica — povucite okvir na željeno mjesto</p>
      <div ref={pregled} className="relative mt-2 select-none overflow-hidden rounded-xl ring-1 ring-ink-100">
        <PozivnicaSlika
          src={src}
          alt="Pregled pozivnice"
          retci={retci}
          okvir={okvir}
          stil={stil}
          slikaSirina={slikaSirina}
          slikaVisina={slikaVisina}
        />
        <div
          onPointerDown={(e) => zapocniPovlacenje(e, "pomak")}
          className="absolute cursor-move rounded-md border-2 border-dashed border-brand-500/80 bg-brand-500/5 touch-none"
          style={{ top: `${okvir.top}%`, left: `${okvir.lijevo}%`, width: `${okvir.sirina}%`, height: `${okvir.visina}%` }}
        >
          <span
            onPointerDown={(e) => zapocniPovlacenje(e, "velicina")}
            className="absolute -bottom-2 -right-2 h-4 w-4 cursor-nwse-resize rounded-full border-2 border-white bg-brand-500 touch-none"
            aria-label="Promijeni veličinu okvira"
          />
        </div>
      </div>

      <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-ink-400">
        <span>
          {Math.round(okvir.lijevo)}% / {Math.round(okvir.top)}% · {Math.round(okvir.sirina)}×{Math.round(okvir.visina)}%
        </span>
        <label className="flex items-center gap-2 text-ink-500">
          <input type="checkbox" checked={dugoIme} onChange={(e) => setDugoIme(e.target.checked)} className="h-3 w-3 accent-brand-500" />
          provjeri s dugim imenom
        </label>
      </div>
      <input type="hidden" name="okvirTop" value={okvir.top} />
      <input type="hidden" name="okvirLijevo" value={okvir.lijevo} />
      <input type="hidden" name="okvirSirina" value={okvir.sirina} />
      <input type="hidden" name="okvirVisina" value={okvir.visina} />

      {/* Tekst */}
      <label className="mt-3 block text-xs font-medium text-ink-500">
        Tekst pozivnice <span className="font-normal text-ink-400">— svaki redak je jedan redak na pozivnici, prvi je naslovni</span>
        <textarea
          ref={polje}
          name="tekstPredlozak"
          rows={4}
          value={tekst}
          onChange={(e) => setTekst(e.target.value)}
          className="input mt-1 !py-2 !text-sm"
        />
      </label>
      <div className="mt-1 flex flex-wrap gap-1">
        {VARIJABLE.map((v) => (
          <button
            key={v.kljuc}
            type="button"
            title={`${v.opis} (npr. ${v.primjer})`}
            onClick={() => umetni(`{${v.kljuc}}`)}
            className="rounded-full bg-ink-100 px-2 py-0.5 text-xs text-ink-600 hover:bg-brand-50 hover:text-brand-600"
          >
            {`{${v.kljuc}}`}
          </button>
        ))}
      </div>
      <div className="mt-1 flex flex-wrap items-center gap-1">
        {EMOTIKONI.map((e) => (
          <button key={e} type="button" onClick={() => umetni(e)} className="rounded-full px-1 text-base hover:bg-ink-100">
            {e}
          </button>
        ))}
        <button
          type="button"
          onClick={() => setTekst(ZADANI_TEKST)}
          className="ml-2 text-xs text-ink-400 underline hover:text-ink-700"
        >
          vrati zadani tekst
        </button>
      </div>
      <label className="mt-2 flex items-center gap-2 text-xs text-ink-500">
        <input type="checkbox" name="tekstNaSve" className="h-3 w-3 accent-brand-500" />
        spremi ovaj tekst na sve predloške
      </label>

      {/* Izgled */}
      <div className="mt-3 flex flex-wrap gap-1">
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

      <details className="mt-2">
        <summary className="cursor-pointer text-xs text-ink-500">Fino podešavanje</summary>
        <div className="mt-2 grid gap-2 sm:grid-cols-2">
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
          <Klizac
            label="Prekrivanje podloge"
            vrijednost={stil.podlogaProzirnost}
            postavi={(v) => setStil((p) => ({ ...p, podlogaProzirnost: v }))}
            najmanje={0}
            najvise={100}
          />
        )}
        <Klizac
          label="Veličina slova"
          vrijednost={Math.round(stil.velicinaSkala * 100)}
          postavi={(v) => setStil((p) => ({ ...p, velicinaSkala: v / 100 }))}
          najmanje={60}
          najvise={160}
        />
      </details>

      <input type="hidden" name="tekstSvijetli" value={stil.svijetliTekst ? "on" : ""} />
      <input type="hidden" name="podloga" value={stil.podloga} />
      <input type="hidden" name="podlogaProzirnost" value={stil.podlogaProzirnost} />
      <input type="hidden" name="font" value={stil.font} />
      <input type="hidden" name="poravnanje" value={stil.poravnanje} />
      <input type="hidden" name="velicinaSkala" value={stil.velicinaSkala} />

      <button type="submit" className="btn-secondary mt-3 !py-1 !text-xs">Spremi pozivnicu</button>
    </form>
  );
}

function Klizac({
  label,
  vrijednost,
  postavi,
  najmanje,
  najvise,
}: {
  label: string;
  vrijednost: number;
  postavi: (v: number) => void;
  najmanje: number;
  najvise: number;
}) {
  return (
    <label className="mt-2 block text-xs text-ink-500">
      <span className="flex items-center justify-between">
        {label}
        <span className="font-semibold text-ink-700">{Math.round(vrijednost)}%</span>
      </span>
      <input
        type="range"
        min={najmanje}
        max={najvise}
        step={1}
        value={vrijednost}
        onChange={(e) => postavi(Number(e.target.value))}
        className="mt-1 w-full accent-brand-500"
      />
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
