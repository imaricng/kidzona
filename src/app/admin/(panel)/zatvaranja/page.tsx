import Link from "next/link";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { prisma } from "@/lib/prisma";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { formatDatum } from "@/lib/format";
import { lokalniISO } from "@/lib/slots";
import { rasponDatuma } from "@/lib/zatvaranja";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { DatumPolje } from "@/components/DatumPolje";

export const dynamic = "force-dynamic";
export const metadata = { title: "Neradni dani" };

const DATUM = /^\d{4}-\d{2}-\d{2}$/;

function osvjezi() {
  revalidatePath("/admin/zatvaranja");
  revalidatePath("/");
  revalidatePath("/rezervacija");
}

// --- Server actions ---------------------------------------------------
async function dodajZatvaranje(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const od = String(formData.get("od") ?? "");
  const doDatuma = String(formData.get("do") ?? "") || od;
  const razlog = String(formData.get("razlog") ?? "").trim();
  if (!DATUM.test(od) || !DATUM.test(doDatuma) || doDatuma < od || razlog.length < 2) {
    redirect(`/admin/zatvaranja?greska=${encodeURIComponent("Unesite datum od, datum do (ne prije datuma od) i razlog.")}`);
  }
  await prisma.closedPeriod.create({
    data: { startDate: od, endDate: doDatuma, reason: razlog, showNotice: formData.get("obavijest") === "on" },
  });
  osvjezi();
  redirect("/admin/zatvaranja?poruka=dodano");
}

async function promijeniObavijest(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const id = String(formData.get("id"));
  const z = await prisma.closedPeriod.findUnique({ where: { id } });
  if (z) await prisma.closedPeriod.update({ where: { id }, data: { showNotice: !z.showNotice } });
  osvjezi();
}

async function obrisiZatvaranje(formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  await prisma.closedPeriod.delete({ where: { id: String(formData.get("id")) } }).catch(() => {});
  osvjezi();
  redirect("/admin/zatvaranja?poruka=obrisano");
}

const PORUKE: Record<string, string> = {
  dodano: "✅ Neradni dani su dodani. Web upiti za te datume više nisu mogući.",
  obrisano: "Razdoblje je obrisano — datumi su ponovno dostupni za upite.",
};

