import Anthropic from "@anthropic-ai/sdk";
import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { env } from "@/lib/env";
import { rateLimit, dohvatiIp } from "@/lib/rate-limit";
import { sistemskeUpute } from "@/lib/chat/upute";
import { dohvatiPonudu, provjeriTermin, izracunajZaChat } from "@/lib/chat/alati";
import { prisma } from "@/lib/prisma";
import { formatDatumDugi } from "@/lib/format";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const MODEL = "claude-opus-5";
/** Zaštita od beskonačne petlje alata; razgovor o rezervaciji stane u par koraka. */
const MAX_KORAKA = 6;

const porukaSchema = z.object({
  uloga: z.enum(["korisnik", "asistent"]),
  tekst: z.string().trim().min(1).max(2000),
});

const zahtjevSchema = z.object({
  // Cijela povijest stiže s klijenta — poslužitelj ne pamti razgovore.
  poruke: z.array(porukaSchema).min(1).max(40),
});

/** Podaci koje model priprema; slanje potvrđuje roditelj u sučelju. */
const pripremaSchema = z.object({
  dateISO: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  slotStart: z.string().regex(/^\d{2}:\d{2}$/),
  roomId: z.string().min(1),
  packageId: z.string().min(1),
  themeId: z.string().optional(),
  numChildren: z.number().int().min(1).max(60),
  parentName: z.string().trim().min(2),
  email: z.string().trim().email(),
  phone: z.string().trim().optional(),
  childName: z.string().trim().optional(),
  temaZelja: z.string().trim().max(500).optional(),
  napomene: z.string().trim().max(1000).optional(),
  dodaciIds: z.array(z.string()).max(20).optional(),
});

export type PripremaUpita = z.infer<typeof pripremaSchema> & {
  sazetak: { naziv: string; vrijednost: string }[];
};

const ALATI: Anthropic.Tool[] = [
  {
    name: "dohvati_ponudu",
    description:
      "Igraonice, paketi s cijenama i trajanjem, dodaci, teme i neradni dani. Pozovi prije nego išta tvrdiš o ponudi ili cijenama.",
    input_schema: { type: "object", properties: {}, additionalProperties: false },
  },
  {
    name: "provjeri_termin",
    description:
      "Je li na zadani datum moguća proslava i koji su početci slobodni. Jedini dopušteni način da potvrdiš slobodan termin.",
    input_schema: {
      type: "object",
      properties: {
        datum: { type: "string", description: "Datum u obliku GGGG-MM-DD" },
        igraonicaId: { type: "string", description: "Neobvezno: id igraonice iz dohvati_ponudu" },
      },
      required: ["datum"],
      additionalProperties: false,
    },
  },
  {
    name: "izracunaj_cijenu",
    description: "Točan iznos za paket, broj djece i odabrane dodatke. Jedini dopušteni izvor iznosa.",
    input_schema: {
      type: "object",
      properties: {
        paketId: { type: "string" },
        brojDjece: { type: "number", description: "Bez slavljenika — on je gratis" },
        dodaciIds: { type: "array", items: { type: "string" } },
      },
      required: ["paketId", "brojDjece"],
      additionalProperties: false,
    },
  },
  {
    name: "pripremi_upit",
    description:
      "Priprema upit za rezervaciju kad su svi podaci prikupljeni. NE šalje ga — roditelj potvrđuje slanje u sučelju. Pozovi tek kad imaš datum, početak, igraonicu, paket, broj djece, ime roditelja i e-poštu.",
    input_schema: {
      type: "object",
      properties: {
        datum: { type: "string" },
        pocetak: { type: "string", description: "HH:mm, jedan od slobodnih početaka" },
        igraonicaId: { type: "string" },
        paketId: { type: "string" },
        temaId: { type: "string" },
        temaZelja: { type: "string", description: "Opis teme izvan ponude" },
        brojDjece: { type: "number" },
        imeRoditelja: { type: "string" },
        email: { type: "string" },
        telefon: { type: "string" },
        imeSlavljenika: { type: "string" },
        napomene: { type: "string" },
        dodaciIds: { type: "array", items: { type: "string" } },
      },
      required: ["datum", "pocetak", "igraonicaId", "paketId", "brojDjece", "imeRoditelja", "email"],
      additionalProperties: false,
    },
  },
];

