"use client";
import { useState } from "react";
import { hr } from "@/i18n/hr";
import { formatEur } from "@/lib/format";

const IZNOSI = [3000, 5000, 7500, 10000, 15000]; // u centima

export function VoucherPurchase() {
  const [iznos, setIznos] = useState(5000);
  const [purchaserName, setName] = useState("");
  const [purchaserEmail, setEmail] = useState("");
  const [recipientName, setRecipient] = useState("");
  const [message, setMessage] = useState("");
  const [slanje, setSlanje] = useState(false);
  const [kod, setKod] = useState<string | null>(null);
  const [greska, setGreska] = useState<string | null>(null);

  async function kupi() {
    setSlanje(true);
    setGreska(null);
    try {
      const res = await fetch("/api/vouchers/purchase", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ iznosCents: iznos, purchaserName, purchaserEmail, recipientName: recipientName || undefined, message: message || undefined }),
      });
      const data = await res.json();
      if (!res.ok) { setGreska(data.error ?? "Greška"); return; }
      setKod(data.code);
    } catch {
      setGreska("Došlo je do pogreške.");
    } finally {
      setSlanje(false);
    }
  }

  if (kod) {
    return (
      <div className="card text-center">
        <div className="text-5xl" aria-hidden>🎁</div>
        <h2 className="mt-3 font-display text-2xl font-extrabold text-ink-900">{hr.pokloni.uspjeh}</h2>
        <div className="mt-4 rounded-2xl bg-brand-50 px-4 py-3">
          <p className="text-sm text-ink-500">{hr.pokloni.vasKod}</p>
          <p className="font-display text-2xl font-extrabold tracking-wider text-brand-600">{kod}</p>
        </div>
        <p className="mt-3 text-sm text-ink-500">{hr.pokloni.uputa}</p>
      </div>
    );
  }

  const valjano = purchaserName.trim().length >= 2 && /\S+@\S+\.\S+/.test(purchaserEmail);

  return (
    <div className="card">
      {greska && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{greska}</p>}
      <label className="label">{hr.pokloni.iznos}</label>
      <div className="flex flex-wrap gap-2">
        {IZNOSI.map((i) => (
          <button key={i} type="button" onClick={() => setIznos(i)} className={`chip ${iznos === i ? "bg-brand-500 text-white" : "bg-ink-100 text-ink-600"}`}>
            {formatEur(i)}
          </button>
        ))}
      </div>

      <div className="mt-4 grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">{hr.pokloni.odIme} *</label>
          <input className="input" value={purchaserName} onChange={(e) => setName(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.pokloni.odEmail} *</label>
          <input className="input" type="email" value={purchaserEmail} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.pokloni.zaIme}</label>
          <input className="input" value={recipientName} onChange={(e) => setRecipient(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.pokloni.poruka}</label>
          <input className="input" value={message} onChange={(e) => setMessage(e.target.value)} />
        </div>
      </div>

      <button type="button" className="btn-primary mt-6 w-full" disabled={!valjano || slanje} onClick={kupi}>
        {slanje ? hr.pokloni.obrada : `${hr.pokloni.kupi} · ${formatEur(iznos)}`}
      </button>
      <p className="mt-2 text-center text-xs text-ink-400">Probni način: plaćanje je simulirano.</p>
    </div>
  );
}
