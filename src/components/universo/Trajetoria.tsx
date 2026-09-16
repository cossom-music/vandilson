"use client";

import { useEffect, useRef, useState } from "react";
import type { Era, Milestone } from "@/content";

/**
 * TRAJETÓRIA (/universo) — modelo vertical (Variação A-Alt aprovada do
 * mockup _temp/design-demos/trajetoria-vertical-variacoes.html):
 *  · UMA LINHA VERTICAL CONTÍNUA é a rota (os anos sobem para baixo);
 *  · os blocos de era ALTERNAM entre a esquerda e a direita da linha;
 *  · cada paragem é um PLANETA A GIRAR (anel orbital + lua), âmbar quando
 *    a era é a última (o presente), prata nas restantes;
 *  · os marcos do intervalo de anos da era listam-se como eventos.
 * Fallback: se o CMS não tiver eras definidas, derivam-se dos marcos —
 * cada "destaque" (major) abre uma era nova.
 */

const trackPlaceholder = "·";

function erasFromMilestones(ms: Milestone[]): Era[] {
  const eras: Era[] = [];
  for (const m of ms) {
    const last = eras[eras.length - 1];
    if (!last || m.major) {
      eras.push({ phase: "Fase", from: m.year, to: m.year, title: m.title, note: m.note });
    } else {
      last.to = m.year;
    }
  }
  return eras;
}

type EraColumn = Era & { events: Milestone[] };

/** Distribui os marcos pelas eras conforme os anos (janelas inclusivas). */
function buildEras(eras: Era[], ms: Milestone[]): EraColumn[] {
  const lastIdx = eras.length - 1;
  const columns = eras.map((e) => ({ ...e, events: [] as Milestone[] }));
  for (const m of ms) {
    // Era do marco = a primeira cujo intervalo o apanha; fora de todas →
    // a última (que, sem "to", estende-se até hoje).
    const idx = columns.findIndex((e) => m.year >= e.from && m.year <= (e.to ?? ""));
    const col = columns[idx >= 0 ? idx : lastIdx];
    if (col) col.events.push(m);
  }
  return columns;
}

