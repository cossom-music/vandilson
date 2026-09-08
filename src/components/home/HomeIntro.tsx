"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import GlassGlobe from "@/components/earth/GlassGlobe";
import { useGsapContext, gsap, ScrollTrigger } from "@/lib/gsap";
import { earthZoom } from "@/lib/earthZoom";
import { animate, stagger, utils, prefersReducedMotion } from "@/lib/anime";
import { useSiteContent } from "@/components/SiteContentProvider";
import { LiquidGlassLink } from "@/components/ui/LiquidGlass";
import ReleasePlanet from "@/components/ReleasePlanet";

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

    // Assinaturas do herói (nome + tagline) — saem suavemente no primeiro
    // scroll, precisamente quando o header entra com o mesmo nome.
    const heroTexts = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-hero-text]"),
    );

    // Pilha de lançamentos — cartões + grid + CTA (por data-attribute)
    const cards = Array.from(
      scope.querySelectorAll<HTMLElement>("[data-release-card]"),
    );
    const cardGrid = scope.querySelector<HTMLElement>("[data-release-grid]");
    const cta = scope.querySelector<HTMLElement>("[data-cta]");

    // A música começa invisível (o GSAP controla opacity + visibility)
    gsap.set(music, { autoAlpha: 0, y: 64 });

    // Timeline única com scrub EXATO sobre todo o container.
    // scrub: true (e não um valor suavizado) — o scroll controla a animação
    // 1:1, sem atraso. Com scrub suavizado, a timeline ficava a "apanhar" o
    // scroll: o sticky soltava e a secção seguinte entrava enquanto os
    // planetas ainda voavam (o descontrolo que o utilizador viu).
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: container,
        start: "top top",
        end: "bottom bottom",
        scrub: true,
      },
    });

    // Ato 1 — DOLLY para dentro do globo (a câmara Three.js lê este valor)
    tl.fromTo(earthZoom.progress, { value: 0 }, { value: 1, duration: 0.55 }, 0);
    tl.to(indicator, { autoAlpha: 0, duration: 0.14 }, 0);
    // Nome + tagline desvanecem mais lentamente (0.35 ≈ 119svh de scroll)
    tl.to(heroTexts, { autoAlpha: 0, duration: 0.35 }, 0);

    // Ato 2 — já dentro do globo: cross-fade para a Música
    tl.to(globe, { autoAlpha: 0, duration: 0.16 }, 0.58);
    tl.to(vignette, { autoAlpha: 0, duration: 0.16 }, 0.58);
    tl.to(music, { autoAlpha: 1, y: 0, duration: 0.22, ease: "power1.out" }, 0.68);
    // Globo invisível → pausa o trabalho por frame da cena Three.js
    // (o render WebGL contínuo escondido roubava frames à página inteira).
    // Reversível: o scrub repõe false ao voltar a subir.
    tl.fromTo(earthZoom.paused, { value: false }, { value: true, duration: 0.01 }, 0.74);

    // Ato 3 — pilha REAL: os cartões nascem empilhados no centro do palco
    // (delta medido em px do layout real) e o scroll abre a pilha até às
    // posições fixas do grid. O scrub inverte tudo ao voltar a subir.
    if (cards.length && cardGrid) {
      const mid = (cards.length - 1) / 2;

      // Mede o delta de cada cartão (no seu slot do grid) até ao centro do
      // palco — é esse delta que o empilha de verdade. Limpa transformações
      // antes de medir, para os rects serem as posições naturais do layout.
      const measureStack = () => {
        gsap.set(cards, { clearProps: "x,y,rotation,scale,xPercent" });
        const g = cardGrid.getBoundingClientRect();
        const cx = g.left + g.width / 2;
        const cy = g.top + g.height / 2;
        return cards.map((card, i) => {
          const r = card.getBoundingClientRect();
          return {
            // Delta até ao centro + um leve leque (estilo mão de cartas)
            x: cx - (r.left + r.width / 2) + (i - mid) * 6,
            y: cy - (r.top + r.height / 2) - i * 7,
            rotation: (i - mid) * 2.4,
            scale: 0.92,
          };
        });
      };

      // Pose inicial: todos empilhados no centro (o primeiro por cima).
      const applyStack = () => {
        const poses = measureStack();
        cards.forEach((card, i) => {
          gsap.set(card, {
            ...poses[i],
            transformOrigin: "50% 50%",
            zIndex: cards.length - i,
          });
        });
      };
      applyStack();

      // Resize/rotação do ecrã: re-medir e re-empilhar — mas só enquanto a
      // pilha ainda estiver fechada (a meio do voo, o scrub manda).
      const onRefresh = () => {
        if (!tl.scrollTrigger || tl.scrollTrigger.progress < 0.84) {
          applyStack();
        }
      };
      ScrollTrigger.addEventListener("refreshInit", onRefresh);

      cards.forEach((card, i) => {
        tl.to(
          card,
          {
            x: 0,
            y: 0,
            rotation: 0,
            scale: 1,
            duration: 0.075,
            // Saída em cascata: o primeiro sai primeiro, o último assenta
            // por último — e só então o CTA pode aparecer.
            ease: "power2.inOut",
          },
          0.86 + i * 0.022,
        );
      });

      // Cleanup do listener — corre no revert() do contexto GSAP.
      return () => ScrollTrigger.removeEventListener("refreshInit", onRefresh);
    }

    // Ato 4 — o CTA só existe depois de TODOS os cartões estarem sentados.
    if (cta) {
      gsap.set(cta, { autoAlpha: 0, y: 24 });
      tl.to(cta, { autoAlpha: 1, y: 0, duration: 0.08, ease: "power1.out" }, 1.02);
    }

    // Respiro final — um espaçador vazio estende a timeline para 1.30:
    // a animação completa aos ~85% do scroll e o sticky segura a Discografia
    // assentada (~65svh) ANTES de soltar para a secção de Contactos.
    // Sem isto, o fim da animação coincidia com o release do sticky e o
    // utilizador via a secção seguinte antes de os cartões assentarem.
    tl.to({}, { duration: 0.2 }, 1.1);
  }, []);

  // Reduced motion: sem pin, sem dolly — globo estático + música em fluxo normal
  if (reduced) {
    return (
      <div ref={scopeRef} className="relative">
      <div className="relative h-[100lvh] overflow-hidden">
        {/* Reforço estelar local — atrás do globo */}
        <div
          aria-hidden="true"
          className="star-layer star-layer--hero pointer-events-none absolute inset-0"
        />
        <div data-globe className="absolute inset-0 z-0">
          <GlassGlobe className="h-full w-full" />
        </div>
          <div
            data-vignette
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
          />
          <HeroSignatures />
        </div>
        <section id="home-music" className="relative bg-night-950 py-20">
          <DiscografiaContent />
        </section>
      </div>
    );
  }

  return (
    <div ref={scopeRef} className="relative h-[460svh]">
      <div className="sticky top-0 h-[100lvh] overflow-hidden">
        {/* Reforço estelar local — atrás do globo, mais denso que o canvas global */}
        <div
          aria-hidden="true"
          className="star-layer star-layer--hero pointer-events-none absolute inset-0"
        />
        {/* Globo de vidro — a câmara mergulha para dentro com o scroll */}
        <div data-globe className="absolute inset-0 z-0">
          <GlassGlobe className="h-full w-full" />
        </div>

        <div
          data-vignette
          className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
        />

        <HeroSignatures />

        {/* Indicador de scroll — some no arranque do mergulho */}
        <div
          data-indicator
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
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

        {/* Secção de Música — sobrepõe o globo e entra em fade in.
            overflow-x-hidden: com a pilha de planetas em voo, nenhum
            transform pode criar scroll horizontal no mobile. */}
        <section
          data-music
          className="invisible absolute inset-0 z-30 overflow-x-hidden overflow-y-auto opacity-0"
        >
          <div className="flex min-h-full items-center">
            <DiscografiaContent />
          </div>
        </section>
      </div>
    </div>
  );
}

