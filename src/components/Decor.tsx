/**
 * Dekorativni elementi brand vizuala Party Kidzone: zvjezdica-maskota, konfeti,
 * baloni, valovi, vijuga i ikonice u krugovima. Sve je čisti SVG (bez slika),
 * skalabilno i skriveno od čitača ekrana.
 */
import type { ReactNode } from "react";

export const BOJE = {
  ljubicasta: "#6A3DE8",
  roza: "#FF4DA6",
  zuta: "#FFD93B",
  cijan: "#4DD6FF",
  tamna: "#2B1A66",
} as const;

/* ------------------------------------------------------------------ maskota */

// Bucmasta zvijezda (vanjski radijus 48, unutarnji 30) — zaobljena debelim potezom.
const ZVIJEZDA = "60,20 77.6,43.7 105.7,53.2 88.5,77.3 88.2,106.8 60,98 31.8,106.8 31.5,77.3 14.3,53.2 42.4,43.7";

/** Nasmijana žuta zvjezdica s ljubičastom krunom (maskota iz logotipa). */
export function StarMascot({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 -8 120 128" className={className} aria-hidden>
      <polygon points={ZVIJEZDA} transform="translate(0 4)" fill="#F2B300" stroke="#F2B300" strokeWidth={14} strokeLinejoin="round" />
      <polygon points={ZVIJEZDA} fill={BOJE.zuta} stroke={BOJE.zuta} strokeWidth={14} strokeLinejoin="round" />
      <path d="M30 54 Q36 45 47 44" stroke="#FFF3B0" strokeWidth={5} strokeLinecap="round" fill="none" />
      {/* oči: lijevo otvoreno, desno namiguje */}
      <ellipse cx="48" cy="66" rx="5" ry="6.5" fill={BOJE.tamna} />
      <circle cx="49.8" cy="63.4" r="1.9" fill="#fff" />
      <path d="M66 67 Q72 60 78 67" stroke={BOJE.tamna} strokeWidth={3.2} strokeLinecap="round" fill="none" />
      <ellipse cx="38" cy="77" rx="5.5" ry="3.2" fill={BOJE.roza} opacity={0.6} />
      <ellipse cx="82" cy="77" rx="5.5" ry="3.2" fill={BOJE.roza} opacity={0.6} />
      <path d="M49 76 Q60 93 71 76 Z" fill="#7A1F4A" stroke="#7A1F4A" strokeWidth={2} strokeLinejoin="round" />
      <ellipse cx="60" cy="82" rx="4.5" ry="2.4" fill={BOJE.roza} />
      {/* kruna */}
      <g transform="rotate(-14 58 16)">
        <path d="M42 24 L39 7 L50 15 L59 3 L68 15 L79 7 L76 24 Z" fill={BOJE.ljubicasta} stroke={BOJE.ljubicasta} strokeWidth={3} strokeLinejoin="round" />
        <rect x="41" y="20" width="36" height="5" rx="2.5" fill="#8F6CF1" />
        <circle cx="39" cy="7" r="3.2" fill="#8F6CF1" />
        <circle cx="59" cy="3" r="3.2" fill="#8F6CF1" />
        <circle cx="79" cy="7" r="3.2" fill="#8F6CF1" />
      </g>
    </svg>
  );
}

/* ------------------------------------------------------------------ konfeti */

type Oblik = "kap" | "zvijezda" | "srce" | "tocka" | "vijuga";
// [x %, y %, oblik, boja, veličina u rem, rotacija u stupnjevima]
type Komad = [number, number, Oblik, string, number, number];

const OBLICI: Record<Oblik, (boja: string) => ReactNode> = {
  kap: (b) => <path d="M12 2C15.5 7 18 10.5 18 14a6 6 0 0 1-12 0c0-3.5 2.5-7 6-12Z" fill={b} />,
  zvijezda: (b) => <path d="M12 2l2.9 6.3 6.9.8-5.1 4.7 1.4 6.8L12 17.2l-6.1 3.4 1.4-6.8L2.2 9.1l6.9-.8L12 2Z" fill={b} />,
  srce: (b) => <path d="M12 21C5 15.5 2 12 2 8.2A4.8 4.8 0 0 1 12 5.5a4.8 4.8 0 0 1 10 2.7C22 12 19 15.5 12 21Z" fill={b} />,
  tocka: (b) => <circle cx="12" cy="12" r="10" fill={b} />,
  vijuga: (b) => <path d="M2 14c3-6 6 6 10 0s7 6 10 0" stroke={b} strokeWidth={3} strokeLinecap="round" fill="none" />,
};

const { zuta: Z, cijan: C, roza: R } = BOJE;

