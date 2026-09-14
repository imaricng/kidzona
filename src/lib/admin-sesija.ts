import { redirect } from "next/navigation";
import { getSession } from "@/lib/auth";

/**
 * Dopušta nastavak samo prijavljenom administratoru ili osoblju. Koristi se u
 * server akcijama administracije jer su one javno dostupne krajnje točke.
 */
export async function zahtijevajOsoblje() {
  const sesija = await getSession();
  if (!sesija || (sesija.role !== "admin" && sesija.role !== "osoblje")) redirect("/admin");
  return sesija;
}
