/**
 * Sinkronizira igraonice i pakete iz `prisma/katalog.ts` u postojeću bazu BEZ
 * brisanja podataka: upsert po slugu, a igraonice i paketi kojih nema u katalogu
 * se deaktiviraju (postojeće rezervacije ostaju netaknute).
 *
 * Pokretanje: `npm run db:sync-katalog`
 */
import { PrismaClient } from "@prisma/client";
import { NEAKTIVNI_DODACI, PAKETI, SOBE, TEME } from "./katalog";

const prisma = new PrismaClient();

async function main() {
  const sobaIds = new Map<string, string>();
  for (const { slug, ...s } of SOBE) {
    const soba = await prisma.room.upsert({
      where: { slug },
      update: { ...s, active: true },
      create: { slug, ...s },
    });
    sobaIds.set(slug, soba.id);
    console.log(`🏠 ${soba.name}`);
  }

  for (const { slug, roomSlug, ...p } of PAKETI) {
    const roomId = sobaIds.get(roomSlug);
    if (!roomId) throw new Error(`Paket ${slug}: nepoznata igraonica ${roomSlug}`);
    const paket = await prisma.package.upsert({
      where: { slug },
      update: { ...p, roomId, active: true },
      create: { slug, ...p, roomId },
    });
    console.log(`🎁 ${roomSlug} / ${paket.name} — ${(paket.basePriceCents / 100).toFixed(2).replace(".", ",")} €, ${paket.durationMin} min, do ${paket.maxChildren} djece`);
  }

  // Teme se samo dodaju/ažuriraju (teme dodane u administraciji ostaju netaknute).
  for (const { slug, ...t } of TEME) {
    const tema = await prisma.theme.upsert({ where: { slug }, update: { ...t, active: true }, create: { slug, ...t } });
    console.log(`${tema.emoji} ${tema.name}`);
  }

  const sobeOff = await prisma.room.updateMany({
    where: { slug: { notIn: SOBE.map((s) => s.slug) }, active: true },
    data: { active: false },
  });
  const paketiOff = await prisma.package.updateMany({
    where: { slug: { notIn: PAKETI.map((p) => p.slug) }, active: true },
    data: { active: false },
  });
  const dodaciOff = await prisma.addOn.updateMany({
    where: { slug: { in: NEAKTIVNI_DODACI }, active: true },
    data: { active: false },
  });
  console.log(`✅ Deaktivirano: ${sobeOff.count} igraonica, ${paketiOff.count} paketa, ${dodaciOff.count} dodataka.`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
