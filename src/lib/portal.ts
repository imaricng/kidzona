/** Pomoćnici za portal roditelja — dohvat obitelji vezane uz prijavljenog korisnika. */
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

export async function getSessionFamily() {
  const session = await getSession();
  if (!session || session.role !== "roditelj") return null;
  const family = await prisma.family.findUnique({
    where: { userId: session.userId },
    include: {
      children: { orderBy: { birthDate: "asc" } },
      reservations: {
        include: { room: true, package: true, theme: true },
        orderBy: { date: "desc" },
      },
    },
  });
  if (!family) return null;
  return { session, family };
}
