/**
 * Upis potvrđenih proslava u Google Calendar igraonice.
 *
 * Pristup ide preko servisnog računa (JWT → pristupni token → Calendar REST),
 * bez dodatnih paketa. Da bi radilo, treba u okruženju postaviti
 * `GOOGLE_CALENDAR_ID`, `GOOGLE_CLIENT_EMAIL` i `GOOGLE_PRIVATE_KEY`, a
 * kalendar podijeliti s adresom servisnog računa uz pravo „Mijenjanje događaja".
 *
 * ID događaja izvodi se iz koda rezervacije (KZ-2026-0042 → "kz20260042"), pa
 * ponovni upis istog termina ažurira postojeći događaj umjesto da stvori drugi.
 * Zato nije potreban dodatni stupac u bazi.
 *
 * Kalendar je pomoćni sustav: greška se zabilježi u log, ali ne ruši rezervaciju.
 */
import { createSign } from "crypto";
import { env } from "@/lib/env";

const OPSEG = "https://www.googleapis.com/auth/calendar.events";
const TOKEN_URL = "https://oauth2.googleapis.com/token";

export interface DogadjajProslave {
  code: string;
  datumISO: string; // "YYYY-MM-DD"
  slotStart: string; // "HH:mm"
  slotEnd: string; // "HH:mm"
  naslov: string;
  opis: string;
  lokacija?: string;
}

function base64url(s: string | Buffer): string {
  return Buffer.from(s).toString("base64url");
}

/**
 * ID događaja mora biti base32hex — znamenke i slova a–v, najmanje 5 znakova.
 * Iz koda zato ispadaju crtice i slovo „z" (izvan je raspona): "KZ-2026-0042"
 * → "k20260042". Kodovi rezervacija imaju fiksni oblik KZ-GGGG-NNNN, pa su
 * uvijek dulji od pet znakova; dopuna nulama je samo obrana za rubne slučajeve.
 */
export function idDogadjaja(code: string): string {
  return code.toLowerCase().replace(/[^0-9a-v]/g, "").padEnd(5, "0");
}

/**
 * Privatni ključ servisnog računa u oblik koji traži `crypto`. Ključ se
 * prepisuje iz JSON datoteke rukom, pa se čisti ono što se pritom najčešće
 * zalijepi uz njega: okolni navodnici iz JSON-a i "\n" kao dva znaka umjesto
 * stvarnog prijeloma retka.
 */
