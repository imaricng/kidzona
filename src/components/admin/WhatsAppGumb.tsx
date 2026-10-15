"use client";

/**
 * Gumb koji otvara WhatsApp s pripremljenom porukom. Poruku šalje osoblje
 * jednim klikom — aplikacija je ne šalje sama (vidi `lib/whatsapp.ts`).
 * Uz `oznaci` se klik bilježi, da se zna kad je poruka zadnji put poslana.
 */
export function WhatsAppGumb({ href, naziv, oznaci }: { href: string; naziv: string; oznaci?: () => Promise<void> }) {
  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className="btn-secondary"
      onClick={() => {
        void oznaci?.();
      }}
    >
      💬 {naziv}
    </a>
  );
}
