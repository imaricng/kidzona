/**
 * Notifikacijski servis — javni ulaz. Odabire providera prema env-u i nudi
 * visokorazinske okidače automatizacije koji ujedno zapisuju u `NotificationLog`.
 *
 * Zamjena providera u produkciji: dodaj granu u `getNotificationService()`.
 */
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { ConsoleNotificationProvider } from "./console-provider";
import type { NotificationService, Poruka } from "./types";

let instanca: NotificationService | null = null;

export function getNotificationService(): NotificationService {
  if (instanca) return instanca;
  switch (env.notificationProvider) {
    case "smtp": {
      // Lijeni import — provider koristi nodemailer (Gmail SMTP).
      const { SmtpNotificationProvider } = require("./smtp-provider") as typeof import("./smtp-provider");
      instanca = new SmtpNotificationProvider();
      break;
    }
    case "resend": {
      // Lijeni import — provider koristi Resend (email) i Twilio (SMS) preko fetch-a.
      const { ResendNotificationProvider } = require("./resend-provider") as typeof import("./resend-provider");
      instanca = new ResendNotificationProvider();
      break;
    }
    case "console":
    default:
      instanca = new ConsoleNotificationProvider();
  }
  return instanca;
}

/**
 * Pošalji poruku kroz aktivni provider i zabilježi je u bazu (revizijski trag +
 * vidljivost u adminu). Greška u slanju ne ruši poslovni tok — samo se logira.
 */
export async function posaljiIZabiljezi(poruka: Poruka): Promise<void> {
  const servis = getNotificationService();
  let rezultat;
  try {
    rezultat = await servis.posalji(poruka);
  } catch (e) {
    rezultat = { status: "greska" as const, greska: String(e) };
  }
  try {
    await prisma.notificationLog.create({
      data: {
        type: poruka.tip,
        channel: poruka.kanal,
        recipient: poruka.primatelj,
        subject: poruka.naslov,
        // Razlog neuspjeha ide ispred teksta — inače se u administraciji vidi
        // samo „greška", bez traga zašto poruka nije otišla.
        body: rezultat.status === "greska" ? `GREŠKA PRI SLANJU: ${rezultat.greska ?? "nepoznato"}\n\n${poruka.tijelo}` : poruka.tijelo,
        reservationId: poruka.reservationId,
        status: rezultat.status,
      },
    });
  } catch {
    // U seedu/testu baza možda nije dostupna — ne rušimo proces.
  }
}

/**
 * Je li ista poruka ovoj rezervaciji poslana u zadnje dvije minute? Štiti od
 * dvostrukog klika na gumb slanja u administraciji.
 */
export async function nedavnoPoslano(reservationId: string, tip: string, sekundi = 120): Promise<boolean> {
  const n = await prisma.notificationLog.count({
    where: { reservationId, type: tip, channel: "email", status: { not: "greska" }, createdAt: { gte: new Date(Date.now() - sekundi * 1000) } },
  });
  return n > 0;
}

export * from "./types";