export default async function ZatvaranjaPage({ searchParams }: { searchParams: Promise<{ poruka?: string; greska?: string }> }) {
  const { poruka, greska } = await searchParams;
  const danas = lokalniISO(new Date());
  const [aktualna, prosla] = await Promise.all([
    prisma.closedPeriod.findMany({ where: { endDate: { gte: danas } }, orderBy: { startDate: "asc" } }),
    prisma.closedPeriod.findMany({ where: { endDate: { lt: danas } }, orderBy: { startDate: "desc" }, take: 5 }),
  ]);
  // Rezervacije i upiti koji već padaju u razdoblje zatvaranja (treba ih riješiti s roditeljima).
  const pogodene = await Promise.all(
    aktualna.map((z) =>
      prisma.reservation.findMany({
        where: {
          date: { gte: new Date(`${z.startDate}T00:00:00`), lte: new Date(`${z.endDate}T23:59:59`) },
          status: { notIn: ["otkazano", "odbijeno"] },
        },
        orderBy: [{ date: "asc" }, { slotStart: "asc" }],
        select: { id: true, code: true, date: true, slotStart: true, status: true, childName: true, parentName: true },
      }),
    ),
  );

  return (
    <div className="mx-auto max-w-4xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">🏖️ Neradni dani</h1>
      <p className="mt-1 text-sm text-ink-500">
        Godišnji odmori, praznici ili razdoblje prije otvorenja. U tim danima kupci ne mogu poslati upit putem web
        obrasca, a na stranici se (ako je uključeno) prikazuje obavijest od 60 dana prije početka do kraja razdoblja.
        Ručni unos u administraciji i dalje je moguć.
      </p>

      {poruka && PORUKE[poruka] && (
        <p className="mt-4 rounded-2xl bg-mint-500/15 px-4 py-3 text-sm font-medium text-mint-600">{PORUKE[poruka]}</p>
      )}
      {greska && <p className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm font-medium text-red-700 ring-1 ring-red-200">{greska}</p>}

      {/* Novo razdoblje */}
      <form action={dodajZatvaranje} className="card mt-6">
        <h2 className="font-semibold text-ink-800">+ Dodaj neradne dane</h2>
        <div className="mt-3 grid gap-4 sm:grid-cols-2 lg:grid-cols-[10rem,10rem,1fr]">
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">Od datuma *</span>
            <DatumPolje name="od" required min={danas} className="input !py-2" />
          </label>
          <label className="block">
            <span className="mb-1 block text-xs font-medium text-ink-500">Do datuma (uključivo)</span>
            <DatumPolje name="do" min={danas} className="input !py-2" />
          </label>
          <label className="block sm:col-span-2 lg:col-span-1">
            <span className="mb-1 block text-xs font-medium text-ink-500">Razlog (vide ga kupci) *</span>
            <input name="razlog" required minLength={2} maxLength={120} placeholder="npr. Godišnji odmor ili Otvaramo 1. studenog" className="input !py-2" />
          </label>
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <label className="flex items-center gap-2 text-sm text-ink-700">
            <input type="checkbox" name="obavijest" defaultChecked className="h-4 w-4 accent-brand-500" />
            Prikaži obavijest na web stranici
          </label>
          <button type="submit" className="btn-primary !py-2">Dodaj</button>
        </div>
        <p className="mt-2 text-xs text-ink-400">Za jedan dan ostavite „Do datuma” prazno.</p>
      </form>

      {/* Aktualna razdoblja */}
      <h2 className="mt-8 font-semibold text-ink-800">Nadolazeći i trenutni ({aktualna.length})</h2>
      <div className="mt-3 space-y-3">
        {aktualna.length === 0 && <p className="text-sm text-ink-400">Nema zakazanih neradnih dana.</p>}
        {aktualna.map((z, i) => {
          const rezervacije = pogodene[i];
          const uTijeku = z.startDate <= danas;
          return (
            <div key={z.id} className={`card ${uTijeku ? "ring-2 ring-sun-400" : ""}`}>
              <div className="flex flex-wrap items-start justify-between gap-3">
                <div>
                  <p className="font-display text-lg font-bold text-brand-900">{z.reason}</p>
                  <p className="text-sm text-ink-600">
                    {rasponDatuma({ od: z.startDate, do: z.endDate })}
                    {uTijeku && <span className="chip ml-2 bg-sun-100 !text-xs font-semibold text-brand-900">u tijeku</span>}
                  </p>
                  <p className="mt-1 text-xs text-ink-400">
                    Obavijest na stranici: {z.showNotice ? "prikazuje se" : "isključena"}
                  </p>
                </div>
                <div className="flex flex-wrap gap-2">
                  <form action={promijeniObavijest}>
                    <input type="hidden" name="id" value={z.id} />
                    <button type="submit" className="btn-secondary !py-2 !text-sm">
                      {z.showNotice ? "Sakrij obavijest" : "Prikaži obavijest"}
                    </button>
                  </form>
                  <form action={obrisiZatvaranje}>
                    <input type="hidden" name="id" value={z.id} />
                    <ConfirmSubmit poruka={`Obrisati „${z.reason}”? Datumi će ponovno biti dostupni za upite.`} className="btn-secondary !py-2 !text-sm !text-red-600">
                      Obriši
                    </ConfirmSubmit>
                  </form>
                </div>
              </div>
              {rezervacije.length > 0 && (
                <div className="mt-4 rounded-2xl bg-red-50 px-4 py-3 text-sm ring-1 ring-red-200">
                  <p className="font-semibold text-red-700">
                    ⚠️ U ovom razdoblju već postoji {rezervacije.length} {rezervacije.length === 1 ? "rezervacija ili upit" : "rezervacija/upita"} — dogovorite drugi termin s roditeljima:
                  </p>
                  <ul className="mt-2 space-y-1">
                    {rezervacije.map((r) => (
                      <li key={r.id} className="flex flex-wrap items-center gap-2">
                        <Link href={`/admin/rezervacije/${r.code}`} className="font-mono text-xs font-semibold text-brand-600 hover:underline">{r.code}</Link>
                        <span className="text-ink-700">{formatDatum(r.date)} u {r.slotStart} · {r.childName ?? r.parentName}</span>
                        <StatusBadge status={r.status} />
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>
          );
        })}
      </div>

      {prosla.length > 0 && (
        <details className="mt-8">
          <summary className="cursor-pointer text-sm text-ink-400">Prošla razdoblja</summary>
          <ul className="mt-2 space-y-1 text-sm text-ink-500">
            {prosla.map((z) => (
              <li key={z.id}>{z.reason} · {rasponDatuma({ od: z.startDate, do: z.endDate })}</li>
            ))}
          </ul>
        </details>
      )}
    </div>
  );
}
