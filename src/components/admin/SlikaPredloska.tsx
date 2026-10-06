"use client";

import { useState } from "react";

/**
 * Odabir slike predloška pozivnice koji veliku fotografiju smanji u pregledniku
 * prije slanja.
 *
 * Razlog: poslužitelj prima najviše oko 4,5 MB po zahtjevu, a slike s mobitela
 * su redovito veće. Smanjena slika (duža stranica 1600 px, JPEG) i dalje je
 * oštra za pozivnicu, a stranica se učitava bitno brže.
 */

/** Duža stranica smanjene slike. */
const NAJVECA_STRANICA = 1600;
/** Slike manje od ovoga šaljemo takve kakve jesu. */
const BEZ_DIRANJA = 800 * 1024;
/** Najveća slika koju poslužitelj prihvaća. */
const NAJVECA = 4 * 1024 * 1024;

function mb(bajtova: number): string {
  return `${(bajtova / (1024 * 1024)).toFixed(1).replace(".", ",")} MB`;
}

/** Smanjuje sliku na `NAJVECA_STRANICA` i pretvara je u JPEG; `null` ako ne uspije. */
async function smanjiSliku(datoteka: File): Promise<File | null> {
  if (typeof createImageBitmap !== "function") return null;
  const slika = await createImageBitmap(datoteka);
  const omjer = Math.min(1, NAJVECA_STRANICA / Math.max(slika.width, slika.height));
  const sirina = Math.round(slika.width * omjer);
  const visina = Math.round(slika.height * omjer);

  const platno = document.createElement("canvas");
  platno.width = sirina;
  platno.height = visina;
  const ctx = platno.getContext("2d");
  if (!ctx) return null;
  // JPEG nema prozirnost — podloga je bijela da se prozirni dijelovi ne zacrne.
  ctx.fillStyle = "#ffffff";
  ctx.fillRect(0, 0, sirina, visina);
  ctx.drawImage(slika, 0, 0, sirina, visina);
  slika.close();

  const blob = await new Promise<Blob | null>((r) => platno.toBlob(r, "image/jpeg", 0.85));
  if (!blob) return null;
  const naziv = datoteka.name.replace(/\.[^.]+$/, "") || "predlozak";
  return new File([blob], `${naziv}.jpg`, { type: "image/jpeg" });
}

export function SlikaPredloska({ name = "slika" }: { name?: string }) {
  const [poruka, setPoruka] = useState<string | null>(null);
  const [greska, setGreska] = useState<string | null>(null);
  const [uTijeku, setUTijeku] = useState(false);

  async function promjena(e: React.ChangeEvent<HTMLInputElement>) {
    const polje = e.currentTarget;
    const izvorna = polje.files?.[0];
    setPoruka(null);
    setGreska(null);
    if (!izvorna) return;
    if (!izvorna.type.startsWith("image/")) {
      setGreska("Odaberite sliku (PNG, JPG ili WebP).");
      return;
    }

    let konacna = izvorna;
    if (izvorna.size > BEZ_DIRANJA) {
      setUTijeku(true);
      try {
        const smanjena = await smanjiSliku(izvorna);
        if (smanjena && smanjena.size < izvorna.size) {
          // Zamjena odabrane datoteke — obrazac zatim šalje smanjenu sliku.
          const prijenos = new DataTransfer();
          prijenos.items.add(smanjena);
          polje.files = prijenos.files;
          konacna = smanjena;
          setPoruka(`Slika je smanjena s ${mb(izvorna.size)} na ${mb(smanjena.size)}.`);
        }
      } catch {
        // Preglednik nije uspio otvoriti sliku — šaljemo izvornu i javljamo ako je prevelika.
      } finally {
        setUTijeku(false);
      }
    }

    if (konacna.size > NAJVECA) {
      setGreska(`Slika je i nakon smanjivanja ${mb(konacna.size)}. Spremite je u manjoj rezoluciji pa pokušajte ponovno.`);
    }
  }

  return (
    <div>
      <input
        type="file"
        name={name}
        accept="image/png,image/jpeg,image/webp"
        required
        onChange={promjena}
        className="block w-full text-xs text-ink-600 file:mr-2 file:rounded-full file:border-0 file:bg-brand-50 file:px-3 file:py-1 file:text-xs file:font-semibold file:text-brand-600"
      />
      {uTijeku && <p className="mt-1 text-xs text-ink-400">Smanjujem sliku…</p>}
      {poruka && <p className="mt-1 text-xs text-mint-600">{poruka}</p>}
      {greska && <p className="mt-1 text-xs font-medium text-red-600">{greska}</p>}
    </div>
  );
}
