"use client";

import { useEffect, useMemo, useState } from "react";
import { useRouter } from "next/navigation";
import { hr, brojDjece } from "@/i18n/hr";
import { formatEur, formatDatumDugi } from "@/lib/format";
import { izracunajCijenu, SPAJANJE_SOBE_CENTS } from "@/lib/pricing";
import {
  druzionicaZaDatum,
  krajTermina,
  lokalniISO,
  preklapaSe,
  sljedeciDatumSTerminima,
  trajanjeSati,
  type Semafor,
  type Termin,
} from "@/lib/slots";
import { StripeConfirm } from "@/components/booking/StripeConfirm";

// --- Tipovi kataloga (serijalizirano s poslužitelja) ----------------------
export interface Katalog {
  rooms: { id: string; name: string; description: string; minChildren: number; maxChildren: number; color: string; mergeableWith: string[] }[];
  packages: {
    id: string; name: string; slug: string; roomId: string | null; basePriceCents: number; perChildCents: number;
    includedItems: string[]; minChildren: number; maxChildren: number; durationMin: number; popular: boolean; description: string;
  }[];
  addons: { id: string; name: string; priceCents: number; unit: "per_child" | "flat"; category: string; description: string }[];
  themes: { id: string; name: string; emoji: string; gradient: string }[];
  depositPercent: number;
  onlinePayments: boolean;
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

interface TerminDost {
  start: string; slobodneSobeIds: string[]; semafor: Semafor;
}

// Zauzeti interval igraonice (iz /api/availability) — za provjeru stane li paket.
interface Zauzeto extends Termin {
  roomId: string;
}

function danasISO() {
  return lokalniISO(new Date());
}

function dodajDan(dateISO: string, dana: number): string {
  const d = new Date(`${dateISO}T00:00:00`);
  d.setDate(d.getDate() + dana);
  return lokalniISO(d);
}

const SEMAFOR_STIL: Record<Semafor, { boja: string; tekst: string }> = {
  slobodno: { boja: "bg-mint-500", tekst: hr.booking.slobodno },
  malo: { boja: "bg-amber-400", tekst: hr.booking.maloMjesta },
  popunjeno: { boja: "bg-red-400", tekst: hr.booking.popunjeno },
};

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

  // Korak 1 — datum i početak (zadano: prvi dan s terminima od danas)
  const [datum, setDatum] = useState<string>(() => sljedeciDatumSTerminima(danasISO()));
  const [termini, setTermini] = useState<TerminDost[] | null>(null);
  const [zauzeto, setZauzeto] = useState<Zauzeto[]>([]);
  const [ucitavanjeTermina, setUcitavanjeTermina] = useState(false);
  const [odabraniStart, setOdabraniStart] = useState<string | null>(null);

  // Korak 2 — igraonica + paket (paket iz linka unaprijed odabire i igraonicu)
  const pocetniPaket = pocetniPaketSlug ? katalog.packages.find((p) => p.slug === pocetniPaketSlug) : undefined;
  const [roomId, setRoomId] = useState<string>(pocetniPaket?.roomId ?? "");
  const [secondRoomId, setSecondRoomId] = useState<string | null>(null);
  const [packageId, setPackageId] = useState<string>(pocetniPaket?.id ?? "");

  // Korak 3 — djeca, dodaci, tema
  const [numChildren, setNumChildren] = useState<number>(pocetniBrojDjece ?? 8);
  const [numAdults, setNumAdults] = useState<number>(2);
  const [dodaci, setDodaci] = useState<Record<string, number>>({});
  const [themeId, setThemeId] = useState<string | null>(null);

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

  // Korak 5 — plaćanje
  const [platiPuni, setPlatiPuni] = useState(false);
  const [slanje, setSlanje] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  // Poklon-bon
  const [voucherCode, setVoucherCode] = useState("");
  const [voucherSaldo, setVoucherSaldo] = useState<number | null>(null);
  const [voucherGreska, setVoucherGreska] = useState<string | null>(null);
  // Stripe potvrda (samo kad backend vrati clientSecret)
  const [stripeData, setStripeData] = useState<{ clientSecret: string; code: string; iznos: number } | null>(null);

