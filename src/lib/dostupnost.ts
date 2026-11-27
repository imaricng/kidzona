/**
 * Provjera dostupnosti termina za pristigle upite i prijedlog najbližih
 * slobodnih termina za istu igraonicu (Kids Play ili Kids Challenge).
 *
 * Čista domenska logika (`izracunajDostupnost`) odvojena je od upita na bazu
 * radi jednostavnog testiranja bez baze podataka.
 */
import { prisma } from "@/lib/prisma";
import { datumUZoni } from "@/lib/format";
import { imeProslave } from "@/lib/nepotpuno";
import { krajTermina, pocetciZaDatum, preklapaSe, uMinute, type Termin } from "@/lib/slots";
import { STATUSI_ZAUZIMAJU_TERMIN } from "@/lib/statusi";
import { zatvaranjeZaDatum, type Zatvaranje } from "@/lib/zatvaranja";

export interface UpitZaProvjeru {
  id?: string;
  dateISO: string; // "YYYY-MM-DD"
  slotStart: string; // "HH:mm"
  slotEnd: string; // "HH:mm"
  durationMin: number;
  roomId: string;
  secondRoomId?: string | null;
}

export interface ZauzetiTermin {
  id: string;
  code: string;
  dateISO: string; // "YYYY-MM-DD"
  slotStart: string;
  slotEnd: string;
  roomId: string;
  secondRoomId?: string | null;
  childName?: string | null;
  parentName?: string;
}

export interface PredlozeniTermin {
  dateISO: string; // "YYYY-MM-DD"
  slotStart: string;
  slotEnd: string;
  /** Pomak u kalendarskim danima od traženog datuma (0 = isti dan, -1 = dan ranije, +1 = dan kasnije). */
  razlikaDana: number;
}

export interface ProvjeraDostupnosti {
  slobodan: boolean;
  razlog: "slobodan" | "rezervacija" | "zatvoreno";
  zauzetoOd?: {
    code: string;
    slotStart: string;
    slotEnd: string;
    naziv: string;
  };
  zatvaranje?: Zatvaranje;
  prijedlozi: PredlozeniTermin[];
}

export interface OpcijeProvjere {
  danasISO?: string;
  maxPrijedloga?: number;
  /** Primarni raspon pretrage u danima (±2 dana). */
  osnovniRasponDana?: number;
  /** Prošireni raspon ako u osnovnom rasponu nema dovoljno slobodnih termina. */
  prosireniRasponDana?: number;
  /** Treba li računati zamjenske prijedloge (false za brze oznake na popisu). */
  traziPrijedloge?: boolean;
}

/** Pomiče ISO datum ("YYYY-MM-DD") za zadani broj dana bez utjecaja ljetnog/zimskog vremena. */
export function pomakniDatum(dateISO: string, dana: number): string {
  const [y, m, d] = dateISO.split("-").map(Number);
  return new Date(Date.UTC(y, m - 1, d + dana)).toISOString().slice(0, 10);
}

/**
 * Provjerava je li traženi termin slobodan za zadanu igraonicu i, ako nije,
 * predlaže najbliže slobodne termine za tu istu igraonicu (isti dan, ±1–2 dana,
 * a po potrebi i šire do prvih slobodnih).
 */
export function izracunajDostupnost(
  upit: UpitZaProvjeru,
  zauzeti: ZauzetiTermin[],
  zatvaranja: Zatvaranje[],
  opcije: OpcijeProvjere = {},
): ProvjeraDostupnosti {
  const {
    danasISO = datumUZoni(new Date()),
    maxPrijedloga = 4,
    osnovniRasponDana = 2,
    prosireniRasponDana = 7,
    traziPrijedloge = true,
  } = opcije;

  const trazeneSobe = [upit.roomId, ...(upit.secondRoomId ? [upit.secondRoomId] : [])];

  const pronadjiSukob = (dateISO: string, termin: Termin): ZauzetiTermin | undefined =>
    zauzeti.find(
      (z) =>
        z.id !== upit.id &&
        z.dateISO === dateISO &&
        (trazeneSobe.includes(z.roomId) || (z.secondRoomId != null && trazeneSobe.includes(z.secondRoomId))) &&
        preklapaSe({ start: z.slotStart, end: z.slotEnd }, termin),
    );

  const zatvaranje = zatvaranjeZaDatum(upit.dateISO, zatvaranja);
  const sukob = pronadjiSukob(upit.dateISO, { start: upit.slotStart, end: upit.slotEnd });

  if (!zatvaranje && !sukob) {
    return { slobodan: true, razlog: "slobodan", prijedlozi: [] };
  }

  const prijedlozi = traziPrijedloge
    ? pronadjiPrijedloge(upit, pronadjiSukob, zatvaranja, danasISO, maxPrijedloga, osnovniRasponDana, prosireniRasponDana)
    : [];

  if (sukob) {
    return {
      slobodan: false,
      razlog: "rezervacija",
      zauzetoOd: {
        code: sukob.code,
        slotStart: sukob.slotStart,
        slotEnd: sukob.slotEnd,
        naziv: imeProslave({ childName: sukob.childName ?? null, parentName: sukob.parentName ?? "" }),
      },
      zatvaranje,
      prijedlozi,
    };
  }

  return {
    slobodan: false,
    razlog: "zatvoreno",
    zatvaranje,
    prijedlozi,
  };
}

