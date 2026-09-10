import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { ConfirmSubmit } from "@/components/ConfirmSubmit";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.paketi };

// --- Pomoćnici --------------------------------------------------------
function slugify(s: string): string {
  return s
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/[čć]/g, "c").replace(/đ/g, "d").replace(/š/g, "s").replace(/ž/g, "z")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "") || `stavka-${Date.now()}`;
}
/** Pretvara euro string (npr. "45,00" ili "45.5") u cente. */
function uCente(v: FormDataEntryValue | null): number {
  const n = Number(String(v ?? "0").replace(",", "."));
  return Number.isFinite(n) ? Math.round(n * 100) : 0;
}
function broj(v: FormDataEntryValue | null, fallback = 0): number {
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}
/** Igraonica iz forme; prazno = paket vrijedi za sve igraonice. */
function sobaIzForme(formData: FormData): string | null {
  return String(formData.get("roomId") ?? "") || null;
}

// --- Server actions: paketi ------------------------------------------
async function azurirajPaket(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.package.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "Paket"),
      description: String(formData.get("description") || ""),
      roomId: sobaIzForme(formData),
      basePriceCents: uCente(formData.get("basePrice")),
      perChildCents: uCente(formData.get("perChild")),
      durationMin: broj(formData.get("durationMin"), 120),
      minChildren: broj(formData.get("minChildren"), 1),
      maxChildren: broj(formData.get("maxChildren"), 15),
      popular: formData.get("popular") === "on",
      active: formData.get("active") === "on",
      includedItems: String(formData.get("includedItems") || "").split("\n").map((l) => l.trim()).filter(Boolean),
    },
  });
  revalidatePath("/admin/paketi");
}

async function kreirajPaket(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "Novi paket");
  const zadnji = await prisma.package.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.package.create({
    data: {
      name, slug: `${slugify(name)}-${Date.now().toString(36)}`,
      description: String(formData.get("description") || ""),
      roomId: sobaIzForme(formData),
      basePriceCents: uCente(formData.get("basePrice")),
      perChildCents: uCente(formData.get("perChild")),
      durationMin: broj(formData.get("durationMin"), 120),
      minChildren: broj(formData.get("minChildren"), 1),
      maxChildren: broj(formData.get("maxChildren"), 15),
      sortOrder: (zadnji?.sortOrder ?? 0) + 1,
      includedItems: String(formData.get("includedItems") || "").split("\n").map((l) => l.trim()).filter(Boolean),
    },
  });
  revalidatePath("/admin/paketi");
}

async function obrisiPaket(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  // Ako je paket vezan uz rezervacije, FK ne dopušta brisanje → samo deaktiviraj.
  try {
    await prisma.package.delete({ where: { id } });
  } catch {
    await prisma.package.update({ where: { id }, data: { active: false } });
  }
  revalidatePath("/admin/paketi");
}

// --- Server actions: dodaci ------------------------------------------
async function azurirajDodatak(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  await prisma.addOn.update({
    where: { id },
    data: {
      name: String(formData.get("name") || "Dodatak"),
      category: String(formData.get("category") || ""),
      priceCents: uCente(formData.get("price")),
      unit: String(formData.get("unit") || "flat"),
      active: formData.get("active") === "on",
    },
  });
  revalidatePath("/admin/paketi");
}

async function kreirajDodatak(formData: FormData) {
  "use server";
  const name = String(formData.get("name") || "Novi dodatak");
  const zadnji = await prisma.addOn.findFirst({ orderBy: { sortOrder: "desc" } });
  await prisma.addOn.create({
    data: {
      name, slug: slugify(name),
      category: String(formData.get("category") || "ostalo"),
      priceCents: uCente(formData.get("price")),
      unit: String(formData.get("unit") || "flat"),
      sortOrder: (zadnji?.sortOrder ?? 0) + 1,
    },
  });
  revalidatePath("/admin/paketi");
}

async function obrisiDodatak(formData: FormData) {
  "use server";
  const id = String(formData.get("id"));
  try {
    await prisma.addOn.delete({ where: { id } });
  } catch {
    await prisma.addOn.update({ where: { id }, data: { active: false } });
  }
  revalidatePath("/admin/paketi");
}

