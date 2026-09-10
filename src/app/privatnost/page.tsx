import { hr } from "@/i18n/hr";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";

export const metadata = { title: "Pravila privatnosti" };

export default function PrivatnostPage() {
  return (
    <>
      <SiteHeader />
      <main className="section py-12">
        <div className="prose mx-auto max-w-2xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Pravila privatnosti</h1>
          <p className="mt-2 text-sm text-ink-400">Posljednja izmjena: lipanj 2026.</p>

          <Section naslov="Voditelj obrade">
            {hr.brand.naziv}, {hr.kontakt.adresa}. Kontakt: {hr.kontakt.email}.
          </Section>
          <Section naslov="Koje podatke prikupljamo">
            Podatke roditelja (ime, e-pošta, telefon) i podatke o djeci (ime, datum rođenja, alergije)
            koje unesete pri rezervaciji ili registraciji. Podatke o djeci tretiramo kao osjetljive.
          </Section>
          <Section naslov="Svrha i pravna osnova">
            Podatke obrađujemo radi organizacije proslave, izdavanja računa (zakonska obveza
            fiskalizacije) te — uz vašu privolu — za podsjetnike i ponude.
          </Section>
          <Section naslov="Vaša prava (Opća uredba o zaštiti podataka)">
            Imate pravo na pristup, ispravak i brisanje podataka te povlačenje privole u svakom
            trenutku. Brisanje računa i podataka o djeci dostupno je u portalu (Račun i privatnost)
            ili na zahtjev na {hr.kontakt.email}. Računi ostaju u zakonskoj evidenciji bez poveznice
            na vaš profil.
          </Section>
          <Section naslov="Kolačići">
            Koristimo nužne kolačiće za rad stranice (npr. prijava). Marketinške kolačiće
            postavljamo samo uz vašu privolu.
          </Section>
          <Section naslov="Čuvanje i sigurnost">
            Podatke čuvamo samo koliko je potrebno za navedene svrhe te primjenjujemo razumne
            tehničke i organizacijske mjere zaštite.
          </Section>
        </div>
      </main>
      <SiteFooter />
    </>
  );
}

function Section({ naslov, children }: { naslov: string; children: React.ReactNode }) {
  return (
    <section className="mt-6">
      <h2 className="font-semibold text-ink-800">{naslov}</h2>
      <p className="mt-1 text-ink-600">{children}</p>
    </section>
  );
}
