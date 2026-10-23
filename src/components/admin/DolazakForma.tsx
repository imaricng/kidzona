"use client";

import { useMemo, useState } from "react";
import { DatumPolje } from "@/components/DatumPolje";

/** Dijete koje već poznajemo (ranija dnevna igra ili CRM) — za brzi odabir pri dolasku. */
export type PoznatoDijete = {
  kljuc: string;
  dijete: string;
  roditelj: string;
  telefon: string;
  email: string;
  rodendan: string; // "YYYY-MM-DD" ili ""
  privola: boolean;
  izvor: "dnevna-igra" | "crm";
};

const PRAZNO = { dijete: "", roditelj: "", telefon: "", email: "", rodendan: "", privola: false };

// Mala slova bez dijakritika, da „sasa” pronađe „Saša”.
function normaliziraj(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "").replace(/đ/g, "d");
}

function samoZnamenke(s: string): string {
  return s.replace(/\D/g, "");
}

export function DolazakForma({
  akcija,
  poznata,
  danas,
}: {
  akcija: (formData: FormData) => void | Promise<void>;
  poznata: PoznatoDijete[];
  danas: string;
}) {
  const [upit, setUpit] = useState("");
  const [otvoren, setOtvoren] = useState(false);
  const [polja, setPolja] = useState(PRAZNO);
  const [vise, setVise] = useState(false);

  const pogoci = useMemo(() => {
    const u = normaliziraj(upit.trim());
    if (u.length < 2) return [];
    const znamenke = samoZnamenke(upit);
    return poznata
      .filter((p) => {
        if (normaliziraj(`${p.dijete} ${p.roditelj} ${p.email}`).includes(u)) return true;
        // Broj se traži po znamenkama: „091 234” pronađe „0912345678”, a „+385 91…” i „091…” se poklapaju.
        if (znamenke.length >= 3) {
          const tel = samoZnamenke(p.telefon);
          return tel.includes(znamenke) || tel.includes(znamenke.replace(/^385/, "0"));
        }
        return false;
      })
      .slice(0, 8);
  }, [upit, poznata]);

  function odaberi(p: PoznatoDijete) {
    setPolja({ dijete: p.dijete, roditelj: p.roditelj, telefon: p.telefon, email: p.email, rodendan: p.rodendan, privola: p.privola });
    if (p.rodendan) setVise(true);
    setUpit("");
    setOtvoren(false);
  }

  const postavi = (k: keyof typeof PRAZNO) => (e: React.ChangeEvent<HTMLInputElement>) =>
    setPolja((s) => ({ ...s, [k]: k === "privola" ? e.target.checked : e.target.value }));

  return (
    <form action={akcija} className="card mt-6">
      <h2 className="font-semibold text-ink-800">+ Novi dolazak</h2>

      {/* Pretraga poznate djece */}
      <div className="relative mt-3">
        <input
          type="search"
          value={upit}
          onChange={(e) => {
            setUpit(e.target.value);
            setOtvoren(true);
          }}
          onFocus={() => setOtvoren(true)}
          onBlur={() => setTimeout(() => setOtvoren(false), 150)}
          onKeyDown={(e) => {
            if (e.key === "Enter") {
              e.preventDefault();
              if (pogoci[0]) odaberi(pogoci[0]);
            }
            if (e.key === "Escape") setOtvoren(false);
          }}
          placeholder="🔍 Traži dijete po imenu, mobitelu ili e-mailu roditelja…"
          aria-label="Traži poznato dijete"
          autoComplete="off"
          className="input !py-2"
        />
        {otvoren && upit.trim().length >= 2 && (
          <ul className="absolute z-20 mt-1 max-h-80 w-full overflow-auto rounded-2xl bg-white py-1 shadow-lg ring-1 ring-black/10">
            {pogoci.length === 0 && <li className="px-4 py-2 text-sm text-ink-400">Nema poznatog djeteta — upišite podatke ispod.</li>}
            {pogoci.map((p) => (
              <li key={p.kljuc}>
                <button
                  type="button"
                  onMouseDown={(e) => e.preventDefault()}
                  onClick={() => odaberi(p)}
                  className="block w-full px-4 py-2 text-left hover:bg-brand-50"
                >
                  <span className="font-medium text-ink-800">{p.dijete}</span>
                  {p.izvor === "crm" && <span className="chip ml-2 bg-brand-100 !text-xs text-brand-700">s rođendana</span>}
                  <span className="block text-xs text-ink-500">
                    {p.roditelj} · {p.telefon || "bez telefona"}{p.email && ` · ${p.email}`}
                  </span>
                </button>
              </li>
            ))}
          </ul>
        )}
      </div>

      <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Ime i prezime djeteta *</span>
          <input name="dijete" value={polja.dijete} onChange={postavi("dijete")} required minLength={3} maxLength={80} className="input !py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Ime roditelja *</span>
          <input name="roditelj" value={polja.roditelj} onChange={postavi("roditelj")} required minLength={2} maxLength={80} className="input !py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">Telefon roditelja *</span>
          <input name="telefon" type="tel" value={polja.telefon} onChange={postavi("telefon")} required inputMode="tel" maxLength={30} className="input !py-2" />
        </label>
        <label className="block">
          <span className="mb-1 block text-xs font-medium text-ink-500">E-mail roditelja (tražite ga)</span>
          <input name="email" type="email" value={polja.email} onChange={postavi("email")} maxLength={120} className="input !py-2" />
        </label>
      </div>
      <label className="mt-3 flex items-start gap-2 text-sm text-ink-700">
        <input type="checkbox" name="privola" checked={polja.privola} onChange={postavi("privola")} className="mt-0.5 h-4 w-4 accent-brand-500" />
        Roditelj pristaje primati obavijesti i ponude Kidzone (npr. podsjetnik za rođendan)
      </label>
      <details className="mt-3" open={vise} onToggle={(e) => setVise(e.currentTarget.open)}>
        <summary className="cursor-pointer text-sm font-medium text-brand-600">Više o djetetu</summary>
        <label className="mt-3 block max-w-xs">
          <span className="mb-1 block text-xs font-medium text-ink-500">Datum rođenja djeteta (za rođendanske ponude)</span>
          <DatumPolje name="rodendan" value={polja.rodendan} onChange={(v) => setPolja((s) => ({ ...s, rodendan: v }))} max={danas} className="input !py-2" />
        </label>
      </details>
      <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
        <button type="button" onClick={() => setPolja(PRAZNO)} className="text-sm text-ink-400 hover:text-ink-600">
          Očisti
        </button>
        <button type="submit" className="btn-primary !py-2">Upiši dolazak</button>
      </div>
    </form>
  );
}
