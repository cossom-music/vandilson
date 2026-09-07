"use client";

import { useState } from "react";
import ReleasePlanet, { ReleasePlanetLinks } from "@/components/ReleasePlanet";
import type { Release } from "@/content";

type PaneKey = "tracklist" | "curiosities" | "facts";

/**
 * Ficha de um lançamento (layout "um por fila"):
 *
 *   · planeta à esquerda (identidade do lançamento, links por baixo);
 *   · painel à direita com tabs condicionais — Tracklist / Curiosidades /
 *     Ficha — só entram quando o lançamento tem esse conteúdo;
 *   · sem detalhes nenhum: mostra só a descrição, sem tablist.
 *
 * A tab ativa é sempre a primeira *disponível* (nunca um índice fixo), e
 * trocar de tab nunca pode apontar para uma pane inexistente.
 */

const PANE_LABELS: Record<PaneKey, string> = {
  tracklist: "Tracklist",
  curiosities: "Curiosidades",
  facts: "Ficha",
};

const PANE_ORDER: PaneKey[] = ["tracklist", "curiosities", "facts"];

function availablePanes(release: Release): PaneKey[] {
  return PANE_ORDER.filter((key) => {
    if (key === "tracklist") return !!release.tracklist?.length;
    if (key === "curiosities") return !!release.curiosities?.length;
    return !!release.facts?.length;
  });
}

export default function ReleaseRow({
  release,
  index = 0,
}: {
  release: Release;
  index?: number;
}) {
  const panes = availablePanes(release);
  const [active, setActive] = useState<PaneKey | null>(panes[0] ?? null);
  const activePane = active && panes.includes(active) ? active : null;

  return (
    <article className="grid items-center gap-10 rounded-3xl border border-white/10 bg-night-900/60 p-6 md:grid-cols-[340px_1fr] md:gap-14 md:p-10 lg:grid-cols-[380px_1fr]">
      {/* Planeta + links — a identidade do lançamento */}
      <div className="mx-auto flex w-full max-w-[320px] flex-col items-center gap-6">
        <ReleasePlanetSlot release={release} index={index} />
      </div>

      {/* Painel de detalhes */}
      <div className="min-w-0">
        <p className="text-[10px] uppercase tracking-[0.24em] text-mist/70">
          {release.type} · {release.year}
        </p>
        <h3 className="mt-2 font-display text-3xl text-cream md:text-4xl">
          {release.title}
        </h3>

        {release.description ? (
          <p className="mt-4 max-w-md text-sm leading-relaxed text-mist">
            {release.description}
          </p>
        ) : null}

        {panes.length > 0 && activePane ? (
          <>
            <div
              role="tablist"
              aria-label={`Detalhes de ${release.title}`}
              className="mt-6 flex flex-wrap gap-2"
            >
              {panes.map((key) => (
                <button
                  key={key}
                  type="button"
                  role="tab"
                  aria-selected={activePane === key}
                  onClick={() => setActive(key)}
                  className={`rounded-full border px-4 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors ${
                    activePane === key
                      ? "border-silver-500/60 bg-white/5 text-cream"
                      : "border-white/10 text-mist hover:border-white/25 hover:text-cream"
                  }`}
                >
                  {PANE_LABELS[key]}
                </button>
              ))}
            </div>

            <div className="mt-4">
              {activePane === "tracklist" && release.tracklist ? (
                <ol>
                  {release.tracklist.map((track, i) => (
                    <li
                      key={`${track.title}-${i}`}
                      className="flex items-baseline gap-4 border-b border-dashed border-white/10 py-2.5 text-sm text-cream/90"
                    >
                      <span className="text-[10px] tracking-[0.1em] text-mist/60">
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="min-w-0">{track.title}</span>
                      {track.duration ? (
                        <span className="ml-auto shrink-0 text-[11px] text-mist/60">
                          {track.duration}
                        </span>
                      ) : null}
                    </li>
                  ))}
                </ol>
              ) : null}

              {activePane === "curiosities" && release.curiosities ? (
                <ul>
                  {release.curiosities.map((curio, i) => (
                    <li
                      key={i}
                      className="border-b border-dashed border-white/10 py-2.5 text-sm leading-relaxed text-mist"
                    >
                      {curio}
                    </li>
                  ))}
                </ul>
              ) : null}

              {activePane === "facts" && release.facts ? (
                <dl>
                  {release.facts.map((fact, i) => (
                    <div
                      key={i}
                      className="grid grid-cols-[120px_1fr] gap-3 border-b border-dashed border-white/10 py-2.5"
                    >
                      <dt className="pt-0.5 text-[10px] uppercase tracking-[0.14em] text-mist/60">
                        {fact.label}
                      </dt>
                      <dd className="text-sm text-cream/90">{fact.value}</dd>
                    </div>
                  ))}
                </dl>
              ) : null}
            </div>
          </>
        ) : null}
      </div>
    </article>
  );
}

function ReleasePlanetSlot({ release, index }: { release: Release; index: number }) {
  return (
    <>
      <div className="aspect-square w-full">
        <ReleasePlanet
          index={index}
          size="lg"
          title={release.title}
          type={release.type}
          year={release.year}
          className="h-full w-full"
        />
      </div>
      <ReleasePlanetLinks />
    </>
  );
}
