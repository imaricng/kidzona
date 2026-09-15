import type { Metadata } from "next";

// Administracija se ne prikazuje u tražilicama.
export const metadata: Metadata = { robots: { index: false, follow: false } };

export default function AdminLayout({ children }: { children: React.ReactNode }) {
  return children;
}
