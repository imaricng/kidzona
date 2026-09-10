import { z } from "zod";

/** Zod sheme za validaciju ulaza na API-ju (server je mjerodavan). */

export const bookingSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Neispravan datum"),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  slotEnd: z.string().regex(/^\d{2}:\d{2}$/),
  roomId: z.string().min(1),
  secondRoomId: z.string().min(1).nullable().optional(),
  packageId: z.string().min(1),
  themeId: z.string().min(1).nullable().optional(),
  numChildren: z.number().int().min(1).max(40),
  numAdults: z.number().int().min(0).max(60).default(0),
  dodaci: z
    .array(z.object({ id: z.string().min(1), quantity: z.number().int().min(0).max(50) }))
    .default([]),
  parentName: z.string().min(2, "Unesite ime i prezime"),
  email: z.string().email("Neispravna adresa e-pošte"),
  phone: z.string().min(6, "Unesite broj telefona"),
  childName: z.string().min(2, "Unesite ime djeteta"),
  childBirthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, "Unesite datum rođenja djeteta"),
  napomene: z.string().optional(),
  gdprConsent: z.literal(true, { errorMap: () => ({ message: "Privola za obradu podataka je obvezna." }) }),
  marketingConsent: z.boolean().default(false),
  waiverAccepted: z.literal(true, { errorMap: () => ({ message: "Potrebno je prihvatiti izjavu roditelja." }) }),
  platiPuniIznos: z.boolean().default(false),
  voucherCode: z.string().max(40).nullable().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

export const voucherPurchaseSchema = z.object({
  iznosCents: z.number().int().min(1000).max(100000), // 10–1000 €
  purchaserName: z.string().min(2),
  purchaserEmail: z.string().email(),
  recipientName: z.string().optional(),
  message: z.string().max(300).optional(),
});

export type VoucherPurchaseInput = z.infer<typeof voucherPurchaseSchema>;

export const registracijaSchema = z.object({
  parentName: z.string().min(2, "Unesite ime i prezime"),
  email: z.string().email("Neispravna adresa e-pošte"),
  password: z.string().min(6, "Lozinka mora imati barem 6 znakova"),
  phone: z.string().optional(),
  marketingConsent: z.boolean().default(false),
  djeca: z
    .array(
      z.object({
        firstName: z.string().min(1),
        birthDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
        allergies: z.string().optional(),
      }),
    )
    .default([]),
});

export type RegistracijaSchemaInput = z.infer<typeof registracijaSchema>;
