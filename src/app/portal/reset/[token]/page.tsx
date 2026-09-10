import { redirect } from "next/navigation";
import Link from "next/link";
import { tokenValjan, postaviNovuLozinku } from "@/lib/password-reset";
import { hr } from "@/i18n/hr";
import { Logo } from "@/components/Logo";

export const dynamic = "force-dynamic";
export const metadata = { title: "Nova lozinka" };

async function postaviAction(token: string, formData: FormData) {
  "use server";
  const lozinka = String(formData.get("password") ?? "");
  const lozinka2 = String(formData.get("password2") ?? "");
  if (lozinka !== lozinka2) redirect(`/portal/reset/${token}?error=match`);
  const ok = await postaviNovuLozinku(token, lozinka);
  if (!ok) redirect(`/portal/reset/${token}?error=invalid`);
  redirect("/portal/prijava?reset=1");
}

export default async function ResetPage({
  params,
  searchParams,
}: {
  params: Promise<{ token: string }>;
  searchParams: Promise<{ error?: string }>;
}) {
  const { token } = await params;
  const { error } = await searchParams;
  const valjan = await tokenValjan(token);
  const action = postaviAction.bind(null, token);

  return (
    <div className="flex min-h-screen items-center justify-center bg-gradient-to-br from-brand-100 via-berry-50 to-sky2-100 p-4">
      <div className="card w-full max-w-sm">
        <Link href="/" className="mb-4 flex items-center justify-center gap-2 font-display text-xl font-extrabold text-brand-600">
          <Logo size="sm" />
        </Link>
        <h1 className="text-center font-display text-xl font-bold text-ink-900">Postavi novu lozinku</h1>

        {!valjan ? (
          <div className="mt-4 text-center">
            <p className="rounded-2xl bg-red-50 px-4 py-3 text-sm text-red-700">Poveznica je nevažeća ili je istekla.</p>
            <Link href="/portal/zaboravljena-lozinka" className="mt-3 inline-block text-sm text-brand-600 hover:underline">Zatraži novu poveznicu</Link>
          </div>
        ) : (
          <form action={action} className="mt-6 space-y-4">
            {error && (
              <p className="rounded-2xl bg-red-50 px-4 py-2 text-sm text-red-700">
                {error === "match" ? hr.portal.lozinkeNeJednake : "Lozinka mora imati barem 6 znakova ili je poveznica istekla."}
              </p>
            )}
            <input name="password" type="password" className="input" placeholder={hr.portal.lozinka} minLength={6} required />
            <input name="password2" type="password" className="input" placeholder={hr.portal.lozinkaPotvrda} minLength={6} required />
            <button type="submit" className="btn-primary w-full">Spremi lozinku</button>
          </form>
        )}
      </div>
    </div>
  );
}
