# 🎈 Kidzona Nova Gradiška

Web aplikacija spremna za produkciju i javna stranica za **rođendaonicu i dječju
igraonicu Kidzona Nova Gradiška**. Pokriva cijeli životni ciklus proslave — od
upita i rezervacije putem interneta, preko naplate i fiskalnog računa, do dolaska gostiju
(QR prijava dolaska) i baze obitelji s dječjim rođendanima.

Aplikacija ima **dvije igraonice** (Mini Kidzona i Game Teen) pa se **istovremeno mogu odvijati dvije
proslave**, a kalendar automatski blokira zauzete termine i igraonice.

---

## ✨ Implementirane značajke

### Landing stranica (javno)
- Naslovni dio s gumbom „Rezerviraj proslavu", sekcije paketa po igraonicama, termina, tematskih proslava, galerije,
  „Zašto Kidzona", recenzija, česta pitanja, kontakt i lokacija.
- Prilagođeno mobitelima, stalno vidljiv gumb za rezervaciju na mobitelu, meta oznake za tražilice.

### Rezervacije putem interneta i kalendar
- Rezervacija u koracima: **datum → termin → igraonica/paket → broj djece →
  dodaci → tema → podaci → plaćanje → potvrda**.
- Dvije igraonice, svaka sa svojim paketima (Standard i Premium).
- **Raspored termina:** pet–ned u 14:00 i 17:00, pon i sri u 17:00; kraj ovisi o paketu (2 h ili 3 h).
- **Automatska blokada termina i igraonice** —
  dvostruka rezervacija je onemogućena (provjera u transakciji).
- **Semafor dostupnosti** (zeleno/žuto/crveno).

### Paketi i automatski izračun cijene
- Paketi Standard / Premium imaju **fiksnu cijenu po proslavi** za uključeni broj djece
  (slavljenik je gratis), a svako dodatno dijete naplaćuje se 10 €. Ukupna cijena = paket + nadoplata + odabrani dodaci
  (računa se uživo u sažetku). Katalog igraonica i paketa je u `prisma/katalog.ts`.
- Dodaci (pizza, torta, dekoracija, pokloni, animator, fotograf)
  s jediničnom cijenom „po djetetu" ili „fiksno".
- Tematske proslave (dinosauri, svemir, jednorozi, podmorje).

### Plaćanje i akontacija
- **Akontacija** (zadano 30 %) ili puni iznos pri potvrdi rezervacije.
- Plaćanje je izdvojeno u `PaymentService` — **probni** način rada (simulirana
  plaćanja) dok Stripe ključevi nisu postavljeni.
- **Poklon-bonovi:** javna kupnja na [`/pokloni`](src/app/pokloni/),
  **iskorištenje pri rezervaciji** (umanjuje iznos za naplatu), popis u administraciji i
  praćenje stanja.

### Portal za roditelje (kupce)
- **Registracija** obitelji s **više djece odjednom** (ime, datum rođenja,
  alergije) na [`/portal/registracija`](src/app/portal/registracija/) i prijava.
- Nadzorna ploča: profil, djeca, **povijest rezervacija** i **brzo ponavljanje**
  prošle rezervacije (unaprijed popunjeni paket, broj djece i kontakt).
- Upravljanje djecom i **GDPR brisanje računa** (briše profil i djecu; rezervacije
  ostaju u evidenciji bez osobne poveznice).

### Baza obitelji, djece i rođendana
- Baza **obitelji, e-pošte roditelja i djece (ime, datum rođenja, alergije)**.
- Pregled **nadolazećih rođendana (60 dana)** i slanje **podsjetnika za sljedeći
  rođendan** — samo uz privolu za marketing.
- Pretraživanje, broj rezervacija, status privole za marketing, povijest.

### Digitalne privole i prijava dolaska
- Privola za obradu podataka i izjava roditelja pri rezervaciji.
- Svaka potvrda nosi **QR kod**; skeniranjem na ulazu osoblje evidentira dolazak
  (`/checkin/<token>`).

### Automatizirane komunikacije
Okidaju se automatski i **zapisuju u konzolu razvojnog poslužitelja** te u bazu (`NotificationLog`):
- Trenutna **potvrda rezervacije** (s QR poveznicom).
- **Obavijest osoblju** (termin, priprema hrane, broj gostiju, dodaci).
- **Podsjetnik** (dan prije), **zahvala i zamolba za Google recenziju** (dan
  poslije), **podsjetnik za sljedeći rođendan** godinu dana kasnije.
- Pokreće ih **zakazani zadatak (cron)** [`/api/cron/reminders`](src/app/api/cron/reminders/route.ts)
  (bez dvostrukih poruka) i **ručni gumb na nadzornoj ploči**.
  Postavke zakazanog zadatka (Vercel Cron) su u [`vercel.json`](vercel.json) (svaki dan u 9:00).

