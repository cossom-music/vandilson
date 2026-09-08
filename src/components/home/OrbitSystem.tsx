"use client";

import { useEffect, useMemo, useRef } from "react";
import { gsap } from "@/lib/gsap";
import { useSiteContent } from "@/components/SiteContentProvider";

/**
 * Secção "Sintonia" — o artista como centro do seu próprio sistema:
 *
 *   · SOL prateado central (corpo escuro, limbo luminoso — a mesma
 *     assinatura fresnel da casca de vidro do herói);
 *   · CADA REDE na sua própria linha de órbita elíptica inclinada,
 *     de dentro para fora: ouvir (Spotify, Apple Music) → seguir
 *     (Instagram, YouTube);
 *   · cada rede vive numa BOLA DE VIDRO com o logotipo monocromático
 *     dentro — tooltip com nome + handle no hover (rato) ou no toque
 *     (mobile: 1.º toque mostra, 2.º toque abre);
 *   · profundidade: os nós crescem e acendem-se ao passar À FRENTE do
 *     sol e encolhem/apagam-se ao passar ATRÁS (z-index dinâmico);
 *   · hover perto do sistema abranda as órbitas (lerp suave);
 *   · entrada: os anéis desenham-se, o sol acende, as bolas surgem em
 *     cascata — o mesmo esquema de reveal do resto do site;
 *   · prefers-reduced-motion: sistema estático, tudo visível.
 *
 * Posições em percentagem do palco (880×620) — responsivo sem medições,
 * e o HTML do servidor já nasce com as bolas nas suas posições iniciais.
 */

const SPACE = { w: 880, h: 620 };
const SUN = { r: 74, top: 0.42 };
const SUN_CY = SPACE.h * SUN.top;

/** Glifos monocromáticos desenhados à mão (traço prateado). */
const LOGOS: Record<string, string> = {
  Spotify:
    '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="9.2" stroke-width="1.6"/><path d="M7.4 9.8 C10.6 8.9 14.3 9.4 17 11.1" stroke-width="1.5" stroke-linecap="round"/><path d="M7.9 12.6 C10.5 12 13.3 12.4 15.5 13.8" stroke-width="1.3" stroke-linecap="round"/><path d="M8.4 15.2 C10.3 14.8 12.5 15.1 14.1 16.1" stroke-width="1.1" stroke-linecap="round"/></svg>',
  "Apple Music":
    '<svg viewBox="0 0 24 24"><path d="M9.6 17.4 V7.2 L18.2 5.4 V15.8" stroke-width="1.6" stroke-linejoin="round"/><circle class="orbit-logo-fill" cx="7.6" cy="17.4" r="2.1"/><circle class="orbit-logo-fill" cx="16.2" cy="15.8" r="2.1"/></svg>',
  Instagram:
    '<svg viewBox="0 0 24 24"><rect x="3" y="3" width="18" height="18" rx="5" stroke-width="1.6"/><circle cx="12" cy="12" r="4" stroke-width="1.6"/><circle class="orbit-logo-fill" cx="17" cy="7" r="1.4"/></svg>',
  YouTube:
    '<svg viewBox="0 0 24 24"><rect x="2.5" y="6" width="19" height="13" rx="3.5" stroke-width="1.6"/><path class="orbit-logo-fill" d="M10.2 9.6 L15.4 12.5 L10.2 15.4 Z"/></svg>',
  TikTok:
    '<svg viewBox="0 0 24 24"><path d="M14.5 4 v9.2 a3.6 3.6 0 1 1 -3.1 -3.57" stroke-width="1.6" stroke-linecap="round"/><path d="M14.5 5.4 c0.9 1.7 2.4 2.8 4.4 3" stroke-width="1.6" stroke-linecap="round"/></svg>',
  Facebook:
    '<svg viewBox="0 0 24 24"><path d="M14.8 4.5 h-2.1 a3.1 3.1 0 0 0 -3.1 3.1 v2.2 H7.4 v3 h2.2 v7.2 h3 v-7.2 h2.6 l0.5 -3 h-3.1 V8 a1.1 1.1 0 0 1 1.1 -1.1 h1.1 Z" stroke-width="1.4" stroke-linejoin="round"/></svg>',
  X:
    '<svg viewBox="0 0 24 24"><path d="M5 4.5 L18.8 19.5 M18.8 4.5 L5 19.5" stroke-width="1.7" stroke-linecap="round"/></svg>',
  Threads:
    '<svg viewBox="0 0 24 24"><path d="M16.6 11.2 c-1.2 -0.5 -2.4 -0.8 -3.6 -0.9 c-2.6 -0.15 -4.4 1 -4.5 2.7 c-0.1 1.6 1.2 2.9 3.1 2.9 c2.5 0 4.4 -1.9 4.6 -4.6 c0.06 -0.9 0.05 -1.9 -0.15 -2.8 c-0.5 -2.4 -2.3 -3.7 -4.6 -3.6 c-2.2 0.1 -3.9 1.3 -4.6 3.3" stroke-width="1.5" stroke-linecap="round"/><path d="M16.9 12.4 c0.5 2.9 -0.7 5.6 -3 6.6 c-2 0.85 -4.3 0.4 -5.6 -1" stroke-width="1.5" stroke-linecap="round"/></svg>',
  SoundCloud:
    '<svg viewBox="0 0 24 24"><path d="M4 15.5 v-3.4 M6.4 16 v-5.2 M8.8 16.5 v-6.6 M11.2 16.8 V8.4 c0 -1.5 1.1 -2.7 2.6 -2.9 c2 -0.25 3.8 1.2 4 3.2" stroke-width="1.5" stroke-linecap="round"/><path d="M17.8 8.7 c1.6 0.3 2.7 1.5 2.7 3.1 c0 1.9 -1.5 3.3 -3.4 3.3 h-2.6" stroke-width="1.5" stroke-linecap="round"/></svg>',
};

