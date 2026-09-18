import { GRADIJENTI } from "@/lib/gradijenti";

/**
 * Gradijent teme iz ponuđenog popisa — slobodan unos Tailwind klasa lako
 * promaši `safelist` u `tailwind.config.ts` i tada se boje tiho ne prikažu.
 * Vrijednost koju tema već ima, a nije na popisu, zadržava se kao prva opcija.
 */
export function OdabirGradijenta({ defaultValue }: { defaultValue: string }) {
  const poznat = GRADIJENTI.some((g) => g.klase === defaultValue);
  return (
    <select name="gradient" defaultValue={defaultValue} className="input !py-2 w-44">
      {!poznat && <option value={defaultValue}>Trenutačni (vlastiti)</option>}
      {GRADIJENTI.map((g) => (
        <option key={g.klase} value={g.klase}>{g.naziv}</option>
      ))}
    </select>
  );
}
