"use client";
import { hr } from "@/i18n/hr";

export function PrintButton() {
  return (
    <button type="button" className="btn-primary" onClick={() => window.print()}>
      🖨️ {hr.booking.spremiPotvrdu}
    </button>
  );
}
