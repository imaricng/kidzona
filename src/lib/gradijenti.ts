/**
 * Ponuda gradijenata za teme. Sve klase moraju odgovarati `safelist` uzorku u
 * `tailwind.config.ts` (palete brand, berry, sun, sky2, mint, ink), inače ih
 * Tailwind ne ugradi u CSS i pozadina ostane prazna.
 */
export const GRADIJENTI: { naziv: string; klase: string }[] = [
  { naziv: "Ljubičasto-roza", klase: "from-brand-400 to-berry-400" },
  { naziv: "Ljubičasta tamna", klase: "from-brand-600 to-berry-500" },
  { naziv: "Roza-ljubičasta", klase: "from-berry-400 to-brand-300" },
  { naziv: "Roza-plava", klase: "from-berry-600 to-sky2-700" },
  { naziv: "Zelena", klase: "from-mint-400 to-mint-600" },
  { naziv: "Zeleno-plava", klase: "from-mint-400 to-sky2-700" },
  { naziv: "Cijan-zelena", klase: "from-sky2-400 to-mint-500" },
  { naziv: "Ledeno plava", klase: "from-sky2-300 to-brand-400" },
  { naziv: "Plavo-tamna", klase: "from-sky2-500 to-ink-800" },
  { naziv: "Žuto-roza", klase: "from-sun-400 to-berry-400" },
  { naziv: "Žuto-ljubičasta", klase: "from-sun-300 to-brand-500" },
  { naziv: "Tamna noć", klase: "from-ink-700 to-brand-800" },
];
