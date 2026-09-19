import type { Metadata, Viewport } from "next";
import { Fredoka, Kalam, Nunito } from "next/font/google";
import "./globals.css";
import { env } from "@/lib/env";
import { CookieConsent } from "@/components/CookieConsent";
import { GoogleAnalytics } from "@/components/GoogleAnalytics";

// Brand fontovi (self-hosted preko next/font, bez vanjskog zahtjeva i blokiranja prikaza):
// "Nunito" za tekst, "Fredoka" za logotip i naslove, "Kalam" za rukopisne potpise.
const nunito = Nunito({ subsets: ["latin", "latin-ext"], weight: ["400", "600", "700", "800"], variable: "--font-nunito", display: "swap" });
const fredoka = Fredoka({ subsets: ["latin", "latin-ext"], weight: ["400", "500", "600", "700"], variable: "--font-fredoka", display: "swap" });
const kalam = Kalam({ subsets: ["latin", "latin-ext"], weight: "700", variable: "--font-kalam", display: "swap" });

const OPIS =
  "Dječji rođendani u Novoj Gradiški — igraonice Kids Play i Kids Challenge, tematske proslave, hrana i torta uključeni. Rezervirajte online ili putem WhatsAppa.";

export const metadata: Metadata = {
  // Puna adresa stranice — potrebna da slika za dijeljenje (opengraph-image.jpg) ima apsolutni URL.
  metadataBase: new URL(env.appUrl),
  title: {
    default: "Party Kidzona — dječji rođendani i igraonica u Novoj Gradiški",
    template: "%s | Party Kidzona Nova Gradiška",
  },
  description: OPIS,
  keywords: [
    "dječji rođendan Nova Gradiška",
    "rođendaonica Nova Gradiška",
    "igraonica Nova Gradiška",
    "tematske proslave",
    "Kids Play",
    "Kids Challenge",
    "Party Kidzona",
  ],
  applicationName: "Party Kidzona",
  openGraph: {
    title: "Party Kidzona — dječji rođendani u Novoj Gradiški",
    description: OPIS,
    siteName: "Party Kidzona Nova Gradiška",
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
    <html lang="hr" className={`${nunito.variable} ${fredoka.variable} ${kalam.variable}`}>
      <body>
        {children}
        <CookieConsent />
        <GoogleAnalytics id={env.gaId} />
      </body>
    </html>
  );
}
