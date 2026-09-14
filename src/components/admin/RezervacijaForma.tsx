"use client";

import { useActionState, useState, type ReactNode } from "react";
import { brojDjece } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { izracunajCijenu } from "@/lib/pricing";
import { krajTermina, trajanjeSati } from "@/lib/slots";
import type { StanjeObrasca } from "@/app/admin/(panel)/rezervacije/akcije";

export interface SobaOpcija {
  id: string;
  name: string;
  maxChildren: number;
}

export interface PaketOpcija {
  id: string;
  name: string;
  roomId: string | null;
  durationMin: number;
  basePriceCents: number;
  perChildCents: number;
  minChildren: number;
  maxChildren: number;
}

export interface TemaOpcija {
  id: string;
  name: string;
  emoji: string;
}

interface Props {
  akcija: (prethodno: StanjeObrasca, formData: FormData) => Promise<StanjeObrasca>;
  sobe: SobaOpcija[];
  paketi: PaketOpcija[];
  teme: TemaOpcija[];
  pocetno: Record<string, string>;
  code?: string; // izmjena postojeće rezervacije
  rucniUnos?: boolean; // prikaz statusa i slanja potvrde
  jeUpit?: boolean; // gumb "Spremi i odobri"
}

/** Obrazac za ručni unos i izmjenu rezervacije u administraciji. */
export function RezervacijaForma({ akcija, sobe, paketi, teme, pocetno, code, rucniUnos = false, jeUpit = false }: Props) {
  const [stanje, posalji, uTijeku] = useActionState(akcija, { greska: null, uspjeh: null, vrijednosti: pocetno, verzija: 0 });

  return (
    <form action={posalji} className="space-y-6">
      {code && <input type="hidden" name="code" value={code} />}
      {stanje.greska && (
        <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{stanje.greska}</p>
      )}
      {stanje.uspjeh && <p className="rounded-2xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">{stanje.uspjeh}</p>}

      {/* Ključ vraća polja na vrijednosti koje je vratio poslužitelj (npr. nakon greške). */}
      <Polja key={stanje.verzija} v={stanje.vrijednosti} sobe={sobe} paketi={paketi} teme={teme} rucniUnos={rucniUnos} />

      <div className="flex flex-wrap gap-3">
        <button type="submit" name="namjera" value="spremi" className="btn-primary" disabled={uTijeku}>
          {uTijeku ? "Spremanje…" : rucniUnos ? "Spremi rezervaciju" : "Spremi izmjene"}
        </button>
        {jeUpit && (
          <button type="submit" name="namjera" value="odobri" className="btn-sun" disabled={uTijeku}>
            Spremi i odobri
          </button>
        )}
      </div>
    </form>
  );
}

