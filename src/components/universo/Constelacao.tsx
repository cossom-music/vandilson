"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import type { Collaborator } from "@/content";
import ConstellationLines from "./ConstellationLines";

/**
 * CONSTELAÇÃO (/universo) — modelo 1 aprovado:
 *  · Vandilson no centro (a estrela principal do site);
 *  · cada colaborador ligado por linha pontilhada REAL (ConstellationLines —
 *    px medidos, passa exatamente pelos centros, pontos uniformes);
 *  · hot → estrela e linha em âmbar;
 *  · CLICAR numa estrela abre o painel de detalhes (papel + projeto em
 *    comum) — tooltip ANCORADO à estrela: abre ACIMA dela (com seta para
 *    baixo, vira para baixo só quando não cabe), segue-a no scroll e fecha
 *    com clique fora, no ✕ ou em ESC.
 *
 * Posições dos nós em %: alternadas esquerda/direita em duas alturas, com
 * ajuste fino por índice para nunca colidirem (2+ colaboradores por anel).
 */
function nodePosition(i: number, n: number): { x: number; y: number } {
  const left = i % 2 === 0;
  const band = Math.floor(i / 2); // 0,1,2… por par
  const x = left ? 20 - (band % 2) * 4 : 80 + (band % 2) * 4;
  const y = 26 + band * 24 + (left ? 0 : 9);
  return { x: Math.min(94, Math.max(6, x)), y: Math.min(92, Math.max(10, y)) };
}

