import { notFound } from "next/navigation";
import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";
import { hr } from "@/i18n/hr";
import { formatDatumDugi, formatDatumVrijeme } from "@/lib/format";

export const dynamic = "force-dynamic";
export const metadata = { title: "Prijava dolaska" };

/** Server action: evidentira dolazak skeniranjem QR koda. */
async function obaviCheckIn(token: string) {
  "use server";
  const session = await getSession();
  const r = await prisma.reservation.findUnique({ where: { qrToken: token }, include: { checkIn: true } });
  if (!r || r.checkIn) return;
  await prisma.checkIn.create({ data: { reservationId: r.id, by: session?.name ?? "osoblje" } });
  await prisma.reservation.update({ where: { id: r.id }, data: { status: "checkin" } });
  revalidatePath(`/checkin/${token}`);
}

export default async function CheckInPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await prisma.reservation.findUnique({
    where: { qrToken: token },
    include: { room: true, secondRoom: true, package: true, checkIn: true },
  });
  if (!r) notFound();

  const prijavljen = !!r.checkIn;
  const checkInAction = obaviCheckIn.bind(null, token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-paper p-4">
      <div className="card w-full max-w-md text-center">
        <div className="text-5xl" aria-hidden>{prijavljen ? "✅" : "🎟️"}</div>
        <h1 className="mt-3 font-display text-2xl font-extrabold text-ink-900">
          {prijavljen ? "Dolazak je evidentiran" : "Prijava dolaska"}
        </h1>
        <p className="mt-1 text-sm text-ink-500">Kod: {r.code}</p>

        <dl className="mt-5 space-y-2 text-left text-sm">
          <div className="flex justify-between"><dt className="text-ink-400">Slavljenik</dt><dd className="font-medium">{r.childName ?? "—"}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-400">Datum</dt><dd className="font-medium">{formatDatumDugi(r.date)}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-400">Termin</dt><dd className="font-medium">{r.slotStart} – {r.slotEnd}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-400">Igraonica</dt><dd className="font-medium">{r.secondRoom ? `${r.room.name} + ${r.secondRoom.name}` : r.room.name}</dd></div>
          <div className="flex justify-between"><dt className="text-ink-400">Broj djece</dt><dd className="font-medium">{r.numChildren}</dd></div>
        </dl>

        {prijavljen ? (
          <p className="mt-5 rounded-2xl bg-mint-100 px-4 py-3 text-sm text-mint-700">
            Prijavljeno: {formatDatumVrijeme(r.checkIn!.checkedInAt)} ({r.checkIn!.by})
          </p>
        ) : (
          <form action={checkInAction} className="mt-5">
            <button type="submit" className="btn-primary w-full">Evidentiraj dolazak</button>
            <p className="mt-2 text-xs text-ink-400">Skenira osoblje na ulazu.</p>
          </form>
        )}
      </div>
    </div>
  );
}