### Članstva, vjernost i slobodna igra (opcijski modul)
- **Bodovi vjernosti** (automatski po završenoj proslavi), **članstva** s
  automatskom obnovom, **vremenske ulaznice za slobodnu igru** s automatskim isticanjem.
- Uključuju se s `FEATURE_LOYALTY`, `FEATURE_MEMBERSHIPS`, `FEATURE_OPEN_PLAY`.

### Administracija
- Nadzorna ploča (prihod, broj rezervacija, današnje proslave, popunjenost,
  ručni okidač automatike).
- Kalendar s blokadom termina i igraonica, popis i detalj rezervacije (promjena statusa,
  slanje poruka, **izmjena termina**, **otkazivanje uz povrat**,
  **ispis računa u PDF**), **baza obitelji**, **raspored osoblja**, **uređivanje paketa,
  dodataka, igraonica i tema** (kroz sučelje), **poklon-bonovi**,
  **članstva, vjernost i slobodna igra**, **blagajna**.

### Sigurnost, privatnost i jezik
- **Zaboravljena lozinka** (token na 1 sat, jednokratan) — `/portal/zaboravljena-lozinka`.
- **Ograničenje broja pokušaja** na prijavu, rezervaciju i novu lozinku (u memoriji; za produkciju Redis).
- **Obavijest o kolačićima** + stranica [Pravila privatnosti](src/app/privatnost/).
- **Otkazivanje iz portala** (roditelj) uz automatski povrat.
- **Dvojezičnost (HR/EN):** potpun [engleski rječnik](src/i18n/en.ts) + prebacivanje
  jezika kolačićem (`getDict`/`getLocale`); javna stranica je dvojezična, prekidač u
  zaglavlju. Ostale stranice koriste isti mehanizam (`getDict(await getLocale())`).
- **Google karta** ugrađena na početnu stranicu (bez API ključa za osnovni prikaz).
- **Testovi:** `npm test` (Vitest) — jedinični testovi izračuna cijene i termina.

### Fiskalizacija (Hrvatska)
- Svaki račun (rezervacija i blagajna) prolazi kroz `FiscalizationService` sučelje i
  ima polja **JIR**, **ZKI**, **redni broj računa**, oznaku poslovnog prostora i
  naplatnog uređaja. Trenutno **probni način** — stvarni servis se priključuje (vidi
  niže).

---

## 🧰 Tehnologije

- **Next.js 15** (App Router) + **TypeScript** + **Tailwind CSS**
- **Prisma ORM** + **PostgreSQL** (Prisma Postgres na Vercelu)
- Apstrakcije: `PaymentService` (Stripe), `FiscalizationService`,
  `NotificationService` (email/SMS) — pružatelj usluge mijenja se na jednom mjestu
- Sav novac u **EUR-centima** (Int); formatiranje po hrvatskom standardu
- i18n rječnik (`src/i18n/hr.ts`) — uz engleski prijevod (`src/i18n/en.ts`)

---

## 🚀 Pokretanje lokalno

Preduvjeti: **Node.js 18+** (testirano na 25) i npm.

```bash
# 1) instaliraj ovisnosti (automatski pokreće `prisma generate`)
npm install

# 2) pripremi varijable okruženja
cp .env.example .env        # na Windowsu: copy .env.example .env

# 3) u .env postavi DATABASE_URL (PostgreSQL), stvori tablice i unesi katalog i administratora
npm run db:push && npm run db:sync-katalog
ADMIN_EMAIL="..." ADMIN_PASSWORD="..." npm run db:admin

# 4) pokreni razvojni server
npm run dev
```

Otvori **http://localhost:3000**.

**Probne prijave** (samo u lokalnoj bazi napunjenoj s `npm run db:reset`):
- Administracija (`/admin`) — Admin: `admin@kidzona.hr` / `admin123`
- Administracija — Osoblje: `osoblje@kidzona.hr` / `osoblje123`
- Portal za roditelje (`/portal`): `ivana.horvat@example.com` / `roditelj123`

> Automatske poruke (potvrda, obavijest osoblju, podsjetnik…) ispisuju se u
> **konzoli u kojoj radi `npm run dev`**.

