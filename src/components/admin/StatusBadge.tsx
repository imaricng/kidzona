import { hr } from "@/i18n/hr";

const STIL: Record<string, string> = {
  upit: "bg-ink-100 text-ink-600",
  potvrdjeno: "bg-sky-100 text-sky-700",
  placeno: "bg-mint-100 text-mint-700",
  checkin: "bg-brand-100 text-brand-700",
  zavrseno: "bg-ink-200 text-ink-700",
  otkazano: "bg-red-100 text-red-700",
};

export function StatusBadge({ status }: { status: string }) {
  const label = (hr.status as Record<string, string>)[status] ?? status;
  return <span className={`chip ${STIL[status] ?? "bg-ink-100 text-ink-600"} text-xs`}>{label}</span>;
}
