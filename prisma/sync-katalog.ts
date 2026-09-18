/**
 * Dopunjava bazu igraonicama, paketima i temama iz `prisma/katalog.ts`.
 *
 * Katalog je polazna točka za praznu bazu, a NE izvor istine za postojeću:
 * paketi se svakodnevno uređuju u administraciji (cijene, opisi, sadržaj), pa
 * bi prepisivanje po katalogu tiho poništilo te izmjene. Zato skripta samo
 * DODAJE ono čega u bazi nema, a postojeće zapise nikad ne dira.
 *
 *   npm run db:sync-katalog              → pregled (ništa se ne zapisuje)
 *   npm run db:sync-katalog -- --potvrdi → zapisuje ono što nedostaje
 *
 * Za uređivanje postojećih paketa koristite administraciju (/admin/paketi).
 */
import { PrismaClient } from "@prisma/client";
import { NEAKTIVNI_DODACI, PAKETI, SOBE, TEME } from "./katalog";

const prisma = new PrismaClient();
const POTVRDA = process.argv.includes("--potvrdi");

async function main() {
  console.log(POTVRDA ? "✍️  Dodajem ono čega u bazi nema.\n" : "🔍 Pregled (ništa se ne zapisuje). Za zapis dodajte `-- --potvrdi`.\n");
  let novih = 0;
  let postojecih = 0;

  const sobaIds = new Map<string, string>();
  for (const { slug, ...s } of SOBE) {
    const postojeca = await prisma.room.findUnique({ where: { slug } });
    if (postojeca) {
      sobaIds.set(slug, postojeca.id);
      postojecih++;
      continue;
    }
    console.log(`🏠 NEDOSTAJE  igraonica ${s.name} (${slug})`);
    novih++;
    if (POTVRDA) {
      const soba = await prisma.room.create({ data: { slug, ...s } });
      sobaIds.set(slug, soba.id);
    }
  }

  for (const { slug, roomSlug, ...p } of PAKETI) {
    if (await prisma.package.findUnique({ where: { slug } })) {
      postojecih++;
      continue;
    }
    console.log(`🎁 NEDOSTAJE  paket ${roomSlug} / ${p.name} (${slug})`);
    novih++;
    if (POTVRDA) {
      const roomId = sobaIds.get(roomSlug);
      if (!roomId) throw new Error(`Paket ${slug}: nepoznata igraonica ${roomSlug}`);
      await prisma.package.create({ data: { slug, ...p, roomId } });
    }
  }

  for (const { slug, ...t } of TEME) {
    if (await prisma.theme.findUnique({ where: { slug } })) {
      postojecih++;
      continue;
    }
    console.log(`${t.emoji} NEDOSTAJE  tema ${t.name} (${slug})`);
    novih++;
    if (POTVRDA) await prisma.theme.create({ data: { slug, ...t } });
  }

  // Jedina namjerna deaktivacija: dodaci s izričitog popisa u katalogu.
  const dodaciOff = await prisma.addOn.findMany({
    where: { slug: { in: NEAKTIVNI_DODACI }, active: true },
    select: { name: true, slug: true },
  });
  for (const d of dodaciOff) console.log(`⚠️  DEAKTIVIRA SE dodatak ${d.name} (${d.slug})`);
  if (POTVRDA && dodaciOff.length > 0) {
    await prisma.addOn.updateMany({ where: { slug: { in: dodaciOff.map((d) => d.slug) } }, data: { active: false } });
  }

  const ukupno = novih + dodaciOff.length;
  console.log(`\n${postojecih} zapisa već postoji i ostaje netaknuto (uređuju se u administraciji).`);
  if (ukupno === 0) console.log("✅ Ništa ne nedostaje.");
  else if (POTVRDA) console.log(`✅ Zapisano: ${ukupno}.`);
  else console.log(`⏹️  ${ukupno} zapisa nedostaje. Za zapis: npm run db:sync-katalog -- --potvrdi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
