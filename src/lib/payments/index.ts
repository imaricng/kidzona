/**
 * Apstrakcija plaćanja. Po defaultu radi u MOCK načinu (test plaćanja bez
 * stvarnog Stripe-a) kad `STRIPE_SECRET_KEY` nije postavljen. Time je booking tok
 * potpuno provozan u demu, a u produkciji se uključuje pravi Stripe.
 *
 * Valuta: EUR. Iznosi su u centima.
 */
import { env } from "@/lib/env";

export type VrstaPlacanja = "akontacija" | "puni-iznos" | "ostatak" | "bon";

export interface NaplataInput {
  amountCents: number;
  kind: VrstaPlacanja;
  opis: string;
  email?: string;
  reservationCode?: string;
}

export interface NaplataRezultat {
  ok: boolean;
  provider: "stripe" | "mock";
  providerRef: string;
  status: "uspjesno" | "neuspjesno" | "na-cekanju";
  // U pravom Stripeu ovdje je client_secret za potvrdu na frontu.
  clientSecret?: string;
}

export interface PovratInput {
  providerRef: string; // referenca originalne naplate (npr. Stripe PaymentIntent id)
  amountCents: number;
}

export interface PaymentService {
  naplati(input: NaplataInput): Promise<NaplataRezultat>;
  /** Povrat (refund) sredstava. Mock vraća uspjeh; Stripe radi stvarni refund. */
  refundiraj(input: PovratInput): Promise<{ ok: boolean }>;
}

/**
 * MOCK provider — uvijek uspješno "naplati" i vrati referencu. Simulira test
 * karticu. Omogućuje da kriterij prihvaćanja (test plaćanje → potvrda) prolazi
 * bez Stripe ključeva.
 */
class MockPaymentProvider implements PaymentService {
  async naplati(input: NaplataInput): Promise<NaplataRezultat> {
    const ref = `mock_${Buffer.from(`${input.reservationCode ?? ""}:${input.amountCents}:${input.kind}`)
      .toString("base64url")
      .slice(0, 24)}`;
    return { ok: true, provider: "mock", providerRef: ref, status: "uspjesno" };
  }
  async refundiraj(): Promise<{ ok: boolean }> {
    return { ok: true };
  }
}

/**
 * Odabir providera: stvarni Stripe ako je postavljen `STRIPE_SECRET_KEY`, inače
 * MOCK (test plaćanja). Stripe implementacija je u `./stripe-provider`, a potvrda
 * naplate stiže preko webhooka [`/api/webhooks/stripe`].
 */
let instanca: PaymentService | null = null;

export function getPaymentService(): PaymentService {
  if (instanca) return instanca;
  if (env.paymentsMock) {
    instanca = new MockPaymentProvider();
  } else {
    // Lijeni import da Stripe SDK ne ulazi u bundle kad se ne koristi.
    const { StripePaymentProvider } = require("./stripe-provider") as typeof import("./stripe-provider");
    instanca = new StripePaymentProvider(env.stripeSecretKey);
  }
  return instanca;
}
