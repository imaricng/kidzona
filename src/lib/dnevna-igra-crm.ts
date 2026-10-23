import { prisma } from "@/lib/prisma";
import { imeZaCrm } from "@/lib/dnevna-igra";

export type DopunaDnevneIgre = {
  email: string;
  rodendan: Date | null;
  privola: boolean;
};

/**
 * Povezuje dijete s dnevne igre s obitelji u CRM-u (po e-mailu roditelja).
 * Obitelj se pronađe ili stvori, dijete se doda kad znamo datum rođenja, a
 * povezuju se i svi raniji boravci istog djeteta (isti telefon i ime) koji
 * dosad nisu imali e-mail — roditelj ga često da tek pri drugom dolasku.
 *
 * Privola se samo dodaje: neoznačena kvačica ne briše privolu koju je
 * roditelj već dao (npr. pri rezervaciji rođendana).
 */
export async function poveziSCrm(dnevnaIgraId: string, dopuna: DopunaDnevneIgre): Promise<void> {
  await prisma.$transaction(async (tx) => {
    const boravak = await tx.dailyPlay.findUniqueOrThrow({ where: { id: dnevnaIgraId } });
    const sada = new Date();

    const obitelj = await tx.family.upsert({
      where: { email: dopuna.email },
      update: {
        phone: boravak.parentPhone,
        ...(dopuna.privola ? { marketingConsent: true, gdprConsentAt: sada } : {}),
      },
      create: {
        parentName: boravak.parentName,
        email: dopuna.email,
        phone: boravak.parentPhone,
        marketingConsent: dopuna.privola,
        gdprConsentAt: dopuna.privola ? sada : null,
        source: "dnevna-igra",
      },
    });

    const rodendan = dopuna.rodendan ?? boravak.childBirthDate;
    const ime = imeZaCrm(boravak.childName);
    let dijete = await tx.child.findFirst({
      where: { familyId: obitelj.id, firstName: { equals: ime, mode: "insensitive" } },
    });
    if (!dijete && rodendan) {
      dijete = await tx.child.create({ data: { familyId: obitelj.id, firstName: ime, birthDate: rodendan } });
    }

    await tx.dailyPlay.updateMany({
      where: {
        OR: [
          { id: boravak.id },
          { familyId: null, parentPhone: boravak.parentPhone, childName: { equals: boravak.childName, mode: "insensitive" } },
        ],
      },
      data: {
        parentEmail: dopuna.email,
        familyId: obitelj.id,
        childId: dijete?.id ?? null,
        ...(rodendan ? { childBirthDate: rodendan } : {}),
        ...(dopuna.privola ? { marketingConsent: true } : {}),
      },
    });
  });
}
