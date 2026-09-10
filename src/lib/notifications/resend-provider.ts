import { env } from "@/lib/env";
import type { NotificationService, Poruka, RezultatSlanja } from "./types";

/**
 * Stvarni provider notifikacija:
 *  - email preko Resend REST API-ja (https://resend.com),
 *  - SMS preko Twilio REST API-ja.
 * Koristi `fetch` (bez dodatnih ovisnosti). Aktivira se kad je
 * `NOTIFICATION_PROVIDER=resend` (vidi `getNotificationService()`).
 * Ako ključ za određeni kanal nedostaje, vraća grešku (poziv se svejedno
 * zabilježi u `NotificationLog`).
 */
export class ResendNotificationProvider implements NotificationService {
  async posalji(poruka: Poruka): Promise<RezultatSlanja> {
    if (poruka.kanal === "sms") return this.posaljiSms(poruka);
    return this.posaljiEmail(poruka);
  }

  private async posaljiEmail(poruka: Poruka): Promise<RezultatSlanja> {
    if (!env.resendApiKey) return { status: "greska", greska: "RESEND_API_KEY nije postavljen" };
    try {
      const res = await fetch("https://api.resend.com/emails", {
        method: "POST",
        headers: {
          Authorization: `Bearer ${env.resendApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          from: env.emailFrom,
          reply_to: env.emailReplyTo,
          to: poruka.primatelj,
          subject: poruka.naslov ?? "Kidzona",
          // Jednostavan tekst → HTML (zadržava prijelome redaka).
          html: `<pre style="font-family:inherit;white-space:pre-wrap">${escapeHtml(poruka.tijelo)}</pre>`,
          text: poruka.tijelo,
        }),
      });
      if (!res.ok) return { status: "greska", greska: `Resend ${res.status}` };
      const data = (await res.json()) as { id?: string };
      return { status: "poslano", providerRef: data.id };
    } catch (e) {
      return { status: "greska", greska: String(e) };
    }
  }

  private async posaljiSms(poruka: Poruka): Promise<RezultatSlanja> {
    if (!env.twilioAccountSid || !env.twilioAuthToken || !env.twilioFromNumber) {
      return { status: "greska", greska: "Twilio nije konfiguriran" };
    }
    try {
      const auth = Buffer.from(`${env.twilioAccountSid}:${env.twilioAuthToken}`).toString("base64");
      const body = new URLSearchParams({ To: poruka.primatelj, From: env.twilioFromNumber, Body: poruka.tijelo });
      const res = await fetch(`https://api.twilio.com/2010-04-01/Accounts/${env.twilioAccountSid}/Messages.json`, {
        method: "POST",
        headers: { Authorization: `Basic ${auth}`, "Content-Type": "application/x-www-form-urlencoded" },
        body,
      });
      if (!res.ok) return { status: "greska", greska: `Twilio ${res.status}` };
      const data = (await res.json()) as { sid?: string };
      return { status: "poslano", providerRef: data.sid };
    } catch (e) {
      return { status: "greska", greska: String(e) };
    }
  }
}

function escapeHtml(s: string): string {
  return s.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
}
