"use client";

import { useEffect, useRef, useState } from "react";
import { hrUIso, isoUHr, normalizirajVrijeme } from "@/lib/datum-unos";

/**
 * Polja za datum i vrijeme koja uvijek prikazuju hrvatski oblik
 * (DD.MM.GGGG., 24 h), bez obzira na jezik preglednika — vidi `datum-unos.ts`.
 *
 * Rade na dva načina, kao i obična polja:
 *  - u obrascu: `name` (+ `defaultValue`) — ISO vrijednost ide skrivenim poljem;
 *  - upravljano: `value` + `onChange` — `onChange` dobiva ispravan ISO ili ""
 *    (prazno ili neispravno), pa roditelj nikad ne ostane sa starom vrijednošću
 *    dok polje pokazuje nešto drugo.
 */

interface ZajednickiProps {
  name?: string;
  value?: string;
  defaultValue?: string;
  onChange?: (vrijednost: string) => void;
  required?: boolean;
  className?: string;
  id?: string;
  "aria-label"?: string;
}

/** Stanje koje je isto za datum i vrijeme: prikazani tekst + ISO vrijednost. */
function useTekstIVrijednost(
  { value, defaultValue = "", onChange }: ZajednickiProps,
  uPrikaz: (v: string) => string,
  izTeksta: (t: string) => string | null,
) {
  const upravljano = value !== undefined;
  const [unutarnja, setUnutarnja] = useState(defaultValue);
  const vrijednost = upravljano ? value : unutarnja;
  const [tekst, setTekst] = useState(uPrikaz(vrijednost));

  // Vrijednost promijenjena izvana (npr. odabir u kalendaru, reset obrasca)
  // osvježava prikaz — ali ne dok korisnik tipka tekst koji joj već odgovara.
  useEffect(() => {
    setTekst((t) => (izTeksta(t) === vrijednost || (!vrijednost && !t.trim()) ? t : uPrikaz(vrijednost)));
  }, [vrijednost, uPrikaz, izTeksta]);

  function postavi(nova: string) {
    if (!upravljano) setUnutarnja(nova);
    onChange?.(nova);
  }

  return { vrijednost, tekst, setTekst, postavi };
}

const ikonaKalendara = (
  <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" className="h-5 w-5" aria-hidden>
    <rect x="3" y="4.5" width="18" height="16.5" rx="2.5" />
    <path d="M16 3v3M8 3v3M3 9.5h18" />
  </svg>
);

const MJESECI = ["siječanj", "veljača", "ožujak", "travanj", "svibanj", "lipanj", "srpanj", "kolovoz", "rujan", "listopad", "studeni", "prosinac"];
const MJESECI_GENITIV = ["siječnja", "veljače", "ožujka", "travnja", "svibnja", "lipnja", "srpnja", "kolovoza", "rujna", "listopada", "studenoga", "prosinca"];
const DANI = ["Pon", "Uto", "Sri", "Čet", "Pet", "Sub", "Ned"];
const dvije = (n: number) => String(n).padStart(2, "0");
const uIso = (g: number, m: number, d: number) => `${g}-${dvije(m + 1)}-${dvije(d)}`;
function danasIso(): string {
  const d = new Date();
  return uIso(d.getFullYear(), d.getMonth(), d.getDate());
}

/**
 * Kalendar na hrvatskom (tjedan od ponedjeljka). Zamjenjuje izbornik
 * preglednika, koji nazive mjeseci i dana piše jezikom preglednika. Mjesec i
 * godina biraju se i iz padajućeg izbornika — za datum rođenja bi listanje
 * mjesec po mjesec trajalo predugo.
 */