/** Sažetak koji roditelj vidi prije slanja — imena umjesto identifikatora. */
async function pripremiUpit(ulaz: Record<string, unknown>): Promise<{ ok: true; priprema: PripremaUpita } | { ok: false; greska: string }> {
  const parsed = pripremaSchema.safeParse({
    dateISO: ulaz.datum,
    slotStart: ulaz.pocetak,
    roomId: ulaz.igraonicaId,
    packageId: ulaz.paketId,
    themeId: ulaz.temaId,
    numChildren: ulaz.brojDjece,
    parentName: ulaz.imeRoditelja,
    email: ulaz.email,
    phone: ulaz.telefon,
    childName: ulaz.imeSlavljenika,
    temaZelja: ulaz.temaZelja,
    napomene: ulaz.napomene,
    dodaciIds: ulaz.dodaciIds,
  });
  if (!parsed.success) {
    return { ok: false, greska: parsed.error.errors[0]?.message ?? "Podaci nisu potpuni." };
  }
  const p = parsed.data;

  const [soba, paket, tema, dodaci, termin] = await Promise.all([
    prisma.room.findUnique({ where: { id: p.roomId } }),
    prisma.package.findUnique({ where: { id: p.packageId } }),
    p.themeId ? prisma.theme.findUnique({ where: { id: p.themeId } }) : null,
    p.dodaciIds?.length ? prisma.addOn.findMany({ where: { id: { in: p.dodaciIds } } }) : [],
    provjeriTermin(p.dateISO, p.roomId),
  ]);
  if (!soba?.active || !paket?.active) return { ok: false, greska: "Odabrana igraonica ili paket nisu dostupni." };
  if (!termin.moguce) return { ok: false, greska: termin.razlog ?? "Taj termin nije moguć." };
  if (termin.slobodniPocetci && !termin.slobodniPocetci.includes(p.slotStart)) {
    return { ok: false, greska: `Početak ${p.slotStart} nije slobodan. Slobodno: ${termin.slobodniPocetci.join(", ")}.` };
  }

  const cijena = await izracunajZaChat({ packageId: p.packageId, numChildren: p.numChildren, dodaciIds: p.dodaciIds });

  const sazetak = [
    { naziv: "Datum", vrijednost: formatDatumDugi(new Date(`${p.dateISO}T00:00:00`)) },
    { naziv: "Početak", vrijednost: p.slotStart },
    { naziv: "Igraonica", vrijednost: soba.name },
    { naziv: "Paket", vrijednost: paket.name },
    { naziv: "Broj djece", vrijednost: `${p.numChildren} (slavljenik gratis)` },
    ...(tema ? [{ naziv: "Tema", vrijednost: tema.name }] : []),
    ...(p.temaZelja ? [{ naziv: "Želja za temom", vrijednost: p.temaZelja }] : []),
    ...(dodaci.length ? [{ naziv: "Dodaci", vrijednost: dodaci.map((d) => d.name).join(", ") }] : []),
    { naziv: "Roditelj", vrijednost: p.parentName },
    { naziv: "E-pošta", vrijednost: p.email },
    ...(p.phone ? [{ naziv: "Telefon", vrijednost: p.phone }] : []),
    ...(p.childName ? [{ naziv: "Slavljenik", vrijednost: p.childName }] : []),
    ...(p.napomene ? [{ naziv: "Napomene", vrijednost: p.napomene }] : []),
    {
      naziv: "Okvirna cijena",
      vrijednost: cijena.poDogovoru ? "po dogovoru" : (cijena.ukupno ?? "—"),
    },
  ];

  return { ok: true, priprema: { ...p, sazetak } };
}