// --- Stranica ---------------------------------------------------------
export default async function AdminPaketiPage() {
  const [paketi, dodaci, teme, sobe] = await Promise.all([
    prisma.package.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
    prisma.addOn.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.theme.findMany({ orderBy: { sortOrder: "asc" } }),
    prisma.room.findMany({ orderBy: [{ active: "desc" }, { sortOrder: "asc" }] }),
  ]);
  const nazivSobe = (id: string | null) => sobe.find((s) => s.id === id)?.name ?? "Sve igraonice";

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.paketi}</h1>
      <p className="mt-1 text-sm text-ink-500">
        Uređujte pakete i dodatke izravno. Cijene unosite u eurima (npr. 45 ili 45,50). Nadoplata se naplaćuje za
        svako dijete iznad uključenog broja (slavljenik se ne broji); trajanje određuje kraj termina.
      </p>

      {/* PAKETI */}
      <h2 className="mt-6 font-semibold text-ink-800">Paketi</h2>
      <div className="mt-3 space-y-4">
        {paketi.map((p) => (
          <form key={p.id} action={azurirajPaket} className={`card ${p.active ? "" : "opacity-60"}`}>
            <input type="hidden" name="id" value={p.id} />
            <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
              <Polje label="Igraonica"><OdabirSobe sobe={sobe} defaultValue={p.roomId ?? ""} /></Polje>
              <Polje label="Naziv"><input name="name" defaultValue={p.name} className="input !py-2" /></Polje>
              <Polje label="Cijena (€, fiksno)"><input name="basePrice" defaultValue={(p.basePriceCents / 100).toFixed(2)} className="input !py-2" /></Polje>
              <Polje label="Nadoplata po djetetu (€)"><input name="perChild" defaultValue={(p.perChildCents / 100).toFixed(2)} className="input !py-2" /></Polje>
              <Polje label="Trajanje (min)"><input name="durationMin" type="number" defaultValue={p.durationMin} className="input !py-2" /></Polje>
              <Polje label="Najmanje djece"><input name="minChildren" type="number" defaultValue={p.minChildren} className="input !py-2" /></Polje>
              <Polje label="Uključeno djece"><input name="maxChildren" type="number" defaultValue={p.maxChildren} className="input !py-2" /></Polje>
              <Polje label="Opis"><input name="description" defaultValue={p.description ?? ""} className="input !py-2" /></Polje>
              <div className="flex items-end gap-4">
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="popular" defaultChecked={p.popular} className="h-4 w-4 accent-brand-500" /> Popularno</label>
                <label className="flex items-center gap-2 text-sm"><input type="checkbox" name="active" defaultChecked={p.active} className="h-4 w-4 accent-brand-500" /> Aktivno</label>
              </div>
            </div>
            <Polje label="Uključeno (jedna stavka po retku)">
              <textarea name="includedItems" rows={3} className="input !py-2" defaultValue={((p.includedItems as string[]) ?? []).join("\n")} />
            </Polje>
            <div className="mt-3 flex items-center justify-between gap-3">
              <span className="text-sm text-ink-400">
                {nazivSobe(p.roomId)} · {formatEur(p.basePriceCents)} · do {p.maxChildren} djece
                {p.perChildCents > 0 ? ` · +${formatEur(p.perChildCents)} po dodatnom djetetu` : ""}
              </span>
              <button type="submit" className="btn-primary !py-2 !text-sm">{hr.zajednicko.spremi}</button>
            </div>
          </form>
        ))}
      </div>

      {/* Brisanje paketa (odvojeno da se ne ugnježđuju forme) */}
      <details className="mt-3">
        <summary className="cursor-pointer text-sm text-ink-400">Brisanje paketa</summary>
        <div className="mt-2 flex flex-wrap gap-2">
          {paketi.map((p) => (
            <form key={p.id} action={obrisiPaket}>
              <input type="hidden" name="id" value={p.id} />
              <ConfirmSubmit poruka={`Obrisati paket „${p.name}" (${nazivSobe(p.roomId)})? Ako je vezan uz rezervacije, bit će samo deaktiviran.`} className="chip bg-red-50 text-red-600 ring-1 ring-red-200">
                🗑️ {p.name} · {nazivSobe(p.roomId)}
              </ConfirmSubmit>
            </form>
          ))}
        </div>
      </details>

      {/* Novi paket */}
      <form action={kreirajPaket} className="card mt-4 border-dashed">
        <h3 className="font-semibold text-ink-800">+ Novi paket</h3>
        <div className="mt-3 grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
          <Polje label="Igraonica"><OdabirSobe sobe={sobe.filter((s) => s.active)} defaultValue="" /></Polje>
          <Polje label="Naziv"><input name="name" className="input !py-2" placeholder="npr. Platinum" /></Polje>
          <Polje label="Cijena (€, fiksno)"><input name="basePrice" className="input !py-2" defaultValue="0" /></Polje>
          <Polje label="Nadoplata po djetetu (€)"><input name="perChild" className="input !py-2" defaultValue="10" /></Polje>
          <Polje label="Trajanje (min)"><input name="durationMin" type="number" className="input !py-2" defaultValue="120" /></Polje>
          <Polje label="Najmanje djece"><input name="minChildren" type="number" className="input !py-2" defaultValue="1" /></Polje>
          <Polje label="Uključeno djece"><input name="maxChildren" type="number" className="input !py-2" defaultValue="15" /></Polje>
          <Polje label="Opis"><input name="description" className="input !py-2" /></Polje>
        </div>
        <Polje label="Uključeno (jedna stavka po retku)"><textarea name="includedItems" rows={2} className="input !py-2" /></Polje>
        <button type="submit" className="btn-secondary mt-3 !py-2">Dodaj paket</button>
      </form>

      {/* DODACI */}
      <h2 className="mt-10 font-semibold text-ink-800">Dodaci</h2>
      <div className="mt-3 space-y-2">
        {dodaci.map((d) => (
          <form key={d.id} action={azurirajDodatak} className={`card flex flex-wrap items-end gap-3 ${d.active ? "" : "opacity-60"}`}>
            <input type="hidden" name="id" value={d.id} />
            <Polje label="Naziv"><input name="name" defaultValue={d.name} className="input !py-2" /></Polje>
            <Polje label="Cijena (€)"><input name="price" defaultValue={(d.priceCents / 100).toFixed(2)} className="input !py-2 w-28" /></Polje>
            <Polje label="Jedinica">
              <select name="unit" defaultValue={d.unit} className="input !py-2">
                <option value="flat">fiksno</option>
                <option value="per_child">po djetetu</option>
              </select>
            </Polje>
            <Polje label="Kategorija"><input name="category" defaultValue={d.category ?? ""} className="input !py-2 w-32" /></Polje>
            <label className="flex items-center gap-2 pb-2 text-sm"><input type="checkbox" name="active" defaultChecked={d.active} className="h-4 w-4 accent-brand-500" /> Aktivno</label>
            <button type="submit" className="btn-primary !py-2 !text-sm">{hr.zajednicko.spremi}</button>
            <ConfirmSubmit poruka={`Obrisati dodatak „${d.name}"?`} className="text-sm text-ink-400 hover:text-red-600 pb-2" >
              🗑️
            </ConfirmSubmit>
          </form>
        ))}
      </div>

      <form action={kreirajDodatak} className="card mt-4 flex flex-wrap items-end gap-3 border-dashed">
        <h3 className="w-full font-semibold text-ink-800">+ Novi dodatak</h3>
        <Polje label="Naziv"><input name="name" className="input !py-2" placeholder="npr. Šećerna vata" /></Polje>
        <Polje label="Cijena (€)"><input name="price" className="input !py-2 w-28" defaultValue="0" /></Polje>
        <Polje label="Jedinica">
          <select name="unit" className="input !py-2"><option value="flat">fiksno</option><option value="per_child">po djetetu</option></select>
        </Polje>
        <Polje label="Kategorija"><input name="category" className="input !py-2 w-32" placeholder="hrana" /></Polje>
        <button type="submit" className="btn-secondary !py-2">Dodaj dodatak</button>
      </form>

      {/* TEME (pregled) */}
      <h2 className="mt-10 font-semibold text-ink-800">Teme</h2>
      <div className="mt-3 flex flex-wrap gap-2">
        {teme.map((t) => (
          <span key={t.id} className={`chip bg-gradient-to-br ${t.gradient} text-white`}>{t.emoji} {t.name}</span>
        ))}
      </div>
    </div>
  );
}

function OdabirSobe({ sobe, defaultValue }: { sobe: { id: string; name: string; active: boolean }[]; defaultValue: string }) {
  return (
    <select name="roomId" defaultValue={defaultValue} className="input !py-2">
      <option value="">Sve igraonice</option>
      {sobe.map((s) => (
        <option key={s.id} value={s.id}>{s.name}{s.active ? "" : " (neaktivna)"}</option>
      ))}
    </select>
  );
}

function Polje({ label, children }: { label: string; children: React.ReactNode }) {
  return (
    <label className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">{label}</span>
      {children}
    </label>
  );
}
