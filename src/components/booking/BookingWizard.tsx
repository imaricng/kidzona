"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hr, brojDjece } from "@/i18n/hr";
import { formatEur, formatDatumDugi } from "@/lib/format";
import { izracunajCijenu, SPAJANJE_SOBE_CENTS } from "@/lib/pricing";
import { druzionicaZaDatum, krajTermina, lokalniISO, pocetciZaDatum, trajanjeSati } from "@/lib/slots";
import { prviOtvoreniDatum, rasponDatuma, zatvaranjeZaDatum, type Zatvaranje } from "@/lib/zatvaranja";
import { SidrenaCijenaOznaka } from "@/components/SidrenaCijena";
import { DatumPolje } from "@/components/DatumPolje";

// --- Tipovi kataloga (serijalizirano s poslužitelja) ------------------
export interface Katalog {
  rooms: { id: string; name: string; description: string; minChildren: number; maxChildren: number; color: string; mergeableWith: string[] }[];
  packages: {
    id: string; name: string; slug: string; roomId: string | null; basePriceCents: number; perChildCents: number;
    includedItems: string[]; minChildren: number; maxChildren: number; durationMin: number; popular: boolean; description: string;
    cijenaPoDogovoru: boolean;
    // Sidrena (dodatna) cijena — obvezna uz javno istaknutu cijenu od 1. 10. 2026.
    sidrenaCijenaCents: number | null; sidrenaPerChildCents: number | null; sidrenaDatum: string | null;
  }[];
  addons: {
    id: string; name: string; priceCents: number; unit: "per_child" | "flat"; category: string; description: string;
    sidrenaCijenaCents: number | null; sidrenaDatum: string | null;
  }[];
  themes: { id: string; name: string; emoji: string; gradient: string }[];
  depositPercent: number;
  onlinePayments: boolean;
  zatvaranja: Zatvaranje[]; // neradni dani (od danas nadalje)
}

export interface PocetniKontakt {
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childBirthDate: string;
  marketingConsent: boolean;
}

type Paket = Katalog["packages"][number];

function danasISO() {
  return lokalniISO(new Date());
}

function dodajDan(dateISO: string, dana: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + dana);
  return lokalniISO(d);
}

/**
 * Upit za proslavu u koracima. Kupac bira datum i početak po rasporedu (bez prikaza
 * zauzetosti), igraonicu, paket i ostale podatke te šalje upit koji administrator
 * odobrava, uređuje ili odbija.
 */