async function izvrsiAlat(ime: string, ulaz: Record<string, unknown>): Promise<{ rezultat: unknown; priprema?: PripremaUpita }> {
  switch (ime) {
    case "dohvati_ponudu":
      return { rezultat: await dohvatiPonudu() };
    case "provjeri_termin":
      return { rezultat: await provjeriTermin(String(ulaz.datum ?? ""), ulaz.igraonicaId ? String(ulaz.igraonicaId) : undefined) };
    case "izracunaj_cijenu":
      return {
        rezultat: await izracunajZaChat({
          packageId: String(ulaz.paketId ?? ""),
          numChildren: Number(ulaz.brojDjece ?? 0),
          dodaciIds: Array.isArray(ulaz.dodaciIds) ? ulaz.dodaciIds.map(String) : undefined,
        }),
      };
    case "pripremi_upit": {
      const ishod = await pripremiUpit(ulaz);
      return ishod.ok
        ? { rezultat: { ok: true, poruka: "Sažetak je prikazan roditelju; on potvrđuje slanje.", sazetak: ishod.priprema.sazetak }, priprema: ishod.priprema }
        : { rezultat: { ok: false, greska: ishod.greska } };
    }
    default:
      return { rezultat: { greska: `Nepoznat alat: ${ime}` } };
  }
}

export async function POST(req: NextRequest) {
  if (!env.chatAktivan) {
    return NextResponse.json({ error: "Chat trenutačno nije dostupan." }, { status: 503 });
  }
  const ip = dohvatiIp(req.headers);
  if (!rateLimit(`chat:${ip}`, 30, 10 * 60_000).dozvoljeno) {
    return NextResponse.json({ error: "Previše poruka. Pokušajte za nekoliko minuta." }, { status: 429 });
  }

  let body: unknown;
  try {
    body = await req.json();
  } catch {
    return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 400 });
  }
  const parsed = zahtjevSchema.safeParse(body);
  if (!parsed.success) return NextResponse.json({ error: "Neispravan zahtjev" }, { status: 422 });

  const client = new Anthropic({ apiKey: env.anthropicApiKey });
  const messages: Anthropic.MessageParam[] = parsed.data.poruke.map((p) => ({
    role: p.uloga === "korisnik" ? "user" : "assistant",
    content: p.tekst,
  }));

  let priprema: PripremaUpita | undefined;

  try {
    for (let korak = 0; korak < MAX_KORAKA; korak++) {
      const odgovor = await client.messages.create({
        model: MODEL,
        max_tokens: 2000,
        system: sistemskeUpute(),
        // Razgovor traži brzinu, ne dubinu — složeni dio posla rade alati.
        output_config: { effort: "low" },
        tools: ALATI,
        messages,
      });

      if (odgovor.stop_reason !== "tool_use") {
        const tekst = odgovor.content
          .filter((b): b is Anthropic.TextBlock => b.type === "text")
          .map((b) => b.text)
          .join("\n")
          .trim();
        return NextResponse.json({
          odgovor: tekst || "Oprostite, nisam uspio sastaviti odgovor. Možete li ponoviti?",
          priprema,
        });
      }

      messages.push({ role: "assistant", content: odgovor.content });
      const pozivi = odgovor.content.filter((b): b is Anthropic.ToolUseBlock => b.type === "tool_use");
      const rezultati: Anthropic.ToolResultBlockParam[] = [];
      for (const poziv of pozivi) {
        const { rezultat, priprema: nova } = await izvrsiAlat(poziv.name, (poziv.input ?? {}) as Record<string, unknown>);
        if (nova) priprema = nova;
        rezultati.push({ type: "tool_result", tool_use_id: poziv.id, content: JSON.stringify(rezultat) });
      }
      messages.push({ role: "user", content: rezultati });
    }

    return NextResponse.json({
      odgovor: "Ovo mi je postalo prekomplicirano za dogovor porukama. Nazovite nas i rado ćemo sve složiti.",
      priprema,
    });
  } catch (e) {
    console.error("Chat:", e);
    return NextResponse.json({ error: "Trenutačno ne mogu odgovoriti. Pokušajte ponovno ili nas nazovite." }, { status: 500 });
  }
}
