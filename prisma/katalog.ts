/**
 * Katalog igraonica i paketa — jedini izvor istine za seed i za sinkronizaciju
 * postojeće baze (`npm run db:sync-katalog`). Cijene su u EUR-centima.
 *
 * Paket: `maxChildren` = broj djece uključen u cijenu (slavljenik se ne broji),
 * `perChildCents` = nadoplata za svako dijete iznad toga, `durationMin` određuje
 * kraj termina (Basic i Standard 2 h, Premium 3 h).
 * Soba: `maxChildren` = gornja granica djece u igraonici (uključujući nadoplatu).
 *
 * VAŽNO — slugovi paketa: sinkronizacija radi upsert **po slugu**, pa slug mora
 * odgovarati onome što je već u bazi. Paketi su kroz administraciju s vremenom
 * preimenovani, zbog čega slugovi više ne opisuju sadržaj (npr. `game-standard`
 * je danas Kids Play / Premium). Slugovi se ne diraju jer ih pamte i podijeljene
 * poveznice (`/rezervacija?paket=<slug>`); mjerodavni su `name` i `roomSlug`.
 */

export interface SobaKatalog {
  slug: string;
  name: string;
  description: string;
  minChildren: number;
  maxChildren: number;
  capacity: number;
  color: string;
  sortOrder: number;
}

export interface PaketKatalog {
  slug: string;
  roomSlug: string;
  name: string;
  tier: number;
  description: string;
  basePriceCents: number;
  perChildCents: number;
  minChildren: number;
  maxChildren: number;
  durationMin: number;
  popular: boolean;
  sortOrder: number;
  includedItems: string[];
}

export const SOBE: SobaKatalog[] = [
  {
    slug: "mini-kidzona",
    name: "Kids Play",
    description: "Igraonica za mlađu djecu.",
    minChildren: 1,
    maxChildren: 30,
    capacity: 50,
    color: "#ff4da6",
    sortOrder: 1,
  },
  {
    slug: "game-teen",
    name: "Kids Challenge",
    description: "Igraonica za djecu od 7 do 13 godina — videoigre, izazovi i turniri.",
    minChildren: 1,
    maxChildren: 25,
    capacity: 40,
    color: "#6a3de8",
    sortOrder: 2,
  },
];