  const paket = katalog.packages.find((p) => p.id === packageId);
  const soba = katalog.rooms.find((r) => r.id === roomId);
  const odabraniTermin = termini?.find((t) => t.start === odabraniStart) ?? null;
  const slotEnd = odabraniStart && paket ? krajTermina(odabraniStart, paket.durationMin) : null;
  const maxDjece = soba?.maxChildren ?? 40;
  const online = katalog.onlinePayments;
  const koraci = [
    hr.booking.koraci.termin,
    hr.booking.koraci.soba,
    hr.booking.koraci.djeca,
    hr.booking.koraci.podaci,
    online ? hr.booking.koraci.placanje : hr.booking.pregledKorak,
  ];

  /** Stane li paket (njegovo trajanje) u odabrani početak u zadanoj igraonici. */
  function stane(rid: string, p: Pick<Paket, "durationMin">): boolean {
    if (!odabraniStart) return false;
    const termin = { start: odabraniStart, end: krajTermina(odabraniStart, p.durationMin) };
    return !zauzeto.some((z) => z.roomId === rid && preklapaSe(z, termin));
  }

  function paketiSobe(rid: string): Paket[] {
    return katalog.packages.filter((p) => p.roomId === null || p.roomId === rid);
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

  // Dohvat dostupnosti kad se promijeni datum
  useEffect(() => {
    let aktivno = true;
    setUcitavanjeTermina(true);
    setOdabraniStart(null);
    fetch(`/api/availability?date=${datum}`)
      .then((r) => r.json())
      .then((d) => {
        if (!aktivno) return;
        setTermini(d.termini ?? []);
        setZauzeto(d.zauzeto ?? []);
      })
      .catch(() => aktivno && setTermini([]))
      .finally(() => aktivno && setUcitavanjeTermina(false));
    return () => {
      aktivno = false;
    };
  }, [datum]);

  // Paket mora pripadati odabranoj igraonici
  useEffect(() => {
    if (paket && roomId && paket.roomId !== null && paket.roomId !== roomId) setPackageId("");
  }, [roomId, paket]);

  // Clamp broja djece: najmanje koliko traži paket, najviše koliko prima igraonica
  useEffect(() => {
    if (!paket) return;
    setNumChildren((n) => Math.min(maxDjece, Math.max(paket.minChildren, n)));
  }, [paket, maxDjece]);

  // Live izračun cijene
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
        return !!odabraniTermin && odabraniTermin.semafor !== "popunjeno";
      case 1:
        return !!soba && !!paket && (paket.roomId === null || paket.roomId === soba.id) && stane(soba.id, paket);
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
    if (!odabraniStart || !paket || !slotEnd) return;
    setSlanje(true);
    setGreska(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateISO: datum,
          slotStart: odabraniStart,
          slotEnd,
          roomId,
          secondRoomId,
          packageId,
          themeId,
          numChildren,
          numAdults,
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
          platiPuniIznos: platiPuni,
          voucherCode: voucherSaldo !== null && voucherCode ? voucherCode : null,
        }),
      });
      const data = await res.json();
      if (!res.ok) {
        if (data.code === "TERMIN_ZAUZET") {
          setGreska(hr.booking.terminZauzet);
          setKorak(0);
        } else {
          setGreska(data.error ?? hr.booking.greska);
        }
        return;
      }
      // Stripe način: prikaži Payment Element za potvrdu karticom.
      if (data.clientSecret) {
        const osnovica = platiPuni ? izracun!.totalCents : izracun!.depositCents;
        const bon = voucherSaldo !== null && voucherCode ? Math.min(voucherSaldo, osnovica) : 0;
        setStripeData({ clientSecret: data.clientSecret, code: data.code, iznos: Math.max(0, osnovica - bon) });
        return;
      }
      // Mock način: rezervacija je odmah potvrđena.
      router.push(`/potvrda/${data.code}`);
    } catch {
      setGreska(hr.booking.greska);
    } finally {
      setSlanje(false);
    }
  }

  // Stripe potvrda karticom (zamjenjuje wizard kad backend vrati clientSecret).
  if (stripeData) {
    return (
      <div className="mx-auto max-w-md">
        <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.booking.koraci.placanje}</h1>
        <p className="mt-1 text-sm text-ink-500">Rezervacija {stripeData.code} — dovršite plaćanje.</p>
        <div className="mt-6">
          <StripeConfirm
            clientSecret={stripeData.clientSecret}
            returnUrl={`${typeof window !== "undefined" ? window.location.origin : ""}/potvrda/${stripeData.code}`}
            iznosCents={stripeData.iznos}
          />
        </div>
      </div>
    );
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
              setDatum={setDatum}
              termini={termini}
              ucitavanje={ucitavanjeTermina}
              odabraniStart={odabraniStart}
              onOdabir={setOdabraniStart}
              trajanja={trajanja}
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
              paket={paket}
              packageId={packageId}
              setPackageId={setPackageId}
              stane={stane}
              start={odabraniStart}
            />
          )}
          {korak === 2 && paket && (
            <KorakDjeca
              paket={paket}
              maxDjece={maxDjece}
              numChildren={numChildren}
              setNumChildren={setNumChildren}
              numAdults={numAdults}
              setNumAdults={setNumAdults}
              addons={katalog.addons}
              dodaci={dodaci}
              setDodaci={setDodaci}
              themes={katalog.themes}
              themeId={themeId}
              setThemeId={setThemeId}
            />
          )}
          {korak === 3 && (
            <KorakPodaci
              {...{ parentName, setParentName, email, setEmail, phone, setPhone, childName, setChildName, childBirthDate, setChildBirthDate, napomene, setNapomene, gdpr, setGdpr, marketing, setMarketing, waiver, setWaiver }}
            />
          )}
          {korak === 4 && izracun && (
            <KorakPlacanje
              online={online}
              izracun={izracun}
              platiPuni={platiPuni}
              setPlatiPuni={setPlatiPuni}
              voucherCode={voucherCode}
              setVoucherCode={setVoucherCode}
              voucherSaldo={voucherSaldo}
              setVoucherSaldo={setVoucherSaldo}
              voucherGreska={voucherGreska}
              setVoucherGreska={setVoucherGreska}
            />
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
              {online
                ? slanje ? hr.booking.obradaPlacanja : platiPuni ? hr.booking.platiPuni : hr.booking.platiAkontaciju
                : slanje ? hr.booking.obradaPotvrde : hr.booking.potvrdiRezervaciju}
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
          tema={katalog.themes.find((t) => t.id === themeId)?.name}
          izracun={izracun}
          online={online}
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
          className={`chip ${i === korak ? "bg-brand-500 text-white" : i < korak ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-500"}`}
        >
          <span className="font-bold">{i + 1}.</span> {naziv}
        </li>
      ))}
    </ol>
  );
}

