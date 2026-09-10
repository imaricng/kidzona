/**
 * Jednostavna autentifikacija za administraciju (demo). Lozinke se hashiraju
 * scrypt-om, sesija se drži u potpisanom (HMAC) kolačiću. Za produkciju
 * preporuča se zamjena s NextAuth/Auth.js ili sličnim — interface je namjerno
 * malen pa je migracija jednostavna.
 */
import { timingSafeEqual, createHmac } from "crypto";
import { cookies } from "next/headers";
import { env } from "@/lib/env";
import { prisma } from "@/lib/prisma";
import { hashPassword, verifyPassword } from "@/lib/password";

export { hashPassword, verifyPassword } from "@/lib/password";

const COOKIE = "kz_session";

// --- Potpisivanje sesije ---------------------------------------------
interface SessionData {
  userId: string;
  role: string;
  name: string;
}

function sign(payload: string): string {
  return createHmac("sha256", env.authSecret).update(payload).digest("hex");
}

function encode(data: SessionData): string {
  const payload = Buffer.from(JSON.stringify(data)).toString("base64url");
  return `${payload}.${sign(payload)}`;
}

function decode(token: string): SessionData | null {
  const [payload, sig] = token.split(".");
  if (!payload || !sig) return null;
  const expected = sign(payload);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;
  try {
    return JSON.parse(Buffer.from(payload, "base64url").toString()) as SessionData;
  } catch {
    return null;
  }
}

// --- Prijava / odjava / sesija ---------------------------------------
async function postaviSesiju(data: SessionData): Promise<void> {
  const store = await cookies();
  store.set(COOKIE, encode(data), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 8, // 8 sati
  });
}

/** Prijava bilo kojeg korisnika (admin, osoblje ili roditelj). */
export async function prijava(email: string, password: string): Promise<SessionData | null> {
  const user = await prisma.user.findUnique({ where: { email } });
  if (!user) return null;
  if (!verifyPassword(password, user.passwordHash)) return null;
  const data: SessionData = { userId: user.id, role: user.role, name: user.name };
  await postaviSesiju(data);
  return data;
}

export interface RegistracijaInput {
  parentName: string;
  email: string;
  password: string;
  phone?: string;
  marketingConsent: boolean;
  djeca: { firstName: string; birthDate: string; allergies?: string }[];
}

/**
 * Registracija roditelja: kreira korisnika (role "roditelj") + CRM obitelj s
 * djecom odjednom, te ga odmah prijavljuje. Vraća null ako email već postoji.
 */
export async function registrirajRoditelja(input: RegistracijaInput): Promise<SessionData | null> {
  const postoji = await prisma.user.findUnique({ where: { email: input.email } });
  if (postoji) return null;

  const user = await prisma.$transaction(async (tx) => {
    const u = await tx.user.create({
      data: { email: input.email, passwordHash: hashPassword(input.password), name: input.parentName, phone: input.phone, role: "roditelj" },
    });
    await tx.family.upsert({
      where: { email: input.email },
      update: { parentName: input.parentName, phone: input.phone, marketingConsent: input.marketingConsent, userId: u.id, gdprConsentAt: new Date() },
      create: {
        parentName: input.parentName, email: input.email, phone: input.phone,
        marketingConsent: input.marketingConsent, gdprConsentAt: new Date(), source: "registracija", userId: u.id,
        children: {
          create: input.djeca.filter((d) => d.firstName && d.birthDate).map((d) => ({
            firstName: d.firstName, birthDate: new Date(d.birthDate), allergies: d.allergies || null,
          })),
        },
      },
    });
    return u;
  });

  const data: SessionData = { userId: user.id, role: user.role, name: user.name };
  await postaviSesiju(data);
  return data;
}

export async function odjava(): Promise<void> {
  const store = await cookies();
  store.delete(COOKIE);
}

export async function getSession(): Promise<SessionData | null> {
  const store = await cookies();
  const token = store.get(COOKIE)?.value;
  if (!token) return null;
  return decode(token);
}
