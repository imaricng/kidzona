/**
 * Centralizirani pristup varijablama okruženja.
 * Nikad ne čitaj `process.env` izravno u ostatku koda — koristi `env`.
 *
 * Prazna vrijednost znači "nije postavljeno" i koristi se zadana vrijednost —
 * npr. kad je na Vercel uvezen `.env.example` s praznim poljima.
 */

function str(value: string | undefined, fallback = ""): string {
  const v = value?.trim();
  return v ? v : fallback;
}

function bool(value: string | undefined, fallback = false): boolean {
  const v = value?.trim();
  if (!v) return fallback;
  return ["1", "true", "yes", "da"].includes(v.toLowerCase());
}

function int(value: string | undefined, fallback: number): number {
  const v = value?.trim();
  if (!v) return fallback;
  const n = Number(v);
  return Number.isFinite(n) ? n : fallback;
}

export const env = {
  appUrl: str(process.env.NEXT_PUBLIC_APP_URL, "http://localhost:3000"),
  timezone: str(process.env.APP_TIMEZONE, "Europe/Zagreb"),

  // Tajna za potpis sesijskog kolačića. U produkciji je obvezna — bez nje bi se
  // prijava mogla lažirati, pa aplikacija radije odbije prijavu.
  get authSecret(): string {
    const tajna = str(process.env.AUTH_SECRET);
    if (tajna) return tajna;
    if (process.env.NODE_ENV === "production") {
      throw new Error("AUTH_SECRET nije postavljen — dodaj ga u varijable okruženja (Vercel → Settings → Environment Variables).");
    }
    return "razvojna-tajna-samo-lokalno";
  },

  // Tajna za zaštitu cron endpointa (automatski podsjetnici). U produkciji je obvezna.
  cronSecret: str(process.env.CRON_SECRET),

  // Bodovi vjernosti koji se dodjeljuju po završenoj proslavi.
  loyaltyPointsPerParty: int(process.env.LOYALTY_POINTS_PER_PARTY, 50),

  // Plaćanja
  // Plaćanje putem interneta ZADANO JE ISKLJUČENO — rezervacija samo potvrđuje
  // narudžbu, a plaća se uživo na dan proslave. Uključi s ONLINE_PAYMENTS=true
  // (i postavi Stripe ključeve) kad želiš naplatu putem interneta.
  onlinePayments: bool(process.env.ONLINE_PAYMENTS, false),
  stripeSecretKey: str(process.env.STRIPE_SECRET_KEY),
  stripeWebhookSecret: str(process.env.STRIPE_WEBHOOK_SECRET),
  get paymentsMock(): boolean {
    return !this.stripeSecretKey;
  },
  depositPercent: int(process.env.DEPOSIT_PERCENT, 30),

  // Obavijesti
  notificationProvider: str(process.env.NOTIFICATION_PROVIDER, "console"),
  // Pošiljatelj automatskih poruka — mora biti na domeni potvrđenoj kod servisa za slanje.
  emailFrom: str(process.env.EMAIL_FROM, "info@kidzona.hr"),
  // Primatelj obavijesti osoblju o novim rezervacijama.
  staffEmail: str(process.env.STAFF_EMAIL, "kidzonang@gmail.com"),
  // Adresa na koju stižu odgovori kupaca na automatske poruke.
  emailReplyTo: str(process.env.EMAIL_REPLY_TO, "kidzonang@gmail.com"),
  resendApiKey: str(process.env.RESEND_API_KEY),
  twilioAccountSid: str(process.env.TWILIO_ACCOUNT_SID),
  twilioAuthToken: str(process.env.TWILIO_AUTH_TOKEN),
  twilioFromNumber: str(process.env.TWILIO_FROM_NUMBER),

  // Fiskalizacija
  fiscalizationProvider: str(process.env.FISCALIZATION_PROVIDER, "mock"),
  fiscalOib: str(process.env.FISCAL_OIB),
  fiscalBusinessSpace: str(process.env.FISCAL_BUSINESS_SPACE, "POSL1"),
  fiscalCashRegister: str(process.env.FISCAL_CASH_REGISTER, "1"),

  // Opcijski moduli
  featureMemberships: bool(process.env.FEATURE_MEMBERSHIPS, true),
  featureLoyalty: bool(process.env.FEATURE_LOYALTY, true),
  featureOpenPlay: bool(process.env.FEATURE_OPEN_PLAY, true),
};
