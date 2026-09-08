"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState } from "react";
import { deleteRelease, moveRelease, toggleFeatured } from "../../actions";
import type { AdminRelease } from "@/lib/admin-releases";
import { Alert, Button } from "../../_ui";

export function ReleaseList({ rows }: { rows: AdminRelease[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const run = async (id: string, fn: () => Promise<{ ok: boolean; error?: string }>) => {
    setBusyId(id);
    setError(null);
    const res = await fn();
    setBusyId(null);
    if (!res.ok) {
      setError(res.error ?? "Erro.");
      return;
    }
    router.refresh();
  };

  const confirmDelete = async (row: AdminRelease) => {
    if (!window.confirm(`Apagar «${row.title}»? Esta ação não pode ser anulada.`)) return;
    await run(row.id, () => deleteRelease(row.id));
  };

  return (
    <div className="space-y-3">
      {error ? <Alert kind="err">{error}</Alert> : null}

      {rows.length === 0 ? (
        <p className="rounded-2xl border border-dashed border-white/15 p-8 text-center text-sm text-mist">
          Ainda não há lançamentos na base de dados.
          <br />
          <span className="mt-2 inline-block">
            <Link href="/admin/lancamentos/novo" className="text-silver-300 underline underline-offset-4 hover:text-cream">
              Criar o primeiro →
            </Link>
          </span>
        </p>
      ) : (
        rows.map((row, i) => (
          <div
            key={row.id}
            className="flex items-center gap-4 rounded-2xl border border-white/10 bg-night-900/40 p-4"
          >
            {/* Capa/planeta em miniatura */}
            <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-night-950">
              {row.imageUrl ? (
                // eslint-disable-next-line @next/next/no-img-element -- miniatura do CMS
                <img src={row.imageUrl} alt="" className="h-full w-full object-cover" />
              ) : (
                <span className="flex h-full w-full items-center justify-center text-[10px] text-silver-700">
                  {row.type}
                </span>
              )}
            </div>

            <div className="min-w-0 flex-1">
              <p className="truncate font-display text-lg text-cream">{row.title}</p>
              <p className="text-xs uppercase tracking-[0.14em] text-silver-600">
                {row.type} · {row.year}
                {row.tracklist.length > 0 ? ` · ${row.tracklist.length} faixas` : ""}
              </p>
              <button
                type="button"
                disabled={busyId === row.id}
                onClick={() => run(row.id, () => toggleFeatured(row.id, !row.featured))}
                className={`mt-1 inline-flex items-center gap-1.5 rounded-full border px-2.5 py-0.5 text-[10px] uppercase tracking-[0.14em] transition-colors disabled:opacity-50 ${
                  row.featured
                    ? "border-silver-300/50 bg-silver-300/10 text-cream"
                    : "border-white/10 text-mist/60 hover:border-white/25 hover:text-mist"
                }`}
                title="Mostrar/ocultar na secção Ouvir da homepage"
              >
                <span
                  aria-hidden="true"
                  className={`h-1.5 w-1.5 rounded-full ${row.featured ? "bg-silver-300" : "bg-white/20"}`}
                />
                {row.featured ? "Na homepage" : "Fora da homepage"}
              </button>
            </div>

            <div className="flex shrink-0 items-center gap-1.5">
              <Button
                type="button"
                variant="ghost"
                disabled={busyId === row.id || i === 0}
                aria-label="Mover para cima"
                onClick={() => run(row.id, () => moveRelease(row.id, "up"))}
              >
                ↑
              </Button>
              <Button
                type="button"
                variant="ghost"
                disabled={busyId === row.id || i === rows.length - 1}
                aria-label="Mover para baixo"
                onClick={() => run(row.id, () => moveRelease(row.id, "down"))}
              >
                ↓
              </Button>
              <Link
                href={`/admin/lancamentos/${row.id}`}
                className="rounded-lg border border-white/15 px-3 py-2 text-sm text-mist transition-colors hover:border-silver-500/40 hover:text-cream"
              >
                Editar
              </Link>
              <Button
                type="button"
                variant="danger"
                disabled={busyId === row.id}
                onClick={() => confirmDelete(row)}
              >
                Apagar
              </Button>
            </div>
          </div>
        ))
      )}
    </div>
  );
}
