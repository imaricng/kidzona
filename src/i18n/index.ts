/**
 * Mehanizam jezika. `hr` je zadani (primarno tržište), `en` je dostupan i
 * potpun. Jezik se bira kolačićem `locale`; `getDict()` vraća odgovarajući
 * rječnik. Javne stranice koriste `getDict(await getLocale())`.
 */
import { cookies } from "next/headers";
import { hr, type Rjecnik } from "./hr";
import { en } from "./en";

export const locales = ["hr", "en"] as const;
export type Locale = (typeof locales)[number];
export const defaultLocale: Locale = "hr";
export const LOCALE_COOKIE = "locale";

const rjecnici: Record<Locale, Rjecnik> = { hr, en };

export function getDict(locale: Locale): Rjecnik {
  return rjecnici[locale] ?? hr;
}

/** Čita jezik iz kolačića (server). */
export async function getLocale(): Promise<Locale> {
  const store = await cookies();
  const v = store.get(LOCALE_COOKIE)?.value as Locale | undefined;
  return v && locales.includes(v) ? v : defaultLocale;
}

export { hr, en };
