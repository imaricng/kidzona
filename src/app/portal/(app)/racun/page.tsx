import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSessionFamily } from "@/lib/portal";
import { odjava } from "@/lib/auth";
import { hr } from "@/i18n/hr";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.portal.racunIPrivatnost };

async function azurirajProfil(formData: FormData) {
  "use server";
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const parentName = String(formData.get("parentName") ?? "").trim();
  const phone = String(formData.get("phone") ?? "").trim();
  const marketingConsent = formData.get("marketing") === "on";
  await prisma.family.update({
    where: { id: podaci.family.id },
    data: { parentName: parentName || podaci.family.parentName, phone: phone || null, marketingConsent },
  });
  await prisma.user.update({ where: { id: podaci.session.userId }, data: { name: parentName || podaci.family.parentName, phone: phone || null } });
  revalidatePath("/portal/racun");
}

async function izbrisiRacun() {
  "use server";
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  // GDPR: brišemo obitelj (kaskadno djeca, lojalnost, članstva) i korisnika.
  // Rezervacije ostaju u evidenciji, ali se odvezuju od osobnog profila (familyId → null).
  await prisma.family.delete({ where: { id: podaci.family.id } });
  await prisma.user.delete({ where: { id: podaci.session.userId } }).catch(() => {});
  await odjava();
  redirect("/");
}

export default async function PortalRacun() {
  const podaci = await getSessionFamily();
  if (!podaci) redirect("/portal/prijava");
  const { family } = podaci;

  return (
    <div className="mx-auto max-w-2xl">
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.portal.racunIPrivatnost}</h1>

      <form action={azurirajProfil} className="card mt-6 space-y-4">
        <h2 className="font-semibold text-ink-800">{hr.portal.mojiPodaci}</h2>
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="label">Ime i prezime</label>
            <input name="parentName" className="input" defaultValue={family.parentName} />
          </div>
          <div>
            <label className="label">Telefon</label>
            <input name="phone" className="input" defaultValue={family.phone ?? ""} />
          </div>
        </div>
        <div>
          <label className="label">E-pošta</label>
          <input className="input bg-ink-50" value={family.email} disabled />
          <p className="mt-1 text-xs text-ink-400">E-pošta se ne može mijenjati u probnoj verziji.</p>
        </div>
        <label className="flex items-start gap-3 text-sm">
          <input type="checkbox" name="marketing" className="mt-1 h-4 w-4 accent-brand-500" defaultChecked={family.marketingConsent} />
          <span>{hr.portal.marketingToggle}</span>
        </label>
        <button type="submit" className="btn-primary">{hr.portal.spremiPromjene}</button>
      </form>

      <div className="card mt-6 border-red-200">
        <h2 className="font-semibold text-red-700">Brisanje računa (GDPR)</h2>
        <p className="mt-2 text-sm text-ink-500">
          Imate pravo na brisanje osobnih podataka. Ovo trajno briše vaš račun, profil obitelji i
          podatke o djeci. Rezervacije ostaju u zakonskoj evidenciji, ali bez poveznice na vaš profil.
        </p>
        <form action={izbrisiRacun} className="mt-4">
          <ConfirmSubmit poruka={hr.portal.izbrisiPotvrda} className="btn-secondary !text-red-600">
            🗑️ {hr.portal.izbrisiRacun}
          </ConfirmSubmit>
        </form>
      </div>
    </div>
  );
}