function Polja({
  v,
  sobe,
  paketi,
  teme,
  rucniUnos,
}: {
  v: Record<string, string>;
  sobe: SobaOpcija[];
  paketi: PaketOpcija[];
  teme: TemaOpcija[];
  rucniUnos: boolean;
}) {
  const [roomId, setRoomId] = useState(v.roomId ?? "");
  const [packageId, setPackageId] = useState(v.packageId ?? "");
  const [slotStart, setSlotStart] = useState(v.slotStart ?? "17:00");
  const [numChildren, setNumChildren] = useState(v.numChildren ?? "10");

  const paketiSobe = paketi.filter((p) => p.roomId === null || p.roomId === roomId);
  const paket = paketiSobe.find((p) => p.id === packageId);
  const soba = sobe.find((s) => s.id === roomId);
  const djece = Number(numChildren) || 0;
  const kraj = paket && /^\d{2}:\d{2}$/.test(slotStart) ? krajTermina(slotStart, paket.durationMin) : null;
  const cijena = paket
    ? izracunajCijenu({
        paket: { name: paket.name, basePriceCents: paket.basePriceCents, ukljucenoDjece: paket.maxChildren, nadoplataPoDjetetuCents: paket.perChildCents },
        brojDjece: djece,
        dodaci: [],
        odabrani: [],
        depositPercent: 0,
      }).totalCents
    : null;

  function promijeniSobu(nova: string) {
    setRoomId(nova);
    const odabrani = paketi.find((p) => p.id === packageId);
    if (odabrani && odabrani.roomId !== null && odabrani.roomId !== nova) setPackageId("");
  }

  return (
    <div className="space-y-6">
      <div>
        <h3 className="font-semibold text-ink-800">Proslava</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Polje label="Datum *">
            <input name="dateISO" type="date" required defaultValue={v.dateISO} className="input !py-2" />
          </Polje>
          <Polje label="Početak *" pomoc={kraj && paket ? `Kraj: ${kraj} (${trajanjeSati(paket.durationMin)})` : "Kraj se računa iz paketa"}>
            <input name="slotStart" type="time" required step={900} value={slotStart} onChange={(e) => setSlotStart(e.target.value)} className="input !py-2" />
          </Polje>
          <Polje label="Igraonica *">
            <select name="roomId" required value={roomId} onChange={(e) => promijeniSobu(e.target.value)} className="input !py-2">
              <option value="">Odaberite…</option>
              {sobe.map((s) => (
                <option key={s.id} value={s.id}>{s.name}</option>
              ))}
            </select>
          </Polje>
          <Polje
            label="Paket *"
            pomoc={paket ? `Uključeno do ${paket.maxChildren} djece${paket.perChildCents > 0 ? ` · +${formatEur(paket.perChildCents)} po dodatnom djetetu` : ""}` : undefined}
          >
            <select name="packageId" required value={packageId} onChange={(e) => setPackageId(e.target.value)} className="input !py-2">
              <option value="">{roomId ? "Odaberite…" : "Najprije odaberite igraonicu"}</option>
              {paketiSobe.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name} — {formatEur(p.basePriceCents)} · {trajanjeSati(p.durationMin)}
                </option>
              ))}
            </select>
          </Polje>
          <Polje label="Tema">
            <select name="themeId" defaultValue={v.themeId ?? ""} className="input !py-2">
              <option value="">Bez teme</option>
              {teme.map((t) => (
                <option key={t.id} value={t.id}>{t.emoji} {t.name}</option>
              ))}
            </select>
          </Polje>
          <Polje label="Broj djece *" pomoc={soba ? `Najviše ${soba.maxChildren} u igraonici ${soba.name}` : undefined}>
            <input
              name="numChildren"
              type="number"
              min={1}
              max={soba?.maxChildren}
              required
              value={numChildren}
              onChange={(e) => setNumChildren(e.target.value)}
              className="input !py-2"
            />
          </Polje>
          <Polje label="Broj odraslih">
            <input name="numAdults" type="number" min={0} defaultValue={v.numAdults ?? "0"} className="input !py-2" />
          </Polje>
        </div>
      </div>

      <div>
        <h3 className="font-semibold text-ink-800">Roditelj i slavljenik</h3>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          <Polje label="Ime i prezime roditelja *">
            <input name="parentName" required defaultValue={v.parentName} className="input !py-2" />
          </Polje>
          <Polje label="E-pošta" pomoc="Obvezna je e-pošta ili telefon">
            <input name="email" type="email" defaultValue={v.email} className="input !py-2" />
          </Polje>
          <Polje label="Telefon">
            <input name="phone" type="tel" defaultValue={v.phone} className="input !py-2" />
          </Polje>
          <Polje label="Ime slavljenika">
            <input name="childName" defaultValue={v.childName} className="input !py-2" />
          </Polje>
          <Polje label="Datum rođenja slavljenika">
            <input name="childBirthDate" type="date" defaultValue={v.childBirthDate} className="input !py-2" />
          </Polje>
          <Polje label="Napomene (alergije, dogovor…)" className="sm:col-span-2 lg:col-span-3">
            <textarea name="napomene" rows={3} defaultValue={v.napomene} className="input !py-2" />
          </Polje>
        </div>
      </div>

      {rucniUnos && (
        <div className="grid gap-4 sm:grid-cols-2">
          <Polje label="Status">
            <select name="status" defaultValue={v.status ?? "potvrdjeno"} className="input !py-2">
              <option value="potvrdjeno">Potvrđena rezervacija (zauzima termin)</option>
              <option value="upit">Upit (čeka odobrenje)</option>
            </select>
          </Polje>
          <label className="flex items-center gap-3 self-end rounded-2xl bg-brand-50 px-4 py-3 text-sm text-ink-700">
            <input type="checkbox" name="posaljiPotvrdu" defaultChecked={v.posaljiPotvrdu === "on"} className="h-4 w-4 accent-brand-500" />
            Pošalji kupcu potvrdu e-poštom (ako je upisana)
          </label>
        </div>
      )}

      {cijena !== null && paket && (
        <p className="rounded-2xl bg-ink-50 px-4 py-3 text-sm text-ink-700">
          Cijena paketa: <strong className="text-brand-600">{formatEur(cijena)}</strong> ({paket.name}, {brojDjece(djece)})
        </p>
      )}
    </div>
  );
}

function Polje({ label, pomoc, className = "", children }: { label: string; pomoc?: string; className?: string; children: ReactNode }) {
  return (
    <label className={`block ${className}`}>
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      {children}
      {pomoc && <span className="mt-1 block text-xs text-ink-400">{pomoc}</span>}
    </label>
  );
}
