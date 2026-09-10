import type { NotificationService, Poruka, RezultatSlanja } from "./types";

/**
 * DEV provider — poruke ispisuje u konzolu (čitljivo, s razdjelnicima).
 * Ovo je default kad nije konfiguriran stvarni email/SMS provider.
 *
 * Za produkciju: implementiraj npr. `ResendNotificationProvider` (email) i
 * `TwilioNotificationProvider` (SMS) s istim interfaceom i odaberi ga u
 * `getNotificationService()` prema `env.notificationProvider`.
 */
export class ConsoleNotificationProvider implements NotificationService {
  async posalji(poruka: Poruka): Promise<RezultatSlanja> {
    const crta = "─".repeat(64);
    // eslint-disable-next-line no-console
    console.log(
      [
        "",
        crta,
        `📨  OBAVIJEST (${poruka.kanal.toUpperCase()}) — tip: ${poruka.tip}`,
        `Za:      ${poruka.primatelj}`,
        poruka.naslov ? `Naslov:  ${poruka.naslov}` : null,
        crta,
        poruka.tijelo,
        crta,
        "",
      ]
        .filter(Boolean)
        .join("\n"),
    );
    return { status: "logirano" };
  }
}
