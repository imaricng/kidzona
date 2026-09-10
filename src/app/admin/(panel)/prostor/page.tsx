import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";
export const metadata = { title: "Igraonice i teme" };

function slugify(s: string): string {
  return s.toLowerCase().normalize("NFD").replace(/[̀-ͯ]/g, "")
    .replace(/[čć]/g, "c").replace(/đ/g, "d").replace(/š/g, "s").replace(/ž/g, "z")
    .replace(/[^a-z0-9]+/g, "-").replace(/^-+|-+$/g, "") || `stavka-${Date.now()}`;
}
function broj(v: FormDataEntryValue | null, f = 0): number { const n = Number(v); return Number.isFinite(n) ? n : f; }

// --- Sobe -------------------------------------------------------------
async function azurirajSobu(formData: FormData) {
  "use server";
  await prisma.room.update({
    where: { id: String(formData.get("id")) },
    data: {
      name: String(formData.get("name") || "Igraonica"),
      color: String(formData.get("color") || "#6A3DE8"),
      capacity: broj(formData.get("capacity"), 20),
      minChildren: broj(formData.get("minChildren"), 5),
      maxChildren: broj(formData.get("maxChildren"), 15),
      sortOrder: broj(formData.get("sortOrder"), 0),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/admin/prostor");
}
async function kreirajSobu(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "Nova igraonica");
  const zadnja = await prisma.room.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.room.create({
    data: {
      name, slug: slugify(name), color: String(formData.get("color") || "#6A3DE8"),
      capacity: broj(formData.get("capacity"), 20), minChildren: broj(formData.get("minChildren"), 5),
      maxChildren: broj(formData.get("maxChildren"), 15), sortOrder: (zadnja?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/prostor");
}
async function obrisiSobu(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  try { await prisma.room.delete({ where: { id } }); }
  catch { await prisma.room.update({ where: { id }, data: { active: false } }); }
  revalidatePath("/admin/prostor");
}

// --- Teme -------------------------------------------------------------
async function azurirajTemu(formData: FormData) {
  "use server";
  await prisma.theme.update({
    where: { id: String(formData.get("id")) },
    data: {
      name: String(formData.get("name") || "Tema"),
      emoji: String(formData.get("emoji") || "🎉"),
      gradient: String(formData.get("gradient") || "from-brand-400 to-berry-400"),
      description: String(formData.get("description") || ""),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/admin/prostor");
}
async function kreirajTemu(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "Nova tema");
  const zadnja = await prisma.theme.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.theme.create({
    data: {
      name, slug: slugify(name), emoji: String(formData.get("emoji") || "🎉"),
      gradient: String(formData.get("gradient") || "from-brand-400 to-berry-400"),
      description: String(formData.get("description") || ""), sortOrder: (zadnja?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/prostor");
}
async function obrisiTemu(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  try { await prisma.theme.delete({ where: { id } }); }
  catch { await prisma.theme.update({ where: { id }, data: { active: false } }); }
  revalidatePath("/admin/prostor");
}

export default async function ProstorPage() {
  const [sobe, teme] = await Promise.all([
    prisma.room.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">Igraonice i teme</h1>

      {/* SOBE */}
      <h2 className="mt-6 font-semibold text-ink-800">Igraonice</h2>
      <div className="mt-3 space-y-2">
        {sobe.map((s) => (
          <form key={s.id} action={azurirajSobu} className={`card flex flex-wrap items-end gap-3 ${s.active ? "" : "opacity-60"}`}>
            <input type="hidden" name="id" value={s.id} />
            <Polje label="Naziv"><input name="name" defaultValue={s.name} className="input !py-2" /></Polje>
            <Polje label="Boja"><input name="color" type="color" defaultValue={s.color} className="h-10 w-14 rounded-lg border border-ink-200" /></Polje>
            <Polje label="Kapacitet"><input name="capacity" type="number" defaultValue={s.capacity} className="input !py-2 w-24" /></Polje>
            <Polje label="Najmanje djece"><input name="minChildren" type="number" defaultValue={s.minChildren} className="input !py-2 w-24" /></Polje>
            <Polje label="Najviše djece"><input name="maxChildren" type="number" defaultValue={s.maxChildren} className="input !py-2 w-24" /></Polje>
            <Polje label="Redoslijed"><input name="sortOrder" type="number" defaultValue={s.sortOrder} className="input !py-2 w-20" /></Polje>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={s.active} className="h-4 w-4 accent-brand-500" /> Aktivno</label>
            <button type="submit" className="btn-primary !py-2 !text-sm">{hr.zajednicko.spremi}</button>
            <ConfirmSubmit poruka={`Obrisati igraonicu „${s.name}"? Ako je vezana uz rezervacije, bit će deaktivirana.`} className="text-sm text-ink-400 hover:text-red-600 pb-2">🗑️</ConfirmSubmit>
          </form>
        ))}
      </div>
      <form action={kreirajSobu} className="card mt-3 flex flex-wrap items-end gap-3 border-dashed">
        <h3 className="w-full font-semibold text-ink-800">+ Nova igraonica</h3>
        <Polje label="Naziv"><input name="name" className="input !py-2" placeholder="npr. Igraonica Sunce" /></Polje>
        <Polje label="Boja"><input name="color" type="color" defaultValue="#6A3DE8" className="h-10 w-14 rounded-lg border border-ink-200" /></Polje>
        <Polje label="Kapacitet"><input name="capacity" type="number" defaultValue="20" className="input !py-2 w-24" /></Polje>
        <Polje label="Najmanje djece"><input name="minChildren" type="number" defaultValue="5" className="input !py-2 w-24" /></Polje>
        <Polje label="Najviše djece"><input name="maxChildren" type="number" defaultValue="15" className="input !py-2 w-24" /></Polje>
        <button type="submit" className="btn-secondary !py-2">Dodaj</button>
      </form>

      {/* TEME */}
      <h2 className="mt-10 font-semibold text-ink-800">Teme</h2>
      <div className="mt-3 space-y-2">
        {teme.map((t) => (
          <form key={t.id} action={azurirajTemu} className={`card flex flex-wrap items-end gap-3 ${t.active ? "" : "opacity-60"}`}>
            <input type="hidden" name="id" value={t.id} />
            <Polje label="Emotikon"><input name="emoji" defaultValue={t.emoji} className="input !py-2 w-16 text-center" /></Polje>
            <Polje label="Naziv"><input name="name" defaultValue={t.name} className="input !py-2" /></Polje>
            <Polje label="Opis"><input name="description" defaultValue={t.description ?? ""} className="input !py-2" /></Polje>
            <Polje label="Gradijent (Tailwind klase)"><input name="gradient" defaultValue={t.gradient} className="input !py-2 w-48" /></Polje>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={t.active} className="h-4 w-4 accent-brand-500" /> Aktivno</label>
            <span className={`chip bg-gradient-to-br ${t.gradient} text-white`}>{t.emoji} {t.name}</span>
            <button type="submit" className="btn-primary !py-2 !text-sm">{hr.zajednicko.spremi}</button>
            <ConfirmSubmit poruka={`Obrisati temu „${t.name}"?`} className="text-sm text-ink-400 hover:text-red-600 pb-2">🗑️</ConfirmSubmit>
          </form>
        ))}
      </div>
      <form action={kreirajTemu} className="card mt-3 flex flex-wrap items-end gap-3 border-dashed">
        <h3 className="w-full font-semibold text-ink-800">+ Nova tema</h3>
        <Polje label="Emotikon"><input name="emoji" defaultValue="🎉" className="input !py-2 w-16 text-center" /></Polje>
        <Polje label="Naziv"><input name="name" className="input !py-2" placeholder="npr. Pirati" /></Polje>
        <Polje label="Opis"><input name="description" className="input !py-2" /></Polje>
        <Polje label="Gradijent (Tailwind klase)"><input name="gradient" defaultValue="from-brand-400 to-berry-400" className="input !py-2 w-48" /></Polje>
        <button type="submit" className="btn-secondary !py-2">Dodaj</button>
      </form>
    </div>
  );
}

function Polje({ label, children }: { label: string; children: React.ReactNode }) {
  return <label className="block"><span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>{children}</label>;
}
