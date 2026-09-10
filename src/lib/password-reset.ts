/**
 * "Zaboravljena lozinka" — generiranje i provjera tokena za reset te postavljanje
 * nove lozinke. Token se šalje emailom (NotificationService). Iz sigurnosnih
 * razloga zahtjev za reset nikad ne otkriva postoji li email.
 */
import { randomBytes } from "crypto";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { hashPassword } from "@/lib/password";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { hr } from "@/i18n/hr";

const TRAJANJE_MS = 60 * 60 * 1000; // 1 sat

/** Kreira token i šalje email s linkom za reset (ako korisnik postoji). */
export async function zatraziReset(email: string): Promise<void> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return; // ne otkrivaj postojanje računa

  const token = randomBytes(32).toString("hex");
  await prisma.passwordResetToken.create({
    data: { userId: user.id, token, expiresAt: new Date(Date.now() + TRAJANJE_MS) },
  });

  const link = `${env.appUrl}/portal/reset/${token}`;
  await posaljiIZabiljezi({
    tip: "potvrda",
    kanal: "email",
    primatelj: email,
    naslov: `Nova lozinka — ${hr.brand.naziv}`,
    tijelo: [
      `Poštovani/a ${user.name},`,
      ``,
      `zatraženo je postavljanje nove lozinke za vaš račun. Novu lozinku postavite putem sljedeće poveznice (vrijedi 1 sat):`,
      link,
      ``,
      `Ako to niste zatražili vi, zanemarite ovu poruku.`,
    ].join("\n"),
  });
}

export async function tokenValjan(token: string): Promise<boolean> {
  const t = await prisma.passwordResetToken.findUnique({ where: { token } });
  return !!t && !t.usedAt && t.expiresAt > new Date();
}

/** Postavlja novu lozinku ako je token valjan; označava token iskorištenim. */
export async function postaviNovuLozinku(token: string, novaLozinka: string): Promise<boolean> {
  const t = await prisma.passwordResetToken.findUnique({ where: { token } });
  if (!t || t.usedAt || t.expiresAt < new Date()) return false;
  if (novaLozinka.length < 6) return false;

  await prisma.$transaction([
    prisma.user.update({ where: { id: t.userId }, data: { passwordHash: hashPassword(novaLozinka) } }),
    prisma.passwordResetToken.update({ where: { id: t.id }, data: { usedAt: new Date() } }),
  ]);
  return true;
}