function pronadjiPrijedloge(
  upit: UpitZaProvjeru,
  pronadjiSukob: (dateISO: string, termin: Termin) => ZauzetiTermin | undefined,
  zatvaranja: Zatvaranje[],
  danasISO: string,
  maxPrijedloga: number,
  osnovniRasponDana: number,
  prosireniRasponDana: number,
): PredlozeniTermin[] {
  const trazeniMin = uMinute(upit.slotStart);

  const skupiURasponu = (raspon: number): PredlozeniTermin[] => {
    const kandidati: PredlozeniTermin[] = [];
    for (let razlika = -raspon; razlika <= raspon; razlika++) {
      const dateISO = pomakniDatum(upit.dateISO, razlika);
      if (dateISO < danasISO) continue;
      if (zatvaranjeZaDatum(dateISO, zatvaranja)) continue;

      for (const slotStart of pocetciZaDatum(dateISO)) {
        if (razlika === 0 && slotStart === upit.slotStart) continue;
        const slotEnd = krajTermina(slotStart, upit.durationMin);
        if (!pronadjiSukob(dateISO, { start: slotStart, end: slotEnd })) {
          kandidati.push({ dateISO, slotStart, slotEnd, razlikaDana: razlika });
        }
      }
    }

    // Poredaj od najbližeg traženom datumu i satu.
    kandidati.sort((a, b) => {
      const distA = Math.abs(a.razlikaDana * 1440 + (uMinute(a.slotStart) - trazeniMin));
      const distB = Math.abs(b.razlikaDana * 1440 + (uMinute(b.slotStart) - trazeniMin));
      if (distA !== distB) return distA - distB;
      // Pri jednakoj udaljenosti prednost ima kasniji datum pa isti sat.
      if (a.razlikaDana !== b.razlikaDana) return b.razlikaDana - a.razlikaDana;
      return uMinute(a.slotStart) - uMinute(b.slotStart);
    });

    return kandidati.slice(0, maxPrijedloga);
  };

  const osnovni = skupiURasponu(osnovniRasponDana);
  if (osnovni.length >= maxPrijedloga || prosireniRasponDana <= osnovniRasponDana) {
    return osnovni;
  }
  return skupiURasponu(prosireniRasponDana);
}

// --- Upiti na bazu ----------------------------------------------------

function mapirajZatvaranja(rows: { startDate: string; endDate: string; reason: string }[]): Zatvaranje[] {
  return rows.map((z) => ({ od: z.startDate, do: z.endDate, razlog: z.reason }));
}

function mapirajZauzete(
  rows: {
    id: string;
    code: string;
    date: Date;
    slotStart: string;
    slotEnd: string;
    roomId: string;
    secondRoomId: string | null;
    childName: string | null;
    parentName: string;
  }[],
): ZauzetiTermin[] {
  return rows.map((r) => ({
    id: r.id,
    code: r.code,
    dateISO: datumUZoni(r.date),
    slotStart: r.slotStart,
    slotEnd: r.slotEnd,
    roomId: r.roomId,
    secondRoomId: r.secondRoomId,
    childName: r.childName,
    parentName: r.parentName,
  }));
}

