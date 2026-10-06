import { describe, expect, it } from "vitest";
import {
  danUAkuzativu,
  predlozakUrl,
  provjeriPredlozak,
  tekstPozivnice,
  temaIzAdrese,
  whatsappBroj,
  whatsappPoruka,
} from "@/lib/pozivnica";
import { analizirajStil } from "@/lib/okvir-detekcija";
import { omjerOkvira, rasporedTeksta } from "@/lib/pozivnica-raspored";

describe("tekstPozivnice", () => {
  // 1. 6. 2030. je subota.
  const osnova = { date: new Date("2030-06-01T00:00:00"), slotStart: "17:00", slotEnd: "19:00" };

  it("ispisuje ime i prezime u prvom retku", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Mia", childLastName: "Horvat", childTurning: 5, phone: null });
    expect(t.ime).toBe("Mia Horvat");
  });

  it("bez prezimena prikazuje samo ime", () => {
    expect(tekstPozivnice({ ...osnova, childName: "Mia", childLastName: "  ", phone: null }).ime).toBe("Mia");
  });

  it("drugi redak nosi koju godinu slavljenik puni", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Mia", childTurning: 5, phone: null });
    expect(t.slavi).toBe("slavi 5. rođendan i zove te da se pridružiš.");
  });

  it("godine računa iz datuma rođenja kad nisu upisane", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Mia", childBirthDate: new Date("2024-03-10T00:00:00"), phone: null });
    expect(t.slavi).toBe("slavi 6. rođendan i zove te da se pridružiš.");
  });

  it("bez poznatih godina izostavlja broj", () => {
    expect(tekstPozivnice({ ...osnova, childName: "Mia", phone: null }).slavi).toBe("slavi rođendan i zove te da se pridružiš.");
  });

  it("treći redak ima dan u akuzativu, datum i termin", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Mia", phone: null });
    expect(t.dodji).toBe("Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.");
  });

  it("traži potvrdu dolaska na broj osobe koja je rezervirala", () => {
    const t = tekstPozivnice({ ...osnova, childName: "Luka", phone: "095 537 8559" });
    expect(t.potvrda).toBe("Dolazak potvrdi na broj 095 537 8559.");
  });

  it("bez telefona ne izmišlja broj za potvrdu", () => {
    expect(tekstPozivnice({ ...osnova, childName: "Luka", phone: null }).potvrda).toBeNull();
  });

  it("bez imena slavljenika ostaje čitljiv", () => {
    expect(tekstPozivnice({ ...osnova, childName: "  ", phone: null }).ime).toBe("Slavljenik");
  });
});

describe("danUAkuzativu", () => {
  it("sklanja sve dane u tjednu", () => {
    const tjedan = ["2030-06-03", "2030-06-04", "2030-06-05", "2030-06-06", "2030-06-07", "2030-06-08", "2030-06-09"];
    const ocekivano = ["u ponedjeljak", "u utorak", "u srijedu", "u četvrtak", "u petak", "u subotu", "u nedjelju"];
    // Ponoć po zagrebačkom vremenu — onako kako je datum zapisan u bazi.
    expect(tjedan.map((d) => danUAkuzativu(new Date(`${d}T00:00:00+02:00`)))).toEqual(ocekivano);
  });

  it("dan čita po zagrebačkoj zoni, ne po zoni poslužitelja", () => {
    // 2030-06-02 00:00 u Zagrebu = 2030-06-01 22:00 UTC; poslužitelj u UTC-u
    // bi bez zone rekao "u subotu".
    expect(danUAkuzativu(new Date("2030-06-01T22:00:00Z"))).toBe("u nedjelju");
  });
});

describe("whatsappBroj", () => {
  it("domaći broj dobiva hrvatski pozivni", () => {
    expect(whatsappBroj("095 537 8559")).toBe("385955378559");
  });
  it("prihvaća +385 i 00385", () => {
    expect(whatsappBroj("+385 95 537 8559")).toBe("385955378559");
    expect(whatsappBroj("00385955378559")).toBe("385955378559");
  });
  it("prekratak ili prazan broj nije upotrebljiv", () => {
    expect(whatsappBroj("123")).toBeNull();
    expect(whatsappBroj(null)).toBeNull();
    expect(whatsappBroj("")).toBeNull();
  });
  it("poruka nosi poveznicu na pozivnicu", () => {
    expect(whatsappPoruka("https://x.hr/pozivnica/abc", "Mia")).toContain("https://x.hr/pozivnica/abc");
    expect(whatsappPoruka("https://x.hr/pozivnica/abc", "Mia")).toContain("(Mia)");
  });
});

