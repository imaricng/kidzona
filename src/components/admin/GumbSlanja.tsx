"use client";

import { useFormStatus } from "react-dom";
import type { ReactNode } from "react";

/**
 * Gumb radnje koji se dok traje slanje zaključa i pokaže „Šaljem…". Slanje
 * e-pošte traje sekundu-dvije; bez toga se gumb klikne ponovno i roditelj
 * dobije istu poruku više puta.
 */
export function GumbSlanja({ children, className }: { children: ReactNode; className?: string }) {
  const { pending } = useFormStatus();
  return (
    <button type="submit" disabled={pending} aria-busy={pending} className={`${className ?? ""} disabled:cursor-wait disabled:opacity-60`}>
      {pending ? "⏳ Šaljem…" : children}
    </button>
  );
}
