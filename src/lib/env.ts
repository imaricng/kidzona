/**
 * Centralizirani pristup varijablama okruženja.
 * Nikad ne čitaj `process.env` izravno u ostatku koda — koristi `env`.
 */

function bool(value: string | undefined, fallback = false): boolean {
  if (value === undefined) return fallback;
  return ["1", "true", "yes", "da"].includes(value.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const n = Number(value);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  appUrl: process.env.NEXT_PUBLIC_APP_URL ?? "http://localhost:3000",
  timezone: process.env.APP_TIMEZONE ?? "Europe/Zagreb",

  // Tajna za potpis sesijskog kolačića. U produkciji je obvezna — bez nje bi se
  // prijava mogla lažirati, pa aplikacija radije odbije prijavu.
  get authSecret(): string {
    const tajna = process.env.AUTH_SECRET;
    if (tajna) return tajna;
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET nije postavljen — dodaj ga u varijable okruženja (Vercel → Settings → Environment Variables).");
    }
    return "razvojna-tajna-samo-lokalno";
  },

  // Tajna za zaštitu cron endpointa (automatski podsjetnici). U produkciji je obvezna.
  cronSecret: process.env.CRON_SECRET ?? "",

  // Bodovi lojalnosti koji se dodjeljuju po završenoj proslavi.
  loyaltyPointsPerParty: int(process.env.LOYALTY_POINTS_PER_PARTY, 50),

  // Plaćanja
  // Online plaćanje je ZADANO ISKLJUČENO — rezervacija samo potvrđuje narudžbu,
  // a plaćanje se vrši uživo na dan proslave. Uključi s ONLINE_PAYMENTS=true
  // (i postavi Stripe ključeve) kad želiš online naplatu.
  onlinePayments: bool(process.env.ONLINE_PAYMENTS, false),
  stripeSecretKey: process.env.STRIPE_SECRET_KEY ?? "",
  stripeWebhookSecret: process.env.STRIPE_WEBHOOK_SECRET ?? "",
  get paymentsMock(): boolean {
    return !this.stripeSecretKey;
  },
  depositPercent: int(process.env.DEPOSIT_PERCENT, 30),

  // Notifikacije
  notificationProvider: process.env.NOTIFICATION_PROVIDER ?? "console",
  // Pošiljatelj automatskih poruka — mora biti na domeni potvrđenoj kod servisa za slanje.
  emailFrom: process.env.EMAIL_FROM ?? "info@kidzona.hr",
  // Primatelj obavijesti osoblju o novim rezervacijama.
  staffEmail: process.env.STAFF_EMAIL ?? "kidzonang@gmail.com",
  // Adresa na koju stižu odgovori kupaca na automatske poruke.
  emailReplyTo: process.env.EMAIL_REPLY_TO ?? "kidzonang@gmail.com",
  resendApiKey: process.env.RESEND_API_KEY ?? "",
  twilioAccountSid: process.env.TWILIO_ACCOUNT_SID ?? "",
  twilioAuthToken: process.env.TWILIO_AUTH_TOKEN ?? "",
  twilioFromNumber: process.env.TWILIO_FROM_NUMBER ?? "",

  // Fiskalizacija
  fiscalizationProvider: process.env.FISCALIZATION_PROVIDER ?? "mock",
  fiscalOib: process.env.FISCAL_OIB ?? "",
  fiscalBusinessSpace: process.env.FISCAL_BUSINESS_SPACE ?? "POSL1",
  fiscalCashRegister: process.env.FISCAL_CASH_REGISTER ?? "1",

  // Feature flagovi
  featureMemberships: bool(process.env.FEATURE_MEMBERSHIPS, true),
  featureLoyalty: bool(process.env.FEATURE_LOYALTY, true),
  featureOpenPlay: bool(process.env.FEATURE_OPEN_PLAY, true),
};
