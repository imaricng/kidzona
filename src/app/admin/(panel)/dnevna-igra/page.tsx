import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { formatDatum, formatDatumVrijeme, imeVelikimSlovom } from "@/lib/format";
import { formatTrajanje, minuteBoravka } from "@/lib/dnevna-igra";
import { poveziSCrm } from "@/lib/dnevna-igra-crm";
import { lokalniISO } from "@/lib/slots";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { DatumPolje } from "@/components/DatumPolje";

export const dynamic = "force-dynamic";
export const metadata = { title: "Dnevna igra" };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const EMAIL = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

function vrijeme(d: Date): string {
  return new Intl.DateTimeFormat("hr-HR", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: "Europe/Zagreb" }).format(d);
}

function osvjezi() {
  revalidatePath("/admin/dnevna-igra");
  revalidatePath("/admin/crm");
}

// --- Server actions ---------------------------------------------------
async function upisiDolazak(formData: FormData) {
  "use server";
  const sesija = await zahtijevajOsoblje();
  const dijete = String(formData.get("dijete") ?? "").trim().replace(/\s+/g, " ");
  const roditelj = String(formData.get("roditelj") ?? "").trim().replace(/\s+/g, " ");
  const telefon = String(formData.get("telefon") ?? "").trim();
  const rodendan = String(formData.get("rodendan") ?? "");
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const privola = formData.get("privola") === "on";

  if (dijete.split(" ").length < 2 || roditelj.length < 2 || telefon.replace(/\D/g, "").length < 6) {
    redirect(`/admin/dnevna-igra?greska=${encodeURIComponent("Upišite ime i prezime djeteta, ime roditelja i ispravan broj telefona.")}`);
  }
  if ((rodendan && !DATUM.test(rodendan)) || (email && !EMAIL.test(email))) {
    redirect(`/admin/dnevna-igra?greska=${encodeURIComponent("Datum rođenja ili e-mail roditelja nije ispravan.")}`);
  }

  const boravak = await prisma.dailyPlay.create({
    data: {
      childName: imeVelikimSlovom(dijete),
      parentName: imeVelikimSlovom(roditelj),
      parentPhone: telefon,
      childBirthDate: rodendan ? new Date(`${rodendan}T12:00:00`) : null,
      parentEmail: email || null,
      marketingConsent: privola,
      createdBy: sesija.name,
    },
  });
  if (email) await poveziSCrm(boravak.id, { email, rodendan: boravak.childBirthDate, privola });
  osvjezi();
  redirect(`/admin/dnevna-igra?poruka=${email ? "dodano" : "bez-emaila"}`);
}

/** Naknadno upisan e-mail (npr. pri sljedećem dolasku) povezuje dijete s CRM-om. */
async function dopuniPodatke(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const id = String(formData.get("id"));
  const email = String(formData.get("email") ?? "").trim().toLowerCase();
  const rodendan = String(formData.get("rodendan") ?? "");
  if (!EMAIL.test(email) || (rodendan && !DATUM.test(rodendan))) {
    redirect(`/admin/dnevna-igra?greska=${encodeURIComponent("Upišite ispravan e-mail roditelja (i datum rođenja, ako ga znate).")}`);
  }
  await poveziSCrm(id, {
    email,
    rodendan: rodendan ? new Date(`${rodendan}T12:00:00`) : null,
    privola: formData.get("privola") === "on",
  });
  osvjezi();
  redirect("/admin/dnevna-igra?poruka=povezano");
}

async function zavrsiIgru(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const id = String(formData.get("id"));
  // Samo ako je dijete još u igraonici — dvostruki klik ne prepisuje vrijeme odlaska.
  await prisma.dailyPlay.updateMany({ where: { id, leftAt: null }, data: { leftAt: new Date() } });
  revalidatePath("/admin/dnevna-igra");
  redirect(`/admin/dnevna-igra?zavrseno=${encodeURIComponent(id)}`);
}

const PORUKE: Record<string, string> = {
  dodano: "✅ Dolazak je upisan, a dijete je u bazi obitelji (CRM).",
  "bez-emaila": "Dolazak je upisan bez e-maila — dijete još nije u CRM-u. Pitajte roditelja za e-mail pri odlasku ili sljedećem dolasku.",
  povezano: "✅ E-mail je upisan i dijete je povezano s bazom obitelji (CRM), zajedno s ranijim dolascima.",
};