export function BookingWizard({
  katalog,
  pocetniPaketSlug,
  pocetniKontakt,
  pocetniBrojDjece,
}: {
  katalog: Katalog;
  pocetniPaketSlug?: string;
  pocetniKontakt?: PocetniKontakt;
  pocetniBrojDjece?: number;
}) {
  const router = useRouter();
  const [korak, setKorak] = useState(0);

  // Korak 1 — datum i početak po rasporedu (zadano: prvi dan s terminima od danas)
  const [datum, setDatum] = useState<string>(() => prviOtvoreniDatum(danasISO(), katalog.zatvaranja));
  const [odabraniStart, setOdabraniStart] = useState<string | null>(null);

  // Korak 2 — igraonica + paket (paket iz linka unaprijed odabire i igraonicu)
  const pocetniPaket = pocetniPaketSlug ? katalog.packages.find((p) => p.slug === pocetniPaketSlug) : undefined;
  const [roomId, setRoomId] = useState<string>(pocetniPaket?.roomId ?? "");
  const [secondRoomId, setSecondRoomId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string>(pocetniPaket?.id ?? "");

  // Korak 3 — djeca, dodaci, tema
  const [numChildren, setNumChildren] = useState<number>(pocetniBrojDjece ?? 8);
  const [dodaci, setDodaci] = useState<Record<string, number>>({});
  const [themeId, setThemeId] = useState<string | null>(null);
  // Tema izvan ponude: roditelj je opisuje riječima, a opis ide u napomene upita.
  const [vlastitaTema, setVlastitaTema] = useState(false);
  const [temaZelja, setTemaZelja] = useState("");

  // Korak 4 — podaci (unaprijed popunjeno za prijavljenog roditelja)
  const [parentName, setParentName] = useState(pocetniKontakt?.parentName ?? "");
  const [email, setEmail] = useState(pocetniKontakt?.email ?? "");
  const [phone, setPhone] = useState(pocetniKontakt?.phone ?? "");
  const [childName, setChildName] = useState(pocetniKontakt?.childName ?? "");
  const [childBirthDate, setChildBirthDate] = useState(pocetniKontakt?.childBirthDate ?? "");
  const [napomene, setNapomene] = useState("");
  const [gdpr, setGdpr] = useState(false);
  const [marketing, setMarketing] = useState(pocetniKontakt?.marketingConsent ?? false);
  const [waiver, setWaiver] = useState(false);

  // Korak 5 — pregled i slanje upita
  const [voucherCode, setVoucherCode] = useState("");
  const [slanje, setSlanje] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);

  const paket = katalog.packages.find((p) => p.id === packageId);
  const soba = katalog.rooms.find((r) => r.id === roomId);
  const zatvaranje = zatvaranjeZaDatum(datum, katalog.zatvaranja);
  const pocetci = zatvaranje ? [] : pocetciZaDatum(datum);
  const slotEnd = odabraniStart && paket ? krajTermina(odabraniStart, paket.durationMin) : null;
  const maxDjece = soba?.maxChildren ?? 40;
  const koraci = [
    hr.booking.koraci.termin,
    hr.booking.koraci.soba,
    hr.booking.koraci.djeca,
    hr.booking.koraci.podaci,
    hr.booking.pregledKorak,
  ];

  function paketiSobe(rid: string): Paket[] {
    return katalog.packages.filter((p) => p.roomId === null || p.roomId === rid);
  }

  // Drugi dan može imati druge početke, pa promjena datuma poništava odabir.
  function promijeniDatum(novi: string) {
    setDatum(novi);
    setOdabraniStart(null);
  }

  // Za prikaz uz početak, npr. "Standard do 16:00 · Premium do 17:00"
  const trajanja = useMemo(() => {
    const poTrajanju = new Map<number, Set<string>>();
    for (const p of katalog.packages) {
      if (!poTrajanju.has(p.durationMin)) poTrajanju.set(p.durationMin, new Set());
      poTrajanju.get(p.durationMin)!.add(p.name);
    }
    return [...poTrajanju.entries()]
      .sort((a, b) => a[0] - b[0])
      .map(([durationMin, nazivi]) => ({ durationMin, nazivi: [...nazivi] }));
  }, [katalog.packages]);

  // Paket mora pripadati odabranoj igraonici
  useEffect(() => {
    if (paket && roomId && paket.roomId !== null && paket.roomId !== roomId) setPackageId("");
  }, [roomId, paket]);

  // Broj djece: najmanje koliko traži paket, najviše koliko prima igraonica
  useEffect(() => {
    if (!paket) return;
    setNumChildren((n) => Math.min(maxDjece, Math.max(paket.minChildren, n)));
  }, [paket, maxDjece]);

  // Okvirna cijena (mjerodavnu računa poslužitelj)
  const izracun = useMemo(() => {
    if (!paket) return null;
    return izracunajCijenu({
      paket: {
        name: paket.name,
        basePriceCents: paket.basePriceCents,
        ukljucenoDjece: paket.maxChildren,
        nadoplataPoDjetetuCents: paket.perChildCents,
      },
      brojDjece: numChildren,
      dodaci: katalog.addons.map((a) => ({ id: a.id, priceCents: a.priceCents, unit: a.unit })),
      odabrani: Object.entries(dodaci).map(([id, quantity]) => ({ id, quantity })),
      spojeneSobe: !!secondRoomId,
      depositPercent: katalog.depositPercent,
    });
  }, [paket, numChildren, dodaci, secondRoomId, katalog]);

  // Validacija po koraku
  function mozeDalje(): boolean {
    switch (korak) {
      case 0:
        return !!odabraniStart && pocetci.includes(odabraniStart);
      case 1:
        return !!soba && !!paket && (paket.roomId === null || paket.roomId === soba.id);
      case 2:
        return !!paket && numChildren >= paket.minChildren && numChildren <= maxDjece;
      case 3:
        return (
          parentName.trim().length >= 2 &&
          /\S+@\S+\.\S+/.test(email) &&
          phone.trim().length >= 6 &&
          childName.trim().length >= 2 &&
          /^\d{4}-\d{2}-\d{2}$/.test(childBirthDate) &&
          gdpr &&
          waiver
        );
      default:
        return true;
    }
  }

  async function posalji() {
    if (!odabraniStart || !paket) return;
    setSlanje(true);
    setGreska(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateISO: datum,
          slotStart: odabraniStart,
          roomId,
          secondRoomId,
          packageId,
          themeId,
          temaZelja: vlastitaTema ? temaZelja.trim() : "",
          numChildren,
          dodaci: Object.entries(dodaci).filter(([, q]) => q > 0).map(([id, quantity]) => ({ id, quantity })),
          parentName,
          email,
          phone: phone || undefined,
          childName: childName || undefined,
          childBirthDate: childBirthDate || null,
          napomene: napomene || undefined,
          gdprConsent: gdpr,
          marketingConsent: marketing,
          waiverAccepted: waiver,
          voucherCode: voucherCode.trim() || null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        setGreska(data.error ?? hr.booking.greska);
        return;
      }
      router.push(`/potvrda/${data.code}?k=${data.kljuc}`);
    } catch {
      setGreska(hr.booking.greska);
    } finally {
      setSlanje(false);
    }
  }

  return (
    <div className="grid gap-8 lg:grid-cols-[1fr,360px]">
      <div>
        <h1 className="font-display text-3xl font-extrabold text-ink-900">{hr.booking.naslov}</h1>
        <Stepper korak={korak} koraci={koraci} />

        {greska && (
          <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">
            {greska}
          </div>
        )}

        <div className="mt-6">
          {korak === 0 && (
            <KorakTermin
              datum={datum}
              setDatum={promijeniDatum}
              pocetci={pocetci}
              odabraniStart={odabraniStart}
              onOdabir={setOdabraniStart}
              trajanja={trajanja}
              zatvaranje={zatvaranje}
              zatvaranja={katalog.zatvaranja}
            />
          )}
          {korak === 1 && (
            <KorakSoba
              sobe={katalog.rooms}
              roomId={roomId}
              setRoomId={setRoomId}
              secondRoomId={secondRoomId}
              setSecondRoomId={setSecondRoomId}
              paketiSobe={paketiSobe}
              packageId={packageId}
              setPackageId={setPackageId}
              start={odabraniStart}
            />
          )}
          {korak === 2 && paket && (
            <KorakDjeca
              paket={paket}
              maxDjece={maxDjece}
              numChildren={numChildren}
              setNumChildren={setNumChildren}
              addons={katalog.addons}
              dodaci={dodaci}
              setDodaci={setDodaci}
              themes={katalog.themes}
              themeId={themeId}
              setThemeId={setThemeId}
              vlastitaTema={vlastitaTema}
              setVlastitaTema={setVlastitaTema}
              temaZelja={temaZelja}
              setTemaZelja={setTemaZelja}
            />
          )}
          {korak === 3 && (
            <KorakPodaci
              {...{ parentName, setParentName, email, setEmail, phone, setPhone, childName, setChildName, childBirthDate, setChildBirthDate, napomene, setNapomene, gdpr, setGdpr, marketing, setMarketing, waiver, setWaiver }}
            />
          )}
          {korak === 4 && izracun && (
            <KorakPregled izracun={izracun} poDogovoru={!!paket?.cijenaPoDogovoru} voucherCode={voucherCode} setVoucherCode={setVoucherCode} />
          )}
        </div>

        <div className="mt-8 flex items-center justify-between">
          <button
            type="button"
            className="btn-ghost"
            onClick={() => setKorak((k) => Math.max(0, k - 1))}
            disabled={korak === 0}
          >
            ← {hr.booking.natrag}
          </button>
          {korak < koraci.length - 1 ? (
            <button type="button" className="btn-primary" onClick={() => setKorak((k) => k + 1)} disabled={!mozeDalje()}>
              {hr.booking.nastavi} →
            </button>
          ) : (
            <button type="button" className="btn-primary" onClick={posalji} disabled={slanje}>
              {slanje ? hr.booking.obradaPotvrde : hr.booking.potvrdiRezervaciju}
            </button>
          )}
        </div>
      </div>

      {/* Sažetak (sticky) */}
      <aside className="lg:sticky lg:top-6 lg:self-start">
        <Sazetak
          datum={odabraniStart ? datum : null}
          termin={odabraniStart ? (slotEnd ? `${odabraniStart} – ${slotEnd}` : odabraniStart) : null}
          soba={soba?.name}
          soba2={secondRoomId ? katalog.rooms.find((r) => r.id === secondRoomId)?.name : undefined}
          paket={paket?.name}
          numChildren={numChildren}
          tema={vlastitaTema ? temaZelja.trim() || hr.booking.vlastitaTema : katalog.themes.find((t) => t.id === themeId)?.name}
          izracun={izracun}
          poDogovoru={!!paket?.cijenaPoDogovoru}
        />
      </aside>
    </div>
  );
}

