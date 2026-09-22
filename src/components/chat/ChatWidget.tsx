"use client";

import { IzjavaRoditelja } from "@/components/IzjavaRoditelja";
import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { hr } from "@/i18n/hr";

/** Chat je za goste; u administraciji i roditeljskom portalu samo smeta. */
const BEZ_CHATA = ["/admin", "/portal", "/rezervacija"];

interface Poruka {
  uloga: "korisnik" | "asistent";
  tekst: string;
}

interface Priprema {
  dateISO: string;
  slotStart: string;
  roomId: string;
  packageId: string;
  themeId?: string;
  numChildren: number;
  parentName: string;
  email: string;
  phone: string;
  childName: string;
  childBirthDate: string;
  temaZelja?: string;
  napomene?: string;
  dodaciIds?: string[];
  sazetak: { naziv: string; vrijednost: string }[];
}

const POZDRAV =
  "Bok! Pomoći ću vam oko rođendana u Kidzoni — mogu provjeriti slobodne termine, objasniti pakete i pripremiti upit. Za koji datum razmišljate?";

/**
 * Chat za rezervaciju. Razgovor vodi model, ali upit šalje roditelj klikom:
 * model samo priprema sažetak, a privole se potvrđuju kvačicama kao u obrascu
 * (privola mora biti izričita radnja, ne rečenica u razgovoru).
 */
