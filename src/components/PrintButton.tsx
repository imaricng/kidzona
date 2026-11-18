"use client";
import { hr } from "@/i18n/hr";

export function PrintButton({ natpis = hr.booking.spremiPotvrdu }: { natpis?: string }) {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      🖨️ {natpis}
    </button>
  );
}
