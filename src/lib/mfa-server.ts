import "server-only";
import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * MFA (2FA TOTP) — estado do fator e nível de garantia (AAL) da sessão.
 * Usa o MFA NATIVO do Supabase Auth: segredos, challenge e verificação
 * vivem na infraestrutura do Supabase — nada de TOTP caseiro.
 */

export type MfaStatus = {
  /** Existe um fator TOTP verificado (2FA ativa). */
  hasVerified: boolean;
  /** Nível atual da sessão: "aal1" (só password) ou "aal2" (password+TOTP). */
  aal: "aal1" | "aal2";
  /** 2FA ativa mas sessão ainda AAL1 → precisa do desafio TOTP. */
  needsChallenge: boolean;
};

/** Lê o estado MFA do utilizador desta sessão. */
export async function getMfaStatus(
  supabase: SupabaseClient,
): Promise<MfaStatus> {
  const { data } = await supabase.auth.mfa.getAuthenticatorAssuranceLevel();
  const { data: factors } = await supabase.auth.mfa.listFactors();
  const hasVerified =
    (factors?.totp ?? []).some((f) => f.status === "verified") ?? false;
  const level = (data?.currentLevel as "aal1" | "aal2" | null) ?? "aal1";
  return {
    hasVerified,
    aal: level,
    needsChallenge: hasVerified && level !== "aal2",
  };
}
