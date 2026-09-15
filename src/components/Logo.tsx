/**
 * Party Kidzona logotip (originalna datoteka: `design/logo-original.png`).
 * Web verzija s prozirnom pozadinom je u `public/brand/logo.png` (1200×558).
 * `sm`/`md` su za zaglavlja (uz natpis "Nova Gradiška"), `lg` za naslovnicu.
 */
import Image from "next/image";

const SIRINA = 1200;
const VISINA = 558;
const ALT = "Party Kidzona — rođendaonica i igraonica, Nova Gradiška";

const VISINE = {
  sm: "h-11 sm:h-12",
  md: "h-16",
} as const;

export function Logo({
  size = "md",
  mjesto = true,
  className = "",
}: {
  size?: "sm" | "md" | "lg";
  /** Natpis "Nova Gradiška" uz logotip (u glavnom zaglavlju se skriva zbog prostora). */
  mjesto?: boolean;
  className?: string;
}) {
  if (size === "lg") {
    return (
      <span className={`inline-flex w-full flex-col items-center ${className}`}>
        <Image
          src="/brand/logo.png"
          alt={ALT}
          width={SIRINA}
          height={VISINA}
          priority
          sizes="(min-width: 640px) 420px, 85vw"
          className="h-auto w-full max-w-[26rem]"
        />
        <span className="mt-4 rounded-full bg-brand-500 px-4 py-1.5 font-display text-sm font-bold uppercase tracking-[0.14em] text-white shadow-[0_3px_0_#2B1A66]">
          Nova Gradiška
        </span>
      </span>
    );
  }

  return (
    <span className={`inline-flex items-center gap-2 ${className}`}>
      <Image
        src="/brand/logo.png"
        alt={ALT}
        width={SIRINA}
        height={VISINA}
        priority
        sizes={size === "sm" ? "110px" : "140px"}
        className={`${VISINE[size]} w-auto`}
      />
      {mjesto && (
        <span
          aria-hidden
          className="hidden font-display text-[0.68rem] font-bold uppercase leading-tight tracking-[0.14em] text-brand-700 sm:block"
        >
          Nova
          <br />
          Gradiška
        </span>
      )}
    </span>
  );
}
