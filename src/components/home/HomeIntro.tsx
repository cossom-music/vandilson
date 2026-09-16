"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import EarthScene from "@/components/home/EarthScene";
import { useGsapContext, gsap, ScrollTrigger } from "@/lib/gsap";
import type { GlobeVariant } from "@/components/earth/GlassGlobe";
import { earthZoom } from "@/lib/earthZoom";
import { animate, stagger, utils, prefersReducedMotion } from "@/lib/anime";
import { motion, useReducedMotion, useScroll, useSpring, useTransform } from "framer-motion";
import { heroCine } from "@/lib/heroCine";
import { useSiteContent } from "@/components/SiteContentProvider";
import { LiquidGlassLink } from "@/components/ui/LiquidGlass";
import ReleasePlanet from "@/components/ReleasePlanet";
import HeroLayers, { HeroLayersFront } from "@/components/home/HeroLayers";
import ChoiceHub from "@/components/home/ChoiceHub";

/**
 * Variante dawn: no fim da transição NÃO entra a Discografia — entra o HUB
 * DE ESCOLHA (Carta de Trajetória): o usuário escolhe para onde navegar.
 * O cross-fade do Ato 2 passa a ser globo → hub; o conteúdo da secção de
 * música continua disponível via destinos do hub.
 */

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
 *
 * VARIANTES: a cor vive em HeroLayers (o que é fino) e
 * em EarthScene (geometria e shaders — limbo atmosférico, luzes de cidade, sol
 * estrelado). A coreografia cinematográfica escreve em `heroCine`, que a cena
 * Three.js lê por frame: o mergulho deixa de ser só um zoom.
 */
/**
 * Arco de FUSÃO — funde o fim do mergulho no globo com a secção seguinte
 * (cores contínuas, sem corte). A cor segue a variante: azul→âmbar na dawn
 * (homepage, o nascer do sol atravessa a transição), prata na silver.
 */
const MERGE_ARC: Record<GlobeVariant, string> = {
  silver:
    "radial-gradient(ellipse 60% 46% at 50% 58%, rgba(202,204,208,0.10) 0%, rgba(58,58,58,0.05) 45%, rgba(3,5,9,0.9) 100%)",
  galaxy:
    "radial-gradient(ellipse 60% 46% at 50% 58%, rgba(202,204,208,0.10) 0%, rgba(58,58,58,0.05) 45%, rgba(3,5,9,0.9) 100%)",
  ember:
    "radial-gradient(ellipse 60% 46% at 50% 58%, rgba(202,204,208,0.10) 0%, rgba(58,58,58,0.05) 45%, rgba(3,5,9,0.9) 100%)",
  // O arco de fusão vive SOBRE o planeta (50% 58%): e o brilho da Terra a
  // entregar o passe à secção seguinte — por isso o azul é contido (o resto do
  // gradiente é o escurecimento da borda, não mais cor para o céu).
  atmo: "radial-gradient(ellipse 60% 46% at 50% 58%, rgba(120,190,255,0.11) 0%, rgba(40,90,180,0.05) 45%, rgba(3,5,9,0.9) 100%)",
  dawn: "radial-gradient(ellipse 60% 46% at 50% 58%, rgba(255,200,140,0.13) 0%, rgba(60,110,200,0.05) 45%, rgba(3,5,9,0.9) 100%)",
};

/** Brilho do nome por variante — lido dos modelos das refs 2 e 4. */
const NAME_GLOW: Partial<Record<GlobeVariant, string>> = {
  atmo: "0 2px 30px rgba(80,150,255,0.38)",
  dawn: "0 2px 26px rgba(255,190,110,0.26)",
};

