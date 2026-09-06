"use client";

import { useRef } from "react";
import Link from "next/link";
import EarthStage from "@/components/earth/EarthStage";
import { gsap, useGsapContext } from "@/lib/gsap";
import { artist, homeHighlights } from "@/content";

export default function HomeHero() {
  const nameRef = useRef<HTMLHeadingElement>(null);
  const stageRef = useRef<HTMLDivElement>(null);

  useGsapContext(({ reduced }) => {
    if (reduced) return;

    const chars = nameRef.current?.querySelectorAll("[data-char]");
    if (chars?.length) {
      gsap.from(chars, {
        yPercent: 120,
        opacity: 0,
        rotateX: -40,
        duration: 1.1,
        ease: "expo.out",
        stagger: 0.045,
        delay: 0.35,
      });
    }

    gsap.from("[data-hero-fade]", {
      opacity: 0,
      y: 18,
      duration: 1,
      ease: "power3.out",
      stagger: 0.18,
      delay: 1.1,
    });

    // Parallax do globo ao fazer scroll
    if (stageRef.current) {
      gsap.to(stageRef.current, {
        yPercent: 16,
        scale: 1.06,
        ease: "none",
        scrollTrigger: {
          trigger: stageRef.current,
          start: "top top",
          end: "bottom top",
          scrub: true,
        },
      });
    }
  }, []);

  const words = [artist.firstName, artist.lastName];

  return (
    <section className="relative flex min-h-[100svh] items-center justify-center overflow-hidden">
      {/* Globo 3D ao fundo */}
      <div ref={stageRef} className="absolute inset-0">
        <EarthStage className="h-full w-full" />
      </div>
      <div className="earth-vignette pointer-events-none absolute inset-0" />

      {/* Nome do artista */}
      <div className="pointer-events-none relative z-10 px-6 text-center">
        <p
          data-hero-fade
          className="mb-6 text-xs uppercase tracking-[0.5em] text-gold-400 md:text-sm"
        >
          {artist.tagline}
        </p>

        <h1
          ref={nameRef}
          className="font-display text-[13vw] leading-[0.95] text-cream drop-shadow-[0_4px_40px_rgba(3,5,9,0.8)] md:text-[9vw]"
          aria-label={artist.name}
        >
          {words.map((word, wi) => (
            <span key={word} className="inline-block whitespace-nowrap">
              {word.split("").map((c, i) => (
                <span key={i} data-char className="inline-block will-change-transform">
                  {c}
                </span>
              ))}
              {wi < words.length - 1 && <span className="inline-block">&nbsp;</span>}
            </span>
          ))}
        </h1>

        <div
          data-hero-fade
          className="pointer-events-auto mt-10 flex flex-wrap items-center justify-center gap-4"
        >
          <Link
            href="/musica"
            className="rounded-full bg-gold-500 px-8 py-3 text-sm font-medium text-night-950 transition-transform hover:scale-105"
          >
            {homeHighlights.listenCta}
          </Link>
          <Link
            href="/sobre"
            className="rounded-full border border-white/20 px-8 py-3 text-sm text-cream transition-colors hover:border-gold-400 hover:text-gold-400"
          >
            Conhecer o artista
          </Link>
        </div>
      </div>

      {/* Indicador de scroll */}
      <div
        data-hero-fade
        className="absolute bottom-8 left-1/2 z-10 -translate-x-1/2"
        aria-hidden="true"
      >
        <div className="h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-gold-400 to-transparent" />
      </div>
    </section>
  );
}