export function ChatWidget() {
  const [otvoren, setOtvoren] = useState(false);
  const [poruke, setPoruke] = useState<Poruka[]>([{ uloga: "asistent", tekst: POZDRAV }]);
  const [unos, setUnos] = useState("");
  const [ucitava, setUcitava] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);
  const [priprema, setPriprema] = useState<Priprema | null>(null);
  const [gdpr, setGdpr] = useState(false);
  const [waiver, setWaiver] = useState(false);
  const [marketing, setMarketing] = useState(false);
  const [salje, setSalje] = useState(false);
  const [poslano, setPoslano] = useState<{ code: string; kljuc: string } | null>(null);
  const dno = useRef<HTMLDivElement>(null);
  const pathname = usePathname();

  useEffect(() => {
    dno.current?.scrollIntoView({ behavior: "smooth" });
  }, [poruke, priprema, poslano, ucitava]);

  // Na stranici s obrascem za rezervaciju chat bi se natjecao sam sa sobom.
  if (BEZ_CHATA.some((p) => pathname === p || pathname.startsWith(`${p}/`))) return null;

  async function posalji() {
    const tekst = unos.trim();
    if (!tekst || ucitava) return;
    const nove: Poruka[] = [...poruke, { uloga: "korisnik", tekst }];
    setPoruke(nove);
    setUnos("");
    setUcitava(true);
    setGreska(null);
    try {
      const res = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        // Pozdrav je naš tekst, ne dio razgovora s modelom.
        body: JSON.stringify({ poruke: nove.slice(1) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Greška");
      setPoruke((p) => [...p, { uloga: "asistent", tekst: data.odgovor }]);
      if (data.priprema) setPriprema(data.priprema);
    } catch (e) {
      setGreska(e instanceof Error ? e.message : "Nešto nije u redu.");
    } finally {
      setUcitava(false);
    }
  }

  async function posaljiUpit() {
    if (!priprema || !gdpr || !waiver || salje) return;
    setSalje(true);
    setGreska(null);
    try {
      const res = await fetch("/api/booking", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          dateISO: priprema.dateISO,
          slotStart: priprema.slotStart,
          roomId: priprema.roomId,
          packageId: priprema.packageId,
          themeId: priprema.themeId,
          temaZelja: priprema.temaZelja ?? "",
          numChildren: priprema.numChildren,
          dodaci: (priprema.dodaciIds ?? []).map((id) => ({ id, quantity: 1 })),
          parentName: priprema.parentName,
          email: priprema.email,
          phone: priprema.phone,
          childName: priprema.childName,
          childBirthDate: priprema.childBirthDate,
          napomene: priprema.napomene || undefined,
          gdprConsent: gdpr,
          marketingConsent: marketing,
          waiverAccepted: waiver,
          voucherCode: null,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Upit nije poslan.");
      setPoslano({ code: data.code, kljuc: data.kljuc });
      setPriprema(null);
    } catch (e) {
      setGreska(e instanceof Error ? e.message : "Upit nije poslan.");
    } finally {
      setSalje(false);
    }
  }

  if (!otvoren) {
    return (
      <button
        type="button"
        onClick={() => setOtvoren(true)}
        aria-label="Otvori razgovor o rezervaciji"
        className="fixed bottom-4 right-4 z-40 flex items-center gap-2 rounded-full bg-brand-500 px-5 py-3 font-bold text-white shadow-soft transition hover:bg-brand-600"
      >
        💬 Pitajte nas
      </button>
    );
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-40 p-3 sm:inset-x-auto sm:right-4 sm:w-[24rem]">
      <div className="flex max-h-[80vh] flex-col overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/10">
        <header className="flex items-center justify-between gap-2 bg-brand-500 px-4 py-3 text-white">
          <span className="font-display font-bold">Rezervacija rođendana</span>
          <button type="button" onClick={() => setOtvoren(false)} aria-label="Zatvori razgovor" className="text-xl leading-none">
            ×
          </button>
        </header>

        <div className="flex-1 space-y-3 overflow-y-auto px-4 py-3 text-sm">
          {poruke.map((p, i) => (
            <div key={i} className={p.uloga === "korisnik" ? "text-right" : ""}>
              <span
                className={`inline-block max-w-[85%] whitespace-pre-wrap rounded-2xl px-3 py-2 text-left ${
                  p.uloga === "korisnik" ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-800"
                }`}
              >
                {p.tekst}
              </span>
            </div>
          ))}

          {ucitava && <p className="text-ink-400">Razmišljam…</p>}

          {priprema && !poslano && (
            <div className="rounded-2xl bg-sun-100 p-3 ring-1 ring-sun-400">
              <p className="font-bold text-brand-900">Provjerite podatke prije slanja</p>
              <dl className="mt-2 space-y-1 text-xs text-ink-700">
                {priprema.sazetak.map((s) => (
                  <div key={s.naziv} className="flex justify-between gap-2">
                    <dt className="text-ink-500">{s.naziv}</dt>
                    <dd className="text-right font-medium">{s.vrijednost}</dd>
                  </div>
                ))}
              </dl>
              <label className="mt-3 flex items-start gap-2 text-xs text-ink-700">
                <input type="checkbox" checked={gdpr} onChange={(e) => setGdpr(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span>{hr.booking.gdprPrivola}</span>
              </label>
              <label className="mt-2 flex items-start gap-2 text-xs text-ink-700">
                <input type="checkbox" checked={waiver} onChange={(e) => setWaiver(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span><IzjavaRoditelja /></span>
              </label>
              <label className="mt-2 flex items-start gap-2 text-xs text-ink-700">
                <input type="checkbox" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} className="mt-0.5 h-4 w-4 accent-brand-500" />
                <span>{hr.booking.marketingPrivola}</span>
              </label>
              <button
                type="button"
                onClick={posaljiUpit}
                disabled={!gdpr || !waiver || salje}
                className="btn-primary mt-3 w-full !py-2 !text-sm disabled:opacity-50"
              >
                {salje ? "Šaljem…" : "Pošalji upit"}
              </button>
              <p className="mt-2 text-[11px] text-ink-500">Upit nije potvrđena rezervacija — javljamo se s potvrdom termina.</p>
            </div>
          )}

          {poslano && (
            <div className="rounded-2xl bg-mint-500/15 p-3">
              <p className="font-bold text-mint-600">✅ Upit je poslan!</p>
              <p className="mt-1 text-xs text-ink-700">
                Broj upita: <strong>{poslano.code}</strong>. Potvrdu smo poslali na vašu e-poštu.
              </p>
              <Link href={`/potvrda/${poslano.code}?k=${poslano.kljuc}`} className="mt-2 inline-block text-xs font-semibold text-brand-600 underline">
                Otvori pregled upita
              </Link>
            </div>
          )}

          {greska && <p className="rounded-2xl bg-red-50 p-2 text-xs text-red-700">{greska}</p>}
          <div ref={dno} />
        </div>

        <div className="border-t border-black/5 p-3">
          <div className="flex gap-2">
            <input
              value={unos}
              onChange={(e) => setUnos(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter" && !e.shiftKey) {
                  e.preventDefault();
                  posalji();
                }
              }}
              maxLength={2000}
              placeholder="Npr. rođendan u svibnju za 12 djece"
              aria-label="Vaša poruka"
              className="input !py-2 flex-1 !text-sm"
            />
            <button type="button" onClick={posalji} disabled={ucitava || !unos.trim()} className="btn-primary !px-4 !py-2 !text-sm disabled:opacity-50">
              Pošalji
            </button>
          </div>
          <p className="mt-2 text-[11px] text-ink-400">
            Odgovara automatski pomoćnik. Za hitno: {hr.kontakt.telefon}.
          </p>
        </div>
      </div>
    </div>
  );
}