// --- Korak 1: datum i početak ----------------------------------------
function KorakTermin({
  datum, setDatum, termini, ucitavanje, odabraniStart, onOdabir, trajanja,
}: {
  datum: string; setDatum: (d: string) => void; termini: TerminDost[] | null; ucitavanje: boolean;
  odabraniStart: string | null; onOdabir: (start: string) => void;
  trajanja: { durationMin: number; nazivi: string[] }[];
}) {
  const druzionica = druzionicaZaDatum(datum);
  return (
    <div className="card">
      <label className="label" htmlFor="datum">{hr.booking.odaberiDatum}</label>
      <input
        id="datum"
        type="date"
        className="input max-w-xs"
        value={datum}
        min={danasISO()}
        onChange={(e) => e.target.value && setDatum(e.target.value)}
      />
      <p className="mt-2 text-sm text-ink-500">{formatDatumDugi(new Date(`${datum}T00:00:00`))}</p>
      <p className="mt-1 text-xs text-ink-400">{hr.booking.rasporedNapomena}</p>

      <h3 className="mt-6 font-semibold text-ink-800">{hr.booking.odaberiTermin}</h3>
      {ucitavanje || termini === null ? (
        <p className="mt-3 text-ink-400">{hr.zajednicko.ucitavanje}</p>
      ) : termini.length === 0 ? (
        <div className="mt-3 rounded-2xl bg-brand-50 px-4 py-4 text-sm">
          <p className="font-semibold text-brand-900">{hr.booking.nemaTermina}</p>
          <button
            type="button"
            className="btn-secondary mt-3 !py-2 !text-sm"
            onClick={() => setDatum(sljedeciDatumSTerminima(dodajDan(datum, 1)))}
          >
            {hr.booking.prviSlobodanDan} →
          </button>
        </div>
      ) : (
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {termini.map((t) => {
            const popunjeno = t.semafor === "popunjeno";
            const aktivan = odabraniStart === t.start;
            return (
              <button
                key={t.start}
                type="button"
                disabled={popunjeno}
                onClick={() => onOdabir(t.start)}
                className={`flex items-center justify-between gap-3 rounded-2xl border px-4 py-3 text-left transition ${
                  aktivan ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 bg-white hover:border-brand-300"
                } ${popunjeno ? "cursor-not-allowed opacity-50" : ""}`}
              >
                <span>
                  <span className="block font-display text-xl font-bold text-ink-900">{t.start}</span>
                  <span className="block text-xs text-ink-500">
                    {trajanja
                      .map((tr) => `${tr.nazivi.join(" / ")} ${hr.booking.doVrijeme} ${krajTermina(t.start, tr.durationMin)}`)
                      .join(" · ")}
                  </span>
                </span>
                <span className="flex shrink-0 items-center gap-2 text-xs text-ink-500">
                  <span className={`h-2.5 w-2.5 rounded-full ${SEMAFOR_STIL[t.semafor].boja}`} />
                  {SEMAFOR_STIL[t.semafor].tekst}
                </span>
              </button>
            );
          })}
        </div>
      )}
      {druzionica.length > 0 && (
        <p className="mt-4 text-sm text-ink-600">
          🧸 {hr.booking.druzionica}: {druzionica.map((d) => `${d.od} – ${d.do}`).join(", ")}
        </p>
      )}
      <p className="mt-4 flex flex-wrap gap-4 text-xs text-ink-400">
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-mint-500" /> {hr.booking.slobodno}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-amber-400" /> {hr.booking.maloMjesta}</span>
        <span className="flex items-center gap-1"><span className="h-2.5 w-2.5 rounded-full bg-red-400" /> {hr.booking.popunjeno}</span>
      </p>
    </div>
  );
}

