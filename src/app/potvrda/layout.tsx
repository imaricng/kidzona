import type { Metadata } from "next";

// Potvrde sadrže osobne podatke i ne prikazuju se u tražilicama.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PotvrdaLayout({ children }: { children: React.ReactNode }) {
  return children;
}
