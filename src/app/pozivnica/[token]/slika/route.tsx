import { ImageResponse } from "next/og";
import sharp from "sharp";
import { prisma } from "@/lib/prisma";
import { retciPozivnice } from "@/lib/pozivnica-tekst";
import { predlozakZaProslavu } from "@/lib/pozivnica-predlosci";
import { omjerOkvira, rasporedTeksta } from "@/lib/pozivnica-raspored";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";

export const runtime = "nodejs";

/**
 * Crtež se dovrši prije odgovora: ImageResponse inače crta usput, pa greška
 * stigne tek kad je odgovor već krenuo i završi kao prazna stranica greške.
 */
async function uSliku(crtez: ImageResponse): Promise<Response> {
  const png = Buffer.from(await crtez.arrayBuffer());
  // PNG crteža je nekoliko megabajta; WhatsApp i Facebook tako velik
  // pretpregled ne prikazuju, pa šaljemo JPEG.
  const jpeg = await sharp(png).jpeg({ quality: 82, progressive: true }).toBuffer();
  return new Response(new Uint8Array(jpeg), {
    headers: {
      "Content-Type": "image/jpeg",
      "Content-Length": String(jpeg.byteLength),
      "Cache-Control": "public, max-age=300, stale-while-revalidate=86400",
    },
  });
}

/**
 * Fontovi za crtanje. Satori nema sistemske fontove, pa ih učitavamo sami
 * (woff s hrvatskim znakovima) i čuvamo po instanci poslužitelja.
 */