export function pemKljuc(vrijednost: string): string {
  return vrijednost
    .trim()
    .replace(/^["']|["']$/g, "")
    .replace(/\\n/g, "\n")
    .trim();
}

/** Pristupni token servisnog računa (vrijedi sat vremena; ne keširamo ga). */
async function pristupniToken(): Promise<string> {
  const sada = Math.floor(Date.now() / 1000);
  const zaglavlje = base64url(JSON.stringify({ alg: "RS256", typ: "JWT" }));
  const tijelo = base64url(
    JSON.stringify({
      iss: env.googleClientEmail,
      scope: OPSEG,
      aud: TOKEN_URL,
      iat: sada,
      exp: sada + 3600,
    }),
  );
  const kljuc = pemKljuc(env.googlePrivateKey);
  const potpis = createSign("RSA-SHA256").update(`${zaglavlje}.${tijelo}`).sign(kljuc, "base64url");

  const res = await fetch(TOKEN_URL, {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({
      grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer",
      assertion: `${zaglavlje}.${tijelo}.${potpis}`,
    }),
  });
  if (!res.ok) throw new Error(`Google token ${res.status}: ${await res.text()}`);
  const data = (await res.json()) as { access_token?: string };
  if (!data.access_token) throw new Error("Google nije vratio pristupni token.");
  return data.access_token;
}

function apiUrl(putanja = ""): string {
  return `https://www.googleapis.com/calendar/v3/calendars/${encodeURIComponent(env.googleCalendarId)}/events${putanja}`;
}

/** Ishod upisa; `razlog` objašnjava zašto nije uspio (prikazuje se u administraciji). */
export interface IshodKalendara {
  ok: boolean;
  razlog?: string;
}

/** Koje varijable nedostaju da bi upis uopće bio moguć. */
function nedostajuPostavke(): string {
  const manjka = [
    env.googleCalendarId ? null : "GOOGLE_CALENDAR_ID",
    env.googleClientEmail ? null : "GOOGLE_CLIENT_EMAIL",
    env.googlePrivateKey ? null : "GOOGLE_PRIVATE_KEY",
  ].filter(Boolean);
  return `Kalendar nije postavljen — nedostaje: ${manjka.join(", ")}.`;
}

/**
 * Upisuje ili ažurira događaj proslave. Ne baca iznimku — pozivatelj zbog
 * kalendara ne prekida svoj posao, nego zabilježi razlog.
 */
export async function upisiProslavuUKalendar(d: DogadjajProslave): Promise<IshodKalendara> {
  if (!env.googleCalendarAktivan) return { ok: false, razlog: nedostajuPostavke() };
  try {
    const token = await pristupniToken();
    const id = idDogadjaja(d.code);
    const dogadjaj = {
      id,
      summary: d.naslov,
      description: d.opis,
      location: d.lokacija,
      start: { dateTime: `${d.datumISO}T${d.slotStart}:00`, timeZone: env.timezone },
      end: { dateTime: `${d.datumISO}T${d.slotEnd}:00`, timeZone: env.timezone },
      status: "confirmed",
    };

    // Postojeći termin se ažurira (PUT), novi se stvara (POST).
    const put = await fetch(`${apiUrl(`/${id}`)}`, {
      method: "PUT",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(dogadjaj),
    });
    if (put.ok) return { ok: true };
    if (put.status !== 404) throw new Error(objasni(put.status, await put.text()));

    const post = await fetch(apiUrl(), {
      method: "POST",
      headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
      body: JSON.stringify(dogadjaj),
    });
    if (!post.ok) throw new Error(objasni(post.status, await post.text()));
    return { ok: true };
  } catch (e) {
    console.error(`Kalendar: upis proslave ${d.code} nije uspio:`, e);
    return { ok: false, razlog: String(e instanceof Error ? e.message : e) };
  }
}

/**
 * Poruke Google Calendar API-ja su tehničke; najčešći uzroci prevode se u
 * uputu koju osoblje može provesti bez razvojnog tima.
 */
function objasni(status: number, tijelo: string): string {
  if (status === 401) return "Google je odbio prijavu (401) — provjerite GOOGLE_CLIENT_EMAIL i GOOGLE_PRIVATE_KEY.";
  if (status === 403) {
    return "Google je odbio pristup (403) — podijelite kalendar s adresom servisnog računa uz pravo „Izmjene događaja\" ili uključite Calendar API u projektu.";
  }
  if (status === 404) return "Kalendar nije pronađen (404) — provjerite GOOGLE_CALENDAR_ID i je li podijeljen sa servisnim računom.";
  return `Google Calendar ${status}: ${tijelo.slice(0, 300)}`;
}

/** Otkazani termin: događaj se briše iz kalendara (ako ondje postoji). */
export async function ukloniProslavuIzKalendara(code: string): Promise<IshodKalendara> {
  if (!env.googleCalendarAktivan) return { ok: false, razlog: nedostajuPostavke() };
  try {
    const token = await pristupniToken();
    const res = await fetch(`${apiUrl(`/${idDogadjaja(code)}`)}`, {
      method: "DELETE",
      headers: { Authorization: `Bearer ${token}` },
    });
    // 404/410 = događaja nema (ručno obrisan ili nikad upisan) — to nije greška.
    if (res.ok || res.status === 404 || res.status === 410) return { ok: true };
    throw new Error(objasni(res.status, await res.text()));
  } catch (e) {
    console.error(`Kalendar: uklanjanje proslave ${code} nije uspjelo:`, e);
    return { ok: false, razlog: String(e instanceof Error ? e.message : e) };
  }
}
