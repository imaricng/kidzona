"use client";

import { useState } from "react";
import { loadStripe } from "@stripe/stripe-js";
import { Elements, PaymentElement, useStripe, useElements } from "@stripe/react-stripe-js";
import { hr } from "@/i18n/hr";
import { formatEur } from "@/lib/format";

/**
 * Stripe potvrda plaćanja karticom (Payment Element). Prikazuje se SAMO kad je
 * postavljen `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY` i kad backend vrati
 * `clientSecret`. U MOCK načinu (bez ključeva) ova se komponenta ne koristi.
 */

const publishableKey = process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY ?? "";
const stripePromise = publishableKey ? loadStripe(publishableKey) : null;

function PaymentForm({ returnUrl, iznosCents }: { returnUrl: string; iznosCents: number }) {
  const stripe = useStripe();
  const elements = useElements();
  const [obrada, setObrada] = useState(false);
  const [greska, setGreska] = useState<string | null>(null);

  async function potvrdi() {
    if (!stripe || !elements) return;
    setObrada(true);
    setGreska(null);
    const { error } = await stripe.confirmPayment({
      elements,
      confirmParams: { return_url: returnUrl },
    });
    // Ako nema redirecta, prikaži grešku (uspjeh preusmjerava na return_url).
    if (error) {
      setGreska(error.message ?? hr.booking.greska);
      setObrada(false);
    }
  }

  return (
    <div className="space-y-4">
      <PaymentElement />
      {greska && <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">{greska}</p>}
      <button type="button" className="btn-primary w-full" onClick={potvrdi} disabled={!stripe || obrada}>
        {obrada ? hr.booking.obradaPlacanja : `Plati ${formatEur(iznosCents)}`}
      </button>
    </div>
  );
}

export function StripeConfirm({ clientSecret, returnUrl, iznosCents }: { clientSecret: string; returnUrl: string; iznosCents: number }) {
  if (!stripePromise) {
    return <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Stripe nije konfiguriran.</p>;
  }
  return (
    <div className="card">
      <h3 className="font-semibold text-ink-800">Plaćanje karticom</h3>
      <p className="mt-1 text-sm text-ink-500">Unesite podatke kartice za sigurnu naplatu (Stripe).</p>
      <div className="mt-4">
        <Elements stripe={stripePromise} options={{ clientSecret, locale: "hr", appearance: { theme: "stripe" } }}>
          <PaymentForm returnUrl={returnUrl} iznosCents={iznosCents} />
        </Elements>
      </div>
    </div>
  );
}
