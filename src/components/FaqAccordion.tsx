"use client";
import { useState } from "react";

export function FaqAccordion({ pitanja }: { pitanja: { p: string; o: string }[] }) {
  const [otvoren, setOtvoren] = useState<number | null>(0);
  return (
    <div className="mx-auto max-w-3xl divide-y divide-black/5 overflow-hidden rounded-3xl bg-white shadow-soft ring-1 ring-black/5">
      {pitanja.map((q, i) => {
        const aktivno = otvoren === i;
        return (
          <div key={i}>
            <button
              type="button"
              onClick={() => setOtvoren(aktivno ? null : i)}
              className="flex w-full items-center justify-between gap-4 px-6 py-5 text-left"
              aria-expanded={aktivno}
            >
              <span className="font-semibold text-ink-800">{q.p}</span>
              <span className={`text-xl text-brand-500 transition ${aktivno ? "rotate-45" : ""}`} aria-hidden>
                +
              </span>
            </button>
            {aktivno && <p className="px-6 pb-5 text-ink-600">{q.o}</p>}
          </div>
        );
      })}
    </div>
  );
}
