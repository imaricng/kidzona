import type { Metadata, Viewport } from "next";
import "./globals.css";
import { hr } from "@/i18n/hr";
import { CookieConsent } from "@/components/CookieConsent";

export const metadata: Metadata = {
  title: {
    default: `${hr.brand.naziv} — rođendaonica i dječja igraonica`,
    template: `%s | ${hr.brand.naziv}`,
  },
  description:
    "Rezervirajte nezaboravan dječji rođendan u Kidzoni Nova Gradiška. Dvije igraonice, tematske proslave, paketi s automatskim izračunom cijene i rezervacija putem interneta.",
  keywords: ["rođendaonica", "dječja igraonica", "Nova Gradiška", "proslava", "rođendan", "Kidzona"],
  openGraph: {
    title: `${hr.brand.naziv}`,
    description: "Rezervirajte dječji rođendan putem interneta — brzo, jednostavno, bezbrižno.",
    locale: "hr_HR",
    type: "website",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  themeColor: "#6A3DE8",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="hr">
      <head>
        {/* Brand fontovi: "Fredoka" (logotip, naslovi), "Nunito" (tekst), "Kalam" (rukopis).
            Učitavaju se u pregledniku; za produkciju preporuka je self-hosting radi GDPR-a. */}
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Fredoka:wght@400;500;600;700&family=Nunito:wght@400;600;700;800&family=Kalam:wght@700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>
        {children}
        <CookieConsent />
      </body>
    </html>
  );
}