export default function Trajetoria({
  milestones,
  eras,
}: {
  milestones: Milestone[];
  eras: Era[];
}) {
  const ms = milestones.length > 0 ? milestones : [];
  const [revealed, setRevealed] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const io = new IntersectionObserver(
      (entries) => {
        if (entries[0].isIntersecting) {
          setRevealed(true);
          io.disconnect();
        }
      },
      { threshold: 0.15 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, []);

  if (ms.length === 0 && eras.length === 0) return null;

  // CMS em primeiro lugar; derivação dos marcos só como fallback.
  const columns = buildEras(eras.length > 0 ? eras : erasFromMilestones(ms), ms);
  const span = `${columns[0]?.from ?? ms[0]?.year ?? ""} — hoje`;

  return (
    <section className="relative overflow-x-clip border-t border-white/5 bg-night-950 py-20 md:py-28">
      <div
        aria-hidden="true"
        className="star-layer star-layer--orbit pointer-events-none absolute inset-0"
      />
      <div ref={ref} className="relative mx-auto max-w-6xl px-6">
        {/* Cabeçalho — título à esquerda, intervalo à direita */}
        <div
          className="flex flex-col gap-2 transition-all duration-700 sm:flex-row sm:items-end sm:justify-between"
          style={{
            opacity: revealed ? 1 : 0,
            transform: `translateY(${revealed ? 0 : 14}px)`,
          }}
        >
          <div>
            <p className="text-[10px] uppercase tracking-[0.35em] text-silver-500">
              Trajetória
            </p>
            <h2 className="mt-3 font-display text-4xl leading-none text-white md:text-6xl">
              O diário de bordo
            </h2>
          </div>
          <p className="shrink-0 font-mono text-[11px] tracking-[0.14em] text-silver-600">
            {span}
          </p>
        </div>

        {/* A rota — a LINHA VERTICAL contínua ao centro (desktop) / à esquerda
            (mobile). Cada paragem: planeta a girar na linha + bloco de texto
            alternando esquerda/direita. */}
        <div className="relative mt-14">
          {/* A linha contínua — o trilho da rota */}
          <span
            aria-hidden="true"
            className="absolute left-5 top-0 h-full w-px bg-gradient-to-b from-transparent via-white/25 to-transparent md:left-1/2"
          />

          <ol className="space-y-14">
            {columns.map((era, i) => {
              const isLast = i === columns.length - 1;
              const left = i % 2 === 0; // desktop: alterna esquerda/direita
              return (
                <li
                  key={`${era.from}-${era.title}`}
                  className="relative pl-14 md:pl-0"
                  style={{
                    opacity: revealed ? 1 : 0,
                    transform: `translateY(${revealed ? 0 : 16}px)`,
                    transition: "opacity 0.7s ease, transform 0.7s cubic-bezier(0.22,1,0.36,1)",
                    transitionDelay: `${0.1 + i * 0.14}s`,
                  }}
                >
                  {/* O planeta na linha — anel orbital + lua a girar */}
                  <span
                    aria-hidden="true"
                    className="absolute left-5 top-2 -translate-x-1/2 md:left-1/2"
                  >
                    <span className="relative block h-9 w-9 md:h-11 md:w-11">
                      {/* Anel orbital — rotação lenta contínua */}
                      <span
                        className="traj-ring absolute inset-0 rounded-full"
                        style={{ animationDuration: `${14 + i * 3}s` }}
                      />
                      {/* A lua — orbita o planeta no sentido oposto */}
                      <span
                        className="traj-moon absolute inset-0"
                        style={{ animationDuration: `${9 + i * 2}s` }}
                      />
                      {/* O corpo do planeta */}
                      <span
                        className={`absolute inset-[6px] rounded-full md:inset-[7px] ${
                          isLast
                            ? "traj-planet-amber"
                            : "traj-planet-silver"
                        }`}
                      />
                    </span>
                  </span>

                  {/* Bloco de texto — à direita da linha (mobile) e
                      alternando à esquerda/direita (desktop) */}
                  <div
                    className={`md:grid md:grid-cols-2 md:gap-16 ${
                      left ? "" : "md:[direction:rtl]"
                    }`}
                  >
                    {/* Célula vazia do lado oposto (desktop) */}
                    <div className={left ? "md:col-start-2" : "md:col-start-1 md:[direction:ltr]"}>
                      <div
                        className={`max-w-md ${
                          left
                            ? "md:text-left"
                            : "md:[direction:ltr] md:text-right"
                        }`}
                      >
                        <div
                          className={`flex flex-wrap items-baseline gap-x-3 ${
                            left ? "" : "md:justify-end"
                          }`}
                        >
                          <span className="font-mono text-[10px] uppercase tracking-[0.26em] text-amber-300">
                            {era.phase}
                          </span>
                          <span className="font-mono text-[11px] tracking-[0.14em] text-silver-600">
                            {era.to
                              ? era.from === era.to
                                ? era.from
                                : `${era.from} — ${era.to}`
                              : `${era.from} — hoje`}
                          </span>
                        </div>
                        <h3 className="mt-2 font-display text-2xl font-medium text-white">
                          {era.title}
                        </h3>
                        {era.note ? (
                          <p className="mt-1.5 text-xs leading-relaxed text-mist/80">
                            {era.note}
                          </p>
                        ) : null}

                        {/* Eventos da era — fileira vertical */}
                        <div
                          className={`mt-4 space-y-3.5 border-l border-white/10 pl-4 ${
                            left ? "" : "md:ml-auto md:border-l-0 md:border-r md:pl-0 md:pr-4"
                          }`}
                        >
                          {era.events.length === 0 && (
                            <span className="text-[11px] tracking-[0.2em] text-silver-700">
                              {trackPlaceholder.repeat(3)}
                            </span>
                          )}
                          {era.events.map((ev) => (
                            <div key={`${ev.year}-${ev.title}`}>
                              <p className="font-mono text-[10px] tracking-[0.18em] text-silver-600">
                                {ev.year}
                              </p>
                              <b className="mt-0.5 block text-[12.5px] font-medium text-silver-300">
                                {ev.title}
                              </b>
                              {ev.note ? (
                                <span className="mt-0.5 block text-[10.5px] leading-relaxed text-mist">
                                  {ev.note}
                                </span>
                              ) : null}
                            </div>
                          ))}

                          {/* Fecho da última era — "Hoje" a âmbar */}
                          {isLast && (
                            <div className="border-l border-amber-300/40 pl-3">
                              <p className="font-mono text-[10px] tracking-[0.18em] text-amber-300/70">
                                agora
                              </p>
                              <b className="mt-0.5 block text-[12.5px] font-medium text-white">
                                Hoje
                              </b>
                              <span className="mt-0.5 block text-[10.5px] leading-relaxed text-mist">
                                A nave segue — a rota continua.
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    </div>
                  </div>
                </li>
              );
            })}
          </ol>

          {/* Fim da rota — a nave (tu estás aqui) no fim da linha */}
          <span
            aria-hidden="true"
            className="absolute bottom-[-10px] left-5 -translate-x-1/2 md:left-1/2"
          >
            <span className="block h-3 w-3 animate-pulse rounded-full bg-white shadow-[0_0_16px_rgba(255,255,255,0.95),0_0_34px_rgba(255,182,94,0.45)]" />
          </span>
        </div>

        <p className="mt-12 text-center text-[9px] uppercase tracking-[0.3em] text-silver-600">
          tu estás aqui · a rota continua
        </p>
      </div>
    </section>
  );
}
