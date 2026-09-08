import Link from "next/link";
import { getAdminReleases } from "@/lib/admin-releases";
import { ReleaseList } from "./release-list";
import { Alert, Panel } from "../../_ui";

export const metadata = { title: "Lançamentos" };

export default async function LancamentosPage() {
  const rows = await getAdminReleases();

  return (
    <Panel title="Lançamentos">
      {rows === null ? (
        <Alert kind="err">
          Não foi possível ligar ao Supabase. Confirme o .env.local e que o
          schema (supabase/migrations) já foi corrido no Dashboard.
        </Alert>
      ) : (
        <>
          <div className="-mt-2 mb-6 flex flex-wrap items-center justify-between gap-3">
            <p className="text-sm text-mist">
              A primeira fila da homepage é o lançamento mais recente (com anel).
            </p>
            <Link
              href="/admin/lancamentos/novo"
              className="inline-flex items-center rounded-lg bg-silver-300 px-4 py-2 text-sm font-medium text-night-950 transition-colors hover:bg-white"
            >
              + Novo lançamento
            </Link>
          </div>
          <ReleaseList rows={rows} />
        </>
      )}
    </Panel>
  );
}
