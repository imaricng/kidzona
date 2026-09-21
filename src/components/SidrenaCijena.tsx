import { tekstSidrene, type SidrenaCijena as Podaci } from "@/lib/sidrena-cijena";

/**
 * Sidrena (dodatna) cijena uz aktualnu — suptilno, sivo, ali čitljivo.
 * Propis traži jasnu vidljivost, pa boja ne smije biti svjetlija od ink-400
 * (na bijeloj podlozi zadovoljava kontrast za sitan tekst).
 */
export function SidrenaCijenaOznaka({ stavka, className = "" }: { stavka: Podaci; className?: string }) {
  const tekst = tekstSidrene(stavka);
  if (!tekst) return null;
  return (
    <span className={`text-ink-400 ${className}`} title="Dodatna (sidrena) cijena">
      {tekst}
    </span>
  );
}