// --- Korak 2: igraonica + paket --------------------------------------
function KorakSoba({
  sobe, roomId, setRoomId, secondRoomId, setSecondRoomId, paketiSobe, paket, packageId, setPackageId, stane, start,
}: {
  sobe: Katalog["rooms"]; roomId: string; setRoomId: (id: string) => void;
  secondRoomId: string | null; setSecondRoomId: (id: string | null) => void;
  paketiSobe: (roomId: string) => Paket[]; paket: Paket | undefined; packageId: string; setPackageId: (id: string) => void;
  stane: (roomId: string, p: Pick<Paket, "durationMin">) => boolean; start: string | null;
}) {
  const odabranaSoba = sobe.find((r) => r.id === roomId);
  // Spajanje: druga igraonica mora biti slobodna za cijelo trajanje odabranog paketa.
  const mogućeSpojiti = odabranaSoba && paket
    ? sobe.filter((r) => r.id !== roomId && odabranaSoba.mergeableWith.includes(r.id) && stane(r.id, paket))
    : [];

  return (
    <div className="space-y-6">
      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.booking.odaberiSobu}</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2">
          {sobe.map((r) => {
            const slobodna = paketiSobe(r.id).some((p) => stane(r.id, p));
            return (
              <button
                key={r.id}
                type="button"
                disabled={!slobodna}
                onClick={() => {
                  setRoomId(r.id);
                  if (secondRoomId === r.id) setSecondRoomId(null);
                }}
                className={`rounded-2xl border px-4 py-3 text-left transition ${roomId === r.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 hover:border-brand-300"} ${slobodna ? "" : "cursor-not-allowed opacity-50"}`}
              >
                <div className="flex items-center gap-2">
                  <span className="h-3 w-3 rounded-full" style={{ backgroundColor: r.color }} />
                  <span className="font-semibold text-ink-800">{r.name}</span>
                </div>
                {r.description && <p className="mt-1 text-xs text-ink-500">{r.description}</p>}
                {!slobodna && <p className="mt-1 text-xs font-semibold text-red-500">{hr.booking.zauzetoUTerminu}</p>}
              </button>
            );
          })}
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
            {paketiSobe(odabranaSoba.id).map((p) => {
              const moze = stane(odabranaSoba.id, p);
              return (
                <button
                  key={p.id}
                  type="button"
                  disabled={!moze}
                  onClick={() => setPackageId(p.id)}
                  className={`flex flex-col rounded-2xl border p-4 text-left transition ${packageId === p.id ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200 hover:border-brand-300"} ${moze ? "" : "cursor-not-allowed opacity-50"}`}
                >
                  {p.popular && <span className="chip mb-2 w-fit bg-brand-500 text-white text-xs">⭐ {hr.paketi.popularno}</span>}
                  <span className="flex items-baseline justify-between gap-2">
                    <span className="font-bold text-ink-900">{p.name}</span>
                    <span className="font-display text-lg font-bold text-brand-600">{formatEur(p.basePriceCents)}</span>
                  </span>
                  <span className="mt-1 text-xs text-ink-500">
                    {trajanjeSati(p.durationMin)}{start ? ` · ${start} – ${krajTermina(start, p.durationMin)}` : ""}
                  </span>
                  <span className="mt-1 text-xs text-ink-500">
                    {hr.paketi.doBroj} {p.maxChildren} {hr.paketi.odDjece} · {hr.paketi.slavljenikGratis}
                    {p.perChildCents > 0 ? ` · +${formatEur(p.perChildCents)} ${hr.paketi.poDodatnomDjetetu}` : ""}
                  </span>
                  {p.includedItems.length > 0 && (
                    <ul className="mt-2 space-y-0.5 text-xs text-ink-600">
                      {p.includedItems.map((s, i) => <li key={i}>✓ {s}</li>)}
                    </ul>
                  )}
                  {!moze && <span className="mt-2 text-xs font-semibold text-red-500">{hr.booking.zauzetoUTerminu}</span>}
                </button>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}

// --- Korak 3: djeca + dodaci + tema ----------------------------------
function KorakDjeca({
  paket, maxDjece, numChildren, setNumChildren, numAdults, setNumAdults, addons, dodaci, setDodaci, themes, themeId, setThemeId,
}: {
  paket: Paket; maxDjece: number; numChildren: number; setNumChildren: (n: number) => void;
  numAdults: number; setNumAdults: (n: number) => void;
  addons: Katalog["addons"]; dodaci: Record<string, number>; setDodaci: (d: Record<string, number>) => void;
  themes: Katalog["themes"]; themeId: string | null; setThemeId: (id: string | null) => void;
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
          {paket.perChildCents > 0 ? ` · +${formatEur(paket.perChildCents)} ${hr.paketi.poDodatnomDjetetu}` : ""}
        </p>
        <p className="text-xs text-ink-400">{hr.booking.brojDjeceNapomena}</p>
        <div className="mt-3 flex items-center gap-4">
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumChildren(Math.max(paket.minChildren, numChildren - 1))}>−</button>
          <span className="w-16 text-center text-2xl font-bold text-ink-900">{numChildren}</span>
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumChildren(Math.min(maxDjece, numChildren + 1))}>+</button>
          <span className="text-ink-500">{brojDjece(numChildren)}</span>
        </div>
        {dodatnaDjeca > 0 && paket.perChildCents > 0 && (
          <p className="mt-2 text-sm font-semibold text-berry-600">
            +{formatEur(dodatnaDjeca * paket.perChildCents)} ({brojDjece(dodatnaDjeca)} {hr.booking.iznadPaketa})
          </p>
        )}

        <h3 className="mt-5 font-semibold text-ink-800">{hr.booking.brojOdraslih}</h3>
        <p className="text-sm text-ink-400">Za planiranje kapaciteta i posluženja.</p>
        <div className="mt-3 flex items-center gap-4">
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumAdults(Math.max(0, numAdults - 1))}>−</button>
          <span className="w-16 text-center text-2xl font-bold text-ink-900">{numAdults}</span>
          <button type="button" className="btn-secondary !h-11 !w-11 !p-0 text-xl" onClick={() => setNumAdults(Math.min(60, numAdults + 1))}>+</button>
          <span className="text-ink-500">{hr.zajednicko.osoba}</span>
        </div>
      </div>

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
                  </span>
                </span>
              </label>
            );
          })}
        </div>
      </div>

      <div className="card">
        <h3 className="font-semibold text-ink-800">{hr.booking.tema}</h3>
        <div className="mt-3 flex flex-wrap gap-3">
          <button
            type="button"
            onClick={() => setThemeId(null)}
            className={`chip ${themeId === null ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}
          >
            {hr.booking.bezTeme}
          </button>
          {themes.map((t) => (
            <button
              key={t.id}
              type="button"
              onClick={() => setThemeId(t.id)}
              className={`chip ${themeId === t.id ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}
            >
              {t.emoji} {t.name}
            </button>
          ))}
        </div>
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
          <input className="input" type="date" max={danasISO()} value={p.childBirthDate} onChange={(e) => p.setChildBirthDate(e.target.value)} />
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

