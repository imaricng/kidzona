"use client";
import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { hr } from "@/i18n/hr";

interface DijeteUnos {
  firstName: string;
  birthDate: string;
  allergies: string;
}

export function RegistracijaForm() {
  const router = useRouter();
  const [parentName, setParentName] = useState("");
  const [email, setEmail] = useState("");
  const [phone, setPhone] = useState("");
  const [password, setPassword] = useState("");
  const [password2, setPassword2] = useState("");
  const [marketing, setMarketing] = useState(true);
  const [djeca, setDjeca] = useState<DijeteUnos[]>([{ firstName: "", birthDate: "", allergies: "" }]);
  const [slanje, setSlanje] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);

  function dodajDijete() {
    setDjeca([...djeca, { firstName: "", birthDate: "", allergies: "" }]);
  }
  function ukloniDijete(i: number) {
    setDjeca(djeca.filter((_, idx) => idx !== i));
  }
  function azurirajDijete(i: number, polje: keyof DijeteUnos, v: string) {
    setDjeca(djeca.map((d, idx) => (idx === i ? { ...d, [polje]: v } : d)));
  }

  async function posalji() {
    setGreska(null);
    if (password !== password2) { setGreska(hr.portal.lozinkeNeJednake); return; }
    setSlanje(true);
    try {
      const res = await fetch("/api/portal/register", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          parentName, email, phone: phone || undefined, password, marketingConsent: marketing,
          djeca: djeca.filter((d) => d.firstName && d.birthDate).map((d) => ({ firstName: d.firstName, birthDate: d.birthDate, allergies: d.allergies || undefined })),
        }),
      });
      const data = await res.json();
      if (!res.ok) { setGreska(data.error ?? "Greška"); return; }
      router.push("/portal");
      router.refresh();
    } catch {
      setGreska("Došlo je do pogreške.");
    } finally {
      setSlanje(false);
    }
  }

  const valjano = parentName.trim().length >= 2 && /\S+@\S+\.\S+/.test(email) && password.length >= 6;

  return (
    <div className="card">
      {greska && <p className="mb-4 rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{greska}</p>}

      <div className="grid gap-4 sm:grid-cols-2">
        <div>
          <label className="label">Ime i prezime *</label>
          <input className="input" value={parentName} onChange={(e) => setParentName(e.target.value)} />
        </div>
        <div>
          <label className="label">E-pošta *</label>
          <input className="input" type="email" value={email} onChange={(e) => setEmail(e.target.value)} />
        </div>
        <div>
          <label className="label">Telefon</label>
          <input className="input" value={phone} onChange={(e) => setPhone(e.target.value)} />
        </div>
        <div className="hidden sm:block" />
        <div>
          <label className="label">{hr.portal.lozinka} *</label>
          <input className="input" type="password" value={password} onChange={(e) => setPassword(e.target.value)} />
        </div>
        <div>
          <label className="label">{hr.portal.lozinkaPotvrda} *</label>
          <input className="input" type="password" value={password2} onChange={(e) => setPassword2(e.target.value)} />
        </div>
      </div>

      <div className="mt-6">
        <div className="flex items-center justify-between">
          <h3 className="font-semibold text-ink-800">{hr.portal.mojaDjeca}</h3>
          <button type="button" className="btn-secondary !py-1.5 !text-sm" onClick={dodajDijete}>+ {hr.portal.dodajDijete}</button>
        </div>
        <div className="mt-3 space-y-3">
          {djeca.map((d, i) => (
            <div key={i} className="grid gap-2 rounded-2xl border border-ink-200 p-3 sm:grid-cols-[1fr,1fr,1fr,auto]">
              <input className="input !py-2" placeholder="Ime djeteta" value={d.firstName} onChange={(e) => azurirajDijete(i, "firstName", e.target.value)} />
              <input className="input !py-2" type="date" value={d.birthDate} onChange={(e) => azurirajDijete(i, "birthDate", e.target.value)} />
              <input className="input !py-2" placeholder="Alergije (nije obvezno)" value={d.allergies} onChange={(e) => azurirajDijete(i, "allergies", e.target.value)} />
              {djeca.length > 1 && (
                <button type="button" className="text-sm text-ink-400 hover:text-red-600" onClick={() => ukloniDijete(i)}>{hr.portal.ukloni}</button>
              )}
            </div>
          ))}
        </div>
      </div>

      <label className="mt-4 flex items-start gap-3 text-sm">
        <input type="checkbox" className="mt-1 h-4 w-4 accent-brand-500" checked={marketing} onChange={(e) => setMarketing(e.target.checked)} />
        <span>{hr.portal.marketingToggle}</span>
      </label>

      <button type="button" className="btn-primary mt-6 w-full" disabled={!valjano || slanje} onClick={posalji}>
        {slanje ? "Obrada…" : hr.portal.registracija}
      </button>
      <p className="mt-4 text-center text-sm text-ink-500">
        {hr.portal.imateRacun}{" "}
        <Link href="/portal/prijava" className="font-medium text-brand-600 hover:underline">{hr.portal.prijava}</Link>
      </p>
    </div>
  );
}