/**
 * Geometria das órbitas — gerada para N redes visíveis (a ordem do CMS
 * manda: de dentro para fora). Mantém a alternância tracejado/sólido,
 * direções alternadas e ângulos iniciais desfasados do desenho original.
 */
function buildRings(count: number) {
  const INNER = { rx: 205, ry: 68, speed: 0.11 };
  const OUTER = { rx: 430, ry: 140, speed: -0.06 };
  const lerp = (a: number, b: number, t: number) => a + (b - a) * t;
  return Array.from({ length: count }, (_, i) => {
    const t = count <= 1 ? 0 : i / (count - 1);
    return {
      rx: Math.round(lerp(INNER.rx, OUTER.rx, t)),
      ry: Math.round(lerp(INNER.ry, OUTER.ry, t)),
      speed: Math.round(lerp(INNER.speed, OUTER.speed, t) * 1000) / 1000,
      dash: i % 2 === 0,
      angle0: Math.round((0.7 + i * 1.55) * 100) / 100,
    };
  });
}

const pctX = (x: number) => (x / SPACE.w) * 100;
const pctY = (y: number) => (y / SPACE.h) * 100;

type NodeState = {
  el: HTMLAnchorElement;
  angle: number;
  rx: number;
  ry: number;
  speed: number;
  reveal: number; // 0 → 1 na entrada (animado pelo GSAP)
  lastOp: number; // última opacidade escrita (evita escritas redundantes)
  lastZ: number; // último z-index escrito (troca só ao cruzar o horizonte)
};

