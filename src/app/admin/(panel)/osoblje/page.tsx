import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatum } from "@/lib/format";
import { env } from "@/lib/env";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { predlozakOsoblje } from "@/lib/notifications/templates";

export const dynamic = "force-dynamic";
export const metadata = { title: hr.admin.osoblje };

const AKTIVNI = ["upit", "potvrdjeno", "placeno", "checkin"];

// --- Server actions ---------------------------------------------------
async function dodijeliOsoblje(formData: FormData) {
  "use server";
  const reservationId = String(formData.get("reservationId"));
  const staffId = String(formData.get("staffId"));
  if (!reservationId || !staffId) return;
  await prisma.staffAssignment.upsert({
    where: { reservationId_staffId: { reservationId, staffId } },
    update: {},
    create: { reservationId, staffId, roleNote: "proslava" },
  });
  revalidatePath("/admin/osoblje");
}

async function ukloniOsoblje(formData: FormData) {
  "use server";
  const id = String(formData.get("assignmentId"));
  await prisma.staffAssignment.delete({ where: { id } }).catch(() => {});
  revalidatePath("/admin/osoblje");
}

async function obavijestiOsoblje(formData: FormData) {
  "use server";
  const reservationId = String(formData.get("reservationId"));
  const r = await prisma.reservation.findUniqueOrThrow({
    where: { id: reservationId },
    include: { room: true, secondRoom: true, package: true, addOns: { include: { addOn: true } }, staff: { include: { staff: true } } },
  });
  const dodaciOpis = r.addOns.map((a) => `${a.addOn.name} ×${a.quantity}`).join(", ");
  const p = predlozakOsoblje(
    { code: r.code, parentName: r.parentName, childName: r.childName, date: r.date, slotStart: r.slotStart, slotEnd: r.slotEnd, roomName: r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name, packageName: r.package.name, numChildren: r.numChildren, totalCents: r.totalCents, depositCents: r.depositCents },
    dodaciOpis,
  );
  // Pošalji svakom dodijeljenom djelatniku (ili na adresu osoblja ako nema nikoga)
  const primatelji = r.staff.length ? r.staff.map((s) => s.staff.email) : [env.staffEmail];
  for (const primatelj of primatelji) {
    await posaljiIZabiljezi({ tip: "osoblje", kanal: "email", primatelj, naslov: p.naslov, tijelo: p.tijelo, reservationId: r.id });
  }
  await prisma.staffAssignment.updateMany({ where: { reservationId }, data: { notifiedAt: new Date() } });
  revalidatePath("/admin/osoblje");
}

export default async function OsobljePage() {
  const danOd = new Date(); danOd.setHours(0, 0, 0, 0);
  const za14 = new Date(danOd); za14.setDate(za14.getDate() + 14);

  const [osoblje, rezervacije] = await Promise.all([
    prisma.user.findMany({ where: { role: { in: ["osoblje", "admin"] } }, orderBy: { name: "asc" } }),
    prisma.reservation.findMany({
      where: { date: { gte: danOd, lte: za14 }, status: { in: AKTIVNI } },
      include: { room: true, staff: { include: { staff: true } } },
      orderBy: [{ date: "asc" }, { slotStart: "asc" }],
    }),
  ]);

  return (
    <div>
      <h1 className="font-display text-2xl font-extrabold text-ink-900">{hr.admin.osoblje}</h1>
      <p className="mt-1 text-sm text-ink-500">Dodijelite osoblje proslavama i pošaljite im obavijest o rasporedu (idućih 14 dana).</p>

      <div className="mt-4 flex flex-wrap gap-2">
        {osoblje.map((o) => (
          <span key={o.id} className="chip bg-white text-ink-700 ring-1 ring-ink-200">🧑‍🏫 {o.name} <span className="text-ink-400">({o.role})</span></span>
        ))}
      </div>

      <div className="mt-6 space-y-3">
        {rezervacije.map((r) => (
          <div key={r.id} className="card">
            <div className="flex flex-wrap items-start justify-between gap-3">
              <div>
                <p className="font-semibold text-ink-800">{formatDatum(r.date)} · {r.slotStart}–{r.slotEnd} · {r.room.name}</p>
                <p className="text-sm text-ink-500">{r.childName ?? r.parentName} · {r.numChildren} djece · <span className="font-mono text-xs">{r.code}</span></p>
                <div className="mt-2 flex flex-wrap gap-1.5">
                  {r.staff.length === 0 && <span className="text-xs text-ink-400">Nema dodijeljenog osoblja</span>}
                  {r.staff.map((s) => (
                    <span key={s.id} className="chip bg-brand-100 text-brand-700 text-xs">
                      {s.staff.name}{s.notifiedAt ? " ✓" : ""}
                      <form action={ukloniOsoblje} className="inline">
                        <input type="hidden" name="assignmentId" value={s.id} />
                        <button type="submit" className="ml-1 text-brand-700/60 hover:text-red-600" title="Ukloni">×</button>
                      </form>
                    </span>
                  ))}
                </div>
              </div>
              <div className="flex flex-col items-end gap-2">
                <form action={dodijeliOsoblje} className="flex gap-2">
                  <input type="hidden" name="reservationId" value={r.id} />
                  <select name="staffId" className="input !py-2 !text-sm" defaultValue="">
                    <option value="" disabled>Dodaj osoblje…</option>
                    {osoblje.map((o) => <option key={o.id} value={o.id}>{o.name}</option>)}
                  </select>
                  <button type="submit" className="btn-secondary !py-2 !text-sm">Dodijeli</button>
                </form>
                <form action={obavijestiOsoblje}>
                  <input type="hidden" name="reservationId" value={r.id} />
                  <button type="submit" className="btn-secondary !py-2 !text-sm">📨 Obavijesti osoblje</button>
                </form>
              </div>
            </div>
          </div>
        ))}
        {rezervacije.length === 0 && <p className="text-ink-400">Nema proslava u idućih 14 dana.</p>}
      </div>
    </div>
  );
}
