"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useRef, useState } from "react";
import { deleteRelease, reorderHomeReleases, reorderReleases, toggleFeatured } from "../../actions";
import type { AdminRelease } from "@/lib/admin-releases";
import { Alert, Button } from "../../_ui";

/**
 * DUAS ORDENS INDEPENDENTES (migration 009):
 *  · a lista principal ordena `position` → manda em /discografia;
 *  · «Ordem na homepage» ordena `home_position` → manda na secção
 *    Ouvir da homepage. Arrastar numa não mexe na outra.
 */

export function ReleaseList({ rows }: { rows: AdminRelease[] }) {
  const router = useRouter();
  const [busyId, setBusyId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  // ── Drag-and-drop (HTML5 nativo, sem dependências) ──
  // `dragId` = linha a arrastar; `overId` = linha por baixo do cursor
  // (para o indicador visual). Ao largar, envia a ordem COMPLETA ao
  // servidor — reorderReleases grava position = índice + 1.
  const [order, setOrder] = useState<AdminRelease[]>(rows);
  const [dragId, setDragId] = useState<string | null>(null);
  const [overId, setOverId] = useState<string | null>(null);
  const dragIndex = useRef<number>(-1);

  // Se o servidor reenviar linhas (refresh após outra ação), sincroniza
  const [serverRows, setServerRows] = useState(rows);
  if (serverRows !== rows) {
    setServerRows(rows);
    setOrder(rows);
  }

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

  const commitOrder = async (next: AdminRelease[]) => {
    setOrder(next);
    const res = await reorderReleases(next.map((r) => r.id));
    if (!res.ok) {
      setError(res.error ?? "Erro ao guardar a ordem.");
      setOrder(rows); // reverte para a ordem do servidor
      return;
    }
    router.refresh();
  };

  const onDragStart = (i: number, id: string) => (e: React.DragEvent) => {
    dragIndex.current = i;
    setDragId(id);
    e.dataTransfer.effectAllowed = "move";
    // Firefox exige data para iniciar o drag
    e.dataTransfer.setData("text/plain", id);
  };

  const onDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== overId) setOverId(id);
  };

  const onDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = dragIndex.current;
    const target = order.findIndex((r) => r.id === id);
    setDragId(null);
    setOverId(null);
    dragIndex.current = -1;
    if (from < 0 || target < 0 || from === target) return;
    const next = [...order];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    void commitOrder(next);
  };

  const onDragEnd = () => {
    setDragId(null);
    setOverId(null);
    dragIndex.current = -1;
  };

  const confirmDelete = async (row: AdminRelease) => {
    if (!window.confirm(`Apagar «${row.title}»? Esta ação não pode ser anulada.`)) return;
    await run(row.id, () => deleteRelease(row.id));
  };

  /* ── Ordem na HOMEPAGE (home_position) — drag-and-drop dedicado ── */
  const [homeOrder, setHomeOrder] = useState<AdminRelease[]>(rows);
  const [homeDragId, setHomeDragId] = useState<string | null>(null);
  const [homeOverId, setHomeOverId] = useState<string | null>(null);
  const homeDragIndex = useRef<number>(-1);
  const [homeSaved, setHomeSaved] = useState(false);
  if (serverRows !== rows) {
    setHomeOrder(rows);
  }

  const commitHomeOrder = async (next: AdminRelease[]) => {
    setHomeOrder(next);
    setHomeSaved(false);
    const res = await reorderHomeReleases(next.map((r) => r.id));
    if (!res.ok) {
      setError(res.error ?? "Erro ao guardar a ordem da homepage.");
      setHomeOrder(rows);
      return;
    }
    setHomeSaved(true);
    setTimeout(() => setHomeSaved(false), 2200);
    router.refresh();
  };

  const onHomeDragStart = (i: number, id: string) => (e: React.DragEvent) => {
    homeDragIndex.current = i;
    setHomeDragId(id);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", id);
  };
  const onHomeDragOver = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    e.dataTransfer.dropEffect = "move";
    if (id !== homeOverId) setHomeOverId(id);
  };
  const onHomeDrop = (id: string) => (e: React.DragEvent) => {
    e.preventDefault();
    const from = homeDragIndex.current;
    const target = homeOrder.findIndex((r) => r.id === id);
    setHomeDragId(null);
    setHomeOverId(null);
    homeDragIndex.current = -1;
    if (from < 0 || target < 0 || from === target) return;
    const next = [...homeOrder];
    const [moved] = next.splice(from, 1);
    next.splice(target, 0, moved);
    void commitHomeOrder(next);
  };
  const onHomeDragEnd = () => {
    setHomeDragId(null);
    setHomeOverId(null);
    homeDragIndex.current = -1;
  };

  return (
    <div className="space-y-10">
      {error ? <Alert kind="err">{error}</Alert> : null}

      {order.length === 0 ? (
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
        <>
        {/* ══ Lista principal — ordem global (/discografia) ══ */}
        <section>
          <p className="mb-3 font-mono text-[10px] uppercase tracking-[0.2em] text-silver-600">
            Ordem global — 01 /discografia
          </p>
          {order.map((row, i) => {
          const isDragging = dragId === row.id;
          const isOver = overId === row.id && dragId !== null && dragId !== row.id;
          return (
            <div
              key={row.id}
              draggable
              onDragStart={onDragStart(i, row.id)}
              onDragOver={onDragOver(row.id)}
              onDragLeave={() => setOverId((cur) => (cur === row.id ? null : cur))}
              onDrop={onDrop(row.id)}
              onDragEnd={onDragEnd}
              className={`flex cursor-grab items-center gap-4 rounded-2xl border border-white/10 bg-night-900/40 p-4 transition-opacity active:cursor-grabbing ${
                isDragging ? "opacity-40" : ""
              } ${isOver ? "border-silver-300/60 border-dashed" : ""}`}
              title="Arraste para reordenar — a ordem aqui é a ordem em /discografia"
            >
              {/* Capa/planeta em miniatura */}
              <div className="h-14 w-14 shrink-0 overflow-hidden rounded-full border border-white/10 bg-night-950">
                {row.imageUrl ? (
                  // eslint-disable-next-line @next/next/no-img-element -- miniatura do CMS
                  <img src={row.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
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
                <span
                  aria-hidden="true"
                  className="mr-1 select-none px-1 font-mono text-xs text-silver-700"
                  title="Posição atual"
                >
                  {i + 1}
                </span>
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
          );
        })}
        </section>

        {/* ══ Ordem na HOMEPAGE — secção Ouvir (curadoria própria) ══ */}
        <section>
          <div className="mb-3 flex flex-wrap items-center justify-between gap-2">
            <p className="font-mono text-[10px] uppercase tracking-[0.2em] text-silver-600">
              02 / Ordem na homepage — secção Ouvir
            </p>
            {homeSaved ? (
              <span className="font-mono text-[10px] tracking-[0.14em] text-emerald-300/80">
                ✓ ordem guardada
              </span>
            ) : (
              <span className="font-mono text-[10px] tracking-[0.14em] text-silver-700">
                arraste para reordenar
              </span>
            )}
          </div>
          <div className="space-y-3">
            {homeOrder.map((row, i) => {
              const isDragging = homeDragId === row.id;
              const isOver = homeOverId === row.id && homeDragId !== null && homeDragId !== row.id;
              return (
                <div
                  key={`home-${row.id}`}
                  draggable
                  onDragStart={onHomeDragStart(i, row.id)}
                  onDragOver={onHomeDragOver(row.id)}
                  onDragLeave={() => setHomeOverId((cur) => (cur === row.id ? null : cur))}
                  onDrop={onHomeDrop(row.id)}
                  onDragEnd={onHomeDragEnd}
                  className={`flex cursor-grab items-center gap-4 rounded-2xl border border-white/10 bg-night-900/40 p-4 transition-opacity active:cursor-grabbing ${
                    isDragging ? "opacity-40" : ""
                  } ${isOver ? "border-amber-300/60 border-dashed" : ""}`}
                  title="Arraste — esta é a ordem em que os lançamentos aparecem na secção Ouvir da homepage"
                >
                  <span
                    aria-hidden="true"
                    className="select-none px-1 font-mono text-xs text-silver-700"
                  >
                    {i + 1}
                  </span>
                  <div className="h-10 w-10 shrink-0 overflow-hidden rounded-full border border-white/10 bg-night-950">
                    {row.imageUrl ? (
                      // eslint-disable-next-line @next/next/no-img-element -- miniatura do CMS
                      <img src={row.imageUrl} alt="" className="h-full w-full object-cover" draggable={false} />
                    ) : (
                      <span className="flex h-full w-full items-center justify-center text-[9px] text-silver-700">
                        {row.type}
                      </span>
                    )}
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-display text-base text-cream">{row.title}</p>
                    <p className="text-[11px] uppercase tracking-[0.14em] text-silver-600">
                      {row.type} · {row.year}
                      {row.featured ? " · na homepage" : " · fora da homepage (invisível no Ouvir)"}
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
          <p className="mt-3 text-xs leading-relaxed text-mist/60">
            A ordem aqui é independente de /discografia. Os lançamentos marcados
            «Na homepage» aparecem no Ouvir por esta ordem; os «Fora» ficam
            escondidos da secção (mas continuam em /discografia).
          </p>
        </section>
        </>
      )}
    </div>
  );
}
