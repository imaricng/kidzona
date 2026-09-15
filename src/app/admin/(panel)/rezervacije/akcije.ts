"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { zahtijevajOsoblje } from "@/lib/admin-sesija";
import { adminRezervacijaSchema, type AdminRezervacijaInput } from "@/lib/validation";
import {
  NeispravnaRezervacijaError,
  TerminZauzetError,
  odbijUpit,
  odobriUpit,
  unesiRucno,
  urediRezervaciju,
  type PodaciRezervacije,
} from "@/lib/reservations";

/** Stanje obrasca rezervacije (vraća se klijentu kroz useActionState). */
export interface StanjeObrasca {
  greska: string | null;
  uspjeh: string | null;
  vrijednosti: Record<string, string>;
  verzija: number;
}

function procitaj(formData: FormData): Record<string, string> {
  const vrijednosti: Record<string, string> = {};
  formData.forEach((v, k) => {
    if (typeof v === "string" && !k.startsWith("$")) vrijednosti[k] = v;
  });
  return vrijednosti;
}

function uPodatke(d: AdminRezervacijaInput): PodaciRezervacije {
  return {
    dateISO: d.dateISO,
    slotStart: d.slotStart,
    roomId: d.roomId,
    packageId: d.packageId,
    themeId: d.themeId,
    numChildren: d.numChildren,
    numAdults: d.numAdults,
    parentName: d.parentName,
    email: d.email,
    phone: d.phone || undefined,
    childName: d.childName || undefined,
    childBirthDate: d.childBirthDate || null,
    napomene: d.napomene || undefined,
    dogovorenaCijenaCents: d.dogovorenaCijena ? Math.round(Number(d.dogovorenaCijena.replace(",", ".")) * 100) : null,
  };
}

function porukaGreske(e: unknown): string {
  if (e instanceof NeispravnaRezervacijaError || e instanceof TerminZauzetError) return e.message;
  console.error("Pogreška pri spremanju rezervacije:", e);
  return "Spremanje nije uspjelo. Pokušajte ponovno.";
}

function osvjezi(code?: string) {
  revalidatePath("/admin/rezervacije");
  revalidatePath("/admin/dashboard");
  revalidatePath("/admin/kalendar");
  if (code) revalidatePath(`/admin/rezervacije/${code}`);
}

/** Ručni unos proslave (dogovor telefonom, WhatsAppom ili uživo). */
export async function spremiRucniUnos(prethodno: StanjeObrasca, formData: FormData): Promise<StanjeObrasca> {
  await zahtijevajOsoblje();
  const vrijednosti = procitaj(formData);
  const verzija = prethodno.verzija + 1;
  const parsed = adminRezervacijaSchema.safeParse(vrijednosti);
  if (!parsed.success) {
    return { greska: parsed.error.errors[0]?.message ?? "Provjerite unesene podatke.", uspjeh: null, vrijednosti, verzija };
  }
  let code: string;
  try {
    const r = await unesiRucno({
      ...uPodatke(parsed.data),
      status: vrijednosti.status === "upit" ? "upit" : "potvrdjeno",
      posaljiPotvrdu: vrijednosti.posaljiPotvrdu === "on",
    });
    code = r.code;
  } catch (e) {
    return { greska: porukaGreske(e), uspjeh: null, vrijednosti, verzija };
  }
  osvjezi(code);
  redirect(`/admin/rezervacije/${code}?poruka=spremljeno`);
}

/** Izmjena rezervacije ili upita; uz namjeru "odobri" upit se nakon spremanja i odobrava. */
export async function spremiIzmjene(prethodno: StanjeObrasca, formData: FormData): Promise<StanjeObrasca> {
  await zahtijevajOsoblje();
  const vrijednosti = procitaj(formData);
  const verzija = prethodno.verzija + 1;
  const code = vrijednosti.code ?? "";
  const parsed = adminRezervacijaSchema.safeParse(vrijednosti);
  if (!parsed.success) {
    return { greska: parsed.error.errors[0]?.message ?? "Provjerite unesene podatke.", uspjeh: null, vrijednosti, verzija };
  }
  try {
    await urediRezervaciju(code, uPodatke(parsed.data));
  } catch (e) {
    return { greska: porukaGreske(e), uspjeh: null, vrijednosti, verzija };
  }
  osvjezi(code);

  if (vrijednosti.namjera === "odobri") {
    const rezultat = await odobriUpit(code);
    if (!rezultat.ok) {
      return { greska: `Izmjene su spremljene, ali upit nije odobren: ${rezultat.poruka}`, uspjeh: null, vrijednosti, verzija };
    }
    osvjezi(code);
    redirect(`/admin/rezervacije/${code}?poruka=odobreno`);
  }
  return { greska: null, uspjeh: "✅ Izmjene su spremljene.", vrijednosti, verzija };
}

export async function odobriUpitAkcija(formData: FormData): Promise<void> {
  await zahtijevajOsoblje();
  const code = String(formData.get("code") ?? "");
  const rezultat = await odobriUpit(code);
  osvjezi(code);
  redirect(
    rezultat.ok
      ? `/admin/rezervacije/${code}?poruka=odobreno`
      : `/admin/rezervacije/${code}?greska=${encodeURIComponent(rezultat.poruka)}`,
  );
}

export async function odbijUpitAkcija(formData: FormData): Promise<void> {
  await zahtijevajOsoblje();
  const code = String(formData.get("code") ?? "");
  const rezultat = await odbijUpit(code, String(formData.get("razlog") ?? ""));
  osvjezi(code);
  redirect(
    rezultat.ok
      ? `/admin/rezervacije/${code}?poruka=odbijeno`
      : `/admin/rezervacije/${code}?greska=${encodeURIComponent(rezultat.poruka)}`,
  );
}
