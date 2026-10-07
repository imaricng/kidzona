"use client";

import { useState } from "react";

/**
 * Slanje pozivnice WhatsAppom kao slike.
 *
 * WhatsApp ne prima privitak kroz poveznicu, pa postoje dva puta:
 *  - **mobitel**: sustavno dijeljenje otvori WhatsApp sa slikom i tekstom u
 *    privitku — roditelj dobije sliku, ne link;
 *  - **računalo**: slika se kopira u međuspremnik i otvori se razgovor, pa se
 *    u WhatsApp Webu zalijepi s Ctrl+V. Ako preglednik to ne dopušta, slika se
 *    preuzme i doda se ručno.
 *
 * Nakon slanja bilježimo da je pozivnica otišla WhatsAppom (`oznaci`).
 */
export function PosaljiPozivnicuWhatsapp({
  slikaUrl,
  waVeza,
  poruka,
  nazivDatoteke,
  oznaci,
  malen = false,
}: {
  slikaUrl: string;
  /** `wa.me` poveznica na razgovor s roditeljem; `null` kad nema broja. */
  waVeza: string | null;
  poruka: string;
  nazivDatoteke: string;
  oznaci: () => Promise<void>;
  malen?: boolean;
}) {
  const [stanje, setStanje] = useState<"spremno" | "radim" | "kopirano" | "preuzeto" | "greska">("spremno");

  async function dohvatiSliku(): Promise<Blob> {
    const o = await fetch(slikaUrl);
    if (!o.ok) throw new Error(`Slika nije dostupna (${o.status}).`);
    return o.blob();
  }

  /** Međuspremnik prima samo PNG, a pozivnica se crta kao JPEG. */
  async function uPng(jpeg: Blob): Promise<Blob> {
    const slika = await createImageBitmap(jpeg);
    const platno = document.createElement("canvas");
    platno.width = slika.width;
    platno.height = slika.height;
    platno.getContext("2d")?.drawImage(slika, 0, 0);
    slika.close();
    return new Promise<Blob>((uspjeh, greska) =>
      platno.toBlob((b) => (b ? uspjeh(b) : greska(new Error("Pretvorba slike nije uspjela."))), "image/png"),
    );
  }

  function preuzmi(blob: Blob) {
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = nazivDatoteke;
    a.click();
    setTimeout(() => URL.revokeObjectURL(url), 10000);
  }

  async function posalji() {
    setStanje("radim");
    try {
      const jpeg = await dohvatiSliku();
      const datoteka = new File([jpeg], nazivDatoteke, { type: "image/jpeg" });

      // Mobitel: sustavno dijeljenje sa slikom u privitku.
      if (navigator.canShare?.({ files: [datoteka] })) {
        await navigator.share({ files: [datoteka], text: poruka });
        await oznaci();
        setStanje("spremno");
        return;
      }

      // Računalo: slika u međuspremnik pa lijepljenje u WhatsApp Web.
      let kopirano = false;
      try {
        const png = await uPng(jpeg);
        await navigator.clipboard.write([new ClipboardItem({ "image/png": png })]);
        kopirano = true;
      } catch {
        preuzmi(jpeg);
      }
      if (waVeza) window.open(waVeza, "_blank", "noopener");
      await oznaci();
      setStanje(kopirano ? "kopirano" : "preuzeto");
    } catch {
      setStanje("greska");
    }
  }

  const klasa = malen ? "btn-secondary !py-1 !text-xs" : "btn-secondary";
  return (
    <span className="inline-flex flex-col gap-1">
      <button type="button" onClick={posalji} disabled={stanje === "radim"} className={klasa}>
        {stanje === "radim" ? "Pripremam sliku…" : "💬 Pošalji sliku WhatsAppom"}
      </button>
      {stanje === "kopirano" && (
        <span className="text-xs text-mint-600">Slika je kopirana — u WhatsAppu pritisnite Ctrl+V i pošaljite.</span>
      )}
      {stanje === "preuzeto" && (
        <span className="text-xs text-ink-500">Slika je preuzeta — dodajte je u razgovor kao privitak.</span>
      )}
      {stanje === "greska" && <span className="text-xs text-red-600">Slika se nije uspjela pripremiti.</span>}
    </span>
  );
}
