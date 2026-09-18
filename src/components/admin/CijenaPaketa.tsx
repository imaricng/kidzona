"use client";

import { useId, useState } from "react";

/**
 * Cijena paketa i prekidač „po dogovoru” zajedno, jer se međusobno isključuju:
 * dok je „po dogovoru” uključeno, upisani iznos se javno ne prikazuje. Polje
 * ostaje u formi (readOnly, ne disabled) da se vrijednost i dalje šalje.
 */
export function CijenaPaketa({
  defaultCijena,
  defaultPoDogovoru,
}: {
  defaultCijena: string;
  defaultPoDogovoru: boolean;
}) {
  const [poDogovoru, setPoDogovoru] = useState(defaultPoDogovoru);
  const napomenaId = useId();
  return (
    <div className="block">
      <span className="mb-1 block text-xs font-medium text-ink-500">Cijena (€, fiksno)</span>
      <input
        name="basePrice"
        defaultValue={defaultCijena}
        readOnly={poDogovoru}
        aria-describedby={poDogovoru ? napomenaId : undefined}
        className={`input !py-2 ${poDogovoru ? "bg-ink-50 text-ink-400" : ""}`}
      />
      <label className="mt-1 flex items-center gap-2 text-sm">
        <input
          type="checkbox"
          name="cijenaPoDogovoru"
          checked={poDogovoru}
          onChange={(e) => setPoDogovoru(e.target.checked)}
          className="h-4 w-4 accent-brand-500"
        />
        Cijena po dogovoru
      </label>
      {poDogovoru && (
        <span id={napomenaId} className="mt-1 block text-xs text-berry-600">
          Javno piše „Po dogovoru”; iznos iznad se ne prikazuje. Odznačite da se cijena prikazuje.
        </span>
      )}
    </div>
  );
}
