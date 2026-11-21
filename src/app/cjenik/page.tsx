import { prisma } from "@/lib/prisma";
import { hr } from "@/i18n/hr";
import { formatDatumVrijeme, formatEur } from "@/lib/format";
import { objaviCjenik, stavkeCjenika, type StavkaCjenika } from "@/lib/cjenik";
import { SiteHeader } from "@/components/SiteHeader";
import { SiteFooter } from "@/components/SiteFooter";
import { PrintButton } from "@/components/PrintButton";

export const dynamic = "force-dynamic";
export const metadata = {
  title: "Cjenik usluga",
  description: "Cjenik rođendanskih proslava, dodataka i dnevne igre s baznim cijenama.",
  alternates: { canonical: "/cjenik" },
};

// Arhivske verzije prikazuju se mjesec dana (propis traži barem 15 dana).
const ARHIVA_DANA = 30;

/**
 * Cjenik usluga s baznim cijenama (NN 132/2026). Ista stranica služi za ispis
 * cjenika u igraonici; datoteka za automatsku obradu i arhiva su na dnu.
 */
export default async function CjenikPage() {
  const [vazeca, stavke] = await Promise.all([objaviCjenik(), stavkeCjenika()]);
  const arhiva = await prisma.cjenikVerzija.findMany({
    where: { broj: { lt: vazeca.broj }, objavljeno: { gte: new Date(Date.now() - ARHIVA_DANA * 86_400_000) } },
    orderBy: { broj: "desc" },
  });
  // Arhivska verzija vrijedila je do objave sljedeće (novije) verzije.
  const novije = [vazeca, ...arhiva];
  const vrijediDo = (i: number) => novije[i].objavljeno;
  const grupe = stavke.reduce<Map<string, StavkaCjenika[]>>((m, s) => m.set(s.grupa, [...(m.get(s.grupa) ?? []), s]), new Map());

  return (
    <>
      <div className="print:hidden">
        <SiteHeader />
      </div>
      <main className="section py-12">
        <div className="mx-auto max-w-3xl">
          <h1 className="font-display text-3xl font-extrabold text-ink-900">Cjenik usluga</h1>
          <p className="mt-2 text-sm text-ink-500">
            {hr.brand.naziv}, {hr.kontakt.adresa} · vrijedi od {formatDatumVrijeme(vazeca.objavljeno)} · cijene u eurima s PDV-om
          </p>

          {[...grupe].map(([grupa, retci]) => (
            <section key={grupa} className="mt-8">
              <h2 className="font-semibold text-ink-800">{grupa}</h2>
              <table className="mt-3 w-full text-sm">
                <thead>
                  <tr className="border-b border-ink-200 text-left text-xs text-ink-500">
                    <th className="py-2 pr-3 font-medium">Usluga</th>
                    <th className="py-2 pr-3 text-right font-medium">Cijena</th>
                    <th className="py-2 text-right font-medium">Bazna cijena</th>
                  </tr>
                </thead>
                <tbody>
                  {retci.map((s) => (
                    <tr key={s.naziv} className="border-b border-black/5 align-top">
                      <td className="py-2 pr-3 text-ink-800">
                        {s.naziv}
                        {s.akcija && <span className="chip ml-2 bg-sun-100 !text-xs text-brand-900">akcija</span>}
                      </td>
                      <td className="whitespace-nowrap py-2 pr-3 text-right font-semibold text-ink-900">{formatEur(s.cijenaCents)}</td>
                      <td className="whitespace-nowrap py-2 text-right text-ink-600">{formatEur(s.baznaCents)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </section>
          ))}

          <div className="mt-8 space-y-2 text-xs text-ink-500">
            <p>
              Bazna cijena je cijena koju smo za uslugu primjenjivali 10. 9. 2026., odnosno na dan kad je usluga uvedena
              (Pravilnik o isticanju bazne cijene proizvoda, NN 132/2026).
            </p>
            <p>Dnevna igra: prvi sat plaća se uvijek, a zatim svakih započetih 30 minuta, s 10 minuta tolerancije (npr. 1 h 10 min = 6 €, 1 h 30 min = 9 €). Paketi s cijenom po dogovoru oblikuju se za pojedinog kupca.</p>
          </div>

          <div className="mt-6 print:hidden">
            <PrintButton natpis="Ispiši cjenik" />
          </div>

          <section className="mt-10 rounded-3xl bg-ink-50 p-5 text-sm print:hidden">
            <h2 className="font-semibold text-ink-800">Cjenik za automatsku obradu</h2>
            <p className="mt-1 text-ink-600">
              Datoteka u CSV obliku (UTF-8, stupci odvojeni točkom-zarezom), prema Pravilniku o načinu objave cjenika
              proizvoda (NN 132/2026). Stalna adresa važećeg cjenika:{" "}
              <a href="/cjenik/aktualni.csv" className="font-medium text-brand-600 underline">/cjenik/aktualni.csv</a>
            </p>
            <ul className="mt-3 space-y-1">
              <li>
                <a href={`/cjenik/${vazeca.datoteka}`} className="break-all font-medium text-brand-600 underline">{vazeca.datoteka}</a>
                <span className="text-ink-500"> — važeći, objavljen {formatDatumVrijeme(vazeca.objavljeno)}</span>
              </li>
              {arhiva.map((v, i) => (
                <li key={v.id}>
                  <a href={`/cjenik/${v.datoteka}`} className="break-all text-brand-600 underline">{v.datoteka}</a>
                  <span className="text-ink-500">
                    {" "}— arhiva, vrijedio {formatDatumVrijeme(v.objavljeno)} – {formatDatumVrijeme(vrijediDo(i))}
                  </span>
                </li>
              ))}
            </ul>
          </section>
        </div>
      </main>
      <div className="print:hidden">
        <SiteFooter />
      </div>
    </>
  );
}