export default async function DnevnaIgraPage({
  searchParams,
}: {
  searchParams: Promise<{ poruka?: string; greska?: string; zavrseno?: string }>;
}) {
  const { poruka, greska, zavrseno } = await searchParams;
  const sada = new Date();
  const danas = lokalniISO(sada);
  const [aktivni, zavrseni, upravoZavrsen, bezEmailaSvi] = await Promise.all([
    prisma.dailyPlay.findMany({ where: { leftAt: null }, orderBy: { arrivedAt: "asc" } }),
    prisma.dailyPlay.findMany({ where: { leftAt: { not: null } }, orderBy: { leftAt: "desc" }, take: 50 }),
    zavrseno ? prisma.dailyPlay.findUnique({ where: { id: zavrseno } }) : Promise.resolve(null),
    prisma.dailyPlay.findMany({ where: { familyId: null }, orderBy: { arrivedAt: "desc" }, take: 200 }),
  ]);
  // Jedno dijete (isti telefon i ime) samo jednom, s najnovijim dolaskom.
  const vidjeni = new Set<string>();
  const bezEmaila = bezEmailaSvi.filter((d) => {
    const kljuc = `${d.parentPhone}|${d.childName.toLowerCase()}`;
    if (vidjeni.has(kljuc)) return false;
    vidjeni.add(kljuc);
    return true;
  });

  return (
    <div className="mx-auto max-w-5xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">🧸 Dnevna igra</h1>
      <p className="mt-1 text-sm text-ink-500">
        Upišite dijete kad dođe na igru — vrijeme dolaska bilježi se samo. Kad dijete odlazi, kliknite „Završi igru”.
        Uz e-mail roditelja dijete ulazi u bazu obitelji (CRM) kao i djeca s rođendana.
      </p>

      {upravoZavrsen?.leftAt && (
        <div className="mt-4 rounded-2xl bg-sun-100 px-5 py-4 ring-2 ring-sun-400" role="status">
          <p className="text-sm text-ink-700">{upravoZavrsen.childName} je bio/la na igri</p>
          <p className="font-display text-3xl font-extrabold text-brand-900">
            {formatTrajanje(minuteBoravka(upravoZavrsen.arrivedAt, upravoZavrsen.leftAt))}
          </p>
          <p className="mt-1 text-xs text-ink-500">
            {vrijeme(upravoZavrsen.arrivedAt)} – {vrijeme(upravoZavrsen.leftAt)} · {formatDatum(upravoZavrsen.arrivedAt)}
          </p>
          {!upravoZavrsen.familyId && <p className="mt-2 text-sm font-medium text-brand-900">✉️ Još nemamo e-mail roditelja — pitajte ga sada.</p>}
        </div>
      )}
      {poruka && PORUKE[poruka] && (
        <p className={`mt-4 rounded-2xl px-4 py-3 text-sm font-medium ${poruka === "bez-emaila" ? "bg-sun-100 text-brand-900" : "bg-mint-500/15 text-mint-600"}`}>
          {PORUKE[poruka]}
        </p>
      )}
      {greska && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{greska}</p>}

      {/* Novi dolazak */}
      <form action={upisiDolazak} className="card mt-6">
        <h2 className="font-semibold text-ink-800">+ Novi dolazak</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">Ime i prezime djeteta *</span>
            <input name="dijete" required minLength={3} maxLength={80} className="input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">Ime roditelja *</span>
            <input name="roditelj" required minLength={2} maxLength={80} className="input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">Telefon roditelja *</span>
            <input name="telefon" type="tel" required inputMode="tel" maxLength={30} className="input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">E-mail roditelja (tražite ga)</span>
            <input name="email" type="email" maxLength={120} className="input !py-2" />
          </label>
        </div>
        <label className="mt-3 flex items-start gap-2 text-sm text-ink-700">
          <input type="checkbox" name="privola" className="mt-0.5 h-4 w-4 accent-brand-500" />
          Roditelj pristaje primati obavijesti i ponude Kidzone (npr. podsjetnik za rođendan)
        </label>
        <details className="mt-3">
          <summary className="cursor-pointer text-sm font-medium text-brand-600">Više o djetetu</summary>
          <label className="mt-3 block max-w-xs">
            <span className="mb-1 block text-xs font-medium text-ink-500">Datum rođenja djeteta (za rođendanske ponude)</span>
            <DatumPolje name="rodendan" max={danas} className="input !py-2" />
          </label>
        </details>
        <div className="mt-4 flex justify-end">
          <button type="submit" className="btn-primary !py-2">Upiši dolazak</button>
        </div>
      </form>

      {/* Djeca trenutno u igraonici */}
      <h2 className="mt-8 font-semibold text-ink-800">Trenutno u igraonici ({aktivni.length})</h2>
      <div className="mt-3 grid gap-3 sm:grid-cols-2">
        {aktivni.length === 0 && <p className="text-sm text-ink-400">Trenutno nema djece na dnevnoj igri.</p>}
        {aktivni.map((d) => (
          <div key={d.id} className="card flex items-start justify-between gap-3">
            <div className="min-w-0">
              <p className="font-display text-lg font-bold text-brand-900">{d.childName}</p>
              <p className="text-sm text-ink-600">
                Došao/la u {vrijeme(d.arrivedAt)} · <span className="font-semibold">{formatTrajanje(minuteBoravka(d.arrivedAt, sada))}</span>
              </p>
              <p className="mt-1 text-xs text-ink-400">
                {d.parentName} ·{" "}
                <a href={`tel:${d.parentPhone}`} className="text-brand-600 hover:underline">{d.parentPhone}</a>
              </p>
              {!d.familyId && <span className="chip mt-1 bg-sun-100 !text-xs font-semibold text-brand-900">bez e-maila — pitajte roditelja</span>}
            </div>
            <form action={zavrsiIgru}>
              <input type="hidden" name="id" value={d.id} />
              <ConfirmSubmit poruka={`Završiti igru za ${d.childName}?`} className="btn-primary shrink-0 !py-2 !text-sm">
                Završi igru
              </ConfirmSubmit>
            </form>
          </div>
        ))}
      </div>

      {/* Djeca koja još nisu u CRM-u */}
      {bezEmaila.length > 0 && (
        <details className="card mt-8">
          <summary className="cursor-pointer font-semibold text-ink-800">✉️ Dopunite e-mail ({bezEmaila.length})</summary>
          <p className="mt-1 text-sm text-ink-500">
            Ova djeca još nisu u bazi obitelji jer nemamo e-mail roditelja. Upisom e-maila povezuju se i svi njihovi raniji dolasci.
          </p>
          <ul className="mt-3 divide-y divide-black/5">
            {bezEmaila.map((d) => (
              <li key={d.id} className="py-3">
                <p className="text-sm">
                  <span className="font-medium text-ink-800">{d.childName}</span>
                  <span className="ml-2 text-ink-500">{d.parentName} · {d.parentPhone} · zadnji dolazak {formatDatum(d.arrivedAt)}</span>
                </p>
                <form action={dopuniPodatke} className="mt-2 flex flex-wrap items-end gap-2">
                  <input type="hidden" name="id" value={d.id} />
                  <input name="email" type="email" required maxLength={120} placeholder="E-mail roditelja" aria-label="E-mail roditelja" className="input !w-60 !py-1.5 !text-sm" />
                  {!d.childBirthDate && (
                    <label className="block">
                      <span className="mb-1 block text-xs text-ink-500">Datum rođenja</span>
                      <DatumPolje name="rodendan" max={danas} className="input !w-40 !py-1.5 !text-sm" />
                    </label>
                  )}
                  <label className="flex items-center gap-1.5 pb-2 text-xs text-ink-600">
                    <input type="checkbox" name="privola" defaultChecked={d.marketingConsent} className="h-4 w-4 accent-brand-500" />
                    pristaje na ponude
                  </label>
                  <button type="submit" className="btn-secondary !py-1.5 !text-sm">Spremi</button>
                </form>
              </li>
            ))}
          </ul>
        </details>
      )}

      {/* Zapisi */}
      <h2 className="mt-8 font-semibold text-ink-800">Zadnji završeni boravci</h2>
      {zavrseni.length === 0 ? (
        <p className="mt-3 text-sm text-ink-400">Još nema završenih boravaka.</p>
      ) : (
        <div className="card mt-3 overflow-x-auto !p-0">
          <table className="w-full text-left text-sm">
            <thead className="bg-brand-50 text-xs text-ink-500">
              <tr>
                <th className="px-4 py-2 font-medium">Dijete</th>
                <th className="px-4 py-2 font-medium">Roditelj</th>
                <th className="px-4 py-2 font-medium">Dolazak</th>
                <th className="px-4 py-2 font-medium">Odlazak</th>
                <th className="px-4 py-2 font-medium">Trajanje</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-black/5">
              {zavrseni.map((d) => (
                <tr key={d.id}>
                  <td className="px-4 py-2 font-medium text-ink-800">{d.childName}</td>
                  <td className="px-4 py-2 text-ink-600">
                    {d.parentName}
                    <span className="block text-xs text-ink-400">{d.parentEmail ?? d.parentPhone}</span>
                  </td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-600">{formatDatumVrijeme(d.arrivedAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2 text-ink-600">{d.leftAt && vrijeme(d.leftAt)}</td>
                  <td className="whitespace-nowrap px-4 py-2 font-semibold text-ink-800">
                    {d.leftAt && formatTrajanje(minuteBoravka(d.arrivedAt, d.leftAt))}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
