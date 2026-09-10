import { hr } from "@/i18n/hr";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { VoucherPurchase } from "@/components/VoucherPurchase";

export const metadata = { title: hr.pokloni.naslov };

export default function PokloniPage() {
  return (
    <>
      <SiteHeader />
      <main className="section py-12">
        <div className="mx-auto max-w-xl">
          <div className="text-center">
            <span className="text-5xl" aria-hidden>🎁</span>
            <h1 className="mt-3 font-display text-3xl font-extrabold text-ink-900">{hr.pokloni.naslov}</h1>
            <p className="mt-2 text-ink-500">{hr.pokloni.podnaslov}</p>
          </div>
          <div className="mt-8">
            <VoucherPurchase />
          </div>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}
