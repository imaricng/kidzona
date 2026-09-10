import Stripe from "stripe";
import type { NaplataInput, NaplataRezultat, PaymentService, PovratInput } from "./index";

/**
 * Stvarni Stripe provider (valuta EUR). Aktivira se kad je postavljen
 * `STRIPE_SECRET_KEY` (vidi `getPaymentService()`).
 *
 * `naplati()` kreira PaymentIntent i vraća `client_secret`. Stvarna potvrda
 * plaćanja događa se na frontu (Stripe Elements / Payment Element), a konačni
 * status stiže preko webhooka [`/api/webhooks/stripe`], koji ažurira `Payment` i
 * `Reservation`. Zato je status ovdje "na-cekanju" — rezervacija se kreira, ali
 * se označava plaćenom tek nakon webhooka.
 */
export class StripePaymentProvider implements PaymentService {
  private stripe: Stripe;

  constructor(secretKey: string) {
    this.stripe = new Stripe(secretKey);
  }

  async naplati(input: NaplataInput): Promise<NaplataRezultat> {
    try {
      const intent = await this.stripe.paymentIntents.create({
        amount: input.amountCents,
        currency: "eur",
        description: input.opis,
        receipt_email: input.email,
        metadata: {
          kind: input.kind,
          reservationCode: input.reservationCode ?? "",
        },
        automatic_payment_methods: { enabled: true },
      });

      return {
        ok: true,
        provider: "stripe",
        providerRef: intent.id,
        status: "na-cekanju", // potvrđuje webhook nakon naplate na frontu
        clientSecret: intent.client_secret ?? undefined,
      };
    } catch (e) {
      return {
        ok: false,
        provider: "stripe",
        providerRef: "",
        status: "neuspjesno",
      };
    }
  }

  async refundiraj(input: PovratInput): Promise<{ ok: boolean }> {
    try {
      await this.stripe.refunds.create({ payment_intent: input.providerRef, amount: input.amountCents });
      return { ok: true };
    } catch {
      return { ok: false };
    }
  }
}
