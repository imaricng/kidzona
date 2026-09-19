import { describe, it, expect } from "vitest";
import { bookingSchema } from "../src/lib/validation";

const POTPUN = {
  dateISO: "2027-01-30",
  slotStart: "14:00",
  roomId: "soba1",
  packageId: "paket1",
  numChildren: 9,
  parentName: "Darija Marić",
  email: "roditelj@primjer.hr",
  phone: "0952222883",
  childName: "Mia",
  childBirthDate: "2019-05-12",
  gdprConsent: true,
  waiverAccepted: true,
};

describe("bookingSchema", () => {
  it("prihvaća potpun upit", () => {
    expect(bookingSchema.safeParse(POTPUN).success).toBe(true);
  });

  it.each([
    ["phone", "Unesite broj telefona"],
    ["childName", "Unesite ime djeteta"],
    ["childBirthDate", "Unesite datum rođenja djeteta"],
    ["parentName", "Unesite ime i prezime roditelja"],
    ["email", "Unesite adresu e-pošte"],
  ])("polje koje nedostaje (%s) daje razumljivu poruku, ne 'Required'", (polje, poruka) => {
    const bez: Record<string, unknown> = { ...POTPUN };
    delete bez[polje];
    const r = bookingSchema.safeParse(bez);
    expect(r.success).toBe(false);
    if (!r.success) {
      const poruke = r.error.errors.map((e) => e.message);
      expect(poruke).toContain(poruka);
      expect(poruke).not.toContain("Required");
    }
  });

  it("privole se ne mogu izostaviti", () => {
    for (const polje of ["gdprConsent", "waiverAccepted"]) {
      const bez: Record<string, unknown> = { ...POTPUN };
      delete bez[polje];
      expect(bookingSchema.safeParse(bez).success).toBe(false);
    }
  });
});
