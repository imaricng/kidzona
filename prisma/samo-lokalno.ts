/**
 * Zaštita od slučajnog brisanja prave baze: skripte koje brišu sve podatke
 * (`db:seed`, `db:reset`) smiju raditi samo nad lokalnom bazom, osim uz
 * DOPUSTI_BRISANJE_BAZE=da.
 */
export function provjeriLokalnuBazu(): void {
  if (!process.env.DATABASE_URL) {
    try {
      process.loadEnvFile(".env");
    } catch {
      /* .env ne postoji */
    }
  }
  const url = process.env.DATABASE_URL ?? "";
  const lokalna = url.startsWith("file:") || /@(localhost|127\.0\.0\.1)(:|\/)/.test(url);
  if (!lokalna && process.env.DOPUSTI_BRISANJE_BAZE !== "da") {
    console.error("⛔ DATABASE_URL ne pokazuje na lokalnu bazu, a ova skripta briše sve podatke — zaustavljeno.");
    console.error("   Ako to stvarno želiš, pokreni je uz DOPUSTI_BRISANJE_BAZE=da.");
    process.exit(1);
  }
}

if (require.main === module) provjeriLokalnuBazu();
