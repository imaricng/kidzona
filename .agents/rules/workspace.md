# Workspace pravila — Kidzona Nova Gradiška

Ova pravila vrijede za cijeli projekt. Agenti i suradnici ih moraju poštivati.

## Tehnologija
- **TypeScript je obavezan** u cijelom kodu (bez `any` osim uz jasan komentar i razlog).
- **Tailwind CSS** za sav stil. Bez inline CSS-a osim za dinamičke vrijednosti.
- **Next.js App Router** (folder `src/app`). API kroz Route Handlers.
- **Prisma ORM** za pristup bazi. Shema mora ostati Postgres-kompatibilna.

## Struktura
- **Jedna značajka = svoj modul/folder.** Domenska logika ide u `src/lib/<domena>`,
  UI u `src/components` ili `src/app/<ruta>`.
- Servisi vanjskih sustava (plaćanje, fiskalizacija, notifikacije) skrivaju se iza
  **interfacea** kako bi se provider lako zamijenio. Vidi `src/lib/*`.

## Sigurnost i tajne
- **Nikad ne hardkodiraj ključeve/tajne.** Sve ide kroz `.env` i `src/lib/env.ts`.
- Osjetljivi podaci o djeci (ime, dob, alergije) tretiraju se po GDPR-u: privola
  roditelja, mogućnost brisanja, minimalno izlaganje.

## Jezik i format
- **Svi korisnički tekstovi na hrvatskom**, isključivo kroz centralizirani i18n
  rječnik `src/i18n/hr.ts`. Bez hardkodiranih stringova u JSX-u.
- Valuta **EUR**, format po hrvatskom standardu (`45,00 €`) — koristi `formatEur()`.
- Datumi `dd.mm.gggg.`, 24-satni sat, zona `Europe/Zagreb` — koristi `formatDatum()`.

## Stil koda
- Sentence case u UI tekstovima. Bez agresivnih boja i bljeskanja.
- Funkcije i varijable opisno imenovane. Komentari na hrvatskom gdje pomažu.
