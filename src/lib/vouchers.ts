/**
 * Pokloni-bonovi (gift vouchers): kupnja online i iskorištenje pri rezervaciji.
 */
import { prisma } from "@/lib/prisma";
import { kodBona } from "@/lib/codes";
import { getPaymentService } from "@/lib/payments";
import { posaljiIZabiljezi } from "@/lib/notifications";
import { formatEur } from "@/lib/format";
import { hr } from "@/i18n/hr";

export interface KupnjaBonaInput {
  iznosCents: number;
  purchaserName: string;
  purchaserEmail: string;
  recipientName?: string;
  message?: string;
}

/** Kupnja bona: (mock) naplata, kreiranje bona i email kupcu s kodom. */
export async function kupiBon(input: KupnjaBonaInput) {
  const placanje = getPaymentService();
  const naplata = await placanje.naplati({
    amountCents: input.iznosCents,
    kind: "bon",
    opis: "Poklon-bon Kidzona",
    email: input.purchaserEmail,
  });
  if (!naplata.ok) throw new Error("Plaćanje bona nije uspjelo");

  const bon = await prisma.voucher.create({
    data: {
      code: kodBona(),
      initialCents: input.iznosCents,
      balanceCents: input.iznosCents,
      status: "aktivan",
      purchaserName: input.purchaserName,
      purchaserEmail: input.purchaserEmail,
      recipientName: input.recipientName,
      message: input.message,
    },
  });

  await posaljiIZabiljezi({
    tip: "potvrda",
    kanal: "email",
    primatelj: input.purchaserEmail,
    naslov: `Vaš poklon-bon ${bon.code} — ${hr.brand.naziv}`,
    tijelo: [
      `Poštovani/a ${input.purchaserName},`,
      ``,
      `hvala na kupnji poklon-bona u vrijednosti ${formatEur(input.iznosCents)}.`,
      ``,
      `Kod bona: ${bon.code}`,
      input.recipientName ? `Za: ${input.recipientName}` : null,
      input.message ? `Poruka: ${input.message}` : null,
      ``,
      `Kod bona unosi se pri rezervaciji proslave.`,
    ].filter((l) => l !== null).join("\n"),
  });

  return bon;
}

export interface ProvjeraBona {
  valid: boolean;
  code?: string;
  balanceCents?: number;
  razlog?: string;
}

/** Provjera bona po kodu (za prikaz prije iskorištenja). */
export async function provjeriBon(code: string): Promise<ProvjeraBona> {
  const bon = await prisma.voucher.findUnique({ where: { code: code.trim().toUpperCase() } });
  if (!bon) return { valid: false, razlog: "Bon ne postoji." };
  if (bon.status !== "aktivan" || bon.balanceCents <= 0) return { valid: false, razlog: "Bon je iskorišten ili istekao." };
  if (bon.expiresAt && bon.expiresAt < new Date()) return { valid: false, razlog: "Bon je istekao." };
  return { valid: true, code: bon.code, balanceCents: bon.balanceCents };
}
