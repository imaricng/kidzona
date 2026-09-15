import { z } from "zod";

/** Zod sheme za validaciju ulaza na API-ju i u administraciji (server je mjerodavan). */

const DATUM = /^\d{4}-\d{2}-\d{2}$/;
const VRIJEME = /^\d{2}:\d{2}$/;

/** Upit za proslavu s weba. */
export const bookingSchema = z.object({
  dateISO: z.string().regex(DATUM, "Neispravan datum"),
  slotStart: z.string().regex(VRIJEME),
  slotEnd: z.string().regex(VRIJEME).optional(), // kraj računa server iz paketa
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
  childBirthDate: z.string().regex(DATUM, "Unesite datum rođenja djeteta"),
  napomene: z.string().optional(),
  gdprConsent: z.literal(true, { errorMap: () => ({ message: "Privola za obradu podataka je obvezna." }) }),
  marketingConsent: z.boolean().default(false),
  waiverAccepted: z.literal(true, { errorMap: () => ({ message: "Potrebno je prihvatiti izjavu roditelja." }) }),
  voucherCode: z.string().max(40).nullable().optional(),
});

export type BookingInput = z.infer<typeof bookingSchema>;

/** Ručni unos i izmjena rezervacije u administraciji (vrijednosti iz obrasca). */
export const adminRezervacijaSchema = z
  .object({
    dateISO: z.string().regex(DATUM, "Unesite datum proslave."),
    slotStart: z.string().regex(VRIJEME, "Unesite početak proslave."),
    roomId: z.string().min(1, "Odaberite igraonicu."),
    packageId: z.string().min(1, "Odaberite paket."),
    themeId: z
      .string()
      .optional()
      .transform((v) => v || null),
    numChildren: z.coerce.number().int().min(1, "Unesite broj djece."),
    numAdults: z.coerce.number().int().min(0, "Broj odraslih ne može biti negativan.").default(0),
    parentName: z.string().trim().min(2, "Unesite ime i prezime roditelja."),
    email: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || z.string().email().safeParse(v).success, "Neispravna adresa e-pošte."),
    phone: z.string().trim().default(""),
    childName: z.string().trim().default(""),
    childBirthDate: z
      .string()
      .default("")
      .refine((v) => v === "" || DATUM.test(v), "Neispravan datum rođenja."),
    napomene: z.string().trim().default(""),
    // Samo za pakete s cijenom po dogovoru; prazno = iznos još nije dogovoren.
    dogovorenaCijena: z
      .string()
      .trim()
      .default("")
      .refine((v) => v === "" || /^\d+([.,]\d{1,2})?$/.test(v), "Dogovorena cijena mora biti iznos u eurima, npr. 450 ili 450,50."),
  })
  .refine((d) => d.email !== "" || d.phone.length >= 6, { message: "Unesite e-poštu ili telefon roditelja.", path: ["email"] });

export type AdminRezervacijaInput = z.infer<typeof adminRezervacijaSchema>;

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
        birthDate: z.string().regex(DATUM),
        allergies: z.string().optional(),
      }),
    )
    .default([]),
});

export type RegistracijaSchemaInput = z.infer<typeof registracijaSchema>;