/** Provjerava jedan upit i po potrebi pronalazi najbliže slobodne termine za tu sobu. */
export async function provjeriDostupnostUpita(
  upit: {
    id?: string;
    date: Date;
    slotStart: string;
    slotEnd: string;
    durationMin: number;
    roomId: string;
    secondRoomId?: string | null;
  },
  opcije: OpcijeProvjere = {},
): Promise<ProvjeraDostupnosti> {
  const dateISO = datumUZoni(upit.date);
  const raspon = opcije.prosireniRasponDana ?? 7;
  // +1 dan rezerve s obje strane zbog vremenske zone pri čitanju iz Postgresa.
  const od = new Date(`${pomakniDatum(dateISO, -(raspon + 1))}T00:00:00Z`);
  const doDatuma = new Date(`${pomakniDatum(dateISO, raspon + 2)}T00:00:00Z`);
  const sobe = [upit.roomId, ...(upit.secondRoomId ? [upit.secondRoomId] : [])];

  const [rezervacije, zatvaranja] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        date: { gte: od, lt: doDatuma },
        status: { in: STATUSI_ZAUZIMAJU_TERMIN },
        OR: [{ roomId: { in: sobe } }, { secondRoomId: { in: sobe } }],
      },
      select: {
        id: true,
        code: true,
        date: true,
        slotStart: true,
        slotEnd: true,
        roomId: true,
        secondRoomId: true,
        childName: true,
        parentName: true,
      },
    }),
    prisma.closedPeriod.findMany({
      where: { endDate: { gte: pomakniDatum(dateISO, -raspon) }, startDate: { lte: pomakniDatum(dateISO, raspon) } },
      select: { startDate: true, endDate: true, reason: true },
    }),
  ]);

  return izracunajDostupnost(
    {
      id: upit.id,
      dateISO,
      slotStart: upit.slotStart,
      slotEnd: upit.slotEnd,
      durationMin: upit.durationMin,
      roomId: upit.roomId,
      secondRoomId: upit.secondRoomId,
    },
    mapirajZauzete(rezervacije),
    mapirajZatvaranja(zatvaranja),
    opcije,
  );
}

/**
 * Skupna provjera statusa dostupnosti za više upita odjednom (jedan upit prema
 * bazi za nadzornu ploču i popis rezervacija).
 */
export async function provjeriDostupnostUpitaVise(
  upiti: {
    id: string;
    date: Date;
    slotStart: string;
    slotEnd: string;
    durationMin: number;
    roomId: string;
    secondRoomId?: string | null;
  }[],
): Promise<Map<string, ProvjeraDostupnosti>> {
  const rezultat = new Map<string, ProvjeraDostupnosti>();
  if (upiti.length === 0) return rezultat;

  const datumiISO = upiti.map((u) => datumUZoni(u.date)).sort();
  const minISO = datumiISO[0];
  const maxISO = datumiISO[datumiISO.length - 1];
  const sobe = [...new Set(upiti.flatMap((u) => [u.roomId, ...(u.secondRoomId ? [u.secondRoomId] : [])]))];

  const [rezervacije, zatvaranja] = await Promise.all([
    prisma.reservation.findMany({
      where: {
        date: {
          gte: new Date(`${pomakniDatum(minISO, -1)}T00:00:00Z`),
          lt: new Date(`${pomakniDatum(maxISO, 2)}T00:00:00Z`),
        },
        status: { in: STATUSI_ZAUZIMAJU_TERMIN },
        OR: [{ roomId: { in: sobe } }, { secondRoomId: { in: sobe } }],
      },
      select: {
        id: true,
        code: true,
        date: true,
        slotStart: true,
        slotEnd: true,
        roomId: true,
        secondRoomId: true,
        childName: true,
        parentName: true,
      },
    }),
    prisma.closedPeriod.findMany({
      where: { endDate: { gte: minISO }, startDate: { lte: maxISO } },
      select: { startDate: true, endDate: true, reason: true },
    }),
  ]);

  const zauzeti = mapirajZauzete(rezervacije);
  const zatv = mapirajZatvaranja(zatvaranja);
  const danasISO = datumUZoni(new Date());

  for (const u of upiti) {
    rezultat.set(
      u.id,
      izracunajDostupnost(
        {
          id: u.id,
          dateISO: datumUZoni(u.date),
          slotStart: u.slotStart,
          slotEnd: u.slotEnd,
          durationMin: u.durationMin,
          roomId: u.roomId,
          secondRoomId: u.secondRoomId,
        },
        zauzeti,
        zatv,
        { danasISO, traziPrijedloge: false },
      ),
    );
  }

  return rezultat;
}
