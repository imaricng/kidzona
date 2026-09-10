/**
 * Katalog igraonica i paketa — jedini izvor istine za seed i za sinkronizaciju
 * postojeće baze (`npm run db:sync-katalog`). Cijene su u EUR-centima.
 *
 * Paket: `maxChildren` = broj djece uključen u cijenu (slavljenik se ne broji),
 * `perChildCents` = nadoplata za svako dijete iznad toga, `durationMin` određuje
 * kraj termina (Standard 2 h, Premium 3 h).
 * Soba: `maxChildren` = gornja granica djece u igraonici (uključujući nadoplatu).
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
    name: "Mini Kidzona",
    description: "Igraonica za mlađu djecu.",
    minChildren: 1,
    maxChildren: 30,
    capacity: 50,
    color: "#FF4DA6",
    sortOrder: 1,
  },
  {
    slug: "game-teen",
    name: "Game Teen",
    description: "Zona videoigara — preporučeno za djecu od 7 do 12 godina i stariju.",
    minChildren: 1,
    maxChildren: 25,
    capacity: 40,
    color: "#6A3DE8",
    sortOrder: 2,
  },
];

export const PAKETI: PaketKatalog[] = [
  // --- Mini Kidzona ---
  {
    slug: "mini-standard",
    roomSlug: "mini-kidzona",
    name: "Standard",
    tier: 1,
    description: "2 sata zabave uz pizzu i tortu.",
    basePriceCents: 20000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 15,
    durationMin: 120,
    popular: false,
    sortOrder: 1,
    includedItems: ["Grickalice, sokovi i pizza", "Torta Ledo Medo", "Osnovna rođendanska dekoracija", "Pozivnice"],
  },
  {
    slug: "mini-premium",
    roomSlug: "mini-kidzona",
    name: "Premium",
    tier: 2,
    description: "3 sata, tematska dekoracija i pinjata.",
    basePriceCents: 27000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 20,
    durationMin: 180,
    popular: false,
    sortOrder: 2,
    includedItems: ["Grickalice, sokovi i pizza", "Torta Ledo Medo", "Tematska dekoracija po izboru", "Pozivnice + pinjata"],
  },
  // --- Game Teen ---
  {
    slug: "game-standard",
    roomSlug: "game-teen",
    name: "Standard",
    tier: 1,
    description: "2 sata videoigara i zabave.",
    basePriceCents: 20000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 12,
    durationMin: 120,
    popular: false,
    sortOrder: 3,
    includedItems: ["Grickalice, sokovi i pizza", "Torta Ledo Medo", "Rođendanska dekoracija i pozivnice", "Slobodna igra na konzolama"],
  },
  {
    slug: "game-premium",
    roomSlug: "game-teen",
    name: "Premium",
    tier: 2,
    description: "3 sata, McDonald's meni i turnir u videoigrama.",
    basePriceCents: 30000,
    perChildCents: 1000,
    minChildren: 1,
    maxChildren: 15,
    durationMin: 180,
    popular: false,
    sortOrder: 4,
    includedItems: [
      "McDonald's meni + grickalice i sokovi",
      "Torta Ledo Medo",
      "Rođendanska dekoracija i pozivnice",
      "Slobodna igra na konzolama",
      "Organizirani turnir (FIFA / Fortnite / Mario Kart) s medaljom za pobjednika",
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
