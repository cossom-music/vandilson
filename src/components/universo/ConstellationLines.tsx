"use client";

import { useCallback, useEffect, useRef, useState } from "react";

/**
 * Linhas de constelação geradas de coordenadas REAIS (a técnica que faltou):
 *
 *  · Os nós são elementos HTML posicionados em % do contentor;
 *  · Este componente MEDE o contentor e o centro de cada nó em px reais;
 *  · Os paths SVG são GERADOS desses mesmos centros — é matematicamente
 *    impossível uma linha "passar ao lado" do nó;
 *  · Tudo em px do viewport (stroke, dasharray) — NADA escala nem estica:
 *    os pontos ficam redondos e uniformes em qualquer ecrã (o bug do
 *    preserveAspectRatio="none" não existe aqui);
 *  · Recalcula no resize (ResizeObserver) e quando os nós mudam de sítio.
 *
 * Uso: envolver a área com <ConstellationLines links={...}/> ABSOLUTO
 * (inset-0) por baixo dos nós, com ids estáveis por nó.
 */

export type ConstellationLink = {
  fromId: string;
  toId: string;
  /** Linha "quente" (âmbar) — parceria em destaque. */
  hot?: boolean;
};

type Pt = { x: number; y: number };

export default function ConstellationLines({
  links,
  /** Padding: não deixar o path encostar ao limite do SVG. */
  pad = 0,
  className = "",
}: {
  links: ConstellationLink[];
  pad?: number;
  className?: string;
}) {
  const hostRef = useRef<HTMLDivElement>(null);
  const [box, setBox] = useState<{ w: number; h: number } | null>(null);
  const [centers, setCenters] = useState<Record<string, Pt>>({});

  const measure = useCallback(() => {
    const host = hostRef.current;
    if (!host) return;
    const r = host.getBoundingClientRect();
    setBox({ w: r.width, h: r.height });
    // Os nós vivem NO host ou num descendente: procuramos por id em todo o host.
    const next: Record<string, Pt> = {};
    for (const link of links) {
      for (const id of [link.fromId, link.toId]) {
        if (next[id]) continue;
        const el = host.querySelector<HTMLElement>(`[data-cnode="${id}"]`);
        if (!el) continue;
        const b = el.getBoundingClientRect();
        next[id] = {
          x: b.left - r.left + b.width / 2,
          y: b.top - r.top + b.height / 2,
        };
      }
    }
    setCenters(next);
  }, [links]);

  // Medir no mount + observar resize do host E dos nós (fontes a carregar,
  // mudanças de layout). rAF deixa o browser pintar antes de medir.
  useEffect(() => {
    let raf = requestAnimationFrame(measure);
    const host = hostRef.current;
    const ro = new ResizeObserver(() => {
      cancelAnimationFrame(raf);
      raf = requestAnimationFrame(measure);
    });
    if (host) ro.observe(host);
    // observar também os nós (o conteúdo deles pode mudar de tamanho)
    if (host) {
      host.querySelectorAll<HTMLElement>("[data-cnode]").forEach((el) => ro.observe(el));
    }
    // Fontes podem deslocar os nós depois do load
    document.fonts?.ready.then(() => measure()).catch(() => {});
    return () => {
      cancelAnimationFrame(raf);
      ro.disconnect();
    };
  }, [measure]);

  const line = (a: Pt, b: Pt): string =>
    `M ${a.x} ${a.y} L ${b.x} ${b.y}`;

  return (
    <div
      ref={hostRef}
      aria-hidden="true"
      className={`pointer-events-none absolute inset-0 ${className}`}
    >
      {box && box.w > 0 && box.h > 0 && (
        <svg
          width={box.w}
          height={box.h}
          viewBox={`0 0 ${box.w} ${box.h}`}
          className="absolute inset-0"
          style={{ overflow: "visible" }}
        >
          {links.map((l, i) => {
            const a = centers[l.fromId];
            const b = centers[l.toId];
            if (!a || !b) return null;
            const inset = (p: Pt): Pt => {
              if (pad <= 0) return p;
              const dx = b.x - a.x;
              const dy = b.y - a.y;
              const len = Math.hypot(dx, dy) || 1;
              const ux = dx / len;
              const uy = dy / len;
              return { x: p.x + ux * pad, y: p.y + uy * pad };
            };
            return (
              <path
                key={`${l.fromId}-${l.toId}-${i}`}
                d={line(inset(a), inset(b))}
                fill="none"
                stroke={l.hot ? "rgba(255,182,94,0.45)" : "rgba(198,202,208,0.26)"}
                strokeWidth={l.hot ? 1.2 : 1}
                strokeDasharray="1.5 6"
                strokeLinecap="round"
              />
            );
          })}
        </svg>
      )}
    </div>
  );
}
