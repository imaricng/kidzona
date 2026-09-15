/**
 * SEO pomoćnici: javna adresa stranice, adrese igraonica i strukturirani podaci
 * (schema.org JSON-LD) za lokalno pretraživanje, pakete i česta pitanja.
 */
import { env } from "@/lib/env";
import { hr } from "@/i18n/hr";

/** Javna adresa stranice bez kose crte na kraju (npr. https://partykidzona.com). */
export const SITE_URL = env.appUrl.replace(/\/+$/, "");

const POSLOVANJE_ID = `${SITE_URL}/#poslovanje`;

/** Adresa podstranice igraonice iz naziva: "Kids Play" → "kids-play". */
export function slugIgraonice(naziv: string): string {
  return naziv
    .toLowerCase()
    .normalize("NFD")
    .replace(/[̀-ͯ]/g, "")
    .replace(/đ/g, "d")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "");
}

export interface PaketSeo {
  name: string;
  description: string | null;
  basePriceCents: number;
  cijenaPoDogovoru: boolean;
}

export interface SobaSeo {
  name: string;
  description: string | null;
  packages: PaketSeo[];
}

// Isto radno vrijeme kao u hr.kontakt (radniDani, vikend).
const RADNO_VRIJEME = [
  { dani: ["Monday", "Wednesday"], od: "17:00", do: "20:00" },
  { dani: ["Tuesday", "Thursday"], od: "16:00", do: "19:00" },
  { dani: ["Friday", "Sunday"], od: "14:00", do: "20:00" },
  { dani: ["Saturday"], od: "10:00", do: "12:00" },
  { dani: ["Saturday"], od: "14:00", do: "20:00" },
];

function ponuda(soba: string, p: PaketSeo) {
  return {
    "@type": "Offer",
    name: `${soba} — ${p.name}`,
    ...(p.description ? { description: p.description } : {}),
    // Paket s cijenom po dogovoru nema javnu cijenu ni u strukturiranim podacima.
    ...(p.cijenaPoDogovoru ? {} : { price: (p.basePriceCents / 100).toFixed(2), priceCurrency: "EUR" }),
    url: `${SITE_URL}/proslave/${slugIgraonice(soba)}`,
  };
}

/** Lokalno poslovanje s adresom, radnim vremenom, društvenim mrežama i paketima po igraonicama. */
export function poslovanjeJsonLd(sobe: SobaSeo[], opciPaketi: PaketSeo[], zatvaranja: { od: string; do: string }[] = []) {
  return {
    "@context": "https://schema.org",
    "@type": "EntertainmentBusiness",
    "@id": POSLOVANJE_ID,
    name: "Party Kidzona Nova Gradiška",
    alternateName: ["Party Kidzona", hr.brand.naziv],
    description: hr.hero.podnaslov,
    slogan: hr.brand.slogan,
    url: SITE_URL,
    logo: `${SITE_URL}/brand/logo.png`,
    image: `${SITE_URL}/opengraph-image.jpg`,
    telephone: `+${hr.kontakt.whatsapp}`,
    email: hr.kontakt.email,
    address: {
      "@type": "PostalAddress",
      streetAddress: "Strossmayerova 3",
      postalCode: "35400",
      addressLocality: "Nova Gradiška",
      addressRegion: "Brodsko-posavska županija",
      addressCountry: "HR",
    },
    areaServed: { "@type": "City", name: "Nova Gradiška" },
    openingHoursSpecification: RADNO_VRIJEME.map((r) => ({
      "@type": "OpeningHoursSpecification",
      dayOfWeek: r.dani,
      opens: r.od,
      closes: r.do,
    })),
    // Neradni dani (godišnji odmor, prije otvorenja…): zatvoreno cijeli dan.
    ...(zatvaranja.length
      ? {
          specialOpeningHoursSpecification: zatvaranja.map((z) => ({
            "@type": "OpeningHoursSpecification",
            validFrom: z.od,
            validThrough: z.do,
            opens: "00:00",
            closes: "00:00",
          })),
        }
      : {}),
    sameAs: [hr.kontakt.facebook, hr.kontakt.instagram],
    currenciesAccepted: "EUR",
    priceRange: "€€",
    hasOfferCatalog: {
      "@type": "OfferCatalog",
      name: "Paketi za dječje rođendane",
      itemListElement: sobe.map((s) => ({
        "@type": "OfferCatalog",
        name: s.name,
        itemListElement: [...s.packages, ...opciPaketi].map((p) => ponuda(s.name, p)),
      })),
    },
  };
}

/** Česta pitanja (vidljiva na stranici) kao FAQPage. */
export function faqJsonLd(pitanja: readonly { p: string; o: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: pitanja.map((q) => ({
      "@type": "Question",
      name: q.p,
      acceptedAnswer: { "@type": "Answer", text: q.o },
    })),
  };
}

/** Podstranica igraonice: usluga dječjih rođendana s paketima i putanja (breadcrumb). */
export function igraonicaJsonLd(soba: SobaSeo, opciPaketi: PaketSeo[]) {
  const url = `${SITE_URL}/proslave/${slugIgraonice(soba.name)}`;
  return [
    {
      "@context": "https://schema.org",
      "@type": "Service",
      name: `${soba.name} — dječji rođendani`,
      serviceType: "Dječji rođendani",
      ...(soba.description ? { description: soba.description } : {}),
      url,
      provider: { "@id": POSLOVANJE_ID, "@type": "EntertainmentBusiness", name: "Party Kidzona Nova Gradiška" },
      areaServed: { "@type": "City", name: "Nova Gradiška" },
      offers: [...soba.packages, ...opciPaketi].map((p) => ponuda(soba.name, p)),
    },
    {
      "@context": "https://schema.org",
      "@type": "BreadcrumbList",
      itemListElement: [
        { "@type": "ListItem", position: 1, name: "Party Kidzona", item: SITE_URL },
        { "@type": "ListItem", position: 2, name: soba.name, item: url },
      ],
    },
  ];
}
