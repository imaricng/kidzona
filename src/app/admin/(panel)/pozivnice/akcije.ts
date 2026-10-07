"use server";

import { revalidatePath } from "next/cache";
import { prisma } from "@/lib/prisma";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { hr } from "@/i18n/hr";

/**
 * Bilježi da je pozivnica poslana WhatsAppom.
 *
 * Poruku šalje osoblje iz WhatsAppa (aplikacija je ne šalje sama), pa se ovdje
 * samo zapisuje da je otišla — da se poslije zna tko je dobio pozivnicu i da je
 * nitko ne pošalje dvaput.
 */
export async function oznaciWhatsappPozivnicu(code: string): Promise<void> {
  await zahtijevajOsoblje();
  const r = await prisma.reservation.update({
    where: { code },
    data: { pozivnicaWhatsappAt: new Date(), pozivniceDigitalne: true },
    select: { id: true, phone: true, code: true },
  });
  await prisma.notificationLog.create({
    data: {
      type: "pozivnica",
      channel: "whatsapp",
      recipient: r.phone ?? "—",
      subject: `Pozivnica poslana WhatsAppom (${r.code})`,
      body: `Osoblje je pozivnicu poslalo WhatsAppom s poslovnog broja ${hr.kontakt.whatsappPoslovni}.`,
      reservationId: r.id,
      status: "rucno",
    },
  });
  revalidatePath("/admin/pozivnice");
  revalidatePath(`/admin/rezervacije/${code}`);
}
