import { describe, it, expect } from "vitest";
import { tijeloUHtml } from "../src/lib/notifications/html";

describe("tijeloUHtml", () => {
  it("web adresu pretvara u klikabilnu poveznicu", () => {
    const html = tijeloUHtml("Recenzija: https://g.page/r/abc/review");
    expect(html).toContain('<a href="https://g.page/r/abc/review"');
    expect(html).toContain(">https://g.page/r/abc/review</a>");
  });

  it("čuva upitne parametre (poveznica na potvrdu ima ključ)", () => {
    const url = "https://partykidzona.com/potvrda/KZ-2026-0001?k=fb68a450";
    const html = tijeloUHtml(`QR kod: ${url}`);
    // & u HTML-u mora biti &amp;, ali poveznica mora ostati cjelovita.
    expect(html).toContain('href="https://partykidzona.com/potvrda/KZ-2026-0001?k=fb68a450"');
  });

  it("više parametara ostaje u istoj poveznici", () => {
    const html = tijeloUHtml("https://primjer.hr/a?x=1&y=2");
    expect(html).toContain('href="https://primjer.hr/a?x=1&amp;y=2"');
    expect(html).not.toContain("</a>&amp;y=2");
  });

  it("točka na kraju rečenice ne ulazi u poveznicu", () => {
    const html = tijeloUHtml("Više na https://partykidzona.com/rezervacija.");
    expect(html).toContain('href="https://partykidzona.com/rezervacija"');
    expect(html).toContain("</a>.");
  });

  it("adresu e-pošte pretvara u mailto", () => {
    const html = tijeloUHtml("Za pitanja: kidzonang@gmail.com ili telefon.");
    expect(html).toContain('<a href="mailto:kidzonang@gmail.com"');
  });

  it("ne linkificira adresu e-pošte koja je dio web poveznice", () => {
    const html = tijeloUHtml("https://primjer.hr/u/ivan@primjer.hr");
    expect(html).not.toContain("mailto:");
  });

  it("escapea HTML iz teksta (napomene kupca ne smiju postati oznake)", () => {
    const html = tijeloUHtml("Napomena: <script>alert(1)</script>");
    expect(html).toContain("&lt;script&gt;");
    expect(html).not.toContain("<script>");
  });

  it("zadržava prijelome redaka predloška", () => {
    expect(tijeloUHtml("prvi\ndrugi")).toContain("prvi\ndrugi");
    expect(tijeloUHtml("bilo što")).toContain("white-space:pre-wrap");
  });
});
