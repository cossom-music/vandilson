import { redirect } from "next/navigation";
import { getAdminUser, createSupabaseServerClient } from "@/lib/supabase-server";
import { getMfaStatus } from "@/lib/mfa-server";
import { getSectionStatuses } from "@/lib/admin-status";
import AdminShell from "./admin-shell";

/**
 * LAYOUT DO PAINEL — servidor: guards (sessão + 2FA) e shell.
 *
 * A apresentação («Bancada») vive em admin-shell.tsx (client): sidebar
 * fixed à tela + drawer mobile. Este ficheiro mantém só a autorização —
 * nada de markup de navegação aqui, tudo no shell partilhado.
 */
export default async function AdminPanelLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getAdminUser();
  if (!user) redirect("/admin/login");

  // ── Gate 2FA: 2FA ativa + sessão AAL1 → termina o login no desafio ──
  // (defesa em profundidade: a RLS (007/008) é a última linha; esta
  // camada evita ver o painel antes do código)
  const supabase = await createSupabaseServerClient();
  if (supabase) {
    const mfa = await getMfaStatus(supabase);
    if (mfa.needsChallenge) redirect("/admin/mfa");
  }

  // Estado por secção (contagens + última edição) — badges do rail.
  // Falha suave: sem BD o Map vem vazio e os badges mostram "seed".
  const statuses = await getSectionStatuses();

  return <AdminShell statuses={statuses}>{children}</AdminShell>;
}
