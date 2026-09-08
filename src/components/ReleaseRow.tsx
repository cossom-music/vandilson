"use client";

import { useId, useLayoutEffect, useRef, useState } from "react";
import {
  AnimatePresence,
  motion,
  useReducedMotion,
  type Variants,
} from "framer-motion";
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
 *
 * Animação (padrão "Smooth Tab", adaptado de kokonutui para framer-motion
 * e a paleta noturna do site):
 *   · pill deslizante atrás das tabs — medida por getBoundingClientRect dos
 *     botões relativos ao tablist, animada com spring (stiffness 400 / damping 30);
 *   · troca de pane direcional — entra da direita se avançamos, da esquerda
 *     se recuamos, com blur + scale, via AnimatePresence mode="popLayout".
 *     Ao contrário do original (cartão de altura fixa), a pane ativa fica
 *     em fluxo para o contentor ter a altura natural do conteúdo — só a
 *     pane que sai é "popada" para absolute.
 */

const PANE_LABELS: Record<PaneKey, string> = {
  tracklist: "Tracklist",
  curiosities: "Curiosidades",
  facts: "Ficha",
};

const PANE_ORDER: PaneKey[] = ["tracklist", "curiosities", "facts"];

/**
 * Ficha técnica pronta a mostrar — as linhas "Faixas" e "Duração" são
 * SEMPRE derivadas da tracklist real, para nunca dessincronizarem quando
 * o gestor edita faixas/durações no admin. As restantes linhas (Produção,
 * etc.) vêm do CMS como estão.
 */
function displayFacts(release: Release): NonNullable<Release["facts"]> {
  const facts = release.facts ?? [];
  if (!release.tracklist?.length) return facts;

  const total = release.tracklist.reduce((acc, t) => {
    const m = /^(\d+):(\d{1,2})$/.exec(t.duration ?? "");
    return m ? acc + Number(m[1]) * 60 + Number(m[2]) : acc;
  }, 0);
  const fmt = (s: number) =>
    s >= 3600
      ? `${Math.floor(s / 3600)}:${String(Math.floor((s % 3600) / 60)).padStart(2, "0")}:${String(s % 60).padStart(2, "0")}`
      : `${Math.floor(s / 60)}:${String(s % 60).padStart(2, "0")}`;

  const derived: Record<string, string> = {
    Faixas: String(release.tracklist.length),
    ...(total > 0 ? { Duração: fmt(total) } : {}),
  };

  const normalize = (label: string) =>
    label.trim().toLocaleLowerCase("pt").replace(/s$/, "");
  const derivedKeys = new Set(Object.keys(derived).map(normalize));

  // Linhas do CMS mantidas, exceto as que agora são calculadas
  const kept = facts.filter((f) => !derivedKeys.has(normalize(f.label)));
  // Calculadas entram na posição da primeira linha substituída (ou no fim)
  const firstReplaced = facts.findIndex((f) => derivedKeys.has(normalize(f.label)));
  const computed = Object.entries(derived).map(([label, value]) => ({ label, value }));
  const out = [...kept];
  out.splice(firstReplaced >= 0 ? Math.min(firstReplaced, out.length) : out.length, 0, ...computed);
  return out;
}

function availablePanes(release: Release): PaneKey[] {
  return PANE_ORDER.filter((key) => {
    if (key === "tracklist") return !!release.tracklist?.length;
    if (key === "curiosities") return !!release.curiosities?.length;
    return true; // "Faixas"/"Duração" são derivadas da tracklist — sempre há Ficha com tracklist
  });
}

/* ── Smooth Tab: transição direcional das panes ── */
const PANE_EASE = [0.32, 0.72, 0, 1] as const;

const slideVariants: Variants = {
  enter: (dir: number) => ({
    x: dir > 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.96,
  }),
  center: { x: 0, opacity: 1, filter: "blur(0px)", scale: 1 },
  exit: (dir: number) => ({
    x: dir < 0 ? "100%" : "-100%",
    opacity: 0,
    filter: "blur(8px)",
    scale: 0.96,
  }),
};

/* prefers-reduced-motion: só fade, sem slide/blur/scale */
const fadeVariants: Variants = {
  enter: { opacity: 0 },
  center: { opacity: 1 },
  exit: { opacity: 0 },
};

