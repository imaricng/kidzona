import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum, dobGodine } from "@/lib/format";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { predlozakRodjendanGodina } from "@/lib/notifications/templates";

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

export default async function CrmPage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const { q } = await searchParams;

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
                  <span className={`chip text-xs ${o.marketingConsent ? "bg-mint-100 text-mint-700" : "bg-ink-100 text-ink-500"}`}>
                    {o.marketingConsent ? hr.admin.marketingDa : hr.admin.marketingNe}
                  </span>
                </div>

                {o.children.length > 0 && (
                  <div className="mt-3 flex flex-wrap gap-2">
                    {o.children.map((c) => (
                      <span key={c.id} className="chip bg-brand-50 text-ink-700 text-xs">
                        👶 {c.firstName} · {dobGodine(c.birthDate)} g. · {formatDatum(c.birthDate)}
                        {c.allergies ? ` · ⚠️ ${c.allergies}` : ""}
                      </span>
                    ))}
                  </div>
                )}

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