/**
 * Bloco tipográfico do herói — H1 em duas linhas (Vandilson / Neto) com a
 * tagline em H3 logo abaixo. ENTRADA: revelação palavra a palavra com
 * anime.js — cada palavra sobe de trás de uma máscara (overflow-hidden),
 * com stagger. SAÍDA: fade no primeiro scroll (GSAP via [data-hero-text]).
 * É o H1 real da página (o sr-only foi removido — sem duplicação).
 */
/**
 * Contagem decrescente para o próximo show — PROMINENTE, mas só aparece
 * quando falta menos de 7 dias (com eventDate definida). Abaixo do nome:
 * “Em cena em {cidade} · DDd HHh MMm”. Sem hidratação: SSR renderiza null.
 */
function HeroCountdown() {
  const { shows } = useSiteContent();
  const next = shows.find((s) => s.eventDate);
  const [now, setNow] = useState<number | null>(null);

  useEffect(() => {
    if (!next?.eventDate) return;
    setNow(Date.now());
    const id = setInterval(() => setNow(Date.now()), 60_000);
    return () => clearInterval(id);
  }, [next?.eventDate]);

  if (!next?.eventDate || now === null) return null;
  // Com hora definida conta para a hora exata; sem hora, para as 21:00
  // (convenção de início de concerto) — nunca para a meia-noite.
  const time = next.eventTime && /^\d{2}:\d{2}$/.test(next.eventTime)
    ? next.eventTime
    : "21:00";
  const target = new Date(`${next.eventDate}T${time}:00`).getTime();
  if (Number.isNaN(target)) return null;
  const diff = target - now;
  // Só os últimos 7 dias (e nada depois da hora de início)
  if (diff <= 0 || diff > 7 * 86_400_000) return null;

  const days = Math.floor(diff / 86_400_000);
  const hours = Math.floor((diff % 86_400_000) / 3_600_000);
  const mins = Math.floor((diff % 3_600_000) / 60_000);
  const pad = (n: number) => String(n).padStart(2, "0");

  // Countdown clicável — leva à secção da agenda (Sobre + Agenda, no fim
  // da homepage). O scroll suave é global (html { scroll-behavior: smooth }).
  return (
    <a
      href="#home-contact"
      data-hero-text
      className="group mt-7 flex w-fit items-center justify-center gap-3 md:gap-4"
      aria-label={`Próximo show em ${next.city} às ${time} — em ${days} dias, ${hours} horas e ${mins} minutos. Ver agenda.`}
      title="Ver a agenda completa"
    >
      {([
        [days, "dias"],
        [hours, "horas"],
        [mins, "min"],
      ] as const).map(([v, u]) => (
        <div
          key={u}
          className="rounded-xl border border-white/[0.12] bg-white/[0.04] px-3.5 py-2 text-center backdrop-blur-sm transition-colors duration-300 group-hover:border-white/30 group-hover:bg-white/[0.08] md:px-5 md:py-3"
        >
          <span className="block font-mono text-2xl tabular-nums text-white md:text-4xl">
            {pad(v)}
          </span>
          <span className="mt-0.5 block text-[9px] uppercase tracking-[0.22em] text-silver-400 md:text-[10px]">
            {u}
          </span>
        </div>
      ))}
      <span className="ml-1 hidden max-w-[9rem] text-left text-[10px] uppercase leading-relaxed tracking-[0.2em] text-silver-300 md:block">
        Em cena em
        <b className="block font-display text-base normal-case tracking-wide text-white">
          {next.city}
        </b>
        <b className="mt-0.5 block font-mono text-xs tracking-[0.14em] text-silver-400">
          {time}
        </b>
        <b className="mt-1 block text-[9px] tracking-[0.24em] text-silver-500 transition-colors group-hover:text-cream">
          Ver agenda ↗
        </b>
      </span>
    </a>
  );
}

