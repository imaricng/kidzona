/** Strukturirani podaci (schema.org) za tražilice. */
export function JsonLd({ data }: { data: unknown }) {
  // "<" se escapea da sadržaj ne može zatvoriti <script> oznaku.
  const json = JSON.stringify(data).replace(/</g, "\\u003c");
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: json }} />;
}
