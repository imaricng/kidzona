"use client";

/**
 * Prebacivanje jezika (HR/EN). Postavlja kolačić `locale` i osvježava stranicu.
 * Server stranice koje koriste `getDict(await getLocale())` prikazat će se na
 * odabranom jeziku.
 */
export function LanguageToggle({ locale }: { locale: "hr" | "en" }) {
  function postavi(novi: "hr" | "en") {
    document.cookie = `locale=${novi}; path=/; max-age=${60 * 60 * 24 * 365}`;
    window.location.reload();
  }
  return (
    <div className="flex items-center gap-1 text-xs font-semibold">
      <button
        type="button"
        onClick={() => postavi("hr")}
        className={`rounded px-1.5 py-0.5 ${locale === "hr" ? "bg-brand-500 text-white" : "text-ink-400 hover:text-ink-700"}`}
        aria-pressed={locale === "hr"}
      >
        HR
      </button>
      <span className="text-ink-300">·</span>
      <button
        type="button"
        onClick={() => postavi("en")}
        className={`rounded px-1.5 py-0.5 ${locale === "en" ? "bg-brand-500 text-white" : "text-ink-400 hover:text-ink-700"}`}
        aria-pressed={locale === "en"}
      >
        EN
      </button>
    </div>
  );
}
