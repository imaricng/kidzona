import { Squiggle } from "@/components/Decor";

/** Naslov sekcije s vijugom u brand boji i opcionalnim podnaslovom. */
export function SectionNaslov({ naslov, podnaslov }: { naslov: string; podnaslov?: string }) {
  return (
    <div className="mx-auto max-w-2xl text-center">
      <h2 className="font-display text-3xl font-bold text-brand-900 sm:text-4xl">{naslov}</h2>
      <Squiggle className="mx-auto mt-2 h-3 w-24 text-berry-500" />
      {podnaslov && <p className="mt-3 text-ink-500">{podnaslov}</p>}
    </div>
  );
}
