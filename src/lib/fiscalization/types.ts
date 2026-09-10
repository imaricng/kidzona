/**
 * Apstrakcija fiskalizacije računa (zakonska obveza u Hrvatskoj).
 *
 * VAŽNO: Ovdje se NE implementira stvarna fiskalizacija. Definiran je samo
 * `FiscalizationService` interface s metodom `fiscalizeInvoice()`. Stvarni,
 * ovlašteni fiskalni servis (komunikacija s Poreznom upravom, XML/SOAP,
 * potpisivanje FINA certifikatom, izračun ZKI-ja i dohvat JIR-a) priključuje se
 * implementacijom ovog interfacea — vidi README, odjeljak "Fiskalizacija".
 *
 * Svaki izdani račun ima polja JIR i ZKI te redni broj računa (vidi Prisma model
 * `Invoice`).
 */

export interface FiskalniRacunInput {
  invoiceId: string;
  number: string; // redni broj računa (npr. "42/POSL1/1")
  issuedAt: Date;
  totalCents: number;
  businessSpace: string; // oznaka poslovnog prostora
  cashRegister: string; // oznaka naplatnog uređaja
  oib?: string; // OIB obveznika
  stavke: { naziv: string; kolicina: number; cijenaCents: number; pdvStopa: number }[];
}

export interface FiskalniRezultat {
  jir: string | null; // Jedinstveni identifikator računa (Porezna)
  zki: string; // Zaštitni kod izdavatelja
  fiscalizedAt: Date;
  provider: string;
}

export interface FiscalizationService {
  /**
   * Fiskalizira račun: izračunava ZKI, šalje Poreznoj i vraća JIR.
   * Implementacija mora biti idempotentna po `invoiceId` gdje je moguće.
   */
  fiscalizeInvoice(input: FiskalniRacunInput): Promise<FiskalniRezultat>;
}
