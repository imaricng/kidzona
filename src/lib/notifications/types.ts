/**
 * Apstrakcija notifikacija. Sav kod šalje poruke kroz `NotificationService`
 * interface, pa se provider (email/SMS) lako zamijeni. U dev okruženju koristi
 * se `ConsoleNotificationProvider` koji poruke ispisuje u konzolu i logira u bazu.
 */

export type Kanal = "email" | "sms";

export type TipPoruke =
  | "potvrda" // potvrda rezervacije (s QR kodom)
  | "podsjetnik" // podsjetnik dan prije
  | "osoblje" // obavijest osoblju o terminu/pripremi
  | "zahvala" // zahvala + zamolba za Google recenziju
  | "rodjendan-godina"; // podsjetnik za sljedeći rođendan godinu dana kasnije

export interface Poruka {
  tip: TipPoruke;
  kanal: Kanal;
  primatelj: string; // email ili broj telefona
  naslov?: string;
  tijelo: string;
  reservationId?: string;
}

export interface RezultatSlanja {
  status: "logirano" | "poslano" | "greska";
  providerRef?: string;
  greska?: string;
}

export interface NotificationService {
  posalji(poruka: Poruka): Promise<RezultatSlanja>;
}
