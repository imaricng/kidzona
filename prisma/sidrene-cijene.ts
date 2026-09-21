/**
 * Popunjavanje sidrenih (dodatnih) cijena za postojeće pakete i dodatke.
 *
 *   npm run sidrene-cijene              → pregled: što nedostaje i što bi se upisalo
 *   npm run sidrene-cijene -- --potvrdi → upisuje
 *
 * POLAZI OD PRETPOSTAVKE koju morate sami potvrditi: da stavci od referentnog
 * datuma (10. 9. 2026.) NIJE mijenjana cijena. Dopis Hrvatske obrtničke komore
 * kaže da je tada današnja cijena ujedno i sidrena. Za stavke kojima je cijena
 * u međuvremenu mijenjana morate upisati iznos koji je vrijedio na taj dan —
 * to se radi ručno u administraciji (Paketi, dodaci i teme).
 *
 * Skripta nikad ne prepisuje već upisanu sidrenu cijenu.
 */
import { PrismaClient } from "@prisma/client";
import { REFERENTNI_DATUM } from "../src/lib/sidrena-cijena";

const prisma = new PrismaClient();
const POTVRDA = process.argv.includes("--potvrdi");
const eur = (c: number) => `${(c / 100).toFixed(2).replace(".", ",")} €`;

async function main() {
  console.log(
    POTVRDA
      ? `✍️  Upisujem sidrene cijene s datumom ${REFERENTNI_DATUM}.\n`
      : `🔍 Pregled (ništa se ne zapisuje). Za upis dodajte \`-- --potvrdi\`.\n`,
  );
  console.log("Pretpostavka: stavkama niže cijena nije mijenjana od 10. 9. 2026.");
  console.log("Ako jest — nemojte pokretati upis, nego iznos unesite ručno u administraciji.\n");

  const [paketi, dodaci] = await Promise.all([
    prisma.package.findMany({ orderBy: { sortOrder: "asc" }, include: { room: true } }),
    prisma.addOn.findMany({ orderBy: { sortOrder: "asc" } }),
  ]);

  let nedostaje = 0;

  console.log("--- Paketi ---");
  for (const p of paketi) {
    const soba = p.room?.name ?? "sve igraonice";
    if (p.sidrenaCijenaCents) {
      console.log(`  ✅ ${soba} / ${p.name}: već upisano (${p.sidrenaDatum} ${eur(p.sidrenaCijenaCents)})`);
      continue;
    }
    if (p.cijenaPoDogovoru) {
      console.log(`  ⏭️  ${soba} / ${p.name}: cijena po dogovoru — nema fiksnog iznosa za isticanje`);
      continue;
    }
    nedostaje++;
    console.log(
      `  ➕ ${soba} / ${p.name}: ${eur(p.basePriceCents)}` +
        (p.perChildCents > 0 ? ` + ${eur(p.perChildCents)} po dodatnom djetetu` : ""),
    );
    if (POTVRDA) {
      await prisma.package.update({
        where: { id: p.id },
        data: {
          sidrenaCijenaCents: p.basePriceCents || null,
          sidrenaPerChildCents: p.perChildCents || null,
          sidrenaDatum: REFERENTNI_DATUM,
        },
      });
    }
  }

  console.log("\n--- Dodaci ---");
  for (const d of dodaci) {
    if (d.sidrenaCijenaCents) {
      console.log(`  ✅ ${d.name}: već upisano (${d.sidrenaDatum} ${eur(d.sidrenaCijenaCents)})`);
      continue;
    }
    if (d.priceCents <= 0) {
      console.log(`  ⏭️  ${d.name}: cijena 0 — dodatna cijena ne smije biti 0,00 €`);
      continue;
    }
    nedostaje++;
    console.log(`  ➕ ${d.name}: ${eur(d.priceCents)}`);
    if (POTVRDA) {
      await prisma.addOn.update({
        where: { id: d.id },
        data: { sidrenaCijenaCents: d.priceCents, sidrenaDatum: REFERENTNI_DATUM },
      });
    }
  }

  console.log("");
  if (nedostaje === 0) console.log("✅ Sve stavke imaju sidrenu cijenu.");
  else if (POTVRDA) console.log(`✅ Upisano za ${nedostaje} stavki.`);
  else console.log(`⏹️  ${nedostaje} stavki nema sidrenu cijenu. Za upis: npm run sidrene-cijene -- --potvrdi`);
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();
  });