export default function ReleaseRow({
  release,
  index = 0,
}: {
  release: Release;
  index?: number;
}) {
  const panes = availablePanes(release);
  const facts = displayFacts(release);
  const [active, setActive] = useState<PaneKey | null>(panes[0] ?? null);
  const activePane = active && panes.includes(active) ? active : null;
  const [direction, setDirection] = useState(0);
  const reduceMotion = useReducedMotion();
  const uid = useId();

  /* Pill deslizante — geometria do botão ativo relativa ao tablist */
  const tablistRef = useRef<HTMLDivElement>(null);
  const buttonRefs = useRef<Map<PaneKey, HTMLButtonElement>>(new Map());
  const [pill, setPill] = useState({ left: 0, top: 0, width: 0, height: 0 });

  useLayoutEffect(() => {
    if (!activePane) return;
    const update = () => {
      const btn = buttonRefs.current.get(activePane);
      const list = tablistRef.current;
      if (!btn || !list) return;
      const r = btn.getBoundingClientRect();
      const lr = list.getBoundingClientRect();
      setPill({
        left: r.left - lr.left,
        top: r.top - lr.top,
        width: r.width,
        height: r.height,
      });
    };
    update();
    window.addEventListener("resize", update);
    // trocas de fonte mudam as larguras dos botões
    document.fonts?.ready.then(update).catch(() => {});
    return () => window.removeEventListener("resize", update);
  }, [activePane]);

  const selectPane = (key: PaneKey) => {
    const current = activePane;
    if (key === current || !current) return;
    setDirection(PANE_ORDER.indexOf(key) > PANE_ORDER.indexOf(current) ? 1 : -1);
    setActive(key);
  };

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
              ref={tablistRef}
              role="tablist"
              aria-label={`Detalhes de ${release.title}`}
              className="relative mt-6 flex w-fit max-w-full flex-wrap gap-1 rounded-full border border-white/10 bg-night-900/50 p-1"
            >
              {/* Pill deslizante — o indicador da tab ativa */}
              <motion.span
                aria-hidden="true"
                initial={false}
                animate={{
                  x: pill.left,
                  y: pill.top,
                  width: pill.width,
                  height: pill.height,
                }}
                transition={{ type: "spring", stiffness: 400, damping: 30 }}
                className="pointer-events-none absolute left-0 top-0 rounded-full bg-white/[0.07] ring-1 ring-silver-500/50"
              />

              {panes.map((key) => (
                <button
                  key={key}
                  ref={(el) => {
                    if (el) buttonRefs.current.set(key, el);
                    else buttonRefs.current.delete(key);
                  }}
                  id={`tab-${uid}-${key}`}
                  type="button"
                  role="tab"
                  aria-selected={activePane === key}
                  aria-controls={`panel-${uid}-${key}`}
                  onClick={() => selectPane(key)}
                  className={`relative z-[1] rounded-full px-3.5 py-2 text-[10px] uppercase tracking-[0.16em] transition-colors duration-300 focus-visible:outline-none focus-visible:ring-1 focus-visible:ring-silver-300/70 ${
                    activePane === key ? "text-cream" : "text-mist hover:text-cream"
                  }`}
                >
                  {PANE_LABELS[key]}
                </button>
              ))}
            </div>

            {/* Panes — slide direcional + blur (Smooth Tab) */}
            <div
              id={`panel-${uid}-${activePane}`}
              role="tabpanel"
              aria-labelledby={`tab-${uid}-${activePane}`}
              className="relative mt-4 overflow-hidden"
            >
              <AnimatePresence
                custom={direction}
                initial={false}
                mode="popLayout"
              >
                <motion.div
                  key={activePane}
                  custom={direction}
                  variants={reduceMotion ? fadeVariants : slideVariants}
                  initial="enter"
                  animate="center"
                  exit="exit"
                  transition={{ duration: 0.4, ease: PANE_EASE }}
                  className="will-change-transform"
                >
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

                  {activePane === "facts" && facts.length > 0 ? (
                    <dl>
                      {facts.map((fact, i) => (
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
                </motion.div>
              </AnimatePresence>
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
          image={release.image ?? null}
          className="h-full w-full"
        />
      </div>
      <ReleasePlanetLinks />
    </>
  );
}
