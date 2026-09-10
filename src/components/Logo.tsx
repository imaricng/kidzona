/**
 * Party Kidzona logotip — vektorska rekreacija brand vizuala: zvjezdica-maskota s
 * krunom, "PARTY" pločica, šareni "KIDZONA" natpis i "NOVA GRADIŠKA" traka.
 * `lg` je uspravna (glavna) varijanta, `sm`/`md` vodoravna za zaglavlja.
 * Ako imaš originalnu datoteku logotipa, spremi je u `public/logo.png` i zamijeni
 * ovaj prikaz s <Image src="/logo.png" ... />.
 */
import { BOJE, StarMascot } from "@/components/Decor";

// Boje slova prate logotip: K roza, I žuta, D cijan, Z ljubičasta, O žuta, N roza, A cijan.
const SLOVA: [string, string][] = [
  ["K", BOJE.roza],
  ["I", BOJE.zuta],
  ["D", BOJE.cijan],
  ["Z", BOJE.ljubicasta],
  ["O", BOJE.zuta],
  ["N", BOJE.roza],
  ["A", BOJE.cijan],
];

const VELICINE = {
  sm: "text-[1.2rem] sm:text-[1.35rem]",
  md: "text-[2rem]",
  lg: "text-5xl sm:text-7xl",
} as const;

export function Logo({
  size = "md",
  subtitle = false,
  className = "",
}: {
  size?: keyof typeof VELICINE;
  subtitle?: boolean;
  className?: string;
}) {
  const naziv = <span className="sr-only">Party Kidzona Nova Gradiška</span>;

  if (size === "lg") {
    return (
      <span className={`inline-flex flex-col items-center leading-none ${VELICINE.lg} ${className}`}>
        {naziv}
        <StarMascot className="relative z-10 -mb-[0.22em] h-[1.45em] w-[1.45em] -rotate-6" />
        <span aria-hidden className="relative z-20">
          <PartyPlocica velicina="0.38em" />
        </span>
        <span aria-hidden className="mt-[0.06em]">
          <Natpis />
        </span>
        <span
          aria-hidden
          className="mt-[0.5em] rounded-full bg-brand-500 px-[0.9em] py-[0.35em] font-display font-bold uppercase tracking-[0.12em] text-white shadow-[0_0.15em_0_#2B1A66]"
          style={{ fontSize: "0.24em" }}
        >
          Nova Gradiška
        </span>
        {subtitle && (
          <span
            aria-hidden
            className="mt-[0.9em] rounded-full bg-sun-400 px-[1em] py-[0.45em] font-display font-bold uppercase tracking-[0.08em] text-brand-800"
            style={{ fontSize: "0.17em" }}
          >
            Rođendaonica &amp; igraonica
          </span>
        )}
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-[0.2em] leading-none ${VELICINE[size]} ${className}`}>
      {naziv}
      <StarMascot className="h-[2.2em] w-[2.2em] shrink-0 -rotate-6" />
      <span aria-hidden className="flex flex-col items-center">
        <PartyPlocica velicina="0.42em" />
        <span className="mt-[0.08em]">
          <Natpis />
        </span>
        <span
          className="mt-[0.35em] font-display font-bold uppercase tracking-[0.16em] text-brand-700"
          style={{ fontSize: "0.3em" }}
        >
          Nova Gradiška
        </span>
      </span>
    </span>
  );
}

function PartyPlocica({ velicina }: { velicina: string }) {
  return (
    <span
      className="inline-block -rotate-2 rounded-full bg-brand-500 px-[0.65em] py-[0.14em] font-display font-bold uppercase leading-none tracking-[0.06em] text-white shadow-[0_0.14em_0_#2B1A66]"
      style={{ fontSize: velicina }}
    >
      Party
    </span>
  );
}

/** Šareni "KIDZONA" s tamnim obrubom i 3D sjenom, slova blago razigrano nakrivljena. */
function Natpis() {
  return (
    <span className="flex font-display font-bold uppercase leading-none">
      {SLOVA.map(([slovo, boja], i) => (
        <span
          key={i}
          className="inline-block"
          style={{
            color: boja,
            WebkitTextStroke: `0.09em ${BOJE.tamna}`,
            paintOrder: "stroke fill",
            textShadow: `0 0.06em 0 ${BOJE.tamna}`,
            transform: `rotate(${i % 2 ? 4 : -4}deg) translateY(${i % 2 ? "0.03em" : "0"})`,
          }}
        >
          {slovo}
        </span>
      ))}
    </span>
  );
}