const RASPOREDI: Record<"hero" | "mala", Komad[]> = {
  hero: [
    [3, 12, "kap", Z, 1.6, -30], [2, 88, "zvijezda", C, 1.2, 10], [18, 4, "vijuga", R, 2.2, 0],
    [30, 90, "tocka", Z, 0.6, 0], [44, 7, "srce", R, 1, -15], [48, 62, "tocka", C, 0.5, 0],
    [53, 91, "kap", Z, 1.2, 150], [58, 22, "zvijezda", Z, 0.9, -20], [66, 5, "kap", C, 1.3, 40],
    [81, 11, "tocka", R, 0.7, 0], [93, 30, "kap", Z, 1.8, 30], [95, 64, "zvijezda", C, 1.1, 20],
    [87, 90, "srce", Z, 1.1, 12], [72, 94, "vijuga", C, 2, -10], [5, 44, "tocka", R, 0.8, 0],
  ],
  mala: [
    [8, 8, "zvijezda", "#fff", 0.8, 0], [84, 7, "kap", "#fff", 0.9, 30], [92, 44, "tocka", "#fff", 0.5, 0],
    [5, 52, "tocka", "#fff", 0.4, 0], [78, 68, "srce", "#fff", 0.7, -10], [16, 30, "kap", "#fff", 0.6, -40],
  ],
};

/** Raspršeni konfeti; roditelj mora imati `relative`. */
export function Confetti({ gustoca = "hero", className = "" }: { gustoca?: "hero" | "mala"; className?: string }) {
  return (
    <div aria-hidden className={`pointer-events-none absolute inset-0 overflow-hidden ${gustoca === "mala" ? "opacity-40" : ""} ${className}`}>
      {RASPOREDI[gustoca].map(([x, y, oblik, boja, vel, rot], i) => (
        <svg
          key={i}
          viewBox="0 0 24 24"
          className="absolute"
          style={{ left: `${x}%`, top: `${y}%`, width: `${vel}rem`, height: `${vel}rem`, transform: `rotate(${rot}deg)` }}
        >
          {OBLICI[oblik](boja)}
        </svg>
      ))}
    </div>
  );
}

/* -------------------------------------------------------- balon, val, vijuga */

export function Balloon({ className = "", color = BOJE.roza }: { className?: string; color?: string }) {
  return (
    <svg viewBox="0 0 40 70" className={className} aria-hidden>
      <path d="M20 44 C 22 52, 16 58, 21 69" stroke="#fff" strokeOpacity={0.75} strokeWidth={1.5} fill="none" />
      <ellipse cx="20" cy="20" rx="17" ry="20" fill={color} />
      <path d="M16.5 39 L23.5 39 L20 45 Z" fill={color} />
      <ellipse cx="13" cy="12" rx="4" ry="6.5" fill="#fff" opacity={0.35} transform="rotate(-20 13 12)" />
    </svg>
  );
}

const VALOVI = [
  "M0 40 C 220 0 420 70 720 38 C 1000 8 1220 60 1440 24 L1440 120 L0 120 Z",
  "M0 62 C 260 24 520 96 800 60 C 1060 28 1260 80 1440 50 L1440 120 L0 120 Z",
  "M0 80 C 300 50 560 112 860 80 C 1120 54 1300 96 1440 72 L1440 120 L0 120 Z",
  "M0 96 C 320 70 600 124 900 96 C 1150 74 1320 110 1440 92 L1440 120 L0 120 Z",
];

/**
 * Valoviti prijelaz između sekcija. `fills` ide od stražnjeg sloja prema
 * prednjem (najviše 4) — npr. šareni val iznad podnožja.
 */
export function Wave({ className = "", fills = ["currentColor"] }: { className?: string; fills?: string[] }) {
  return (
    <svg viewBox="0 0 1440 120" preserveAspectRatio="none" className={className} aria-hidden>
      {fills.slice(0, VALOVI.length).map((fill, i) => (
        <path key={i} d={VALOVI[i]} fill={fill} />
      ))}
    </svg>
  );
}

export function Squiggle({ className = "" }: { className?: string }) {
  return (
    <svg viewBox="0 0 100 14" fill="none" className={className} aria-hidden>
      <path d="M2 7 Q10 1 18 7 T34 7 T50 7 T66 7 T82 7 T98 7" stroke="currentColor" strokeWidth={3.5} strokeLinecap="round" />
    </svg>
  );
}

/* ------------------------------------------------------------------ ikonice */

