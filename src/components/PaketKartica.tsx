import Link from "next/link";
import type { Rjecnik } from "@/i18n/hr";
import { formatEur } from "@/lib/format";
import { trajanjeSati } from "@/lib/slots";
import { Ikona } from "@/components/Decor";
import { SidrenaCijenaOznaka } from "@/components/SidrenaCijena";

const PAKET_AKCENT = ["bg-sky2-400", "bg-berry-500", "bg-brand-500"];

export interface PaketKarticaPodaci {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  basePriceCents: number;
  perChildCents: number;
  cijenaPoDogovoru: boolean;
  sidrenaCijenaCents: number | null;
  sidrenaPerChildCents: number | null;
  sidrenaDatum: string | null;
  popular: boolean;
  durationMin: number;
  maxChildren: number;
  includedItems: unknown;
}

/** Kartica paketa za proslavu (naslovnica i podstranice igraonica). */
export function PaketKartica({ paket: p, indeks, t }: { paket: PaketKarticaPodaci; indeks: number; t: Rjecnik }) {
  const stavke = (p.includedItems as string[]) ?? [];
  return (
    <div className={`card relative flex w-full flex-col overflow-hidden pt-9 sm:w-[21rem] ${p.popular ? "ring-4 ring-sun-400" : ""}`}>
      <span aria-hidden className={`absolute inset-x-0 top-0 h-3 ${PAKET_AKCENT[indeks % PAKET_AKCENT.length]}`} />
      {p.popular && <span className="chip mb-2 w-fit bg-sun-400 font-bold text-brand-900">★ {t.paketi.popularno}</span>}
      <h4 className="font-display text-2xl font-bold text-brand-900">{p.name}</h4>
      {p.description && <p className="mt-1 text-sm text-ink-500">{p.description}</p>}
      <div className="mt-4 flex flex-wrap items-baseline gap-x-2">
        {p.cijenaPoDogovoru ? (
          <>
            <span className="font-display text-4xl font-bold text-brand-600">{t.paketi.poDogovoru}</span>
            <span className="text-sm text-ink-500">{t.paketi.poDogovoruNapomena}</span>
          </>
        ) : (
          <>
            <span className="font-display text-4xl font-bold text-brand-600">{formatEur(p.basePriceCents)}</span>
            <span className="text-sm text-ink-500">{t.paketi.fiksnaCijena}</span>
          </>
        )}
      </div>
      {/* Dodatna (sidrena) cijena — obvezna uz svaku javno istaknutu cijenu. */}
      <SidrenaCijenaOznaka stavka={p} className="mt-1 block text-xs" />
      <ul className="mt-4 flex flex-wrap gap-2 font-semibold">
        <li className="chip bg-brand-50 !text-xs text-brand-700">⏱ {trajanjeSati(p.durationMin)}</li>
        <li className="chip bg-berry-50 !text-xs text-berry-700">
          {t.paketi.doBroj} {p.maxChildren} {t.paketi.odDjece} · {t.paketi.slavljenikGratis}
        </li>
        {p.perChildCents > 0 && !p.cijenaPoDogovoru && (
          <li className="chip bg-sun-100 !text-xs text-brand-900">
            +{formatEur(p.perChildCents)} {t.paketi.poDodatnomDjetetu}
            <SidrenaCijenaOznaka
              stavka={{ sidrenaCijenaCents: p.sidrenaPerChildCents, sidrenaDatum: p.sidrenaDatum }}
              className="ml-1 !text-ink-500"
            />
          </li>
        )}
      </ul>
      <ul className="mt-5 flex-1 space-y-2.5 text-sm text-ink-600">
        {stavke.map((s, j) => (
          <li key={j} className="flex items-start gap-2.5">
            <span className="mt-0.5 flex h-5 w-5 shrink-0 items-center justify-center rounded-full bg-brand-100 text-brand-600">
              <Ikona ime="kvacica" className="h-3.5 w-3.5" />
            </span>
            <span>{s}</span>
          </li>
        ))}
      </ul>
      <Link href={`/rezervacija?paket=${p.slug}`} className="btn-primary mt-6 w-full">
        {t.paketi.odabir}
      </Link>
    </div>
  );
}
