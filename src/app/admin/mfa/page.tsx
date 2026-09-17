import { redirect } from "next/navigation";
import { getAdminUser } from "@/lib/supabase-server";
import { getMfaStatus } from "@/lib/mfa-server";
import MfaChallenge from "./mfa-challenge";

export const metadata = { title: "Verificação 2FA — Admin" };

/**
 * DESAFIO 2FA — segunda etapa do login quando há fator TOTP verificado.
 * A sessão aqui é AAL1 (password ok); o código sobe-a para AAL2.
 */
export default async function MfaPage() {
  const supabase = await (async () => {
    const { createSupabaseServerClient } = await import("@/lib/supabase-server");
    return createSupabaseServerClient();
  })();
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  const mfa = await getMfaStatus(supabase!);
  // Sem 2FA ativa ou já AAL2 → nada a fazer aqui
  if (!mfa.needsChallenge) redirect("/admin");

  return (
    <div className="mx-auto flex min-h-[80vh] w-full max-w-sm flex-col justify-center px-6">
      <p className="text-[10px] uppercase tracking-[0.3em] text-silver-600">
        Vandilson Neto
      </p>
      <h1 className="mt-2 font-display text-3xl text-cream">Verificação 2FA</h1>
      <p className="mt-2 text-sm text-mist">
        Introduz o código de 6 dígitos da tua app autenticadora.
      </p>
      <div className="mt-8">
        <MfaChallenge />
      </div>
    </div>
  );
}
