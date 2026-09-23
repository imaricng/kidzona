import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum, dobGodine } from "@/lib/format";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { predlozakRodjendanGodina } from "@/lib/notifications/templates";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";
import { DatumPolje } from "@/components/DatumPolje";
import { lokalniISO } from "@/lib/slots";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.crm };

/** Broj dana do sljedećeg rođendana (na temelju mjeseca i dana). */
function danaDoRodjendana(birthDate: Date): number {
  const sada = new Date(); sada.setHours(0, 0, 0, 0);
  const sljedeci = new Date(sada.getFullYear(), birthDate.getMonth(), birthDate.getDate());
  if (sljedeci < sada) sljedeci.setFullYear(sada.getFullYear() + 1);
  return Math.round((sljedeci.getTime() - sada.getTime()) / 86400000);
}

// --- Server action: pošalji podsjetnik za rođendan (re-marketing) -----
async function posaljiRodjendanskiPodsjetnik(childId: string) {
  "use server";
  const dijete = await prisma.child.findUniqueOrThrow({ where: { id: childId }, include: { family: true } });
  const novaDob = dobGodine(dijete.birthDate) + 1;
  const p = predlozakRodjendanGodina(dijete.family.parentName, dijete.firstName, novaDob);
  await posaljiIZabiljezi({ tip: "rodjendan-godina", kanal: "email", primatelj: dijete.family.email, naslov: p.naslov, tijelo: p.tijelo });
  revalidatePath("/admin/crm");
}

// --- Server actions: brisanje ------------------------------------------
/**
 * Briše obitelj kao i brisanje računa u portalu (GDPR): kaskadno djeca,
 * bodovi vjernosti i članstva. Rezervacije i računi ostaju u evidenciji
 * (zakonska obveza), samo bez poveznice na obitelj.
 */
async function obrisiObitelj(familyId: string) {
  "use server";
  await zahtijevajOsoblje();
  const obitelj = await prisma.family.findUnique({ where: { id: familyId }, include: { user: true } });
  if (!obitelj) return;
  await prisma.family.delete({ where: { id: familyId } });
  // Roditeljev račun u portalu bez obitelji nema svrhu. Račun osoblja se nikad ne briše odavde.
  if (obitelj.user?.role === "roditelj") {
    await prisma.user.delete({ where: { id: obitelj.user.id } }).catch(() => {});
  }
  revalidatePath("/admin/crm");
}