export default function Constelacao({ collaborators }: { collaborators: Collaborator[] }) {
  const cols = collaborators;
  const [open, setOpen] = useState<number | null>(null);
  const mapRef = useRef<HTMLDivElement>(null);

  /** Âncora do tooltip — centro-x clampeado e lado (acima/abaixo) da estrela. */
  type Anchor = { x: number; y: number; placeAbove: boolean };
  const [anchor, setAnchor] = useState<Anchor | null>(null);

  /** Mede a estrela i e calcula a posição do tooltip (acima, por omissão). */
  const updateAnchor = useCallback((i: number) => {
    const el = mapRef.current?.querySelectorAll<HTMLElement>("[data-cstar]")[i];
    if (!el || typeof window === "undefined") return;
    const r = el.getBoundingClientRect();
    // Acima por omissão; vira para BAIXO quando a estrela está tão perto do
    // topo que o painel (~280px, largura 17rem com quebras de linha) sairia.
    const placeAbove = r.top > 280;
    // Clampa o centro-x para o painel (17rem máx.) nunca sair do viewport.
    const pw = Math.min(272, window.innerWidth - 32);
    const half = pw / 2 + 8;
    const x = Math.min(Math.max(r.left + r.width / 2, half), window.innerWidth - half);
    setAnchor({ x, y: placeAbove ? r.top : r.bottom, placeAbove });
  }, []);

  // Fechar com ESC ou clique fora do mapa/painel
  useEffect(() => {
    if (open === null) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    const onClick = (e: MouseEvent) => {
      const t = e.target as HTMLElement;
      if (!t.closest("[data-cstar]") && !t.closest("[data-cpanel]")) setOpen(null);
    };
    window.addEventListener("keydown", onKey);
    window.addEventListener("click", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("click", onClick);
    };
  }, [open]);

  // Enquanto aberto, o tooltip segue a estrela (scroll/resize reancoram-no)
  useEffect(() => {
    if (open === null) return;
    const onMove = () => updateAnchor(open);
    onMove();
    window.addEventListener("scroll", onMove, { passive: true });
    window.addEventListener("resize", onMove);
    return () => {
      window.removeEventListener("scroll", onMove);
      window.removeEventListener("resize", onMove);
    };
  }, [open, updateAnchor]);

  const nodes = useMemo(
    () => cols.map((c, i) => ({ c, ...nodePosition(i, cols.length) })),
    [cols],
  );
  const links = nodes.map((n, i) => ({
    fromId: "core",
    toId: `col-${i}`,
    hot: !!n.c.hot,
  }));

  if (cols.length === 0) return null;
  const openNode = open !== null ? nodes[open] : null;
  return (
    <section className="relative overflow-x-clip border-t border-white/5 bg-night-950 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="star-layer star-layer--orbit pointer-events-none absolute inset-0"
      />
      <div className="relative mx-auto max-w-6xl px-6">
        <p className="text-center text-[10px] uppercase tracking-[0.35em] text-silver-500">
          Constelação
        </p>
        <h2 className="mt-3 text-center font-display text-4xl leading-none text-white md:text-6xl">
          Quem orbita comigo
        </h2>

        <div ref={mapRef} className="relative mt-8 h-[120vw] max-h-[520px] w-full sm:h-[100vw] md:h-auto md:aspect-[1020/540]">
          <ConstellationLines links={links} pad={22} />

          {/* Centro — Vandilson */}
          <div
            data-cnode="core"
            className="absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center"
            style={{ left: "50%", top: "50%" }}
          >
            <span
              className="mx-auto mb-2 block h-[54px] w-[54px] rounded-full md:h-16 md:w-16"
              style={{
                background:
                  "radial-gradient(circle at 34% 30%, #f2f5f9 0%, #aeb6c2 45%, #2c3037 85%)",
                boxShadow:
                  "0 0 26px rgba(255,255,255,0.4), 0 0 60px rgba(255,255,255,0.12)",
              }}
            />
            <p className="font-display text-sm text-white md:text-[15px]">Vandilson Neto</p>
            <p className="mt-0.5 text-[8.5px] uppercase tracking-[0.26em] text-silver-600">
              centro da constelação
            </p>
          </div>

          {/* Colaboradores — estrelas clicáveis */}
          {nodes.map((n, i) => (
            <button
              key={`${n.c.name}-${i}`}
              data-cnode={`col-${i}`}
              data-cstar
              type="button"
              onClick={(e) => {
                e.stopPropagation();
                updateAnchor(i);
                setOpen((o) => (o === i ? null : i));
              }}
              aria-expanded={open === i}
              aria-label={`${n.c.name} — ${n.c.role}. Ver detalhes.`}
              className="group absolute z-10 -translate-x-1/2 -translate-y-1/2 text-center transition-transform duration-300 hover:scale-105"
              style={{ left: `${n.x}%`, top: `${n.y}%`, width: "min(150px, 27vw)" }}
            >
              <span
                className={`mx-auto mb-2 flex h-[34px] w-[34px] items-center justify-center rounded-full font-display text-[13px] md:h-10 md:w-10 ${
                  n.c.hot
                    ? "bg-[radial-gradient(circle_at_34%_30%,#3a3325,#1c160c_60%,#0a0806)] text-amber-200 shadow-[0_0_22px_rgba(255,182,94,0.35)] ring-1 ring-amber-300/50"
                    : "bg-[radial-gradient(circle_at_34%_30%,#2b3140,#10131c_60%,#080a0f)] text-silver-300 shadow-[0_0_14px_rgba(198,202,208,0.18)] ring-1 ring-silver-300/30"
                }`}
              >
                {n.c.name.trim().charAt(0).toUpperCase() || "★"}
              </span>
              <span className="block text-[12px] font-medium leading-tight text-white">
                {n.c.name}
              </span>
              <span
                className={`mt-0.5 block text-[8.5px] uppercase tracking-[0.2em] ${
                  n.c.hot ? "text-amber-300/80" : "text-silver-600"
                }`}
              >
                {n.c.role}
              </span>
            </button>
          ))}
        </div>

        <p className="mt-4 text-center text-[9px] uppercase tracking-[0.3em] text-silver-600">
          toca numa estrela para ver o projeto em comum
        </p>
      </div>

      {/* Painel de detalhes — TOOLTIP ANCORADO à estrela clicada: abre
          ACIMA dela (seta para baixo); vira para baixo só quando a estrela
          está perto do topo. position: fixed + coords do getBoundingClientRect
          → acompanha a estrela no scroll sem recalcular offsets do layout. */}
      {openNode && anchor && (
        <div
          data-cpanel
          role="dialog"
          aria-label={`${openNode.c.name} — detalhes`}
          className="fixed z-50 w-[min(17rem,calc(100vw-3rem))] -translate-x-1/2 rounded-2xl border border-white/10 bg-night-950/95 p-4 shadow-[0_18px_60px_rgba(0,0,0,0.7)] backdrop-blur-md"
          style={
            anchor.placeAbove
              ? { left: anchor.x, bottom: `calc(100vh - ${anchor.y}px + 14px)` }
              : { left: anchor.x, top: anchor.y + 14 }
          }
        >
          {/* Seta — aponta para a estrela (para baixo se o tooltip está
              acima, para cima se está abaixo) */}
          <span
            aria-hidden="true"
            className={`absolute left-1/2 h-3 w-3 -translate-x-1/2 rotate-45 border border-white/10 bg-night-950 ${
              anchor.placeAbove
                ? "-bottom-[7px] border-t-0 border-l-0"
                : "-top-[7px] border-b-0 border-r-0"
            }`}
          />
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-display text-lg text-white">{openNode.c.name}</p>
              <p
                className={`mt-0.5 text-[9px] uppercase tracking-[0.22em] ${
                  openNode.c.hot ? "text-amber-300" : "text-silver-500"
                }`}
              >
                {openNode.c.role}
                {openNode.c.hot ? " · destaque" : ""}
              </p>
            </div>
            <button
              type="button"
              onClick={() => setOpen(null)}
              aria-label="Fechar"
              className="rounded-full border border-white/15 px-2.5 py-0.5 text-sm text-mist transition-colors hover:border-white/40 hover:text-white"
            >
              ×
            </button>
          </div>
          {openNode.c.project ? (
            <p className="mt-3 text-sm leading-relaxed text-mist">{openNode.c.project}</p>
          ) : (
            <p className="mt-3 text-sm italic text-mist/50">
              {"/* TODO: projeto em comum — a preencher no admin */"}
              Detalhes em breve.
            </p>
          )}
        </div>
      )}
    </section>
  );
}
