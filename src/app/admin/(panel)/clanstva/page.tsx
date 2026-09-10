import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";
import { formatDatum, formatDatumVrijeme, formatEur } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Članstva i vjernost" };

// --- Server actions ---------------------------------------------------
async function kreirajClanstvo(formData: FormData) {
  "use server";
  const familyId = String(formData.get("familyId"));
  const plan = String(formData.get("plan") || "mjesecno");
  if (!familyId) return;
  const renewsAt = new Date();
  renewsAt.setMonth(renewsAt.getMonth() + (plan === "godisnje" ? 12 : 1));
  await prisma.membership.create({ data: { familyId, plan, status: "aktivno", renewsAt, autoRenew: true } });
  revalidatePath("/admin/clanstva");
}

async function izdajOpenPlay(formData: FormData) {
  "use server";
  const childName = String(formData.get("childName") || "").trim() || null;
  const durationMin = Number(formData.get("durationMin") || 60);
  const expiresAt = new Date(Date.now() + durationMin * 60000);
  // Cijena: 6 € po satu (proporcionalno)
  const priceCents = Math.round((durationMin / 60) * 600);
  await prisma.openPlaySession.create({ data: { childName, durationMin, expiresAt, priceCents, status: "aktivna" } });
  revalidatePath("/admin/clanstva");
}

async function zatvoriOpenPlay(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.openPlaySession.update({ where: { id }, data: { status: "zatvorena" } }).catch(() => {});
  revalidatePath("/admin/clanstva");
}

export default async function ClanstvaPage() {
  // Automatski označi istekle open-play sesije
  await prisma.openPlaySession.updateMany({
    where: { status: "aktivna", expiresAt: { lt: new Date() } },
    data: { status: "istekla" },
  });

  const [clanstva, lojalnost, openPlay, obitelji] = await Promise.all([
    env.featureMemberships ? prisma.membership.findMany({ include: { family: true }, orderBy: { startedAt: "desc" } }) : Promise.resolve([]),
    env.featureLoyalty ? prisma.loyaltyAccount.findMany({ include: { family: true }, orderBy: { points: "desc" }, take: 20 }) : Promise.resolve([]),
    env.featureOpenPlay ? prisma.openPlaySession.findMany({ orderBy: { startedAt: "desc" }, take: 20 }) : Promise.resolve([]),
    prisma.family.findMany({ orderBy: { parentName: "asc" } }),
  ]);

  const sve = !env.featureMemberships && !env.featureLoyalty && !env.featureOpenPlay;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="font-display text-2xl font-extrabold text-ink-900">Članstva, vjernost i slobodna igra</h1>
        <p className="mt-1 text-sm text-ink-500">Opcijski modul — uključuje se postavkama FEATURE_MEMBERSHIPS, FEATURE_LOYALTY i FEATURE_OPEN_PLAY.</p>
      </div>

      {sve && <p className="card text-ink-400">Svi su moduli isključeni u postavkama.</p>}

      {/* SLOBODNA IGRA */}
      {env.featureOpenPlay && (
        <section className="card">
          <h2 className="font-semibold text-ink-800">🎟️ Slobodna igra — vremenske ulaznice</h2>
          <form action={izdajOpenPlay} className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="label">Ime djeteta</label>
              <input name="childName" className="input !py-2" placeholder="(nije obvezno)" />
            </div>
            <div>
              <label className="label">Trajanje</label>
              <select name="durationMin" className="input !py-2" defaultValue="60">
                <option value="30">30 min</option>
                <option value="60">60 min</option>
                <option value="90">90 min</option>
                <option value="120">120 min</option>
              </select>
            </div>
            <button type="submit" className="btn-primary !py-2">Izdaj ulaznicu</button>
          </form>

          <div className="mt-4 grid gap-2 sm:grid-cols-2">
            {openPlay.map((s) => {
              const istekla = s.status !== "aktivna";
              return (
                <div key={s.id} className={`rounded-2xl border p-3 ${istekla ? "border-ink-200 bg-ink-50" : "border-mint-300 bg-mint-50"}`}>
                  <div className="flex items-center justify-between">
                    <span className="font-medium text-ink-800">{s.childName ?? "Ulaznica"}</span>
                    <span className="chip bg-white text-xs text-ink-600">{s.status}</span>
                  </div>
                  <p className="text-xs text-ink-500">{s.durationMin} min · {formatEur(s.priceCents)}</p>
                  <p className="text-xs text-ink-400">Istječe: {formatDatumVrijeme(s.expiresAt)}</p>
                  {!istekla && (
                    <form action={zatvoriOpenPlay} className="mt-2">
                      <input type="hidden" name="id" value={s.id} />
                      <button type="submit" className="text-xs text-ink-500 hover:text-red-600">Zatvori ranije</button>
                    </form>
                  )}
                </div>
              );
            })}
            {openPlay.length === 0 && <p className="text-sm text-ink-400">Nema izdanih ulaznica.</p>}
          </div>
        </section>
      )}

      {/* LOJALNOST */}
      {env.featureLoyalty && (
        <section className="card">
          <h2 className="font-semibold text-ink-800">⭐ Bodovi vjernosti</h2>
          <p className="text-xs text-ink-400">Obitelji dobivaju {env.loyaltyPointsPerParty} bodova po završenoj proslavi.</p>
          <ul className="mt-3 divide-y divide-black/5">
            {lojalnost.map((l) => (
              <li key={l.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">{l.family.parentName} <span className="text-ink-400">· {l.family.email}</span></span>
                <span className="chip bg-brand-100 text-brand-700">{l.points} bodova</span>
              </li>
            ))}
            {lojalnost.length === 0 && <li className="py-2 text-sm text-ink-400">Još nema bodova.</li>}
          </ul>
        </section>
      )}

      {/* ČLANSTVA */}
      {env.featureMemberships && (
        <section className="card">
          <h2 className="font-semibold text-ink-800">🪪 Članstva (s automatskom obnovom)</h2>
          <form action={kreirajClanstvo} className="mt-3 flex flex-wrap items-end gap-2">
            <div>
              <label className="label">Obitelj</label>
              <select name="familyId" className="input !py-2" defaultValue="">
                <option value="" disabled>Odaberi obitelj…</option>
                {obitelji.map((o) => <option key={o.id} value={o.id}>{o.parentName} ({o.email})</option>)}
              </select>
            </div>
            <div>
              <label className="label">Plan</label>
              <select name="plan" className="input !py-2" defaultValue="mjesecno">
                <option value="mjesecno">Mjesečno</option>
                <option value="godisnje">Godišnje</option>
              </select>
            </div>
            <button type="submit" className="btn-secondary !py-2">Kreiraj članstvo</button>
          </form>

          <ul className="mt-4 divide-y divide-black/5">
            {clanstva.map((c) => (
              <li key={c.id} className="flex items-center justify-between py-2 text-sm">
                <span className="text-ink-700">{c.family.parentName} · {c.plan}</span>
                <span className="text-xs text-ink-400">obnova: {c.renewsAt ? formatDatum(c.renewsAt) : "—"} {c.autoRenew ? "(auto)" : ""}</span>
              </li>
            ))}
            {clanstva.length === 0 && <li className="py-2 text-sm text-ink-400">Nema članstava.</li>}
          </ul>
        </section>
      )}
    </div>
  );
}