/** Ručni unos djeteta (npr. blizanci ili dvoje djece na istoj proslavi). */
async function dodajDijete(familyId: string, formData: FormData) {
  "use server";
  await zahtijevajOsoblje();
  const firstName = String(formData.get("firstName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "").trim();
  const allergies = String(formData.get("allergies") ?? "").trim();
  // Obrazac već traži oba podatka; ovdje su za slučaj da zahtjev stigne mimo njega.
  if (firstName.length < 2 || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return;
  await prisma.child.create({
    data: { familyId, firstName, birthDate: new Date(birthDate), allergies: allergies || null },
  });
  revalidatePath("/admin/crm");
}

/** Pojedino dijete (npr. pogrešno upisano) — obitelj ostaje. */
async function obrisiDijete(childId: string) {
  "use server";
  await zahtijevajOsoblje();
  await prisma.child.delete({ where: { id: childId } }).catch(() => {});
  revalidatePath("/admin/crm");
}

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;
  const danas = lokalniISO(new Date()); // dijete ne može biti rođeno u budućnosti

  const obitelji = await prisma.family.findMany({
    include: {
      children: { orderBy: { birthDate: "asc" } },
      reservations: { orderBy: { date: "desc" }, take: 1 },
      _count: { select: { reservations: true } },
    },
    orderBy: { createdAt: "desc" },
  });

  const upit = (q ?? "").trim().toLowerCase();
  const filtrirane = upit
    ? obitelji.filter((o) => o.parentName.toLowerCase().includes(upit) || o.email.toLowerCase().includes(upit) || o.children.some((c) => c.firstName.toLowerCase().includes(upit)))
    : obitelji;

  // Nadolazeći rođendani (svi djeca, sortirano po danima do rođendana, prvih 60 dana)
  const svaDjeca = obitelji.flatMap((o) => o.children.map((c) => ({ ...c, family: o })));
  const nadolazeciRodjendani = svaDjeca
    .map((c) => ({ c, dana: danaDoRodjendana(c.birthDate) }))
    .filter((x) => x.dana <= 60)
    .sort((a, b) => a.dana - b.dana);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.crm}</h1>
      <p className="mt-1 text-sm text-ink-500">{hr.admin.crmOpis}</p>

      <div className="mt-4 grid gap-4 sm:grid-cols-3">
        <KpiMini naslov="Obitelji" v={String(obitelji.length)} />
        <KpiMini naslov="Djeca u bazi" v={String(svaDjeca.length)} />
        <KpiMini naslov="Privole za marketing" v={String(obitelji.filter((o) => o.marketingConsent).length)} />
      </div>

      {/* Nadolazeći rođendani */}
      <section className="card mt-6">
        <h2 className="font-semibold text-ink-800">🎂 {hr.admin.rodjendani} (60 dana)</h2>
        {nadolazeciRodjendani.length === 0 ? (
          <p className="mt-3 text-sm text-ink-400">Nema rođendana u sljedećih 60 dana.</p>
        ) : (
          <ul className="mt-3 divide-y divide-black/5">
            {nadolazeciRodjendani.map(({ c, dana }) => (
              <li key={c.id} className="flex flex-wrap items-center justify-between gap-2 py-2.5">
                <div>
                  <span className="font-medium text-ink-800">{c.firstName}</span>
                  <span className="ml-2 text-sm text-ink-500">puni {dobGodine(c.birthDate) + 1} · {formatDatum(c.birthDate)}</span>
                  <span className="ml-2 chip bg-brand-100 text-brand-700 text-xs">za {dana} dana</span>
                  <span className="block text-xs text-ink-400">{c.family.parentName} · {c.family.email}</span>
                </div>
                <form action={posaljiRodjendanskiPodsjetnik.bind(null, c.id)}>
                  <button type="submit" className="btn-secondary !px-3 !py-1.5 !text-sm" disabled={!c.family.marketingConsent} title={c.family.marketingConsent ? "" : "Nema privolu za marketing"}>
                    📨 {hr.admin.posaljiPodsjetnik}
                  </button>
                </form>
              </li>
            ))}
          </ul>
        )}
      </section>

      {/* Pretraživanje i popis obitelji */}
      <section className="card mt-6">
        <form className="mb-4">
          <input name="q" defaultValue={q} placeholder={hr.admin.pretrazi} className="input max-w-md" />
        </form>

        <div className="space-y-4">
          {filtrirane.map((o) => {
            const zadnja = o.reservations[0];
            return (
              <div key={o.id} className="rounded-2xl border border-ink-200 p-4">
                <div className="flex flex-wrap items-start justify-between gap-2">
                  <div>
                    <p className="font-semibold text-ink-900">{o.parentName}</p>
                    <p className="text-sm text-ink-500">{o.email}{o.phone ? ` · ${o.phone}` : ""}</p>
                    <p className="text-xs text-ink-400">{o.city} · {o._count.reservations} rezervacija</p>
                  </div>
                  <div className="flex items-center gap-2">
                    <span className={`chip text-xs ${o.marketingConsent ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-500"}`}>
                      {o.marketingConsent ? hr.admin.marketingDa : hr.admin.marketingNe}
                    </span>
                    <form action={obrisiObitelj.bind(null, o.id)}>
                      <ConfirmSubmit
                        poruka={
                          `Trajno obrisati obitelj „${o.parentName}"` +
                          (o.children.length ? ` i ${o.children.length} ${o.children.length === 1 ? "dijete" : "djece"}` : "") +
                          ` iz baze?\n\nRezervacije (${o._count.reservations}) i računi ostaju u evidenciji, ali bez poveznice na obitelj.` +
                          (o.userId ? "\nBriše se i njihov račun u roditeljskom portalu." : "") +
                          "\n\nOvo se ne može poništiti."
                        }
                        className="rounded-full px-2 py-1 text-xs text-ink-400 transition hover:bg-red-50 hover:text-red-600"
                      >
                        🗑️ Obriši
                      </ConfirmSubmit>
                    </form>
                  </div>
                </div>

                {o.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.children.map((c) => (
                      <span key={c.id} className="chip bg-brand-50 text-ink-700 text-xs">
                        👶 {c.firstName} · {dobGodine(c.birthDate)} g. · {formatDatum(c.birthDate)}
                        {c.allergies ? ` · ⚠️ ${c.allergies}` : ""}
                        <form action={obrisiDijete.bind(null, c.id)} className="inline">
                          <ConfirmSubmit
                            poruka={`Obrisati dijete „${c.firstName}" (${formatDatum(c.birthDate)}) iz obitelji ${o.parentName}?`}
                            className="ml-1 text-ink-400 hover:text-red-600"
                          >
                            <span aria-label={`Obriši dijete ${c.firstName}`}>×</span>
                          </ConfirmSubmit>
                        </form>
                      </span>
                    ))}
                  </div>
                )}

                <details className="mt-3">
                  <summary className="w-fit cursor-pointer text-xs font-semibold text-brand-600 hover:underline">
                    + Dodaj dijete
                  </summary>
                  <form action={dodajDijete.bind(null, o.id)} className="mt-2 flex flex-wrap items-end gap-2">
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Ime *</span>
                      <input name="firstName" required minLength={2} placeholder="npr. Lucija" className="input !py-2 w-36" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Datum rođenja *</span>
                      <DatumPolje name="birthDate" required max={danas} className="input !py-2 w-44" />
                    </label>
                    <label className="block">
                      <span className="mb-1 block text-xs font-medium text-ink-500">Alergije (neobvezno)</span>
                      <input name="allergies" placeholder="npr. kikiriki" className="input !py-2 w-40" />
                    </label>
                    <button type="submit" className="btn-primary !py-2 !text-sm">Dodaj</button>
                  </form>
                  <p className="mt-1 text-xs text-ink-400">
                    Dijete ulazi u bazu rođendana — podsjetnik za sljedeću godinu šalje se samo obiteljima s privolom za marketing.
                  </p>
                </details>

                {zadnja && (
                  <p className="mt-2 text-xs text-ink-400">{hr.admin.zadnjaProslava}: {formatDatum(zadnja.date)} ({zadnja.code})</p>
                )}
              </div>
            );
          })}
          {filtrirane.length === 0 && <p className="text-center text-ink-400">Nema rezultata.</p>}
        </div>
      </section>
    </div>
  );
}

function KpiMini({ naslov, v }: { naslov: string; v: string }) {
  return (
    <div className="card">
      <p className="text-sm text-ink-500">{naslov}</p>
      <p className="mt-1 font-display text-2xl font-extrabold text-ink-900">{v}</p>
    </div>
  );
}
