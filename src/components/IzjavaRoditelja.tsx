import { hr } from "@/i18n/hr";

/**
 * Izjava s poveznicom na pravila. Poveznica se otvara u novoj kartici, da
 * roditelj ne izgubi ono što je već upisao u obrazac ili razgovor.
 */
export function IzjavaRoditelja() {
  return (
    <>
      {hr.booking.waiverPrije}
      <a href="/pravila" target="_blank" rel="noopener" className="font-semibold text-brand-600 underline underline-offset-2">
        {hr.booking.waiverPoveznica}
      </a>
      {hr.booking.waiverPoslije}
    </>
  );
}