describe("provjeriPredlozak", () => {
  it("prihvaća sliku do 4 MB", () => {
    expect(provjeriPredlozak("image/png", 1024)).toBeNull();
    expect(provjeriPredlozak("image/jpeg", 4 * 1024 * 1024)).toBeNull();
  });
  it("odbija pogrešnu vrstu, prazno i preveliko", () => {
    expect(provjeriPredlozak("application/pdf", 1024)).toMatch(/slika/i);
    expect(provjeriPredlozak("image/png", 0)).toMatch(/prazna/i);
    expect(provjeriPredlozak("image/png", 5 * 1024 * 1024)).toMatch(/4 MB/);
  });
  it("adresa predloška vodi na par tema + igraonica", () => {
    expect(predlozakUrl("t1", "r2")).toBe("/api/pozivnice/predlozak/t1/r2");
  });
  it("proslava bez teme ima generički predložak igraonice", () => {
    expect(predlozakUrl(null, "r2")).toBe("/api/pozivnice/predlozak/bez-teme/r2");
    expect(temaIzAdrese("bez-teme")).toBeNull();
    expect(temaIzAdrese("t1")).toBe("t1");
  });
});

describe("rasporedTeksta", () => {
  const retci = {
    ime: "Mia Horvat",
    slavi: "slavi 5. rođendan i zove te da se pridružiš.",
    dodji: "Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.",
  };

  it("dugo ime dobiva manja slova od kratkog", () => {
    const kratko = rasporedTeksta({ ...retci, ime: "Mia" }, 0.5);
    const dugo = rasporedTeksta({ ...retci, ime: "Ana-Marija Kovačević-Babić" }, 0.5);
    expect(dugo.ime).toBeLessThan(kratko.ime);
  });

  it("tekst stane u širinu okvira (uz dopušteno prelamanje)", () => {
    const r = rasporedTeksta({ ...retci, ime: "Ana-Marija Kovačević-Babić" }, 0.5);
    // Ime smije u dva retka: procijenjena širina ne smije preći dvostruku širinu okvira.
    expect("Ana-Marija Kovačević-Babić".length * 0.52 * r.ime).toBeLessThanOrEqual(2 * 94 + 0.01);
    expect(retci.dodji.length * 0.52 * r.dodji).toBeLessThanOrEqual(3 * 94 + 0.01);
  });

  it("nizak okvir stisne sve retke", () => {
    const visok = rasporedTeksta(retci, 0.6);
    const nizak = rasporedTeksta(retci, 0.15);
    expect(nizak.ime).toBeLessThan(visok.ime);
    expect(nizak.dodji).toBeLessThan(visok.dodji);
  });

  it("skala iz administracije mijenja veličinu, ali ne razbija uklapanje", () => {
    const zadano = rasporedTeksta(retci, 0.5, 1);
    const vece = rasporedTeksta(retci, 0.5, 1.4);
    expect(vece.ime).toBeGreaterThanOrEqual(zadano.ime);
  });

  it("omjer okvira računa se iz postotaka i dimenzija slike", () => {
    // Pola širine i pola visine slike 1000x1000 -> kvadratni okvir.
    expect(omjerOkvira({ sirina: 50, visina: 50 }, 1000, 1000)).toBeCloseTo(1);
    expect(omjerOkvira({ sirina: 80, visina: 20 }, 1000, 1400)).toBeCloseTo((0.2 * 1400) / (0.8 * 1000));
  });
});

describe("analizirajStil", () => {
  function povrsina(boja: (x: number, y: number) => [number, number, number], n = 40) {
    const d = new Uint8ClampedArray(n * n * 4);
    for (let y = 0; y < n; y++) {
      for (let x = 0; x < n; x++) {
        const i = (y * n + x) * 4;
        const [r, g, b] = boja(x, y);
        d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
      }
    }
    return { d, n };
  }
  const cijela = { top: 0, lijevo: 0, sirina: 100, visina: 100 };

  it("mirno bijelo polje daje tamni tekst bez podloge", () => {
    const { d, n } = povrsina(() => [250, 250, 250]);
    expect(analizirajStil(d, n, n, cijela, 4)).toEqual({ tekstSvijetli: false, podloga: "nema", podlogaProzirnost: 85 });
  });

  it("mirna tamna slika daje svijetli tekst bez podloge", () => {
    const { d, n } = povrsina(() => [25, 25, 40]);
    expect(analizirajStil(d, n, n, cijela, 4)).toEqual({ tekstSvijetli: true, podloga: "nema", podlogaProzirnost: 85 });
  });

  it("šarena svijetla površina dobiva svijetlu podlogu", () => {
    const { d, n } = povrsina((x, y) => ((x + y) % 2 === 0 ? [250, 250, 250] : [120, 60, 200]));
    const stil = analizirajStil(d, n, n, cijela, 4);
    expect(stil.podloga).toBe("svijetla");
    expect(stil.podlogaProzirnost).toBeGreaterThan(50);
  });
});