### Korisne skripte
| Naredba | Opis |
|---|---|
| `npm run dev` | razvojni server |
| `npm run build` | produkcijska verzija (uključuje provjeru tipova) |
| `npm run start` | pokretanje produkcijske verzije |
| `npm run db:push` | sinkronizira shemu s bazom |
| `npm run db:seed` | puni probne podatke — briše sve (**samo lokalna baza**) |
| `npm run db:reset` | briše bazu i puni probne podatke (**samo lokalna baza**) |
| `npm run db:sync-katalog` | unosi igraonice i pakete iz `prisma/katalog.ts` bez brisanja podataka |
| `npm run db:admin` | stvara ili mijenja administratora (`ADMIN_EMAIL`, `ADMIN_PASSWORD`, lozinka barem 12 znakova) |
| `npm test` | pokreće jedinične testove (Vitest) |

---

## 🔑 Varijable okruženja (`.env`)

Vidi `.env.example` za potpuni popis i komentare. Najvažnije:

| Varijabla | Zadano | Opis |
|---|---|---|
| `DATABASE_URL` | — | veza na PostgreSQL (`postgres://…`) |
| `NEXT_PUBLIC_APP_URL` | `http://localhost:3000` | osnovna adresa (QR poveznice, e-pošta) |
| `AUTH_SECRET` | — | tajna za potpis prijave; **u produkciji obvezna** (bez nje prijava ne radi) |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | — | koristi ih `npm run db:admin` (i lokalni seed) |
| `DEPOSIT_PERCENT` | `30` | postotak akontacije |
| `STRIPE_SECRET_KEY` | prazno → **probni način** | Stripe tajni ključ (EUR) |
| `NOTIFICATION_PROVIDER` | `console` | `console` / (kasnije) `resend`, `twilio` |
| `EMAIL_FROM` | `info@kidzona.hr` | pošiljatelj automatskih poruka (domena potvrđena kod servisa za slanje) |
| `STAFF_EMAIL` | `kidzonang@gmail.com` | primatelj obavijesti osoblju o novim rezervacijama |
| `EMAIL_REPLY_TO` | `kidzonang@gmail.com` | adresa za odgovore kupaca na automatske poruke |
| `FISCALIZATION_PROVIDER` | `mock` | `mock` / (kasnije) `fina` |
| `FISCAL_OIB`, `FISCAL_BUSINESS_SPACE`, `FISCAL_CASH_REGISTER` | — | podaci obveznika fiskalizacije |
| `CRON_SECRET` | — | štiti `/api/cron/reminders`; **u produkciji obvezan** |
| `LOYALTY_POINTS_PER_PARTY` | `50` | bodovi vjernosti po proslavi |
| `FEATURE_MEMBERSHIPS` / `FEATURE_LOYALTY` / `FEATURE_OPEN_PLAY` | `true` | uključivanje opcijskih modula |

---

## 🔌 Gdje se priključuju stvarni servisi

Sve su integracije iza sučelja — implementiraj klasu i dodaj granu u tvorničkoj
funkciji. Bez ostalih izmjena u kodu.

### Plaćanje (Stripe, EUR) — IMPLEMENTIRANO, aktivira se ključem
- [`src/lib/payments/stripe-provider.ts`](src/lib/payments/stripe-provider.ts) —
  `StripePaymentProvider` kreira PaymentIntent (`currency: "eur"`) i vraća
  `client_secret`. Aktivira se čim postaviš `STRIPE_SECRET_KEY` (inače probni način).
- Webhook [`/api/webhooks/stripe`](src/app/api/webhooks/stripe/route.ts) na
  `payment_intent.succeeded` označava plaćanje uspješnim i ažurira rezervaciju
  (`paidCents`, status). Postavi `STRIPE_WEBHOOK_SECRET`.
- **Stripe Payment Element na sučelju je gotov**
  ([`StripeConfirm.tsx`](src/components/booking/StripeConfirm.tsx)): kad je
  postavljen `NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY`, rezervacija prikazuje Stripe
  Payment Element i potvrđuje plaćanje karticom. Bez ključa ostaje probni tok.
  Lokalno: `stripe listen --forward-to localhost:3000/api/webhooks/stripe`.

### Fiskalizacija (Hrvatska — zakonska obveza)
- Datoteke: [`src/lib/fiscalization/`](src/lib/fiscalization/)
- `FiscalizationService.fiscalizeInvoice()` je točka priključka. Implementiraj
  npr. `FinaFiscalizationProvider` koji:
  - izračunava **ZKI** (RSA-SHA1 potpis nad nizom podataka, FINA certifikat),
  - šalje račun **Poreznoj upravi** (SOAP/XML) i dohvaća **JIR**.
- Račun (`Invoice`) već ima polja `jir`, `zki`, `number`, `businessSpace`,
  `cashRegister`. **Probni način generira lažne vrijednosti samo za razvoj.**

