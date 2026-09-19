import nodemailer, { type Transporter } from "nodemailer";
import { env } from "@/lib/env";
import type { NotificationService, Poruka, RezultatSlanja } from "./types";
import { tijeloUHtml } from "./html";

/**
 * Slanje e-pošte preko SMTP-a (Gmail račun igraonice). Aktivira se s
 * `NOTIFICATION_PROVIDER=smtp`.
 *
 * Gmail traži App Password (Google račun → Sigurnost → Potvrda u dva koraka →
 * Lozinke za aplikacije); obična lozinka računa na SMTP-u ne prolazi. Gmail i
 * inače prepisuje zaglavlje pošiljatelja u adresu kojom se prijavilo, pa se
 * šalje s `SMTP_USER`, a odgovori se usmjeravaju na `EMAIL_REPLY_TO`.
 *
 * SMS ovaj provider ne šalje — za to služi Twilio u `ResendNotificationProvider`.
 */
export class SmtpNotificationProvider implements NotificationService {
  private transporter: Transporter | null = null;

  private veza(): Transporter {
    if (!this.transporter) {
      this.transporter = nodemailer.createTransport({
        host: env.smtpHost,
        port: env.smtpPort,
        secure: env.smtpPort === 465, // 465 = implicitni TLS, 587 = STARTTLS
        auth: { user: env.smtpUser, pass: env.smtpPassword },
      });
    }
    return this.transporter;
  }

  async posalji(poruka: Poruka): Promise<RezultatSlanja> {
    if (poruka.kanal === "sms") {
      return { status: "greska", greska: "SMTP provider ne šalje SMS poruke." };
    }
    if (!env.smtpUser || !env.smtpPassword) {
      return { status: "greska", greska: "SMTP_USER ili SMTP_PASSWORD nije postavljen" };
    }
    try {
      const info = await this.veza().sendMail({
        from: `"Party Kidzona Nova Gradiška" <${env.smtpUser}>`,
        replyTo: env.emailReplyTo,
        to: poruka.primatelj,
        subject: poruka.naslov ?? "Kidzona",
        text: poruka.tijelo,
        html: tijeloUHtml(poruka.tijelo),
      });
      return { status: "poslano", providerRef: info.messageId };
    } catch (e) {
      return { status: "greska", greska: String(e) };
    }
  }

  /** Provjera postavki bez slanja poruke — koristi `npm run provjeri`. */
  async provjeriVezu(): Promise<void> {
    await this.veza().verify();
  }
}

