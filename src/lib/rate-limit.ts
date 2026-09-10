/**
 * Jednostavan in-memory rate-limiter (sliding window). Dovoljan za jednu
 * instancu; za produkciju s više instanci koristi Redis/Upstash. Štiti
 * osjetljive rute (prijava, booking, reset lozinke) od zlouporabe.
 */
type Zapis = { count: number; resetAt: number };
const spremnik = new Map<string, Zapis>();

export interface RateLimitRezultat {
  dozvoljeno: boolean;
  preostalo: number;
  resetAt: number;
}

/**
 * @param kljuc  jedinstveni ključ (npr. `login:${ip}`)
 * @param limit  maksimalan broj pokušaja u prozoru
 * @param prozorMs  trajanje prozora u milisekundama
 */
export function rateLimit(kljuc: string, limit: number, prozorMs: number): RateLimitRezultat {
  const sada = Date.now();
  const zapis = spremnik.get(kljuc);

  if (!zapis || zapis.resetAt < sada) {
    spremnik.set(kljuc, { count: 1, resetAt: sada + prozorMs });
    return { dozvoljeno: true, preostalo: limit - 1, resetAt: sada + prozorMs };
  }

  if (zapis.count >= limit) {
    return { dozvoljeno: false, preostalo: 0, resetAt: zapis.resetAt };
  }

  zapis.count++;
  return { dozvoljeno: true, preostalo: limit - zapis.count, resetAt: zapis.resetAt };
}

/** Dohvati IP iz zaglavlja zahtjeva (iza proxyja koristi x-forwarded-for). */
export function dohvatiIp(headers: Headers): string {
  return (headers.get("x-forwarded-for")?.split(",")[0] ?? headers.get("x-real-ip") ?? "nepoznato").trim();
}

// Povremeno počisti istekle zapise (sprječava rast memorije).
if (typeof setInterval !== "undefined") {
  setInterval(() => {
    const sada = Date.now();
    for (const [k, v] of spremnik) if (v.resetAt < sada) spremnik.delete(k);
  }, 60_000).unref?.();
}