export default function OrbitSystem() {
  const { socials: allSocials } = useSiteContent();
  // Só as redes visíveis entram no sistema (fallback: todas, se o CMS
  // ainda não tiver o campo `visible`)
  const visibleSocials = allSocials.some((s) => s.visible === false)
    ? allSocials.filter((s) => s.visible !== false)
    : allSocials;
  const RINGS = useMemo(() => buildRings(visibleSocials.length), [visibleSocials.length]);
  const stageRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const stage = stageRef.current;
    if (!stage) return;

    const reduced = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
    const canHover = window.matchMedia("(hover: hover) and (pointer: fine)").matches;

    const nodes: NodeState[] = RINGS.map((ring, i) => ({
      el: stage.querySelectorAll<HTMLAnchorElement>(".orbit-node")[i],
      angle: ring.angle0,
      rx: ring.rx,
      ry: ring.ry,
      speed: ring.speed,
      reveal: reduced ? 1 : 0,
      lastOp: -1,
      lastZ: -1,
    })).filter((n) => n.el); // defenses: menos nós DOM que anéis esperados

    const sun = stage.querySelector<HTMLElement>(".orbit-sun");
    const ringEls = Array.from(stage.querySelectorAll<SVGEllipseElement>(".ring-ellipse"));

    // ── Sistema em execução (GSAP ticker — zero re-renders do React) ──
    // Performance: os nós movem-se APENAS por transform (compositado na
    // GPU, com subpixel suave). Animar left/top força LAYOUT a cada frame
    // e o navegador alinha posições a pixels inteiros — era isso que se
    // via como movimento "frame a frame".
    let speedFactor = 1;
    let targetFactor = 1;
    let stageScale = stage.getBoundingClientRect().width / SPACE.w;

    const onResize = () => {
      stageScale = stage.getBoundingClientRect().width / SPACE.w;
    };
    window.addEventListener("resize", onResize);

    // Comuta a âncora para o centro (a posição passa a viver só no transform;
    // os left/top percentuais do SSR mantêm-se como fallback no-JS)
    for (const n of nodes) {
      n.el.style.left = "50%";
      n.el.style.top = `${SUN.top * 100}%`;
    }

    const tick = (deltaMS = 16.7) => {
      const dt = Math.min(deltaMS / 1000, 0.05);
      speedFactor += (targetFactor - speedFactor) * Math.min(1, dt * 6);

      for (const n of nodes) {
        if (!reduced) n.angle += n.speed * dt * speedFactor;

        const dx = n.rx * Math.cos(n.angle) * stageScale;
        const dy = n.ry * Math.sin(n.angle) * stageScale;
        const depth = (Math.sin(n.angle) + 1) / 2; // 0 = atrás · 1 = frente

        n.el.style.transform =
          `translate(-50%, -50%) translate3d(${dx.toFixed(2)}px, ${dy.toFixed(2)}px, 0) scale(${(0.72 + depth * 0.5).toFixed(3)})`;

        const op = (0.4 + depth * 0.6) * n.reveal;
        if (Math.abs(op - n.lastOp) > 0.001) {
          n.el.style.opacity = op.toFixed(3);
          n.lastOp = op;
        }

        const z = depth > 0.5 ? 25 : 10;
        if (z !== n.lastZ) {
          n.el.style.zIndex = String(z);
          n.lastZ = z;
        }
      }
    };

    tick(); // pose imediata (sem um frame na posição do SSR)

    // Tooltip no toque: 1.º toque mostra, 2.º toque abre o link
    const closeAll = () => nodes.forEach((n) => n.el.classList.remove("show"));
    const onNodeClick = (n: NodeState) => (e: MouseEvent) => {
      if (!n.el.classList.contains("show")) {
        e.preventDefault();
        closeAll();
        n.el.classList.add("show");
      }
    };
    const onDocClick = (e: MouseEvent) => {
      if (!(e.target as HTMLElement).closest(".orbit-node")) closeAll();
    };

    const cleanupFns: Array<() => void> = [];

    const onStageEnter = () => {
      targetFactor = 0.16;
    };
    const onStageLeave = () => {
      targetFactor = 1;
    };

    if (!reduced) {
      const tickerCb = (_time: number, deltaMS: number) => tick(deltaMS);
      gsap.ticker.add(tickerCb);
      cleanupFns.push(() => gsap.ticker.remove(tickerCb));
    }

    if (!canHover) {
      nodes.forEach((n) => n.el.addEventListener("click", onNodeClick(n)));
      document.addEventListener("click", onDocClick);
    }
    stage.addEventListener("mouseenter", onStageEnter);
    stage.addEventListener("mouseleave", onStageLeave);

    // ── Coreografia de entrada (mesmo esquema de reveal do site) ──
    let io: IntersectionObserver | undefined;
    let ctx: ReturnType<typeof gsap.context> | undefined;

    if (!reduced) {
      // Estado inicial oculto (só quando o JS corre — padrão AnimeReveal)
      gsap.set(nodes.map((n) => n.el), { opacity: 0 });
      gsap.set(ringEls, { opacity: 0 });
      if (sun) gsap.set(sun, { opacity: 0 });

      io = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) continue;
            io?.disconnect();

            ctx = gsap.context(() => {
              const tl = gsap.timeline({ defaults: { ease: "power3.out" } });

              // 1 · anéis: sólidos desenham-se, tracejados esmaecem
              ringEls.forEach((el, i) => {
                if (!RINGS[i].dash) {
                  let len = 1600;
                  try {
                    len = el.getTotalLength();
                  } catch {
                    /* fallback */
                  }
                  el.style.strokeDasharray = String(len);
                  el.style.strokeDashoffset = String(len);
                  tl.to(el, { opacity: 1, strokeDashoffset: 0, duration: 1.4, ease: "power2.inOut" }, i * 0.16);
                } else {
                  tl.to(el, { opacity: 1, duration: 0.9 }, 0.3 + i * 0.16);
                }
              });

              // 2 · o sol acende
              if (sun) {
                gsap.set(sun, { xPercent: -50, yPercent: -50 });
                tl.to(sun, { opacity: 1, duration: 1.1, ease: "power2.out" }, 0.05).fromTo(
                  sun,
                  { scale: 0.86 },
                  { scale: 1, duration: 1.4, ease: "power2.out" },
                  0.05,
                );
              }

              // 3 · bolas surgem em cascata (reveal lido pelo ticker)
              nodes.forEach((n, i) => {
                tl.to(n, { reveal: 1, duration: 0.7 }, 0.6 + i * 0.13);
              });
            }, stage);
            break;
          }
        },
        { threshold: 0.3 },
      );
      io.observe(stage);
    }

    return () => {
      io?.disconnect();
      cleanupFns.forEach((fn) => fn());
      window.removeEventListener("resize", onResize);
      ctx?.revert();
      stage.removeEventListener("mouseenter", onStageEnter);
      stage.removeEventListener("mouseleave", onStageLeave);
      if (!canHover) {
        nodes.forEach((n) => n.el.removeEventListener("click", onNodeClick(n)));
        document.removeEventListener("click", onDocClick);
      }
    };
  }, []);

  return (
    <div
      ref={stageRef}
      className="orbit-stage relative mx-auto w-[min(880px,86vw)] sm:w-[min(880px,92vw)]"
      style={{ aspectRatio: `${SPACE.w} / ${SPACE.h}` }}
    >
      {/* Anéis — um por rede */}
      <svg
        className="rings absolute inset-0 h-full w-full"
        viewBox={`0 0 ${SPACE.w} ${SPACE.h}`}
        aria-hidden="true"
        style={{ overflow: "visible" }}
      >
        {RINGS.map((ring, i) => (
          <ellipse
            key={i}
            className={`ring-ellipse${ring.dash ? " ring-dashed" : ""}`}
            cx={SPACE.w / 2}
            cy={SUN_CY}
            rx={ring.rx}
            ry={ring.ry}
          />
        ))}
      </svg>

      {/* Sol prateado central */}
      <div
        className="orbit-sun"
        style={{ width: SUN.r * 2, height: SUN.r * 2, top: `${SUN.top * 100}%` }}
        aria-hidden="true"
      />

      {/* Bolas de vidro com logotipos + tooltips */}
      {RINGS.map((ring, i) => {
        const s = visibleSocials[i];
        if (!s) return null;
        const logo = LOGOS[s.label] ?? LOGOS.Instagram; // rede desconhecida → glifo neutro
        const x0 = pctX(SPACE.w / 2 + ring.rx * Math.cos(ring.angle0));
        const y0 = pctY(SUN_CY + ring.ry * Math.sin(ring.angle0));
        const depth0 = (Math.sin(ring.angle0) + 1) / 2;
        return (
          <a
            key={s.label}
            className="orbit-node"
            href={s.url}
            target="_blank"
            rel="noopener"
            aria-label={`${s.label} — ${s.handle}`}
            style={{
              // Valores com precisão fixa — idênticos no servidor e no
              // cliente (zero margem para desvio de hidratação)
              left: `${x0.toFixed(4)}%`,
              top: `${y0.toFixed(4)}%`,
              transform: `translate(-50%, -50%) scale(${(0.72 + depth0 * 0.5).toFixed(3)})`,
              zIndex: depth0 > 0.5 ? 25 : 10,
            }}
          >
            <span className="orbit-tip" aria-hidden="true">
              <span className="orbit-tip-name">{s.label}</span>
              <span className="orbit-tip-handle">{s.handle}</span>
              <span className="orbit-tip-open">Toque novamente para abrir ↗</span>
            </span>
            <span className="orbit-ball" dangerouslySetInnerHTML={{ __html: logo }} />
          </a>
        );
      })}
    </div>
  );
}