const IKONE = {
  torta: (
    <>
      <path d="M4 21h16" />
      <path d="M5 21v-7a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v7" />
      <path d="M5 16c1.5 1 2.5 1 3.5 0s2.5-1 3.5 0 2.5 1 3.5 0 2-1 3.5 0" />
      <path d="M8 12V9M12 12V9M16 12V9" />
      <path d="M8 6.5c.6-.7.6-1.6 0-2.5M12 6.5c.6-.7.6-1.6 0-2.5M16 6.5c.6-.7.6-1.6 0-2.5" />
    </>
  ),
  balon: (
    <>
      <path d="M12 16c-3.5 0-6-3.2-6-7a6 6 0 0 1 12 0c0 3.8-2.5 7-6 7Z" />
      <path d="M11 16l1 2 1-2" />
      <path d="M12 18c0 2-2 2-1 4" />
    </>
  ),
  medo: (
    <>
      <circle cx="7" cy="5.5" r="2.2" />
      <circle cx="17" cy="5.5" r="2.2" />
      <circle cx="12" cy="10" r="5" />
      <path d="M10.8 11.8h2.4" />
      <circle cx="10" cy="9" r=".6" fill="currentColor" stroke="none" />
      <circle cx="14" cy="9" r=".6" fill="currentColor" stroke="none" />
      <path d="M7.5 14.5C5.5 16 5 18 6 20.5h12c1-2.5.5-4.5-1.5-6" />
    </>
  ),
  paleta: (
    <>
      <path d="M12 3a9 9 0 1 0 0 18c1.2 0 2-.8 2-1.8 0-.5-.2-.9-.5-1.2-.3-.3-.5-.7-.5-1.2 0-1 .8-1.8 1.8-1.8H17a4 4 0 0 0 4-4c0-4.4-4-8-9-8Z" />
      <circle cx="7.5" cy="11" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="10" cy="7" r="1.2" fill="currentColor" stroke="none" />
      <circle cx="15" cy="7.5" r="1.2" fill="currentColor" stroke="none" />
    </>
  ),
  kruna: (
    <>
      <path d="M3 8l4.5 4L12 5l4.5 7L21 8l-2 11H5L3 8Z" />
      <path d="M5.5 16h13" />
    </>
  ),
  disco: (
    <>
      <path d="M12 2v4" />
      <circle cx="12" cy="13" r="7" />
      <path d="M5 13h14M12 6v14M7 8.5c3 1.5 7 1.5 10 0M7 17.5c3-1.5 7-1.5 10 0" />
    </>
  ),
  gamepad: (
    <>
      <path d="M7 7h10a5 5 0 0 1 4.9 6l-.6 3a2.8 2.8 0 0 1-5 1.2L15 16H9l-1.3 1.2a2.8 2.8 0 0 1-5-1.2l-.6-3A5 5 0 0 1 7 7Z" />
      <path d="M7 10v4M5 12h4" />
      <circle cx="15.5" cy="11" r=".9" fill="currentColor" stroke="none" />
      <circle cx="17.5" cy="13" r=".9" fill="currentColor" stroke="none" />
    </>
  ),
  stit: (
    <>
      <path d="M12 3l7 3v5c0 5-3.5 8.5-7 10-3.5-1.5-7-5-7-10V6l7-3Z" />
      <path d="M9 12l2 2 4-4" />
    </>
  ),
  iskrice: (
    <>
      <path d="M12 3l1.8 5.2L19 10l-5.2 1.8L12 17l-1.8-5.2L5 10l5.2-1.8L12 3Z" />
      <path d="M19 16l.7 2 2 .7-2 .7-.7 2-.7-2-2-.7 2-.7.7-2Z" />
    </>
  ),
  osmijeh: (
    <>
      <circle cx="12" cy="12" r="9" />
      <path d="M8 14c1 1.8 2.4 2.7 4 2.7s3-.9 4-2.7" />
      <path d="M9 9.5h.01M15 9.5h.01" strokeWidth={3} />
    </>
  ),
  srce: <path d="M12 20s-7-4.4-7-10a4 4 0 0 1 7-2.6A4 4 0 0 1 19 10c0 5.6-7 10-7 10Z" />,
  kvacica: <path d="M5 12.5l4.5 4.5L19 7.5" />,
  lokacija: (
    <>
      <path d="M12 21s-7-6.2-7-12a7 7 0 0 1 14 0c0 5.8-7 12-7 12Z" />
      <circle cx="12" cy="9" r="2.5" />
    </>
  ),
} satisfies Record<string, ReactNode>;

export type IkonaIme = keyof typeof IKONE;

export function Ikona({ ime, className = "h-6 w-6" }: { ime: IkonaIme; className?: string }) {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth={2} strokeLinecap="round" strokeLinejoin="round" className={className} aria-hidden>
      {IKONE[ime]}
    </svg>
  );
}

const KRUGOVI = {
  brand: "bg-brand-500 text-white",
  berry: "bg-berry-500 text-white",
  sun: "bg-sun-400 text-brand-800",
  sky: "bg-sky2-400 text-white",
} as const;

export type BojaKruga = keyof typeof KRUGOVI;

/** Bijela ikonica u obojenom krugu s bijelim rubom (stil "highlights" ikona). */
export function IconCircle({
  ikona,
  boja,
  className = "h-16 w-16",
  iconClassName = "h-8 w-8",
}: {
  ikona: IkonaIme;
  boja: BojaKruga;
  className?: string;
  iconClassName?: string;
}) {
  return (
    <span aria-hidden className={`inline-flex shrink-0 items-center justify-center rounded-full shadow-pop ring-4 ring-white ${KRUGOVI[boja]} ${className}`}>
      <Ikona ime={ikona} className={iconClassName} />
    </span>
  );
}
