import Link from "next/link";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionFamily } from "@/lib/portal";
import { otkaziRezervaciju } from "@/lib/reservations";
import { hr } from "@/i18n/hr";
import { formatDatum, formatEur, dobGodine } from "@/lib/format";
import { StatusBadge } from "@/components/admin/StatusBadge";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.portal.naslov };

/** Roditelj otkazuje vlastitu rezervaciju (uz povrat). */
async function otkaziAction(formData: FormData) {
  "use server";
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const code = String(formData.get("code"));
  const r = await prisma.reservation.findUnique({ where: { code } });
  if (r?.familyId === podaci.family.id) {
    await otkaziRezervaciju(code, true);
  }
  revalidatePath("/portal");
}

const OTKAZIVO = ["upit", "potvrdjeno", "placeno"];

export default async function PortalDashboard() {
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const { session, family } = podaci;

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">
        {hr.portal.pozdrav}, {session.name.split(" ")[0]}! 👋
      </h1>

      <div className="mt-6 grid gap-6 lg:grid-cols-3">
        {/* Profil */}
        <section className="card">
          <h2 className="font-semibold text-ink-800">{hr.portal.mojiPodaci}</h2>
          <dl className="mt-3 space-y-1.5 text-sm">
            <div className="flex justify-between"><dt className="text-ink-400">Ime</dt><dd className="font-medium">{family.parentName}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">E-pošta</dt><dd className="font-medium">{family.email}</dd></div>
            <div className="flex justify-between"><dt className="text-ink-400">Telefon</dt><dd className="font-medium">{family.phone ?? "—"}</dd></div>
          </dl>
          <Link href="/portal/racun" className="mt-4 inline-block text-sm text-brand-600 hover:underline">{hr.portal.racunIPrivatnost} →</Link>
        </section>

        {/* Djeca */}
        <section className="card lg:col-span-2">
          <div className="flex items-center justify-between">
            <h2 className="font-semibold text-ink-800">{hr.portal.mojaDjeca}</h2>
            <Link href="/portal/djeca" className="text-sm text-brand-600 hover:underline">Uredi →</Link>
          </div>
          {family.children.length === 0 ? (
            <p className="mt-3 text-sm text-ink-400">Još niste dodali djecu.</p>
          ) : (
            <div className="mt-3 flex flex-wrap gap-2">
              {family.children.map((c) => (
                <span key={c.id} className="chip bg-brand-50 text-ink-700 text-sm">
                  👶 {c.firstName} · {dobGodine(c.birthDate)} g. · 🎂 {formatDatum(c.birthDate)}
                </span>
              ))}
            </div>
          )}
        </section>
      </div>

      {/* Povijest rezervacija */}
      <section className="card mt-6">
        <div className="flex items-center justify-between">
          <h2 className="font-semibold text-ink-800">{hr.portal.povijest}</h2>
          <Link href="/rezervacija" className="btn-primary !px-3 !py-1.5 !text-sm">{hr.portal.novaRezervacija}</Link>
        </div>
        {family.reservations.length === 0 ? (
          <p className="mt-4 text-sm text-ink-400">{hr.portal.nemaPovijesti}</p>
        ) : (
          <ul className="mt-4 space-y-3">
            {family.reservations.map((r) => (
              <li key={r.id} className="flex flex-wrap items-center justify-between gap-3 rounded-2xl border border-ink-200 p-4">
                <div className="min-w-0">
                  <p className="font-medium text-ink-800">
                    {r.theme?.emoji} {formatDatum(r.date)} · {r.slotStart}–{r.slotEnd}
                    <span className="ml-2 font-mono text-xs text-ink-400">{r.code}</span>
                  </p>
                  <p className="text-sm text-ink-500">{r.room.name} · {r.package.name} · {r.numChildren} djece · {formatEur(r.totalCents)}</p>
                </div>
                <div className="flex items-center gap-2">
                  <StatusBadge status={r.status} />
                  <Link
                    href={`/rezervacija?paket=${r.package.slug}&djeca=${r.numChildren}`}
                    className="btn-secondary !px-3 !py-1.5 !text-sm"
                  >
                    🔁 {hr.portal.ponovi}
                  </Link>
                  <Link href={`/potvrda/${r.code}`} className="text-sm text-brand-600 hover:underline">Potvrda</Link>
                  {OTKAZIVO.includes(r.status) && r.date > new Date() && (
                    <form action={otkaziAction}>
                      <input type="hidden" name="code" value={r.code} />
                      <ConfirmSubmit poruka={`Otkazati rezervaciju ${r.code}? Akontacija/uplata se vraća.`} className="text-sm text-ink-400 hover:text-red-600">
                        Otkaži
                      </ConfirmSubmit>
                    </form>
                  )}
                </div>
              </li>
            ))}
          </ul>
        )}
      </section>
    </div>
  );
}