### Obavijesti e-poštom i SMS-om — IMPLEMENTIRANO, aktivira se ključem
- [`src/lib/notifications/resend-provider.ts`](src/lib/notifications/resend-provider.ts)
  šalje e-poštu preko **Resend** i SMS preko **Twilio** (REST, bez dodatnih ovisnosti).
- Aktiviraj s `NOTIFICATION_PROVIDER=resend` + `RESEND_API_KEY` (email) i/ili
  `TWILIO_ACCOUNT_SID`/`TWILIO_AUTH_TOKEN`/`TWILIO_FROM_NUMBER` (SMS). Inače razvojni način
  (konzola). Predlošci su u [`templates.ts`](src/lib/notifications/templates.ts).

---

## 🏛️ Arhitektura (ukratko)

```
src/
├─ app/                      # Next.js App Router
│  ├─ page.tsx               # početna stranica
│  ├─ rezervacija/           # rezervacija u koracima
│  ├─ potvrda/[code]/        # potvrda + QR
│  ├─ checkin/[token]/       # QR prijava dolaska
│  ├─ pokloni/               # kupnja poklon-bonova
│  ├─ portal/                # portal za roditelje (prijava, registracija, (app))
│  ├─ api/                   # availability, booking, vouchers, cron, portal
│  └─ admin/                 # prijava + (panel) zaštićene rute
├─ components/               # sučelje (početna, rezervacija, administracija)
├─ i18n/hr.ts                # centralizirani hrvatski rječnik
└─ lib/
   ├─ prisma.ts, env.ts, format.ts, auth.ts, password.ts
   ├─ pricing.ts             # automatski izračun cijene (čista funkcija)
   ├─ slots.ts               # raspored termina, semafor, preklapanje
   ├─ reservations.ts        # dostupnost, zaštita od dvostruke rezervacije, račun, automatika
   ├─ payments/              # PaymentService (Stripe / probni)
   ├─ fiscalization/         # FiscalizationService (FINA / probni)
   └─ notifications/         # NotificationService + predlošci + okidači
prisma/
├─ schema.prisma            # domenski model (Postgres-kompatibilan)
└─ seed.ts                  # probni podaci (katalog igraonica i paketa je u katalog.ts)
```

Ključne odluke: novac kao **Int (centi)**; statusi/role kao **String** s Zod
validacijom; liste kao **Json**; vanjski
sustavi iza **sučelja**.

---

## 🧪 Provjera kriterija prihvaćanja

1. ✅ Rezervacija od gumba do (probnog) plaćanja i potvrde s **QR kodom**.
2. ✅ Potvrđena rezervacija **blokira termin i igraonicu** — dvostruka rezervacija onemogućena
   (HTTP 409).
3. ✅ Cijena se **mijenja uživo** s brojem djece i dodacima.
4. ✅ Admin prijava → rezervacija vidljiva na nadzornoj ploči i u kalendaru.
5. ✅ Automatske poruke (potvrda, obavijest osoblju, podsjetnik) — okidaju se i
   **zapisuju u konzolu**.
6. ✅ Svi računi kroz `FiscalizationService` s poljima **JIR/ZKI** i rednim brojem.
7. ✅ Cijeli UI na **hrvatskom**, cijene u **EUR**, datumi `dd.mm.gggg.`.
8. ✅ Responzivno, radi na mobilnoj širini.

---

## 📦 Sljedeći koraci za produkciju

- **Objava na Vercel:** baza je Prisma Postgres. Na Vercelu postavi `DATABASE_URL`, `AUTH_SECRET`,
  `CRON_SECRET` i `NEXT_PUBLIC_APP_URL`; promjene sheme primijeni s `npm run db:push`.
- **Stripe** i **email/SMS** su već implementirani — samo postavi ključeve
  (`STRIPE_SECRET_KEY`, `STRIPE_WEBHOOK_SECRET`, `RESEND_API_KEY`, Twilio) i dodaj
  Stripe Payment Element na sučelje. Preostaje **ovlašteni fiskalni** servis + FINA
  certifikat (interface je spreman).
- (Opcijski) Zamijeni probnu prijavu s NextAuth/Auth.js i premjesti ograničenje pokušaja na
  Redis/Upstash; dodaj Sentry (DSN) za praćenje pogrešaka i potpunu dvojezičnost
  na svim stranicama administracije i portala (mehanizam je već postavljen).
- Objava na **Vercel** (struktura je spremna, uklj. `vercel.json` cron); domena,
  `.env` tajne u okruženju, postavi `CRON_SECRET`.
- Platinum paketi (kad budu poznati podaci) — dodaju se u `prisma/katalog.ts` ili u administraciji.
- Prava e-pošta za potvrdu registracije u portalu.

---

© Kidzona Nova Gradiška. Probna aplikacija — sav sadržaj (slike, recenzije) je
privremen.