function HeroSignatures() {
  const { artist } = useSiteContent();
  const rootRef = useRef<HTMLDivElement>(null);

  // anime.js v4 — revelação palavra a palavra na entrada
  useEffect(() => {
    const root = rootRef.current;
    if (!root) return;
    const words = root.querySelectorAll<HTMLElement>("[data-reveal-word]");
    if (!words.length) return;

    // Movimento reduzido: mostra tudo de imediato (os spans SSR começam
    // ocultos — sem isto, ficariam invisíveis para sempre).
    if (prefersReducedMotion()) {
      utils.set(words, { opacity: 1, y: "0em" });
      return;
    }

    // As palavras começam ocultas no SSR (anti-flash) e sobem da máscara
    // em sequência. Unidade em (relativa à fonte) — robusta em qualquer ecrã.
    animate(words, {
      y: ["1.1em", "0em"],
      opacity: [0, 1],
      duration: 1000,
      delay: stagger(110, { start: 300 }),
      ease: "outExpo",
    });
  }, []);

  return (
    <div
      ref={rootRef}
      className="absolute left-6 right-6 top-[10%] z-20 text-center md:left-10 md:right-auto md:top-[40%] md:text-left"
    >
      {/* Nome — duas filas, cada palavra sobe da própria máscara */}
      <h1
        data-hero-text
        className="font-display text-4xl leading-[0.95] text-white sm:text-5xl md:text-7xl"
      >
        <span className="block overflow-hidden">
          <span
            data-reveal-word
            className="inline-block will-change-transform"
            style={{ opacity: 0, transform: "translateY(1.1em)" }}
          >
            {artist.firstName}
          </span>
        </span>
        <span className="block overflow-hidden">
          <span
            data-reveal-word
            className="inline-block will-change-transform"
            style={{ opacity: 0, transform: "translateY(1.1em)" }}
          >
            {artist.lastName}
          </span>
        </span>
      </h1>

      {/* Frase — também palavra a palavra, mais rápida e discreta */}
      <h3
        data-hero-text
        className="mt-5 text-[11px] font-medium uppercase tracking-[0.35em] text-silver-300 md:mt-6 md:text-xs"
      >
        {artist.tagline.split(" ").map((word, i) => (
          <span
            key={`${word}-${i}`}
            className="inline-block overflow-hidden align-bottom"
          >
            <span
              data-reveal-word
              className="inline-block will-change-transform"
              style={{ opacity: 0, transform: "translateY(1.1em)" }}
            >
              {word}
              {i < artist.tagline.split(" ").length - 1 ? "\u00A0" : ""}
            </span>
          </span>
        ))}
      </h3>

      {/* Countdown — últimos 7 dias antes do próximo show */}
      <HeroCountdown />
    </div>
  );
}