export const PAKETI: PaketKatalog[] = [
  // --- Kids Play ---
  {
    slug: "mini-standard", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "mini-kidzona",
    name: "Basic",
    tier: 1,
    description: "2 sata zabave u igraonici",
    basePriceCents: 15000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 10,
    durationMin: 120,
    popular: false,
    sortOrder: 1,
    includedItems: [
      "Softplay igraonica i animator",
      "Grickalice, sokovi",
      "Osnovna rođendanska dekoracija",
      "Pozivnice",
    ],
  },
  {
    slug: "mini-premium", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "mini-kidzona",
    name: "Standard",
    tier: 2,
    description: "2 sata zabave u igraonici",
    basePriceCents: 20000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 15,
    durationMin: 120,
    popular: true, // bedž „Najpopularnije” na karticama paketa
    sortOrder: 2,
    includedItems: [
      "Softplay igraonica i animator",
      "Grickalice, sokovi i pizza",
      "Torta Ledo Medo",
      "Rođendanska dekoracija",
      "Pozivnice",
    ],
  },
  {
    slug: "game-standard", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "mini-kidzona",
    name: "Premium",
    tier: 3,
    description: "3 sata igre, Tematska dekoracija",
    basePriceCents: 30000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 20,
    durationMin: 180,
    popular: false,
    sortOrder: 3,
    includedItems: [
      "Softplay igraonica i animator",
      "Grickalice, sokovi i pizza",
      "Torta Ledo Medo",
      "Tematska Rođendanska dekoracija i pozivnice",
    ],
  },
  // --- Kids Challenge ---
  {
    slug: "game-premium", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "game-teen",
    name: "Basic",
    tier: 1,
    description: "2 sata, slobodna igra",
    basePriceCents: 16000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 10,
    durationMin: 120,
    popular: false,
    sortOrder: 4,
    includedItems: [
      "Grickalice i sokovi",
      "Gaming konzole neograničeno",
      "Mini Nogomet / Girls SPA / Neon party / PS5",
      "Foto kutak s dekoracijom",
    ],
  },
  {
    slug: "platinum-mu1jpawq", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "game-teen",
    name: "Standard",
    tier: 2,
    description: "2 sata videoigara, sporta i zabave",
    basePriceCents: 22000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 15,
    durationMin: 120,
    popular: true, // bedž „Najpopularnije” na karticama paketa
    sortOrder: 5,
    includedItems: [
      "Grickalice, sokovi i pizza",
      "Torta Ledo Medo",
      "Mini Nogomet / Girls SPA / Neon party / PS5",
      "Foto kutak s dekoracijom",
      "Neograničeni broj žetona za sve aparate",
    ],
  },
  {
    slug: "premium-mu6n9wnj", // povijesni slug u bazi; ne mijenjati (v. napomenu na vrhu)
    roomSlug: "game-teen",
    name: "Premium",
    tier: 3,
    description: "3 sata videoigara, sporta i zabave",
    basePriceCents: 30000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 18,
    durationMin: 180,
    popular: false,
    sortOrder: 6,
    includedItems: [
      "Grickalice, sokovi i pizza",
      "Torta Ledo Medo",
      "Mini Nogomet / Girls SPA / Neon party / PS5",
      "Foto kutak s tematskom dekoracijom",
      "Neograničeni broj žetona za sve aparate",
      "Veliki Challenge kroz sve igre",
      "Medalje za top 3",
      "Girls SPA puna radionica (lak, maske, glitter)",
      "Premium doživljaj",
    ],
  },
];

export interface TemaKatalog {
  slug: string;
  name: string;
  emoji: string;
  gradient: string; // Tailwind klase (brand palete su u safelistu)
  description: string;
  sortOrder: number;
}

// Tematske proslave — na početnoj po četiri u redu.
export const TEME: TemaKatalog[] = [
  { slug: "dinosauri", name: "Dinosauri", emoji: "🦕", gradient: "from-mint-400 to-mint-600", description: "Avantura u doba dinosaura.", sortOrder: 1 },
  { slug: "svemir", name: "Svemir", emoji: "🚀", gradient: "from-sky2-500 to-ink-800", description: "Putovanje među zvijezdama.", sortOrder: 2 },
  { slug: "jednorozi", name: "Jednorozi", emoji: "🦄", gradient: "from-berry-400 to-brand-300", description: "Čarobni svijet jednoroga.", sortOrder: 3 },
  { slug: "podmorje", name: "Podmorje", emoji: "🐠", gradient: "from-sky2-400 to-mint-500", description: "Tajne podvodnog svijeta.", sortOrder: 4 },
  { slug: "frozen", name: "Frozen", emoji: "❄️", gradient: "from-sky2-300 to-brand-400", description: "Snježno kraljevstvo Anne i Else.", sortOrder: 5 },
  { slug: "minecraft", name: "Minecraft", emoji: "⛏️", gradient: "from-mint-400 to-sky2-700", description: "Svijet kockica, gradnje i istraživanja.", sortOrder: 6 },
  { slug: "game-turniri", name: "Game Turniri", emoji: "🎮", gradient: "from-brand-600 to-berry-500", description: "Turniri u videoigrama s medaljama za pobjednike.", sortOrder: 7 },
  { slug: "spiderman", name: "Spiderman", emoji: "🕷️", gradient: "from-berry-600 to-sky2-700", description: "Pustolovina za male superjunake.", sortOrder: 8 },
];

// Dodaci koji se ne uklapaju u fiksni raspored termina (npr. produljenje proslave).
export const NEAKTIVNI_DODACI = ["dodatno-vrijeme"];