export function KalendarHr({
  vrijednost,
  min,
  max,
  odaberi,
  zatvori,
}: {
  vrijednost: string;
  min?: string;
  max?: string;
  odaberi: (iso: string) => void;
  zatvori: () => void;
}) {
  const danas = danasIso();
  const polaziste = vrijednost || (min && danas < min ? min : max && danas > max ? max : danas);
  const [godina, setGodina] = useState(Number(polaziste.slice(0, 4)));
  const [mjesec, setMjesec] = useState(Number(polaziste.slice(5, 7)) - 1);
  const okvir = useRef<HTMLDivElement>(null);

  useEffect(() => {
    okvir.current?.focus();
  }, []);

  const tekucaGodina = new Date().getFullYear();
  const godinaOd = Math.min(min ? Number(min.slice(0, 4)) : tekucaGodina - 20, godina);
  const godinaDo = Math.max(max ? Number(max.slice(0, 4)) : tekucaGodina + 3, godina);
  const godine = Array.from({ length: godinaDo - godinaOd + 1 }, (_, i) => godinaOd + i);

  const pomak = (new Date(godina, mjesec, 1).getDay() + 6) % 7; // ponedjeljak = 0
  const brojDana = new Date(godina, mjesec + 1, 0).getDate();
  const celije: (number | null)[] = [...Array<null>(pomak).fill(null), ...Array.from({ length: brojDana }, (_, i) => i + 1)];

  const zadnjiPrethodnog = new Date(godina, mjesec, 0);
  const mozeNazad = !min || uIso(zadnjiPrethodnog.getFullYear(), zadnjiPrethodnog.getMonth(), zadnjiPrethodnog.getDate()) >= min;
  const prviSljedeceg = new Date(godina, mjesec + 1, 1);
  const mozeNaprijed = !max || uIso(prviSljedeceg.getFullYear(), prviSljedeceg.getMonth(), 1) <= max;

  function pomakni(za: number) {
    const d = new Date(godina, mjesec + za, 1);
    setGodina(d.getFullYear());
    setMjesec(d.getMonth());
  }

  const strelica =
    "flex h-8 w-8 items-center justify-center rounded-full text-lg text-brand-700 transition hover:bg-brand-50 disabled:opacity-30 disabled:hover:bg-transparent";
  const izbor = "rounded-lg border border-ink-200 bg-white px-1.5 py-1 text-sm font-semibold text-brand-900 focus:border-brand-400";

  return (
    <div
      ref={okvir}
      role="dialog"
      aria-label="Odabir datuma"
      tabIndex={-1}
      onKeyDown={(e) => {
        if (e.key === "Escape") {
          e.stopPropagation();
          zatvori();
        }
      }}
      className="absolute left-0 top-full z-50 mt-2 w-72 rounded-2xl bg-white p-3 shadow-soft ring-1 ring-brand-100 focus:outline-none"
    >
      <div className="flex items-center justify-between gap-1">
        <button type="button" onClick={() => pomakni(-1)} disabled={!mozeNazad} aria-label="Prethodni mjesec" className={strelica}>
          ‹
        </button>
        <div className="flex gap-1">
          <select aria-label="Mjesec" value={mjesec} onChange={(e) => setMjesec(Number(e.target.value))} className={izbor}>
            {MJESECI.map((m, i) => (
              <option key={m} value={i}>
                {m}
              </option>
            ))}
          </select>
          <select aria-label="Godina" value={godina} onChange={(e) => setGodina(Number(e.target.value))} className={izbor}>
            {godine.map((g) => (
              <option key={g} value={g}>
                {g}.
              </option>
            ))}
          </select>
        </div>
        <button type="button" onClick={() => pomakni(1)} disabled={!mozeNaprijed} aria-label="Sljedeći mjesec" className={strelica}>
          ›
        </button>
      </div>

      <div className="mt-2 grid grid-cols-7 gap-0.5 text-center">
        {DANI.map((d) => (
          <span key={d} className="py-1 text-[11px] font-semibold uppercase tracking-wide text-ink-400">
            {d}
          </span>
        ))}
        {celije.map((dan, i) => {
          if (dan === null) return <span key={`p${i}`} />;
          const iso = uIso(godina, mjesec, dan);
          const nedostupno = (!!min && iso < min) || (!!max && iso > max);
          const odabrano = iso === vrijednost;
          const jeDanas = iso === danas;
          return (
            <button
              key={iso}
              type="button"
              disabled={nedostupno}
              onClick={() => odaberi(iso)}
              aria-label={`${dan}. ${MJESECI_GENITIV[mjesec]} ${godina}.`}
              aria-pressed={odabrano}
              className={`h-9 rounded-full text-sm transition ${
                odabrano
                  ? "bg-brand-500 font-bold text-white"
                  : nedostupno
                    ? "cursor-not-allowed text-ink-300"
                    : `text-ink-800 hover:bg-brand-50 ${jeDanas ? "font-bold ring-1 ring-brand-300" : ""}`
              }`}
            >
              {dan}
            </button>
          );
        })}
      </div>
    </div>
  );
}

