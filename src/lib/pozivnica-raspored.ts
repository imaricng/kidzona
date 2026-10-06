/**
 * Uklapanje teksta pozivnice u okvir na predlošku.
 *
 * Okviri su različitih oblika (široki i niski, uski i visoki), a imena različite
 * duljine, pa se veličina slova ne može zadati fiksno. Ovdje se računa iz
 * duljine teksta i oblika okvira: prvo koliko stane po širini (uz prelamanje),
 * zatim se sve skupa stisne ako je previsoko.
 *
 * Mjerna jedinica je `cqw` — postotak širine okvira. Isti brojevi vrijede na
 * mobitelu, na desktopu i pri crtanju PNG pozivnice.
 */

/** Prosječna širina znaka u odnosu na visinu slova (procjena za naše fontove). */
const SIRINA_ZNAKA = 0.52;
/** Koliko širine okvira tekst smije zauzeti (ostatak je zrak uz rub). */
const ISKORISTIVA_SIRINA = 94;
/** Koliko visine okvira tekst smije zauzeti. */
const ISKORISTIVA_VISINA = 92;

export interface RetciPozivnice {
  ime: string;
  slavi: string;
  dodji: string;
}

export interface Raspored {
  /** Veličine slova u `cqw` (postotak širine okvira). */
  ime: number;
  slavi: number;
  dodji: number;
  /** Razmak između redaka u `cqw`. */
  razmak: number;
}

/** Osnovne veličine prije uklapanja. */
const OSNOVA = { ime: 11, slavi: 5.4, dodji: 5.4, razmak: 2.2 };

/** Koliko redaka zauzme tekst zadane veličine. */
function brojRedaka(tekst: string, velicina: number): number {
  const sirinaTeksta = tekst.length * SIRINA_ZNAKA * velicina;
  return Math.max(1, Math.ceil(sirinaTeksta / ISKORISTIVA_SIRINA));
}

/** Najveća veličina pri kojoj tekst stane u zadani broj redaka. */
function stane(tekst: string, osnova: number, najviseRedaka: number): number {
  if (tekst.length === 0) return osnova;
  const najvecaZaRedak = (ISKORISTIVA_SIRINA * najviseRedaka) / (tekst.length * SIRINA_ZNAKA);
  return Math.min(osnova, najvecaZaRedak);
}

/**
 * Veličine slova za tri retka pozivnice.
 *
 * @param omjerOkvira visina okvira podijeljena njegovom širinom
 * @param skala ručno povećanje ili smanjenje iz administracije (1 = zadano)
 */
export function rasporedTeksta(retci: RetciPozivnice, omjerOkvira: number, skala = 1): Raspored {
  const s = Math.max(0.5, Math.min(2, skala));
  const trazeno = uklopi(retci, omjerOkvira, s);
  if (s <= 1) return trazeno;
  // Povećanje ne može preko granice uklapanja: ako bi veća slova ostatka
  // teksta stisnula ime, ostaje najbolji uklopljeni raspored.
  const zadano = uklopi(retci, omjerOkvira, 1);
  return trazeno.ime >= zadano.ime ? trazeno : zadano;
}

function uklopi(retci: RetciPozivnice, omjerOkvira: number, s: number): Raspored {
  // Ime smije u dva retka, ostalo u tri — tako duga imena ostanu čitljiva.
  let ime = stane(retci.ime, OSNOVA.ime * s, 2);
  let slavi = stane(retci.slavi, OSNOVA.slavi * s, 3);
  let dodji = stane(retci.dodji, OSNOVA.dodji * s, 3);
  let razmak = OSNOVA.razmak * s;

  // Visina okvira izražena u istim jedinicama (širina okvira = 100 cqw).
  const visinaOkvira = Math.max(10, omjerOkvira * 100);
  const ukupno = () =>
    brojRedaka(retci.ime, ime) * ime * 1.15 +
    brojRedaka(retci.slavi, slavi) * slavi * 1.3 +
    brojRedaka(retci.dodji, dodji) * dodji * 1.3 +
    razmak * 2;

  const dopusteno = (visinaOkvira * ISKORISTIVA_VISINA) / 100;
  if (ukupno() > dopusteno) {
    const faktor = dopusteno / ukupno();
    ime *= faktor;
    slavi *= faktor;
    dodji *= faktor;
    razmak *= faktor;
  }

  const zaokruzi = (v: number) => Math.round(v * 100) / 100;
  return { ime: zaokruzi(ime), slavi: zaokruzi(slavi), dodji: zaokruzi(dodji), razmak: zaokruzi(razmak) };
}

/** Omjer okvira (visina/širina) iz postotaka okvira i dimenzija slike. */
export function omjerOkvira(
  okvir: { sirina: number; visina: number },
  slikaSirina: number,
  slikaVisina: number,
): number {
  const sirinaPx = (okvir.sirina / 100) * slikaSirina;
  const visinaPx = (okvir.visina / 100) * slikaVisina;
  if (sirinaPx <= 0) return 0.4;
  return visinaPx / sirinaPx;
}
