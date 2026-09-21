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

export function DatumPolje(props: ZajednickiProps & { min?: string; max?: string }) {
  const { name, min, max, required, className = "input", id } = props;
  const { vrijednost, tekst, setTekst, postavi } = useTekstIVrijednost(props, isoUHr, hrUIso);
  const vidljivo = useRef<HTMLInputElement>(null);
  const birac = useRef<HTMLInputElement>(null);

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

  function otvoriKalendar() {
    const el = birac.current;
    if (!el) return;
    try {
      el.showPicker();
    } catch {
      el.focus(); // stariji preglednici bez showPicker()
    }
  }

  return (
    <div className="relative">
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
        onClick={otvoriKalendar}
        aria-label="Odaberi datum u kalendaru"
        className="absolute inset-y-0 right-0 flex w-11 items-center justify-center text-ink-400 transition hover:text-brand-600"
      >
        {ikonaKalendara}
      </button>
      {/* Izvorni kalendar preglednika — nevidljiv, služi samo za odabir klikom. */}
      <input
        ref={birac}
        type="date"
        tabIndex={-1}
        aria-hidden
        min={min}
        max={max}
        value={vrijednost}
        onChange={(e) => {
          setTekst(isoUHr(e.target.value));
          vidljivo.current?.setCustomValidity("");
          postavi(e.target.value);
        }}
        className="pointer-events-none absolute bottom-0 left-0 h-0 w-full opacity-0"
      />
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