/** Conteúdo da secção Discografia — compacto para caber num ecrã (100svh). */
function DiscografiaContent() {
  const { homeSections, homeHighlights, releases: allReleases } = useSiteContent();
  // Só os marcados como destacados no admin; sem nenhum marcado → todos
  // (a secção nunca fica vazia, mesmo antes de a migração 004 ser aplicada)
  const featured = allReleases.filter((r) => r.featured);
  const releases = featured.length > 0 ? featured : allReleases;
  return (
    <div className="mx-auto w-full max-w-6xl px-6 py-8 md:py-10">
      <p className="text-xs uppercase tracking-[0.35em] text-mist">
        {homeSections.music.eyebrow}
      </p>

      <h2 className="mt-3 font-display text-5xl leading-none text-white md:text-7xl">
        {homeSections.music.title}
      </h2>

      <p className="mt-5 hidden max-w-xl text-sm leading-relaxed text-mist md:block">
        {homeHighlights.latest.description}
      </p>

      {/* Lançamentos — chegam empilhados; o scroll abre a pilha.
          Cada lançamento é um PLANETA: tamanho, fase de luz e superfície
          próprios (ver ReleasePlanet) — consistentes com o sistema visual. */}
      <div
        data-release-grid
        className="relative mt-8 grid grid-cols-2 gap-6 md:mt-10 md:grid-cols-4 md:gap-8"
      >
        {releases.map((r, i) => (
          <Link key={r.title} href="/discografia" className="group block">
            <div
              data-release-card
              className="flex h-32 w-full flex-col items-center justify-center transition-transform duration-500 group-hover:-translate-y-1 md:h-48"
            >
              <ReleasePlanet
                index={i}
                size="md"
                title={r.title}
                type={r.type}
                year={r.year}
                image={r.image ?? null}
                className="h-full w-full"
              />
            </div>
          </Link>
        ))}
      </div>

      {/* CTA — liquid glass; só entra depois de a pilha abrir por completo */}
      <div data-cta className="mt-16 flex justify-center md:mt-24">
        <LiquidGlassLink filterId="glass-discografia-cta" href="/discografia">
          {homeSections.music.cta}
        </LiquidGlassLink>
      </div>
    </div>
  );
}
