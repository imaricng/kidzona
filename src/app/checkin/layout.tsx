import type { Metadata } from "next";

// Prijava dolaska (QR kod) ne prikazuje se u tražilicama.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function CheckInLayout({ children }: { children: React.ReactNode }) {
  return children;
}
