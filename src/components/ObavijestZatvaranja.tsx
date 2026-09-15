import { prisma } from "@/lib/prisma";
import { getDict, getLocale } from "@/i18n";
import { lokalniISO } from "@/lib/slots";
import { rasponDatuma } from "@/lib/zatvaranja";

/** Traka s obaviješću o neradnim danima (u tijeku ili u sljedećih 60 dana). */
export async function ObavijestZatvaranja() {
  const danas = new Date();
  const za60 = new Date(danas);
  za60.setDate(za60.getDate() + 60);
  const danasISO = lokalniISO(danas);
  const zatvaranja = await prisma.closedPeriod
    .findMany({
      where: { showNotice: true, endDate: { gte: danasISO }, startDate: { lte: lokalniISO(za60) } },
      orderBy: { startDate: "asc" },
      take: 2,
    })
    .catch(() => []);
  if (zatvaranja.length === 0) return null;
  const t = getDict(await getLocale());

  return (
    <div role="status" className="bg-sun-400 text-brand-900">
      <div className="section flex flex-col items-center justify-center gap-x-4 gap-y-0.5 py-2 text-center text-sm font-semibold sm:flex-row sm:flex-wrap">
        {zatvaranja.map((z) => (
          <p key={z.id}>
            🗓️ {z.startDate <= danasISO ? t.zatvoreno.sada : t.zatvoreno.uskoro}: <strong>{z.reason}</strong> (
            {rasponDatuma({ od: z.startDate, do: z.endDate })})
          </p>
        ))}
        <p className="font-normal">{t.zatvoreno.ostaliDatumi}</p>
      </div>
    </div>
  );
}
