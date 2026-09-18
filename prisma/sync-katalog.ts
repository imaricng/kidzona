/**
 * Sinkronizira igraonice i pakete iz `prisma/katalog.ts` u postojeću bazu BEZ
 * brisanja podataka: upsert po slugu, a igraonice i paketi kojih nema u katalogu
 * se deaktiviraju (postojeće rezervacije ostaju netaknute).
 *
 * Upsert ide po slugu i prepisuje nazive, cijene i sadržaj paketa, pa razlika
 * između kataloga i onoga što je netko u međuvremenu promijenio u administraciji
 * znači gubitak tih izmjena. Zato skripta bez potvrde samo ISPISUJE razlike:
 *
 *   npm run db:sync-katalog              → pregled (ništa se ne zapisuje)
 *   npm run db:sync-katalog -- --potvrdi → primjena
 */
import { PrismaClient } from "@prisma/client";
import { NEAKTIVNI_DODACI, PAKETI, SOBE, TEME } from "./katalog";

const prisma = new PrismaClient();
const POTVRDA = process.argv.includes("--potvrdi");

/** Polja u kojima se zapis razlikuje od kataloga (za pregled prije pisanja). */
function razlike(postojeci: Record<string, unknown>, zeljeni: Record<string, unknown>): string[] {
  return Object.entries(zeljeni)
    .filter(([k, v]) => JSON.stringify(postojeci[k]) !== JSON.stringify(v))
    .map(([k, v]) => `${k}: ${JSON.stringify(postojeci[k])} → ${JSON.stringify(v)}`);
}

async function main() {
  console.log(POTVRDA ? "✍️  Primjena kataloga na bazu.\n" : "🔍 Pregled (ništa se ne zapisuje). Za primjenu dodajte `-- --potvrdi`.\n");
  let izmjena = 0;

  const sobaIds = new Map<string, string>();
  for (const { slug, ...s } of SOBE) {
    const postojeca = await prisma.room.findUnique({ where: { slug } });
    const promjene = postojeca ? razlike(postojeca, { ...s, active: true }) : null;
    if (!postojeca) console.log(`🏠 NOVO  ${s.name} (${slug})`);
    else if (promjene?.length) console.log(`🏠 MIJENJA SE  ${postojeca.name} (${slug})\n   ${promjene.join("\n   ")}`);
    if (!postojeca || promjene?.length) izmjena++;

    if (POTVRDA) {
      const soba = await prisma.room.upsert({ where: { slug }, update: { ...s, active: true }, create: { slug, ...s } });
      sobaIds.set(slug, soba.id);
    } else if (postojeca) {
      sobaIds.set(slug, postojeca.id);
    }
  }

  for (const { slug, roomSlug, ...p } of PAKETI) {
    const roomId = sobaIds.get(roomSlug);
    if (!roomId) {
      if (POTVRDA) throw new Error(`Paket ${slug}: nepoznata igraonica ${roomSlug}`);
      console.log(`🎁 NOVO  ${p.name} (${slug}) — igraonica ${roomSlug} još ne postoji`);
      izmjena++;
      continue;
    }
    const postojeci = await prisma.package.findUnique({ where: { slug } });
    const promjene = postojeci ? razlike(postojeci, { ...p, roomId, active: true }) : null;
    if (!postojeci) console.log(`🎁 NOVO  ${roomSlug} / ${p.name} (${slug})`);
    else if (promjene?.length) console.log(`🎁 MIJENJA SE  ${roomSlug} / ${postojeci.name} (${slug})\n   ${promjene.join("\n   ")}`);
    if (!postojeci || promjene?.length) izmjena++;

    if (POTVRDA) {
      await prisma.package.upsert({ where: { slug }, update: { ...p, roomId, active: true }, create: { slug, ...p, roomId } });
    }
  }

  // Teme se samo dodaju/ažuriraju (teme dodane u administraciji ostaju netaknute).
  for (const { slug, ...t } of TEME) {
    const postojeca = await prisma.theme.findUnique({ where: { slug } });
    const promjene = postojeca ? razlike(postojeca, { ...t, active: true }) : null;
    if (!postojeca) console.log(`${t.emoji} NOVO  tema ${t.name} (${slug})`);
    else if (promjene?.length) console.log(`${t.emoji} MIJENJA SE  tema ${postojeca.name} (${slug})\n   ${promjene.join("\n   ")}`);
    if (!postojeca || promjene?.length) izmjena++;

    if (POTVRDA) await prisma.theme.upsert({ where: { slug }, update: { ...t, active: true }, create: { slug, ...t } });
  }

  // Deaktivacije se uvijek imenuju — nikad tiho, jer nestaju s javnih stranica.
  const [sobeOff, paketiOff, dodaciOff] = await Promise.all([
    prisma.room.findMany({ where: { slug: { notIn: SOBE.map((s) => s.slug) }, active: true }, select: { name: true, slug: true } }),
    prisma.package.findMany({ where: { slug: { notIn: PAKETI.map((p) => p.slug) }, active: true }, select: { name: true, slug: true } }),
    prisma.addOn.findMany({ where: { slug: { in: NEAKTIVNI_DODACI }, active: true }, select: { name: true, slug: true } }),
  ]);
  for (const s of sobeOff) console.log(`⚠️  DEAKTIVIRA SE igraonica ${s.name} (${s.slug}) — nema je u katalogu`);
  for (const p of paketiOff) console.log(`⚠️  DEAKTIVIRA SE paket ${p.name} (${p.slug}) — nema ga u katalogu`);
  for (const d of dodaciOff) console.log(`⚠️  DEAKTIVIRA SE dodatak ${d.name} (${d.slug})`);
  izmjena += sobeOff.length + paketiOff.length + dodaciOff.length;

  if (POTVRDA) {
    await prisma.room.updateMany({ where: { slug: { in: sobeOff.map((s) => s.slug) } }, data: { active: false } });
    await prisma.package.updateMany({ where: { slug: { in: paketiOff.map((p) => p.slug) } }, data: { active: false } });
    await prisma.addOn.updateMany({ where: { slug: { in: dodaciOff.map((d) => d.slug) } }, data: { active: false } });
  }

  if (izmjena === 0) console.log("✅ Baza već odgovara katalogu — nema izmjena.");
  else if (POTVRDA) console.log(`\n✅ Primijenjeno: ${izmjena} izmjena.`);
  else console.log(`\n⏹️  ${izmjena} izmjena NIJE zapisano. Provjerite popis, pa pokrenite: npm run db:sync-katalog -- --potvrdi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
