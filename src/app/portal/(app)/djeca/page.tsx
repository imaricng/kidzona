import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionFamily } from "@/lib/portal";
import { hr } from "@/i18n/hr";
import { formatDatum, dobGodine } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.portal.mojaDjeca };

async function dodajDijete(formData: FormData) {
  "use server";
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const firstName = String(formData.get("firstName") ?? "").trim();
  const birthDate = String(formData.get("birthDate") ?? "");
  const allergies = String(formData.get("allergies") ?? "").trim();
  if (!firstName || !/^\d{4}-\d{2}-\d{2}$/.test(birthDate)) return;
  await prisma.child.create({
    data: { familyId: podaci.family.id, firstName, birthDate: new Date(birthDate), allergies: allergies || null },
  });
  revalidatePath("/portal/djeca");
}

async function ukloniDijete(formData: FormData) {
  "use server";
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const id = String(formData.get("id"));
  // Sigurnosna provjera: dijete mora pripadati ovoj obitelji
  const dijete = await prisma.child.findUnique({ where: { id } });
  if (dijete?.familyId === podaci.family.id) {
    await prisma.child.delete({ where: { id } });
  }
  revalidatePath("/portal/djeca");
}

export default async function PortalDjeca() {
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const { family } = podaci;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.portal.mojaDjeca}</h1>
      <p className="mt-1 text-sm text-ink-500">Podaci o djeci (rođendani, alergije) koriste se za proslave i podsjetnike. Možete ih izbrisati u svakom trenutku (GDPR).</p>

      <div className="mt-6 space-y-3">
        {family.children.map((c) => (
          <div key={c.id} className="card flex items-center justify-between">
            <div>
              <p className="font-medium text-ink-800">👶 {c.firstName} <span className="text-sm text-ink-400">· {dobGodine(c.birthDate)} g.</span></p>
              <p className="text-sm text-ink-500">🎂 {formatDatum(c.birthDate)}{c.allergies ? ` · ⚠️ ${c.allergies}` : ""}</p>
            </div>
            <form action={ukloniDijete}>
              <input type="hidden" name="id" value={c.id} />
              <button type="submit" className="text-sm text-ink-400 hover:text-red-600">{hr.portal.ukloni}</button>
            </form>
          </div>
        ))}
        {family.children.length === 0 && <p className="text-ink-400">Nema dodane djece.</p>}
      </div>

      <form action={dodajDijete} className="card mt-6">
        <h2 className="font-semibold text-ink-800">{hr.portal.dodajDijete}</h2>
        <div className="mt-3 grid gap-3 sm:grid-cols-3">
          <input name="firstName" className="input" placeholder="Ime djeteta" required />
          <input name="birthDate" type="date" className="input" required />
          <input name="allergies" className="input" placeholder="Alergije (nije obvezno)" />
        </div>
        <button type="submit" className="btn-primary mt-4">+ {hr.portal.dodajDijete}</button>
      </form>
    </div>
  );
}
