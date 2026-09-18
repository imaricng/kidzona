/**
 * Napomene rezervacije: želja za temom izvan ponude, poruka kupca i kod
 * poklon-bona dolaze u jedno polje, svaka u svom retku. Prazni dijelovi se
 * izostavljaju, a ako nema ničega, polje ostaje prazno (null).
 */
export function sastaviNapomene({
  temaZelja,
  napomene,
  bon,
}: {
  temaZelja?: string;
  napomene?: string;
  bon?: string;
}): string | null {
  const zelja = temaZelja?.trim();
  return (
    [zelja ? `Želja za temom: ${zelja}` : null, napomene?.trim(), bon ? `Poklon-bon: ${bon}` : null]
      .filter(Boolean)
      .join("\n") || null
  );
}