// --- Korak 5: plaćanje ------------------------------------------------
function KorakPlacanje({
  online, izracun, platiPuni, setPlatiPuni,
  voucherCode, setVoucherCode, voucherSaldo, setVoucherSaldo, voucherGreska, setVoucherGreska,
}: {
  online: boolean;
  izracun: ReturnType<typeof izracunajCijenu>; platiPuni: boolean; setPlatiPuni: (v: boolean) => void;
  voucherCode: string; setVoucherCode: (v: string) => void;
  voucherSaldo: number | null; setVoucherSaldo: (v: number | null) => void;
  voucherGreska: string | null; setVoucherGreska: (v: string | null) => void;
}) {
  const [provjera, setProvjera] = useState(false);
  // Online: plaća se akontacija ili puni iznos. Uživo: plaća se ukupno na blagajni.
  const osnovica = online ? (platiPuni ? izracun.totalCents : izracun.depositCents) : izracun.totalCents;
  const bonPrimijenjen = voucherSaldo !== null ? Math.min(voucherSaldo, osnovica) : 0;
  const zaPlatiti = Math.max(0, osnovica - bonPrimijenjen);

  async function primijeniBon() {
    setProvjera(true);
    setVoucherGreska(null);
    try {
      const res = await fetch(`/api/vouchers/check?code=${encodeURIComponent(voucherCode)}`);
      const data = await res.json();
      if (data.valid) {
        setVoucherSaldo(data.balanceCents);
      } else {
        setVoucherSaldo(null);
        setVoucherGreska(data.razlog ?? hr.pokloni.bonNevazeci);
      }
    } catch {
      setVoucherGreska(hr.pokloni.bonNevazeci);
    } finally {
      setProvjera(false);
    }
  }

  return (
    <div className="card space-y-4">
      <h3 className="font-semibold text-ink-800">{online ? hr.booking.koraci.placanje : hr.booking.pregledKorak}</h3>

      {!online && (
        <p className="rounded-2xl bg-mint-50 px-4 py-3 text-sm text-mint-700">
          💶 {hr.booking.placanjeUzivoNapomena}
        </p>
      )}

      {online && (
        <div className="grid gap-3 sm:grid-cols-2">
          <button
            type="button"
            onClick={() => setPlatiPuni(false)}
            className={`rounded-2xl border p-4 text-left transition ${!platiPuni ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200"}`}
          >
            <span className="block font-semibold text-ink-800">{hr.booking.akontacija}</span>
            <span className="mt-1 block text-2xl font-extrabold text-brand-600">{formatEur(izracun.depositCents)}</span>
            <span className="text-xs text-ink-400">{hr.booking.ostatak}: {formatEur(izracun.ostatakCents)}</span>
          </button>
          <button
            type="button"
            onClick={() => setPlatiPuni(true)}
            className={`rounded-2xl border p-4 text-left transition ${platiPuni ? "border-brand-500 bg-brand-50 ring-2 ring-brand-300" : "border-ink-200"}`}
          >
            <span className="block font-semibold text-ink-800">{hr.booking.platiPuni}</span>
            <span className="mt-1 block text-2xl font-extrabold text-brand-600">{formatEur(izracun.totalCents)}</span>
            <span className="text-xs text-ink-400">Cijeli iznos odmah</span>
          </button>
        </div>
      )}

      {/* Poklon-bon */}
      <div className="rounded-2xl bg-brand-50 p-4">
        <p className="text-sm font-medium text-ink-700">🎁 {hr.pokloni.imatBon}</p>
        <div className="mt-2 flex gap-2">
          <input
            className="input"
            placeholder={hr.pokloni.unesiKod}
            value={voucherCode}
            onChange={(e) => { setVoucherCode(e.target.value); setVoucherSaldo(null); }}
          />
          <button type="button" className="btn-secondary shrink-0" onClick={primijeniBon} disabled={!voucherCode || provjera}>
            {hr.pokloni.primijeni}
          </button>
        </div>
        {voucherGreska && <p className="mt-2 text-sm text-red-600">{voucherGreska}</p>}
        {voucherSaldo !== null && (
          <p className="mt-2 text-sm text-mint-700">
            ✅ {hr.pokloni.bonPrimijenjen} · {hr.pokloni.stanje}: {formatEur(voucherSaldo)} (−{formatEur(bonPrimijenjen)})
          </p>
        )}
      </div>

      <div className="flex items-center justify-between rounded-2xl bg-ink-50 px-4 py-3">
        <span className="font-semibold text-ink-800">{online ? "Za plaćanje sada" : hr.booking.zaPlatitiUzivo}</span>
        <span className="text-xl font-extrabold text-brand-600">{formatEur(zaPlatiti)}</span>
      </div>

      {online && (
        <p className="rounded-2xl bg-sky2-50 px-4 py-3 text-xs text-ink-500">
          Probni način rada: plaćanje je simulirano. U stvarnom radu ovdje se učitava Stripe (EUR).
        </p>
      )}
    </div>
  );
}

// --- Sažetak ----------------------------------------------------------
function Sazetak({
  datum, termin, soba, soba2, paket, numChildren, tema, izracun, online,
}: {
  datum: string | null; termin: string | null; soba?: string; soba2?: string; paket?: string;
  numChildren: number; tema?: string; izracun: ReturnType<typeof izracunajCijenu> | null; online: boolean;
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
      {izracun && (
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
            <span>{hr.booking.ukupno}</span>
            <span className="text-brand-600">{formatEur(izracun.totalCents)}</span>
          </div>
          <div className="mt-1 flex justify-between text-sm text-ink-500">
            <span>{online ? hr.booking.akontacija : hr.booking.zaPlatitiUzivo}</span>
            <span>{formatEur(online ? izracun.depositCents : izracun.totalCents)}</span>
          </div>
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
