"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import GlassGlobe from "@/components/earth/GlassGlobe";
import { useGsapContext, gsap } from "@/lib/gsap";
import { earthZoom } from "@/lib/earthZoom";
import { artist, homeSections, homeHighlights, releases } from "@/content";
import LiquidGlassLink from "@/components/ui/LiquidGlassLink";

/**
 * Intro da homepage ao estilo animejs.com — três atos num viewport FIXO:
 *
 *   Ato 1 (0 → 55%)   DOLLY da câmara para DENTRO do globo de vidro
 *                     (zoom geométrico — nítido a qualquer nível);
 *   Ato 2 (58 → 90%)  já dentro, o globo faz FADE OUT e a secção de
 *                     Música faz FADE IN no mesmo lugar;
 *   no fim do container o stack solta-se e o Contacto chega em fluxo normal.
 *
 * Paleta monocromática (medida no vídeo de referência): prata sobre preto.
 * Sem dourado — o acento é o limbo prateado do vidro.
 */
export default function HomeIntro() {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // O ref devolvido TEM de ser anexado à raiz (mais abaixo: ref={scopeRef})
  const scopeRef = useGsapContext(({ reduced: rm, scope }) => {
    if (!scope || rm) return;

    // Elementos por data-attribute — consultas DOM diretas, sem seletores GSAP
    const container = scope;
    const globe = scope.querySelector<HTMLElement>("[data-globe]");
    const vignette = scope.querySelector<HTMLElement>("[data-vignette]");
    const indicator = scope.querySelector<HTMLElement>("[data-indicator]");
    const music = scope.querySelector<HTMLElement>("[data-music]");
    if (!globe || !vignette || !indicator || !music) return;

    // A música começa invisível (o GSAP controla opacity + visibility)
    gsap.set(music, { autoAlpha: 0, y: 64 });

    // Timeline única com scrub sobre todo o container
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: 0.6,
      },
    });

    // Ato 1 — DOLLY para dentro do globo (a câmara Three.js lê este valor)
    tl.fromTo(earthZoom.progress, { value: 0 }, { value: 1, duration: 0.55 }, 0);
    tl.to(indicator, { autoAlpha: 0, duration: 0.08 }, 0);

    // Ato 2 — já dentro do globo: cross-fade para a Música
    tl.to(globe, { autoAlpha: 0, duration: 0.16 }, 0.58);
    tl.to(vignette, { autoAlpha: 0, duration: 0.16 }, 0.58);
    tl.to(music, { autoAlpha: 1, y: 0, duration: 0.22, ease: "power1.out" }, 0.68);
  }, []);

  // Reduced motion: sem pin, sem dolly — globo estático + música em fluxo normal
  if (reduced) {
    return (
      <div ref={scopeRef} className="relative">
        <div className="relative h-[100svh] overflow-hidden">
          <div data-globe className="absolute inset-0 z-0">
            <GlassGlobe className="h-full w-full" />
          </div>
          <div
            data-vignette
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
          />
          <h1 className="sr-only">
            {artist.name} — {artist.tagline}
          </h1>
        </div>
        <section id="home-music" className="relative bg-night-950 py-20">
          <DiscografiaContent />
        </section>
      </div>
    );
  }

  return (
    <div ref={scopeRef} className="relative h-[340svh]">
      <div className="sticky top-0 h-[100svh] overflow-hidden">
        {/* Globo de vidro — a câmara mergulha para dentro com o scroll */}
        <div data-globe className="absolute inset-0 z-0">
          <GlassGlobe className="h-full w-full" />
        </div>

        <div
          data-vignette
          className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
        />

        {/* Nome do artista acessível (SEO) */}
        <h1 className="sr-only">
          {artist.name} — {artist.tagline}
        </h1>

        {/* Indicador de scroll — some no arranque do mergulho */}
        <div
          data-indicator
          className="absolute bottom-8 left-1/2 z-20 -translate-x-1/2"
          aria-hidden="true"
        >
          <div className="flex flex-col items-center gap-3">
            <span className="text-[10px] uppercase tracking-[0.4em] text-mist/80">
              Deslize para explorar
            </span>
            <div className="h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-white/60 to-transparent" />
          </div>
        </div>

        {/* Arco de prata — funde o fim do mergulho no globo com a secção
            de Música (cores contínuas, sem corte; sem dourado). */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_60%_46%_at_50%_58%,rgba(202,204,208,0.10)_0%,rgba(58,58,58,0.05)_45%,rgba(3,5,9,0.9)_100%)]" />
        </div>

        {/* Secção de Música — sobrepõe o globo e entra em fade in */}
        <section
          data-music
          className="invisible absolute inset-0 z-30 overflow-y-auto opacity-0"
        >
          <div className="flex min-h-full items-center">
            <DiscografiaContent />
          </div>
        </section>
      </div>
    </div>
  );
}

/** Conteúdo da secção Discografia — compacto para caber num ecrã (100svh). */
function DiscografiaContent() {
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-10">
      <p className="text-xs uppercase tracking-[0.35em] text-mist">
        {homeSections.music.eyebrow}
      </p>

      <h2 className="mt-3 font-display text-5xl leading-none text-white md:text-7xl">
        {homeSections.music.title}
      </h2>

      <p className="mt-5 hidden max-w-xl text-sm leading-relaxed text-mist md:block">
        {homeHighlights.latest.description}
      </p>

      {/* Lançamentos */}
      <div className="mt-8 grid grid-cols-2 gap-3 md:grid-cols-4 md:gap-5">
        {releases.map((r) => (
          <Link key={r.title} href="/discografia" className="group block">
            <div
              className={`flex h-36 w-full flex-col rounded-2xl bg-gradient-to-br ${r.gradient} p-1 transition-transform duration-500 group-hover:-translate-y-1 md:h-44`}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-1.5 rounded-xl bg-night-900/80">
                <span className="text-[10px] uppercase tracking-[0.3em] text-mist">
                  {r.type} · {r.year}
                </span>
                <span className="px-3 text-center font-display text-base text-white md:text-lg">
                  {r.title}
                </span>
              </div>
            </div>
          </Link>
        ))}
      </div>

      {/* CTA — liquid glass, centrado */}
      <div className="mt-10 flex justify-center">
        <LiquidGlassLink href="/discografia">
          {homeSections.music.cta}
        </LiquidGlassLink>
      </div>
    </div>
  );
}
