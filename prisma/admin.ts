/**
 * Stvara ili ažurira administratora bez diranja ostalih podataka.
 *
 * Pokretanje: ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run db:admin
 * (lozinka mora imati barem 12 znakova).
 */
import { PrismaClient } from "@prisma/client";
import { hashPassword } from "../src/lib/password";

const prisma = new PrismaClient();

async function main() {
  const email = (process.env.ADMIN_EMAIL ?? "").trim().toLowerCase();
  const lozinka = process.env.ADMIN_PASSWORD ?? "";
  if (!email.includes("@")) throw new Error("Postavi ADMIN_EMAIL.");
  if (lozinka.length < 12) throw new Error("ADMIN_PASSWORD mora imati barem 12 znakova.");

  const user = await prisma.user.upsert({
    where: { email },
    update: { passwordHash: hashPassword(lozinka), role: "admin" },
    create: { email, passwordHash: hashPassword(lozinka), name: "Administrator", role: "admin" },
  });
  console.log(`✅ Administrator spreman: ${user.email}`);
}

main()
  .catch((e) => {
    console.error(`⛔ ${e instanceof Error ? e.message : e}`);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
