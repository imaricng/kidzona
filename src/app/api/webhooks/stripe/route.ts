import { NextRequest, NextResponse } from "next/server";
import Stripe from "stripe";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";

/**
 * POST /api/webhooks/stripe
 * Prima Stripe događaje i potvrđuje plaćanja. Na `payment_intent.succeeded`
 * označava odgovarajući `Payment` uspješnim i preračunava `Reservation.paidCents`
 * i status. Zahtijeva `STRIPE_SECRET_KEY` i `STRIPE_WEBHOOK_SECRET`.
 *
 * Lokalno testiranje: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.
 */
export async function POST(req: NextRequest) {
  if (!env.stripeSecretKey || !env.stripeWebhookSecret) {
    return NextResponse.json({ error: "Stripe nije konfiguriran" }, { status: 400 });
  }

  const stripe = new Stripe(env.stripeSecretKey);
  const sig = req.headers.get("stripe-signature") ?? "";
  const raw = await req.text();

  let event: Stripe.Event;
  try {
    event = stripe.webhooks.constructEvent(raw, sig, env.stripeWebhookSecret);
  } catch {
    return NextResponse.json({ error: "Neispravan potpis" }, { status: 400 });
  }

  if (event.type === "payment_intent.succeeded") {
    const intent = event.data.object as Stripe.PaymentIntent;
    await potvrdiPlacanje(intent.id);
  }

  return NextResponse.json({ received: true });
}

/** Označi plaćanje uspješnim i preračunaj naplaćeni iznos i status rezervacije. */
async function potvrdiPlacanje(providerRef: string) {
  const payment = await prisma.payment.findFirst({ where: { providerRef, provider: "stripe" } });
  if (!payment || !payment.reservationId) return;

  await prisma.payment.update({ where: { id: payment.id }, data: { status: "uspjesno" } });

  const rezervacija = await prisma.reservation.findUnique({
    where: { id: payment.reservationId },
    include: { payments: true },
  });
  if (!rezervacija) return;

  const naplaceno = rezervacija.payments
    .map((p) => (p.id === payment.id ? { ...p, status: "uspjesno" } : p))
    .filter((p) => p.status === "uspjesno")
    .reduce((s, p) => s + p.amountCents, 0);

  const status = naplaceno >= rezervacija.totalCents ? "placeno" : naplaceno > 0 ? "potvrdjeno" : rezervacija.status;
  await prisma.reservation.update({ where: { id: rezervacija.id }, data: { paidCents: naplaceno, status } });
}
