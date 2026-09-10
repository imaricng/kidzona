import Link from "next/link";
import { hr } from "@/i18n/hr";

/** Ljepljivi CTA gumb vidljiv samo na mobitelu (većina roditelja bukira s telefona). */
export function StickyCta({ label }: { label?: string }) {
  return (
    <div className="fixed inset-x-0 bottom-0 z-40 border-t border-black/5 bg-white/95 p-3 backdrop-blur md:hidden">
      <Link href="/rezervacija" className="btn-primary w-full">
        {label ?? hr.hero.cta}
      </Link>
    </div>
  );
}