export default function HomeIntro({
  variant = "silver",
}: {
  /** Variante visual do herói — "dawn" é a atual (homepage /); "silver" é a
   *  homepage anterior. As cores extra vivem em HeroLayers e
   *  desvanecem com o globo (data-hero-fx), garantindo a transição prateada. */
  variant?: GlobeVariant;
}) {
  const [reduced, setReduced] = useState(false);
  // Variante dawn termina no HUB DE ESCOLHA em vez da Discografia.
  const useChoiceHub = variant === "dawn";

  useEffect(() => {
    setReduced(window.matchMedia("(prefers-reduced-motion: reduce)").matches);
  }, []);

  // O ref devolvido TEM de ser anexado à raiz (mais abaixo: ref={scopeRef})
  const scopeRef = useGsapContext(({ reduced: rm, scope }) => {
    if (!scope || rm) return;

    // Elementos por data-attribute — consultas DOM diretas, sem seletores GSAP
    const heroStage = scope.querySelector<HTMLElement>("[data-hero-stage]") ?? scope;
    const musicStage = scope.querySelector<HTMLElement>("[data-music-stage]");
    // Palco dividido (dawn): herói→hub num sticky, Ouvir noutro — a secção
    // volta a ser real no fluxo do documento e as âncoras nativas funcionam.
    const isSplit = musicStage !== null;
    const globe = scope.querySelector<HTMLElement>("[data-globe]");
    const vignette = scope.querySelector<HTMLElement>("[data-vignette]");
    const indicator = scope.querySelector<HTMLElement>("[data-indicator]");
    const music = scope.querySelector<HTMLElement>("[data-music]");
    if (!globe || !vignette || !indicator) return;
    // No palco dividido a Ouvir é sempre visível (secção real, com palco
    // próprio); nos restantes vive no palco do herói e nasce oculta para o
    // cross-fade.
    if (music) {
      if (isSplit) gsap.set(music, { autoAlpha: 1, y: 0 });
      else gsap.set(music, { autoAlpha: 0, y: 64 });
    }

    // Camadas de cor da variante (nebulosa, sol, flare…) — desvanecem junto
    // com o globo no Ato 2. Em "silver" o grupo não existe (querySelector null).
    const heroFx = scope.querySelector<HTMLElement>("[data-hero-fx]")
      ? Array.from(scope.querySelectorAll<HTMLElement>("[data-hero-fx]"))
      : [];
    // EarthScene faz o seu próprio zoom do fundo — não interagimos diretamente.

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

    // Timeline única com scrub EXATO sobre todo o container.
    // scrub: true (e não um valor suavizado) — o scroll controla a animação
    // 1:1, sem atraso. Com scrub suavizado, a timeline ficava a "apanhar" o
    // scroll: o sticky soltava e a secção seguinte entrava enquanto os
    // planetas ainda voavam (o descontrolo que o utilizador viu).
    const tl = gsap.timeline({
      defaults: { ease: "none" },
      scrollTrigger: {
        trigger: heroStage,
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

    // CINEMA DA VARIANTE — o scroll escreve os sinais que a cena Three.js lê
    // por frame (heroCine). Corre no mesmo arco do dolly: o mergulho e o
    // espetáculo da variante são o mesmo movimento, não dois.
    if (variant === "atmo") {
      // As cidades do lado noturno ganham corpo enquanto a câmara desce.
      tl.fromTo(heroCine.cities, { value: 0.9 }, { value: 1.3, duration: 0.5 }, 0);
    } else if (variant === "dawn") {
      // O AMANHECER sobe: o sol sai de trás do limbo, o flare abre e o ponto
      // de contacto incendeia-se — tudo durante o mesmo mergulho.
      tl.fromTo(
        heroCine.sunrise,
        { value: 0.35 },
        { value: 1, duration: 0.5, ease: "power1.inOut" },
        0,
      );
      // Parallax: o sol desliza lateralmente contra o limbo.
      tl.fromTo(heroCine.drift, { value: 0 }, { value: 1, duration: 0.5, ease: "sine.inOut" }, 0);
    }

    // Ato 2 — já dentro do globo: cross-fade para a Música (ou, na dawn,
    // para o HUB DE ESCOLHA — a única secção que vive no palco).
    tl.to(globe, { autoAlpha: 0, duration: 0.16 }, 0.58);
    tl.to(vignette, { autoAlpha: 0, duration: 0.16 }, 0.58);
    // Cores extra da variante saem um pouco antes — a cena já está prateada
    // quando a Música faz fade in (transição garantida por construção).
    if (heroFx.length) {
      tl.to(heroFx, { autoAlpha: 0, duration: 0.14, ease: "power1.in" }, 0.44);
    }
    const choiceHub = scope.querySelector<HTMLElement>("[data-choice-hub]");
    if (choiceHub) {
      gsap.set(choiceHub, { autoAlpha: 0, y: 40 });
      // Hub entra após o cross-fade e FICA — é o destino final do palco do
      // herói; a Ouvir tem palco sticky próprio (timeline mtl abaixo).
      tl.to(choiceHub, { autoAlpha: 1, y: 0, duration: 0.24, ease: "power1.out" }, 0.68);
      // Cauda assente: o hub permanece até o sticky soltar para o palco da
      // Ouvir — sem fade out, a carta entrega o scroll diretamente.
      tl.to({}, { duration: 0.28 }, 0.94);
    }
    // A Ouvir entra no cross-fade (restantes variantes) — na dawn (isSplit)
    // ela já vive visível no seu próprio palco, fora desta timeline.
    if (music && !isSplit) {
      tl.to(
        music,
        { autoAlpha: 1, y: 0, duration: 0.16, ease: "power1.out" },
        choiceHub ? 1.22 : 0.68,
      );
    }
    // Globo invisível → pausa o trabalho por frame da cena Three.js
    // (o render WebGL contínuo escondido roubava frames à página inteira).
    // Reversível: o scrub repõe false ao voltar a subir.
    tl.fromTo(earthZoom.paused, { value: false }, { value: true, duration: 0.01 }, 0.74);
    // (a Ouvir chega DEPOIS do hub — a pausa do render WebGL fica no
    // 0.74, durante o cross-fade, e não afeta o hub que é puro DOM)

    // PALCO PRÓPRIO DA OUVIR (só dawn): timeline GSAP dedicada ao segundo
    // sticky — a pilha de planetas e o CTA animam com o scroll DESTE palco,
    // desacoplados do herói.
    let mtl: gsap.core.Timeline | null = null;
    if (isSplit && musicStage) {
      mtl = gsap.timeline({
        defaults: { ease: "none" },
        scrollTrigger: {
          trigger: musicStage,
          start: "top top",
          end: "bottom bottom",
          scrub: true,
        },
      });
    }

    // Cleanup acumulado (o CTA/respiro vivem DEPOIS do bloco dos cartões —
    // antes, o return dentro do bloco os tornava código morto).
    let cleanup: (() => void) | undefined;

    // Ato 3 — pilha REAL: os cartões nascem empilhados no centro do palco
    // (delta medido em px do layout real) e o scroll abre a pilha até às
    // posições fixas do grid. O scrub inverte tudo ao voltar a subir.
    // Corre em TODAS as variantes — na dawn a pilha abre DEPOIS do hub
    // (os cartões partem de 1.04, quando a Ouvir já está visível).
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

      // A pilha anima na timeline do palco onde a secção vive: mtl (palco
      // próprio da dawn) ou tl (restantes variantes, dentro do herói).
      const stackTl = mtl ?? tl;
      const stackBase = mtl ? 0.06 : choiceHub ? 1.32 : 0.86;

      // Resize/rotação do ecrã: re-medir e re-empilhar — mas só enquanto a
      // pilha ainda estiver fechada (a meio do voo, o scrub manda).
      const onRefresh = () => {
        if (!stackTl.scrollTrigger || stackTl.scrollTrigger.progress < 0.84) {
          applyStack();
        }
      };
      ScrollTrigger.addEventListener("refreshInit", onRefresh);
      cleanup = () => ScrollTrigger.removeEventListener("refreshInit", onRefresh);

      cards.forEach((card, i) => {
        stackTl.to(
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
          stackBase + i * 0.022,
        );
      });
    }

    // Ato 4 — o CTA só existe depois de TODOS os cartões estarem sentados.
    if (cta) {
      gsap.set(cta, { autoAlpha: 0, y: 24 });
      (mtl ?? tl).to(
        cta,
        { autoAlpha: 1, y: 0, duration: 0.08, ease: "power1.out" },
        mtl ? 0.42 : choiceHub ? 1.62 : 1.02,
      );
    }

    // Respiro final — um espaçador vazio estende a timeline:
    // a animação completa aos ~85% do scroll e o sticky segura a secção
    // assentada ANTES de soltar para a secção de Contactos. Na dawn o
    // respiro é MAIOR (1.74 → 2.1): o sticky só larga DEPOIS de a pilha
    // e o CTA estarem 100% assentados — a página não desce para a Sintonia
    // a meio da animação da Ouvir.
    if (mtl) {
      // Palco dividido: o respiro vive NA timeline da Ouvir — o palco fica
      // parado com a pilha e o CTA assentados antes de soltar para Contactos.
      mtl.to({}, { duration: 0.3 }, 0.55);
    } else {
      tl.to({}, { duration: 0.2 }, choiceHub ? 1.74 : 1.22);
      tl.to({}, { duration: choiceHub ? 0.8 : 0 }, choiceHub ? 1.94 : 1);
    }
    return cleanup;
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
        {variant !== "silver" && <HeroLayers variant={variant} />}
        <div data-globe className="absolute inset-0 z-0">
          <EarthScene variant={variant} />
        </div>
        {variant !== "silver" && <HeroLayersFront variant={variant} />}
          <div
            data-vignette
            className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
          />
          <HeroSignatures glow={NAME_GLOW[variant]} />
        </div>
        <section className="relative bg-night-950 py-20">
          <DiscografiaContent />
        </section>
      </div>
    );
  }

  return (
    <>
    {/* ESTRUTURA EM DOIS PALCOS STICKY (dawn):
        1. Palco do herói (260svh): mergulho no globo → hub de escolha;
        2. Palco da Ouvir (220svh): a secção é REAL no fluxo do documento —
           âncoras nativas (#home-music) funcionam e a pilha de planetas
           tem timeline GSAP própria (scrub do scroll deste palco). */}
    <div ref={scopeRef} data-hero-scope className="relative">
      <div
        data-hero-stage
        className={
          useChoiceHub
            ? "relative h-[260svh]" // dawn: só herói + hub neste palco
            : "relative h-[460svh]" // restantes: herói + Ouvir no mesmo palco (como antes)
        }
      >
      <div className="sticky top-0 h-[100lvh] overflow-hidden">
        {/* Reforço estelar local — atrás do globo, mais denso que o canvas global */}
        <div
          aria-hidden="true"
          className="star-layer star-layer--hero pointer-events-none absolute inset-0"
        />
        {variant !== "silver" && <HeroLayers variant={variant} />}
        {/* Cena da terra — scroll faz zoom no fundo (estrelas) e no objeto */}
        <div data-globe className="absolute inset-0 z-0">
          <EarthScene variant={variant} />
        </div>
        {variant !== "silver" && <HeroLayersFront variant={variant} />}

        <div
          data-vignette
          className="pointer-events-none absolute inset-0 z-20 bg-[radial-gradient(ellipse_62%_55%_at_50%_46%,rgba(3,5,9,0)_58%,#030509_100%)]"
        />

        <HeroSignatures glow={NAME_GLOW[variant]} />

        {/* Indicador de scroll — some no arranque do mergulho.
            O FADE é do GSAP ([data-indicator]); a entrada com mola e o
            parallax com o scroll são Framer Motion, em nós INTERNOS, para as
            duas bibliotecas nunca escreverem no mesmo elemento. */}
        <div
          data-indicator
          className="absolute bottom-3 left-1/2 z-20 -translate-x-1/2"
          aria-hidden="true"
        >
          <ScrollCue />
        </div>

        {/* Arco de fusão — a cor segue a variante (ver MERGE_ARC) */}
        <div className="pointer-events-none absolute inset-0 z-20">
          <div className="absolute inset-0" style={{ background: MERGE_ARC[variant] }} />
        </div>

        {/* SECÇÃO OUVIR — no palco sticky (nas variantes SEM hub de escolha).
            Na dawn ela vive no PALCO PRÓPRIO abaixo (secção real, âncora
            nativa funcional). overflow-x-hidden: com a pilha em voo, nenhum
            transform pode criar scroll horizontal. */}
        {!useChoiceHub && (
          <section
            id="home-music"
            data-music
            className="invisible absolute inset-0 z-30 overflow-x-hidden overflow-y-auto"
          >
            <div className="flex min-h-full items-center">
              <DiscografiaContent />
            </div>
          </section>
        )}

        {/* HUB DE ESCOLHA (só dawn) — destino final do palco do herói. */}
        {useChoiceHub && (
          <div data-choice-hub className="invisible absolute inset-0 z-40 overflow-y-auto opacity-0">
            <ChoiceHub />
          </div>
        )}
      </div>
      </div>

      {/* PALCO PRÓPRIO DA OUVIR (só dawn) — secção REAL no fluxo do
          documento dentro do seu próprio sticky: a âncora #home-music
          funciona nativamente e a pilha de planetas anima com o scroll
          DESTE palco (timeline GSAP dedicada, scrub 1:1). */}
      {useChoiceHub && (
        <div
          data-music-stage
          className="relative h-[220svh]"
        >
          <div className="sticky top-0 h-[100lvh] overflow-hidden">
            {/* Estrelas do palco — o fundo é transparente para as estrelas
                globais (StarField) visíveis atrás, como no herói. */}
            <div
              aria-hidden="true"
              className="star-layer star-layer--hero pointer-events-none absolute inset-0"
            />
            <section
              id="home-music"
              data-music
              className="absolute inset-0 overflow-x-hidden overflow-y-auto"
            >
              <div className="flex min-h-full items-center">
                <DiscografiaContent />
              </div>
            </section>
          </div>
        </div>
      )}
    </div>
    </>
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

/**
 * Indicador de scroll do herói (Framer Motion): entra com um fade depois do
 * nome ficar revelado e faz parallax para baixo com o scroll — o gesto de
 * "empurrar" a página para dentro do globo.
 */
function ScrollCue() {
  const reduced = useReducedMotion();
  const { scrollY } = useScroll();
  const drift = useSpring(useTransform(scrollY, [0, 640], [0, 96]), {
    stiffness: 90,
    damping: 22,
    mass: 0.6,
  });
  return (
    <motion.div
      className="flex flex-col items-center gap-3"
      initial={reduced ? false : { opacity: 0 }}
      animate={{ opacity: 1 }}
      transition={{ delay: 0.9, duration: 1, ease: "easeOut" }}
    >
      <motion.div
        className="flex flex-col items-center gap-3"
        style={reduced ? undefined : { y: drift }}
      >
        <span className="text-[10px] uppercase tracking-[0.4em] text-mist/80">
          Deslize para explorar
        </span>
        <div className="h-10 w-px animate-pulse bg-gradient-to-b from-transparent via-white/60 to-transparent" />
      </motion.div>
    </motion.div>
  );
}

function HeroSignatures({ glow }: { glow?: string }) {
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
        style={glow ? { textShadow: glow } : undefined}
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
