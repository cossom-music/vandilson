import { getAdminUser } from "@/lib/supabase-server";
import { getMfaStatus } from "@/lib/mfa-server";
import SecurityClient from "./security-client";

export const metadata = { title: "Segurança — Admin" };

/** Página de segurança do painel: estado da 2FA + ativação/desativação. */
export default async function SegurancaPage() {
  const { createSupabaseServerClient } = await import("@/lib/supabase-server");
  const supabase = await createSupabaseServerClient();
  await getAdminUser();
  // O layout (painel) já garante sessão; se nulo, o layout redireciona.

  const mfa = supabase
    ? await getMfaStatus(supabase)
    : { hasVerified: false, aal: "aal1" as const, needsChallenge: false };

  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.3em] text-silver-600">Segurança</p>
      <h2 className="mt-1 font-display text-2xl text-cream">
        Autenticação de dois fatores
      </h2>
      <p className="mt-2 max-w-2xl text-sm text-mist">
        Protege o painel com um código rotativo de 30s (TOTP) gerado por apps como
        Google Authenticator, Aegis ou 1Password. Depois de ativa, o login pede a
        password <em>e</em> o código.
      </p>
      <SecurityClient
        hasVerified={mfa.hasVerified}
        aal={mfa.aal}
      />
    </div>
  );
}
