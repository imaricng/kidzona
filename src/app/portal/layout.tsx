import type { Metadata } from "next";

// Portal za roditelje (prijava, podaci o djeci) ne prikazuje se u tražilicama.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function PortalRootLayout({ children }: { children: React.ReactNode }) {
  return children;
}
