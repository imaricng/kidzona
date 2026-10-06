import { ImageResponse } from "next/og";
import { prisma } from "@/lib/prisma";
import { env } from "@/lib/env";
import { tekstPozivnice } from "@/lib/pozivnica";
import { predlozakZaProslavu } from "@/lib/pozivnica-predlosci";
import { omjerOkvira, rasporedTeksta } from "@/lib/pozivnica-raspored";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";

export const runtime = "nodejs";

/**
 * Fontovi za crtanje. Satori nema sistemske fontove, pa ih učitavamo sami
 * (woff s hrvatskim znakovima) i čuvamo po instanci poslužitelja.
 */
let fontovi: { name: string; data: ArrayBuffer; weight: 400 | 800; style: "normal" }[] | null = null;

async function dohvatiFontove() {
  if (fontovi) return fontovi;
  const [obicni, podebljani] = await Promise.all([
    fetch(`${env.appUrl}/fonts/nunito-400.woff`).then((r) => r.arrayBuffer()),
    fetch(`${env.appUrl}/fonts/nunito-800.woff`).then((r) => r.arrayBuffer()),
  ]);
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
export async function GET(_req: Request, { params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const r = await prisma.reservation.findUnique({
    where: { qrToken: token },
    include: { room: true, theme: true },
  });
  if (!r || !STATUSI_ZAUZIMAJU_TERMIN.includes(r.status)) {
    return new Response("Pozivnica nije dostupna.", { status: 404 });
  }

  const tekst = tekstPozivnice(r);
  const [predlozak, fonts] = await Promise.all([predlozakZaProslavu(r.themeId, r.roomId), dohvatiFontove()]);
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
    return new ImageResponse(
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
          <div style={{ fontSize: 96, fontWeight: 800 }}>{tekst.ime}</div>
          <div style={{ fontSize: 44, marginTop: 24 }}>{tekst.slavi}</div>
          <div style={{ fontSize: 44, marginTop: 12 }}>{tekst.dodji}</div>
        </div>
      ),
      { width: SIRINA, height: Math.round(SIRINA * 1.414), fonts },
    );
  }

  const visina = Math.round((SIRINA * predlozak.slikaVisina) / predlozak.slikaSirina);
  const okvir = predlozak.okvir;
  const okvirSirinaPx = (okvir.sirina / 100) * SIRINA;
  const raspored = rasporedTeksta(
    tekst,
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

  return new ImageResponse(
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
            backgroundColor: podloga,
            borderRadius: podloga ? Math.round(okvirSirinaPx * 0.04) : 0,
          }}
        >
          <div style={{ fontSize: px(raspored.ime), fontWeight: 800, lineHeight: 1.1 }}>{tekst.ime}</div>
          <div style={{ fontSize: px(raspored.slavi), lineHeight: 1.3, marginTop: px(raspored.razmak) }}>
            {tekst.slavi}
          </div>
          <div style={{ fontSize: px(raspored.dodji), lineHeight: 1.3, marginTop: px(raspored.razmak * 0.6) }}>
            {tekst.dodji}
          </div>
        </div>
      </div>
    ),
    { width: SIRINA, height: visina, fonts },
  );
}
