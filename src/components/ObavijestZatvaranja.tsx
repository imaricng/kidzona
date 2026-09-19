import Link from "next/link";
import { prisma } from "@/lib/prisma";
import { getDict, getLocale } from "@/i18n";
import { lokalniISO } from "@/lib/slots";
import { rasponDatuma } from "@/lib/zatvaranja";

/**
 * Traka s obaviješću o neradnim danima (u tijeku ili u sljedećih 60 dana).
 *
 * Razdoblje koje traje sada prikazuje se kao najava, ne kao isprika: upisani
 * razlog („Otvaramo u studenom") uz poziv na rezervaciju, jer upiti za budući
 * termin i tada stižu. Buduće razdoblje (npr. godišnji odmor) i dalje treba
 * točne datume, pa ondje ostaje informativan oblik.
 */
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
  const uTijeku = zatvaranja.some((z) => z.startDate <= danasISO);

  return (
    <div role="status" className="bg-sun-400 text-brand-900">
      <div className="section flex flex-col items-center justify-center gap-x-3 gap-y-0.5 py-2 text-center text-sm font-semibold sm:flex-row sm:flex-wrap">
        {zatvaranja.map((z) =>
          z.startDate <= danasISO ? (
            <p key={z.id}>
              🗓️ <strong>{z.reason}</strong> — {t.zatvoreno.popunjavaju}
            </p>
          ) : (
            <p key={z.id}>
              🗓️ {t.zatvoreno.uskoro}: <strong>{z.reason}</strong> ({rasponDatuma({ od: z.startDate, do: z.endDate })})
            </p>
          ),
        )}
        {uTijeku ? (
          <Link href="/rezervacija" className="underline underline-offset-2 hover:no-underline">
            {t.zatvoreno.rezervirajOdmah}
          </Link>
        ) : (
          <p className="font-normal">{t.zatvoreno.ostaliDatumi}</p>
        )}
      </div>
    </div>
  );
}
