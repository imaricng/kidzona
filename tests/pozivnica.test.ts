import { describe, expect, it } from "vitest";
import { danUAkuzativu, potvrdaDolaska, predlozakUrl, provjeriPredlozak, temaIzAdrese } from "@/lib/pozivnica";
import { popuniTekst, PRIMJER_VRIJEDNOSTI, retciPozivnice } from "@/lib/pozivnica-tekst";
import { analizirajStil } from "@/lib/okvir-detekcija";
import { omjerOkvira, rasporedTeksta } from "@/lib/pozivnica-raspored";

/** Prijelaz u novi redak — predložak teksta je višeredni. */
const ENTER = String.fromCharCode(10);

describe("popuniTekst", () => {
  const osnova = { date: new Date("2030-06-01T00:00:00+02:00"), slotStart: "17:00", slotEnd: "19:00" };

  it("zadani tekst daje ime, godine i termin", () => {
    const retci = retciPozivnice(
      { ...osnova, childName: "Mia", childLastName: "Horvat", childTurning: 5, phone: null },
      null,
    );
    expect(retci).toEqual([
      "Mia Horvat",
      "slavi 5. rođendan i zove te da se pridružiš.",
      "Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.",
    ]);
  });

  it("bez prezimena prikazuje samo ime", () => {
    const retci = retciPozivnice({ ...osnova, childName: "Mia", childLastName: "  ", phone: null }, null);
    expect(retci[0]).toBe("Mia");
  });

  it("godine racuna iz datuma rodenja kad nisu upisane", () => {
    const retci = retciPozivnice(
      { ...osnova, childName: "Mia", childBirthDate: new Date("2024-03-10T00:00:00"), phone: null },
      null,
    );
    expect(retci[1]).toBe("slavi 6. rođendan i zove te da se pridružiš.");
  });

  it("redak s praznom varijablom se izostavlja", () => {
    const retci = retciPozivnice({ ...osnova, childName: "Mia", phone: null }, null);
    expect(retci).toHaveLength(2);
    expect(retci.join(" ")).not.toContain("slavi");
  });

  it("vlastiti tekst s emotikonima i varijablama", () => {
    const predlozak = ["🎉 {imeKratko} te zove!", "U {igraonica}, {dan} u {od}."].join(ENTER);
    const retci = popuniTekst(predlozak, PRIMJER_VRIJEDNOSTI);
    expect(retci).toEqual(["🎉 Mia te zove!", "U Kids Play, u subotu u 17:00."]);
  });

  it("nepoznata varijabla ostaje vidljiva da se primijeti tipfeler", () => {
    expect(popuniTekst("{imeeee} slavi", PRIMJER_VRIJEDNOSTI)).toEqual(["{imeeee} slavi"]);
  });

  it("potvrda dolaska nosi broj, a bez broja je nema", () => {
    expect(potvrdaDolaska("095 537 8559")).toBe("Dolazak potvrdi na broj 095 537 8559.");
    expect(potvrdaDolaska(null)).toBeNull();
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
  const retci = [
    "Mia Horvat",
    "slavi 5. rođendan i zove te da se pridružiš.",
    "Dođi u subotu, 01. 06. 2030. od 17:00 do 19:00 sati.",
  ];
  const sDugimImenom = ["Ana-Marija Kovačević-Babić", retci[1], retci[2]];

  it("dugo ime dobiva manja slova od kratkog", () => {
    expect(rasporedTeksta(sDugimImenom, 0.5).velicine[0]).toBeLessThan(rasporedTeksta(["Mia", retci[1], retci[2]], 0.5).velicine[0]);
  });

  it("tekst stane u širinu okvira (uz dopušteno prelamanje)", () => {
    const r = rasporedTeksta(sDugimImenom, 0.5);
    expect(sDugimImenom[0].length * 0.52 * r.velicine[0]).toBeLessThanOrEqual(2 * 94 + 0.01);
    expect(retci[2].length * 0.52 * r.velicine[2]).toBeLessThanOrEqual(3 * 94 + 0.01);
  });

  it("nizak okvir stisne sve retke", () => {
    const visok = rasporedTeksta(retci, 0.6);
    const nizak = rasporedTeksta(retci, 0.15);
    expect(nizak.velicine[0]).toBeLessThan(visok.velicine[0]);
    expect(nizak.velicine[2]).toBeLessThan(visok.velicine[2]);
  });

  it("skala iz administracije mijenja veličinu, ali ne razbija uklapanje", () => {
    expect(rasporedTeksta(retci, 0.5, 1.4).velicine[0]).toBeGreaterThanOrEqual(rasporedTeksta(retci, 0.5, 1).velicine[0]);
  });

  it("podnosi i više od tri retka", () => {
    const pet = [...retci, "Bit će torte! 🎂", "Vidimo se!"];
    const r = rasporedTeksta(pet, 0.5);
    expect(r.velicine).toHaveLength(5);
    expect(r.velicine.every((v) => v > 0)).toBe(true);
  });

  it("omjer okvira računa se iz postotaka i dimenzija slike", () => {
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
