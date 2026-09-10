/**
 * Generiranje čitljivih kodova rezervacije, QR tokena i rednih brojeva računa.
 */
import { randomBytes, randomUUID } from "crypto";

/** Kod rezervacije, npr. "KZ-2026-0042". `seq` je redni broj te godine. */
export function kodRezervacije(godina: number, seq: number): string {
  return `KZ-${godina}-${String(seq).padStart(4, "0")}`;
}

/** Nepredvidljiv token za QR prijavu dolaska. */
export function qrToken(): string {
  return randomBytes(16).toString("hex");
}

/** Slučajni UUID (npr. za interne reference). */
export function uuid(): string {
  return randomUUID();
}

/**
 * Redni broj računa u hrvatskom formatu: "broj/poslovniProstor/naplatniUredaj".
 * Npr. "42/POSL1/1". Broj se resetira po godini (vodi se u aplikaciji/seedu).
 */
export function brojRacuna(seq: number, businessSpace: string, cashRegister: string): string {
  return `${seq}/${businessSpace}/${cashRegister}`;
}

/** Kod poklon-bona, npr. "KZ-GIFT-7F3A9C". */
export function kodBona(): string {
  return `KZ-GIFT-${randomBytes(3).toString("hex").toUpperCase()}`;
}