// --- Stepper ----------------------------------------------------------
function Stepper({ korak, koraci }: { korak: number; koraci: string[] }) {
  return (
    <ol className="mt-6 flex flex-wrap gap-2 text-sm">
      {koraci.map((naziv, i) => (
        <li
          key={naziv}
          className={`chip ${i === korak ? "bg-brand-500 text-white" : i < korak ? "bg-mint-500/15 text-mint-600" : "bg-ink-100 text-ink-500"}`}
        >
          <span className="font-bold">{i + 1}.</span> {naziv}
        </li>
      ))}
    </ol>
  );
}

// --- Korak 1: datum i početak ----------------------------------------
function KorakTermin({
  datum, setDatum, pocetci, odabraniStart, onOdabir, trajanja, zatvaranje, zatvaranja,
}: {
  datum: string; setDatum: (d: string) => void; pocetci: string[];
  odabraniStart: string | null; onOdabir: (start: string) => void;
  trajanja: { durationMin: number; nazivi: string[] }[];
  zatvaranje?: Zatvaranje; zatvaranja: Zatvaranje[];
}) {
  const druzionica = druzionicaZaDatum(datum);
  return (
    <div className="card">
      <label className="label" htmlFor="datum">{hr.booking.odaberiDatum}</label>
      <div className="max-w-xs">
        <DatumPolje id="datum" value={datum} min={danasISO()} onChange={(iso) => iso && setDatum(iso)} />
      </div>
      <p className="mt-2 text-sm text-ink-500">{formatDatumDugi(new Date(`${datum}T00:00:00`))}</p>
      <p className="mt-1 text-xs text-ink-400">{hr.booking.rasporedNapomena}</p>

      <h3 className="mt-6 font-semibold text-ink-800">{hr.booking.odaberiTermin}</h3>
      {zatvaranje ? (
        <div className="mt-3 rounded-2xl bg-sun-100 px-4 py-4 text-sm ring-1 ring-sun-400">
          <p className="font-semibold text-brand-900">
            🗓️ {hr.zatvoreno.naDan}: {zatvaranje.razlog} ({rasponDatuma(zatvaranje)})
          </p>
          <button
            type="button"
            className="btn-secondary mt-3 !py-2 !text-sm"
            onClick={() => setDatum(prviOtvoreniDatum(dodajDan(zatvaranje.do, 1), zatvaranja))}
          >
            {hr.zatvoreno.prviOtvoreni} →
          </button>
        </div>
      ) : pocetci.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-brand-50 px-4 py-4 text-sm">
          <p className="font-semibold text-brand-900">{hr.booking.nemaTermina}</p>
          <button
            type="button"
            className="btn-secondary mt-3 !py-2 !text-sm"
            onClick={() => setDatum(prviOtvoreniDatum(dodajDan(datum, 1), zatvaranja))}
          >
            {hr.booking.prviSlobodanDan} →
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {pocetci.map((start) => {
            const aktivan = odabraniStart === start;
            return (
              <button
                key={start}
                type="button"
                onClick={() => onOdabir(start)}
                className={`rounded-2xl border px-4 py-3 text-left transition ${
                  aktivan ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 bg-white hover:border-brand-300"
                }`}
              >
                <span className="block font-display text-xl font-bold text-ink-900">{start}</span>
                <span className="block text-xs text-ink-500">
                  {trajanja
                    .map((tr) => `${tr.nazivi.join(" / ")} ${hr.booking.doVrijeme} ${krajTermina(start, tr.durationMin)}`)
                    .join(" · ")}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {!zatvaranje && druzionica.length > 0 && (
        <p className="mt-4 text-sm text-ink-600">
          🧸 {hr.booking.druzionica}: {druzionica.map((d) => `${d.od} – ${d.do}`).join(", ")}
        </p>
      )}
    </div>
  );
}

// --- Korak 2: igraonica + paket --------------------------------------
function KorakSoba({
  sobe, roomId, setRoomId, secondRoomId, setSecondRoomId, paketiSobe, packageId, setPackageId, start,
}: {
  sobe: Katalog["rooms"]; roomId: string; setRoomId: (id: string) => void;
  secondRoomId: string | null; setSecondRoomId: (id: string | null) => void;
  paketiSobe: (roomId: string) => Paket[]; packageId: string; setPackageId: (id: string) => void;
  start: string | null;
}) {
  const odabranaSoba = sobe.find((r) => r.id === roomId);
  const mogućeSpojiti = odabranaSoba
    ? sobe.filter((r) => r.id !== roomId && odabranaSoba.mergeableWith.includes(r.id))
    : [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.booking.odaberiSobu}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {sobe.map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                setRoomId(r.id);
                if (secondRoomId === r.id) setSecondRoomId(null);
              }}
              className={`rounded-2xl border px-4 py-3 text-left transition ${roomId === r.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 hover:border-brand-300"}`}
            >
              <div className="flex items-center gap-2">
                <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                <span className="font-semibold text-ink-800">{r.name}</span>
              </div>
              {r.description && <p className="mt-1 text-xs text-ink-500">{r.description}</p>}
            </button>
          ))}
        </div>

        {mogućeSpojiti.length > 0 && (
          <label className="mt-4 flex items-center gap-3 rounded-2xl bg-brand-50 px-4 py-3 text-sm">
            <input
              type="checkbox"
              className="h-4 w-4 accent-brand-500"
              checked={!!secondRoomId}
              onChange={(e) => setSecondRoomId(e.target.checked ? mogućeSpojiti[0].id : null)}
            />
            <span>{hr.booking.spojiSobe} <span className="text-ink-400">(+{formatEur(SPAJANJE_SOBE_CENTS)})</span></span>
          </label>
        )}
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.paketi.naslov}</h3>
        {!odabranaSoba ? (
          <p className="mt-3 text-sm text-ink-400">{hr.booking.najprijeSoba}</p>
        ) : (
          <div className="mt-3 grid gap-3 md:grid-cols-2">
            {paketiSobe(odabranaSoba.id).map((p) => (
              <button
                key={p.id}
                type="button"
                onClick={() => setPackageId(p.id)}
                className={`flex flex-col rounded-2xl border p-4 text-left transition ${packageId === p.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 hover:border-brand-300"}`}
              >
                {p.popular && <span className="chip mb-2 w-fit bg-sun-400 text-xs font-bold text-brand-900">★ {hr.paketi.popularno}</span>}
                <span className="flex items-baseline justify-between gap-2">
                  <span className="font-bold text-ink-900">{p.name}</span>
                  <span className="text-right">
                    <span className="block font-display text-lg font-bold text-brand-600">
                      {p.cijenaPoDogovoru ? hr.paketi.poDogovoru : formatEur(p.basePriceCents)}
                    </span>
                    <SidrenaCijenaOznaka stavka={p} className="block text-[11px] leading-tight" />
                  </span>
                </span>
                <span className="mt-1 text-xs text-ink-500">
                  {trajanjeSati(p.durationMin)}{start ? ` · ${start} – ${krajTermina(start, p.durationMin)}` : ""}
                </span>
                <span className="mt-1 text-xs text-ink-500">
                  {hr.paketi.doBroj} {p.maxChildren} {hr.paketi.odDjece} · {hr.paketi.slavljenikGratis}
                  {p.perChildCents > 0 && !p.cijenaPoDogovoru ? ` · +${formatEur(p.perChildCents)} ${hr.paketi.poDodatnomDjetetu}` : ""}
                </span>
                {p.includedItems.length > 0 && (
                  <ul className="mt-2 space-y-0.5 text-xs text-ink-600">
                    {p.includedItems.map((s, i) => <li key={i}>✓ {s}</li>)}
                  </ul>
                )}
              </button>
            ))}
            <p className="text-xs text-ink-400">{hr.paketi.sidrenaNapomena}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Korak 3: djeca + dodaci + tema ----------------------------------
function KorakDjeca({
  paket, maxDjece, numChildren, setNumChildren, addons, dodaci, setDodaci, themes, themeId, setThemeId,
  vlastitaTema, setVlastitaTema, temaZelja, setTemaZelja,
}: {
  paket: Paket; maxDjece: number; numChildren: number; setNumChildren: (n: number) => void;
  addons: Katalog["addons"]; dodaci: Record<string, number>; setDodaci: (d: Record<string, number>) => void;
  themes: Katalog["themes"]; themeId: string | null; setThemeId: (id: string | null) => void;
  vlastitaTema: boolean; setVlastitaTema: (v: boolean) => void;
  temaZelja: string; setTemaZelja: (v: string) => void;
}) {
  const dodatnaDjeca = Math.max(0, numChildren - paket.maxChildren);
  function toggle(id: string) {
    const kopija = { ...dodaci };
    if (kopija[id]) delete kopija[id];
    else kopija[id] = 1;
    setDodaci(kopija);
  }
  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.booking.brojDjece}</h3>
        <p className="text-sm text-ink-400">
          {paket.name}: {hr.paketi.doBroj} {paket.maxChildren} {hr.paketi.odDjece} · {hr.paketi.slavljenikGratis}
          {paket.perChildCents > 0 && !paket.cijenaPoDogovoru ? ` · +${formatEur(paket.perChildCents)} ${hr.paketi.poDodatnomDjetetu}` : ""}
        </p>
        <p className="text-xs text-ink-400">{hr.booking.brojDjeceNapomena}</p>
        <div className="mt-3 flex items-center gap-4">
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumChildren(Math.max(paket.minChildren, numChildren - 1))}>−</button>
          <span className="w-16 text-center text-2xl font-bold text-ink-900">{numChildren}</span>
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumChildren(Math.min(maxDjece, numChildren + 1))}>+</button>
          <span className="text-ink-500">{brojDjece(numChildren)}</span>
        </div>
        {dodatnaDjeca > 0 && paket.perChildCents > 0 && !paket.cijenaPoDogovoru && (
          <p className="mt-2 text-sm font-semibold text-berry-600">
            +{formatEur(dodatnaDjeca * paket.perChildCents)} ({brojDjece(dodatnaDjeca)} {hr.booking.iznadPaketa})
          </p>
        )}
      </div>

      {addons.length > 0 && (
        <div className="card">
          <h3 className="font-semibold text-ink-800">{hr.booking.dodaci}</h3>
          <div className="mt-3 grid gap-3 sm:grid-cols-2">
            {addons.map((a) => {
              const odabran = !!dodaci[a.id];
              return (
                <label
                  key={a.id}
                  className={`flex cursor-pointer items-start gap-3 rounded-2xl border px-4 py-3 transition ${odabran ? "border-brand-500 bg-brand-50" : "border-ink-200 hover:border-brand-300"}`}
                >
                  <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={odabran} onChange={() => toggle(a.id)} />
                  <span className="flex-1">
                    <span className="block font-medium text-ink-800">{a.name}</span>
                    <span className="text-sm text-ink-500">
                      {formatEur(a.priceCents)} {a.unit === "per_child" ? hr.paketi.poDjetetu : ""}
                      <SidrenaCijenaOznaka stavka={a} className="ml-1 text-[11px]" />
                    </span>
                  </span>
                </label>
              );
            })}
          </div>
        </div>
      )}

      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.booking.tema}</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => {
              setThemeId(null);
              setVlastitaTema(false);
            }}
            className={`chip ${themeId === null && !vlastitaTema ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}
          >
            {hr.booking.bezTeme}
          </button>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => {
                setThemeId(t.id);
                setVlastitaTema(false);
              }}
              className={`chip ${themeId === t.id && !vlastitaTema ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}
            >
              {t.emoji} {t.name}
            </button>
          ))}
          <button
            type="button"
            onClick={() => {
              setThemeId(null);
              setVlastitaTema(true);
            }}
            className={`chip ${vlastitaTema ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}
          >
            ✏️ {hr.booking.vlastitaTema}
          </button>
        </div>

        {vlastitaTema && (
          <div className="mt-4">
            <label className="label" htmlFor="tema-zelja">{hr.booking.vlastitaTemaUpis}</label>
            <textarea
              id="tema-zelja"
              rows={3}
              maxLength={500}
              className="input"
              placeholder={hr.booking.vlastitaTemaPlaceholder}
              value={temaZelja}
              onChange={(e) => setTemaZelja(e.target.value)}
            />
            <p className="mt-1 text-xs text-ink-500">{hr.booking.vlastitaTemaNapomena}</p>
          </div>
        )}
      </div>
    </div>
  );
}

// --- Korak 4: podaci --------------------------------------------------
function KorakPodaci(p: {
  parentName: string; setParentName: (v: string) => void;
  email: string; setEmail: (v: string) => void;
  phone: string; setPhone: (v: string) => void;
  childName: string; setChildName: (v: string) => void;
  childBirthDate: string; setChildBirthDate: (v: string) => void;
  napomene: string; setNapomene: (v: string) => void;
  gdpr: boolean; setGdpr: (v: boolean) => void;
  marketing: boolean; setMarketing: (v: boolean) => void;
  waiver: boolean; setWaiver: (v: boolean) => void;
}) {
  return (
    <div className="space-y-6">
      <div className="card grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{hr.booking.imeRoditelja} *</label>
          <input className="input" value={p.parentName} onChange={(e) => p.setParentName(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.booking.emailRoditelja} *</label>
          <input className="input" type="email" value={p.email} onChange={(e) => p.setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.booking.telefonRoditelja} *</label>
          <input className="input" type="tel" value={p.phone} onChange={(e) => p.setPhone(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.booking.imeDjeteta} *</label>
          <input className="input" value={p.childName} onChange={(e) => p.setChildName(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.booking.datumRodjenja} *</label>
          <DatumPolje max={danasISO()} value={p.childBirthDate} onChange={p.setChildBirthDate} />
          <p className="mt-1 text-xs text-ink-400">Koristimo za podsjetnik za sljedeći rođendan (uz vašu privolu).</p>
        </div>
        <div className="sm:col-span-2">
          <label className="label">{hr.booking.napomene}</label>
          <textarea className="input" rows={2} value={p.napomene} onChange={(e) => p.setNapomene(e.target.value)} />
        </div>
      </div>

      <div className="card space-y-3">
        <h3 className="font-semibold text-ink-800">{hr.booking.waiverNaslov}</h3>
        <p className="text-sm text-ink-500">{hr.booking.waiverTekst}</p>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={p.waiver} onChange={(e) => p.setWaiver(e.target.checked)} />
          <span>{hr.booking.waiverPrihvati} *</span>
        </label>
        <div className="border-t border-black/5 pt-3" />
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={p.gdpr} onChange={(e) => p.setGdpr(e.target.checked)} />
          <span>{hr.booking.gdprPrivola} *</span>
        </label>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={p.marketing} onChange={(e) => p.setMarketing(e.target.checked)} />
          <span>{hr.booking.marketingPrivola}</span>
        </label>
      </div>
    </div>
  );
}

// --- Korak 5: pregled i slanje upita ----------------------------------
function KorakPregled({
  izracun, poDogovoru, voucherCode, setVoucherCode,
}: {
  izracun: ReturnType<typeof izracunajCijenu>;
  poDogovoru: boolean;
  voucherCode: string; setVoucherCode: (v: string) => void;
}) {
  const [provjera, setProvjera] = useState(false);
  const [bon, setBon] = useState<{ ok: boolean; tekst: string } | null>(null);

  async function provjeriBon() {
    setProvjera(true);
    setBon(null);
    try {
      const res = await fetch(`/api/vouchers/check?code=${encodeURIComponent(voucherCode.trim())}`);
      const data = await res.json();
      setBon(
        data.valid
          ? { ok: true, tekst: `${hr.pokloni.stanje}: ${formatEur(data.balanceCents)}` }
          : { ok: false, tekst: data.razlog ?? hr.pokloni.bonNevazeci },
      );
    } catch {
      setBon({ ok: false, tekst: hr.pokloni.bonNevazeci });
    } finally {
      setProvjera(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-ink-800">{hr.booking.pregledKorak}</h3>

      <p className="rounded-2xl bg-sun-100 px-4 py-3 text-sm text-brand-900">📨 {hr.booking.upitNapomena}</p>

      <div className="flex items-center justify-between gap-3 rounded-2xl bg-ink-50 px-4 py-3">
        <span>
          <span className="block font-semibold text-ink-800">{hr.booking.okvirnaCijena}</span>
          <span className="text-xs text-ink-500">{poDogovoru ? hr.paketi.poDogovoruNapomena : hr.booking.zaPlatitiUzivo}</span>
        </span>
        <span className="text-xl font-extrabold text-brand-600">{poDogovoru ? hr.paketi.poDogovoru : formatEur(izracun.totalCents)}</span>
      </div>

      {/* Poklon-bon: provjera valjanosti; primjenjuje se pri potvrdi rezervacije */}
      <div className="rounded-2xl bg-brand-50 p-4">
        <p className="text-sm font-medium text-ink-700">🎁 {hr.pokloni.imatBon}</p>
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder={hr.pokloni.unesiKod}
            value={voucherCode}
            onChange={(e) => { setVoucherCode(e.target.value); setBon(null); }}
          />
          <button type="button" className="btn-secondary shrink-0" onClick={provjeriBon} disabled={!voucherCode.trim() || provjera}>
            {hr.pokloni.provjeri}
          </button>
        </div>
        {bon && <p className={`mt-2 text-sm ${bon.ok ? "text-mint-600" : "text-red-600"}`}>{bon.ok ? `✅ ${hr.pokloni.bonPrimijenjen}` : ""} {bon.tekst}</p>}
        <p className="mt-2 text-xs text-ink-500">{hr.booking.bonNapomena}</p>
      </div>
    </div>
  );
}

// --- Sažetak ----------------------------------------------------------
function Sazetak({
  datum, termin, soba, soba2, paket, numChildren, tema, izracun, poDogovoru,
}: {
  datum: string | null; termin: string | null; soba?: string; soba2?: string; paket?: string;
  numChildren: number; tema?: string; izracun: ReturnType<typeof izracunajCijenu> | null; poDogovoru: boolean;
}) {
  return (
    <div className="card">
      <h3 className="font-display text-lg font-bold text-ink-900">{hr.booking.sazetak}</h3>
      <dl className="mt-4 space-y-2 text-sm">
        <Red naziv="Datum" vrijednost={datum ? formatDatumDugi(new Date(`${datum}T00:00:00`)) : "—"} />
        <Red naziv="Termin" vrijednost={termin ?? "—"} />
        <Red naziv="Igraonica" vrijednost={soba2 ? `${soba} + ${soba2}` : soba ?? "—"} />
        <Red naziv="Paket" vrijednost={paket ?? "—"} />
        <Red naziv="Broj djece" vrijednost={paket ? brojDjece(numChildren) : "—"} />
        <Red naziv="Tema" vrijednost={tema ?? "—"} />
      </dl>
      {poDogovoru && (
        <div className="mt-4 flex justify-between border-t border-black/5 pt-3 text-lg font-bold text-ink-900">
          <span>{hr.booking.okvirnaCijena}</span>
          <span className="text-brand-600">{hr.paketi.poDogovoru}</span>
        </div>
      )}
      {izracun && !poDogovoru && (
        <>
          <div className="mt-4 space-y-1 border-t border-black/5 pt-4 text-sm text-ink-600">
            {izracun.stavke.map((s, i) => (
              <div key={i} className="flex justify-between gap-2">
                <span className="truncate">{s.naziv}</span>
                <span className="shrink-0 font-medium">{formatEur(s.iznosCents)}</span>
              </div>
            ))}
          </div>
          <div className="mt-3 flex justify-between border-t border-black/5 pt-3 text-lg font-bold text-ink-900">
            <span>{hr.booking.okvirnaCijena}</span>
            <span className="text-brand-600">{formatEur(izracun.totalCents)}</span>
          </div>
          <p className="mt-1 text-sm text-ink-500">{hr.booking.zaPlatitiUzivo}</p>
        </>
      )}
    </div>
  );
}

function Red({ naziv, vrijednost }: { naziv: string; vrijednost: string }) {
  return (
    <div className="flex justify-between gap-2">
      <dt className="text-ink-400">{naziv}</dt>
      <dd className="text-right font-medium text-ink-800">{vrijednost}</dd>
    </div>
  );
}
