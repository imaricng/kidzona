"use client";

/** Gumb za potvrdu (npr. brisanje) — traži potvrdu prije slanja forme. */
export function ConfirmSubmit({ poruka, children, className }: { poruka: string; children: React.ReactNode; className?: string }) {
  return (
    <button
      type="submit"
      className={className}
      onClick={(e) => {
        if (!window.confirm(poruka)) e.preventDefault();
      }}
    >
      {children}
    </button>
  );
}