export function DatumPolje(props: ZajednickiProps & { min?: string; max?: string }) {
  const { name, min, max, required, className = "input", id } = props;
  const { vrijednost, tekst, setTekst, postavi } = useTekstIVrijednost(props, isoUHr, hrUIso);
  const vidljivo = useRef<HTMLInputElement>(null);
  const omotac = useRef<HTMLDivElement>(null);
  const [otvoren, setOtvoren] = useState(false);

  // Klik izvan polja i kalendara zatvara kalendar.
  useEffect(() => {
    if (!otvoren) return;
    function klik(e: MouseEvent) {
      if (!omotac.current?.contains(e.target as Node)) setOtvoren(false);
    }
    document.addEventListener("mousedown", klik);
    return () => document.removeEventListener("mousedown", klik);
  }, [otvoren]);

  function poruka(iso: string | null, t: string): string {
    if (!t.trim()) return required ? "Unesite datum." : "";
    if (!iso) return "Datum upišite kao DD.MM.GGGG., npr. 01.11.2026.";
    if (min && iso < min) return `Najraniji mogući datum je ${isoUHr(min)}`;
    if (max && iso > max) return `Najkasniji mogući datum je ${isoUHr(max)}`;
    return "";
  }

  function upis(t: string) {
    setTekst(t);
    const iso = hrUIso(t);
    const greska = poruka(iso, t);
    vidljivo.current?.setCustomValidity(greska);
    postavi(iso && !greska ? iso : "");
  }

  return (
    <div ref={omotac} className="relative">
      <input
        ref={vidljivo}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="DD.MM.GGGG."
        aria-label={props["aria-label"]}
        required={required}
        value={tekst}
        onChange={(e) => upis(e.target.value)}
        onBlur={() => {
          const iso = hrUIso(tekst);
          if (iso) setTekst(isoUHr(iso)); // „1.11.2026" → „01.11.2026."
        }}
        className={`${className} !pr-11`}
      />
      <button
        type="button"
        onClick={() => setOtvoren((o) => !o)}
        aria-label="Odaberi datum u kalendaru"
        aria-expanded={otvoren}
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400 transition hover:text-brand-600"
      >
        {ikonaKalendara}
      </button>
      {otvoren && (
        <KalendarHr
          vrijednost={vrijednost}
          min={min}
          max={max}
          zatvori={() => {
            setOtvoren(false);
            vidljivo.current?.focus();
          }}
          odaberi={(iso) => {
            setTekst(isoUHr(iso));
            vidljivo.current?.setCustomValidity("");
            postavi(iso);
            setOtvoren(false);
          }}
        />
      )}
      {name && <input type="hidden" name={name} value={vrijednost} />}
    </div>
  );
}

const bezPromjene = (v: string) => v;

/** Prijedlozi u padajućem popisu; upisati se može i bilo koje drugo vrijeme. */
function prijedloziVremena(korakMin: number, odSata: number, doSata: number): string[] {
  const popis: string[] = [];
  for (let m = odSata * 60; m <= doSata * 60; m += korakMin) {
    popis.push(`${String(Math.floor(m / 60)).padStart(2, "0")}:${String(m % 60).padStart(2, "0")}`);
  }
  return popis;
}

export function VrijemePolje(props: ZajednickiProps & { korakMin?: number }) {
  const { name, required, className = "input", id, korakMin = 15 } = props;
  const { vrijednost, tekst, setTekst, postavi } = useTekstIVrijednost(props, bezPromjene, normalizirajVrijeme);
  const vidljivo = useRef<HTMLInputElement>(null);
  const popisId = `${name ?? id ?? "vrijeme"}-prijedlozi`;

  function upis(t: string) {
    setTekst(t);
    const v = normalizirajVrijeme(t);
    const greska = !t.trim() ? (required ? "Unesite vrijeme." : "") : v ? "" : "Vrijeme upišite kao SS:MM, npr. 17:00.";
    vidljivo.current?.setCustomValidity(greska);
    postavi(v ?? "");
  }

  return (
    <>
      <input
        ref={vidljivo}
        id={id}
        type="text"
        inputMode="numeric"
        autoComplete="off"
        placeholder="SS:MM"
        list={popisId}
        aria-label={props["aria-label"]}
        required={required}
        value={tekst}
        onChange={(e) => upis(e.target.value)}
        onBlur={() => {
          const v = normalizirajVrijeme(tekst);
          if (v) setTekst(v); // „17" → „17:00"
        }}
        className={className}
      />
      <datalist id={popisId}>
        {prijedloziVremena(korakMin, 8, 22).map((v) => (
          <option key={v} value={v} />
        ))}
      </datalist>
      {name && <input type="hidden" name={name} value={vrijednost} />}
    </>
  );
}