let fontovi: { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[] | null = null;

async function dohvatiFontove(osnova: string) {
  if (fontovi) return fontovi;
  const ucitaj = async (naziv: string) => {
    const o = await fetch(`${osnova}/fonts/${naziv}`);
    if (!o.ok) throw new Error(`Font ${naziv} nije dostupan (${o.status}).`);
    return o.arrayBuffer();
  };
  const [obicni, podebljani] = await Promise.all([ucitaj("nunito-400.woff"), ucitaj("nunito-800.woff")]);
  fontovi = [
    { name: "Nunito", data: obicni, weight: 400, style: "normal" },
    { name: "Nunito", data: podebljani, weight: 800, style: "normal" },
  ];
  return fontovi;
}

/** Širina nacrtane pozivnice; visina se računa iz omjera predloška. */
const SIRINA = 1000;

/**
 * GET /pozivnica/{token}/slika — pozivnica kao PNG.
 *
 * Služi za pretpregled poveznice (WhatsApp, Facebook) i za spremanje slike, pa
 * gost vidi samu pozivnicu umjesto golog linka. Crta se istim pravilima kao
 * stranica: okvir u postocima, veličine slova iz `pozivnica-raspored`.
 */
export async function GET(req: Request, { params }: { params: Promise<{ token: string }> }) {
  try {
    return await nacrtaj(req, await params);
  } catch (e) {
    // Crtanje slike je pomoćna mogućnost — stranica pozivnice radi i bez nje.
    console.error("Crtanje pozivnice nije uspjelo:", e);
    return new Response(`Pozivnicu nije moguće nacrtati: ${e instanceof Error ? e.message : String(e)}`, { status: 500 });
  }
}

async function nacrtaj(req: Request, { token }: { token: string }) {
  const r = await prisma.reservation.findUnique({
    where: { qrToken: token },
    include: { room: true, theme: true },
  });
  if (!r || !STATUSI_ZAUZIMAJU_TERMIN.includes(r.status)) {
    return new Response("Pozivnica nije dostupna.", { status: 404 });
  }

  const osnova = new URL(req.url).origin;
  const [predlozak, fonts] = await Promise.all([predlozakZaProslavu(r.themeId, r.roomId), dohvatiFontove(osnova)]);
  const retci = retciPozivnice({ ...r, igraonica: r.room.name }, predlozak?.tekstPredlozak);
  // Sliku predloška učitavamo iz baze i ugrađujemo je u crtež: bez vanjskog
  // zahtjeva crtanje ne ovisi o tome je li aplikacija dostupna sama sebi.
  const slika = predlozak
    ? await prisma.pozivnicaPredlozak.findFirst({
        where: { themeId: predlozak.themeId, roomId: predlozak.roomId },
        select: { mime: true, podaci: true },
      })
    : null;
  const osnovniStil = { fontFamily: "Nunito" } as const;

  // Bez predloška crtamo jednostavnu pozivnicu u bojama teme.
  if (!predlozak || !slika) {
    return uSliku(
      new ImageResponse(
      (
        <div
          style={{
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: "center",
            width: "100%",
            height: "100%",
            background: "linear-gradient(135deg, #ff7a59, #c084fc)",
            color: "white",
            padding: 80,
            textAlign: "center",
            ...osnovniStil,
          }}
        >
          {retci.map((redak, i) => (
            <div key={i} style={{ fontSize: i === 0 ? 96 : 44, fontWeight: i === 0 ? 800 : 400, marginTop: i === 0 ? 0 : 18 }}>
              {redak}
            </div>
          ))}
        </div>
      ),
      { width: SIRINA, height: Math.round(SIRINA * 1.414), fonts, emoji: "noto" },
    ));
  }

  const visina = Math.round((SIRINA * predlozak.slikaVisina) / predlozak.slikaSirina);
  const okvir = predlozak.okvir;
  const okvirSirinaPx = (okvir.sirina / 100) * SIRINA;
  const raspored = rasporedTeksta(
    retci,
    omjerOkvira(okvir, predlozak.slikaSirina, predlozak.slikaVisina),
    predlozak.stil.velicinaSkala,
  );
  // `cqw` je postotak širine okvira — ovdje ga pretvaramo u piksele.
  const px = (cqw: number) => Math.max(10, Math.round((cqw / 100) * okvirSirinaPx));

  const prozirnost = Math.max(0, Math.min(100, predlozak.stil.podlogaProzirnost)) / 100;
  const podloga =
    predlozak.stil.podloga === "svijetla"
      ? `rgba(255,255,255,${prozirnost})`
      : predlozak.stil.podloga === "tamna"
        ? `rgba(29,24,64,${prozirnost})`
        : undefined;

  const poravnanje =
    predlozak.stil.poravnanje === "gore" ? "flex-start" : predlozak.stil.poravnanje === "dolje" ? "flex-end" : "center";

  return uSliku(
    new ImageResponse(
    (
      <div style={{ display: "flex", position: "relative", width: "100%", height: "100%" }}>
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img src={`data:${slika.mime};base64,${Buffer.from(slika.podaci).toString("base64")}`} alt="" width={SIRINA} height={visina} />
        <div
          style={{
            position: "absolute",
            top: `${okvir.top}%`,
            left: `${okvir.lijevo}%`,
            width: `${okvir.sirina}%`,
            height: `${okvir.visina}%`,
            display: "flex",
            flexDirection: "column",
            alignItems: "center",
            justifyContent: poravnanje,
            textAlign: "center",
            padding: Math.round(okvirSirinaPx * 0.03),
            color: predlozak.stil.svijetliTekst ? "white" : "#1d1840",
            ...osnovniStil,
            // Prazne vrijednosti se izostavljaju: crtanje ne podnosi `undefined`.
            ...(podloga ? { backgroundColor: podloga, borderRadius: Math.round(okvirSirinaPx * 0.04) } : {}),
          }}
        >
          {retci.map((redak, i) => (
            <div
              key={i}
              style={{
                fontSize: px(raspored.velicine[i]),
                fontWeight: i === 0 ? 800 : 400,
                lineHeight: i === 0 ? 1.1 : 1.3,
                marginTop: i === 0 ? 0 : px(raspored.razmak * (i === 1 ? 1 : 0.6)),
              }}
            >
              {redak}
            </div>
          ))}
        </div>
      </div>
    ),
    { width: SIRINA, height: visina, fonts, emoji: "noto" },
  ));
}
