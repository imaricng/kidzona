/**
 * Provjera postavki e-pošte i kalendara — bez dodirivanja rezervacija.
 *
 *   npm run provjeri                      → samo ispiše što je postavljeno
 *   npm run provjeri -- --posalji test@x  → pošalje testnu poruku na tu adresu
 *   npm run provjeri -- --kalendar        → upiše probni događaj (i odmah ga obriše)
 *
 * Pokreće se s istim varijablama okruženja koje koristi aplikacija.
 */
import { env } from "../src/lib/env";
import { SmtpNotificationProvider } from "../src/lib/notifications/smtp-provider";
import { upisiProslavuUKalendar, ukloniProslavuIzKalendara, idDogadjaja } from "../src/lib/kalendar";
import { dohvatiPonudu, provjeriTermin, izracunajZaChat } from "../src/lib/chat/alati";

const args = process.argv.slice(2);
function argVrijednost(ime: string): string | undefined {
  const i = args.indexOf(ime);
  return i >= 0 ? args[i + 1] : undefined;
}
const ima = (v: string) => (v ? "✅ postavljeno" : "❌ nedostaje");

async function main() {
  console.log("--- E-pošta ---------------------------------------------");
  console.log(`NOTIFICATION_PROVIDER : ${env.notificationProvider}${env.notificationProvider === "smtp" ? "" : "  ⚠️  poruke se NE šalju (samo se zapisuju)"}`);
  console.log(`SMTP_HOST / PORT      : ${env.smtpHost}:${env.smtpPort}`);
  console.log(`SMTP_USER             : ${env.smtpUser || "(prazno)"} ${ima(env.smtpUser)}`);
  console.log(`SMTP_PASSWORD         : ${ima(env.smtpPassword)}`);
  console.log(`STAFF_EMAIL (upiti)   : ${env.staffEmail}`);
  console.log(`EMAIL_REPLY_TO        : ${env.emailReplyTo}`);
  console.log(`REVIEW_URL (recenzija): ${env.reviewUrl}`);

  console.log("\n--- Google Calendar -------------------------------------");
  console.log(`GOOGLE_CALENDAR_ID    : ${env.googleCalendarId || "(prazno)"} ${ima(env.googleCalendarId)}`);
  console.log(`GOOGLE_CLIENT_EMAIL   : ${env.googleClientEmail || "(prazno)"} ${ima(env.googleClientEmail)}`);
  console.log(`GOOGLE_PRIVATE_KEY    : ${ima(env.googlePrivateKey)}`);
  console.log(`Kalendar aktivan      : ${env.googleCalendarAktivan ? "da" : "ne"}`);

  const primatelj = argVrijednost("--posalji");
  if (primatelj) {
    console.log(`\n--- Testna poruka → ${primatelj} ---`);
    const provider = new SmtpNotificationProvider();
    try {
      await provider.provjeriVezu();
      console.log("Veza sa SMTP poslužiteljem: ✅ uspješna prijava");
    } catch (e) {
      console.log("Veza sa SMTP poslužiteljem: ❌", String(e));
      console.log("Podsjetnik: Gmail traži App Password (2FA → Lozinke za aplikacije), ne lozinku računa.");
      return;
    }
    const r = await provider.posalji({
      tip: "osoblje",
      kanal: "email",
      primatelj,
      naslov: "Test — Party Kidzona (slanje e-pošte radi)",
      tijelo: [
        "Ovo je testna poruka iz sustava Party Kidzona.",
        "",
        "Ako ste je primili, slanje e-pošte je ispravno postavljeno:",
        `• novi upiti idu na: ${env.staffEmail}`,
        `• odgovori kupaca idu na: ${env.emailReplyTo}`,
        "",
        "Poruku možete obrisati.",
      ].join("\n"),
    });
    console.log("Rezultat slanja:", r.status, r.greska ?? r.providerRef ?? "");
  }

  if (args.includes("--kalendar")) {
    console.log("\n--- Probni događaj u kalendaru ---");
    if (!env.googleCalendarAktivan) {
      console.log("❌ Kalendar nije konfiguriran (nedostaju GOOGLE_* varijable).");
      return;
    }
    const code = "KZ-TEST-0001";
    const sutra = new Date(Date.now() + 86_400_000).toISOString().slice(0, 10);
    const upisan = await upisiProslavuUKalendar({
      code,
      datumISO: sutra,
      slotStart: "09:00",
      slotEnd: "09:30",
      naslov: "TEST — provjera povezivanja (slobodno obrišite)",
      opis: "Probni događaj koji je upisao sustav Party Kidzona.",
      lokacija: "Party Kidzona Nova Gradiška",
    });
    console.log(`Upis (${idDogadjaja(code)}):`, upisan.ok ? "✅ uspio" : `❌ nije uspio — ${upisan.razlog}`);
    if (upisan.ok) {
      const uklonjen = await ukloniProslavuIzKalendara(code);
      console.log("Brisanje probnog događaja:", uklonjen.ok ? "✅ uspjelo" : `❌ nije uspjelo — ${uklonjen.razlog}`);
    }
  }

  if (args.includes("--chat")) {
    console.log("\n--- Chatbot ---------------------------------------------");
    console.log(`ANTHROPIC_API_KEY     : ${ima(env.anthropicApiKey)}`);
    console.log(`Chat aktivan          : ${env.chatAktivan ? "da" : "ne (widget se ne prikazuje)"}`);

    console.log("\nAlati (rade i bez ključa — model iz njih dobiva činjenice):");
    const ponuda = await dohvatiPonudu();
    console.log(`  dohvati_ponudu   → ${ponuda.igraonice.length} igraonice, ${ponuda.paketi.length} paketa, ${ponuda.dodaci.length} dodataka, ${ponuda.teme.length} tema`);
    for (const p of ponuda.paketi) console.log(`      • ${p.naziv} — ${p.cijena}, ${p.trajanje}, do ${p.ukljucenoDjece} djece`);

    const zaTjedanDana = new Date(Date.now() + 7 * 86_400_000).toISOString().slice(0, 10);
    const termin = await provjeriTermin(zaTjedanDana);
    console.log(`  provjeri_termin  → ${zaTjedanDana}: ${termin.moguce ? `slobodno u ${termin.slobodniPocetci?.join(", ")}` : `${termin.razlog}${termin.prijedlogDatuma ? ` Prijedlog: ${termin.prijedlogDatuma}.` : ""}`}`);

    const prvi = ponuda.paketi.find((p) => !p.cijenaPoDogovoru);
    if (prvi) {
      const c = await izracunajZaChat({ packageId: prvi.id, numChildren: prvi.ukljucenoDjece + 2 });
      console.log(`  izracunaj_cijenu → ${prvi.naziv} za ${prvi.ukljucenoDjece + 2} djece: ukupno ${c.ukupno} (${c.placanje})`);
    }
  }

  if (!primatelj && !args.includes("--kalendar") && !args.includes("--chat")) {
    console.log("\nZa testno slanje: npm run provjeri -- --posalji vasa@adresa.hr");
    console.log("Za provjeru kalendara: npm run provjeri -- --kalendar");
    console.log("Za provjeru chatbota: npm run provjeri -- --chat");
  }
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
