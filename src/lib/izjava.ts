import { hr } from "@/i18n/hr";

/**
 * Izjava roditelja kakvu ju je roditelj pročitao — isti tekst prikazuje se u
 * obrascu i chatu (`IzjavaRoditelja`, s poveznicom na pravila) te se doslovno
 * sprema uz rezervaciju (`ConsentWaiver.content`), da zapis odgovara onome
 * što je stvarno prihvaćeno.
 */
export const IZJAVA_RODITELJA = `${hr.booking.waiverPrije}${hr.booking.waiverPoveznica}${hr.booking.waiverPoslije}`;
