import { hr } from "@/i18n/hr";

/**
 * Zelena ili crvena oznaka dostupnosti termina za pristigli upit.
 * Koristi se na nadzornoj ploči, popisu rezervacija i detalju upita.
 */
export function DostupnostBadge({ slobodan }: { slobodan: boolean }) {
  return (
    <span
      className={`chip inline-flex items-center gap-1.5 text-xs font-semibold ${
        slobodan
          ? "bg-emerald-50 text-emerald-700 ring-1 ring-emerald-200"
          : "bg-red-50 text-red-700 ring-1 ring-red-200"
      }`}
    >
      <span
        className={`h-2 w-2 rounded-full ${slobodan ? "bg-emerald-500" : "bg-red-500"}`}
        aria-hidden
      />
      {slobodan ? hr.admin.terminSlobodan : hr.admin.terminZauzet}
    </span>
  );
}
