"use client";

/**
 * Liquid Glass Link — efeito "liquid glass" (estilo kokonutui, MIT) portado
 * para um <Link> do Next.js, sem dependências novas.
 *
 * Como funciona: um filtro SVG (feTurbulence → feDisplacementMap) aplicado
 * via `backdrop-filter: url(#id)` refracta o que está atrás do elemento,
 * e uma pilha de sombras internas brancas simula as arestas de vidro.
 *
 * Fallback: Safari não suporta url() em backdrop-filter — aí usa blur simples.
 */

import Link from "next/link";
import React from "react";

const GLASS_SHADOW_DARK = [
  "0 0 8px rgba(0,0,0,0.03)",
  "0 2px 6px rgba(0,0,0,0.08)",
  "inset 3px 3px 0.5px -3.5px rgba(255,255,255,0.09)",
  "inset -3px -3px 0.5px -3.5px rgba(255,255,255,0.85)",
  "inset 1px 1px 1px -0.5px rgba(255,255,255,0.6)",
  "inset -1px -1px 1px -0.5px rgba(255,255,255,0.6)",
  "inset 0 0 6px 6px rgba(255,255,255,0.12)",
  "inset 0 0 2px 2px rgba(255,255,255,0.06)",
  "0 0 12px rgba(0,0,0,0.15)",
].join(", ");

const BUTTON_GLASS_FILTER_SCALE = 70;

interface GlassFilterProps {
  id: string;
  scale?: number;
}

/** Filtro SVG partilhado — invisível, só define o displacement map. */
const GlassFilter = React.memo(({ id, scale }: GlassFilterProps) => (
  <svg aria-hidden="true" focusable={false} className="hidden">
    <defs>
      <filter
        colorInterpolationFilters="sRGB"
        height="200%"
        id={id}
        width="200%"
        x="-50%"
        y="-50%"
      >
        <feTurbulence
          baseFrequency="0.05 0.05"
          numOctaves="1"
          result="turbulence"
          seed="1"
          type="fractalNoise"
        />
        <feGaussianBlur in="turbulence" result="blurredNoise" stdDeviation="2" />
        <feDisplacementMap
          in="SourceGraphic"
          in2="blurredNoise"
          result="displaced"
          scale={scale}
          xChannelSelector="R"
          yChannelSelector="B"
        />
        <feGaussianBlur in="displaced" result="finalBlur" stdDeviation="4" />
      </filter>
    </defs>
  </svg>
));
GlassFilter.displayName = "GlassFilter";

export type LiquidGlassLinkProps = React.ComponentProps<typeof Link>;

/**
 * Link com efeito liquid glass — escala no hover, comprime no toque.
 * Respeita prefers-reduced-motion (sem escala).
 */
export default function LiquidGlassLink({
  className = "",
  children,
  ...props
}: LiquidGlassLinkProps) {
  const filterId = React.useId();

  return (
    <>
      <Link
        {...props}
        className={`group relative inline-flex items-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-8 py-3.5 text-sm font-medium text-white transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97] hover:scale-[1.04] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:hover:scale-100 ${className}`}
      >
        {/* Arestas de vidro (sombras internas) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{ boxShadow: GLASS_SHADOW_DARK }}
        />
        {/* Refração do fundo (displacement + blur de fallback para Safari) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 isolate -z-10 overflow-hidden rounded-full"
          style={{
            backdropFilter: `url("#${filterId}")`,
            WebkitBackdropFilter: "blur(6px) saturate(1.15)",
          }}
        />
        {/* Brilho que percorre o vidro no hover */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full bg-gradient-to-r from-transparent via-white/10 to-transparent opacity-0 transition-opacity duration-300 group-hover:opacity-100 motion-reduce:transition-none"
        />
        <span className="relative z-10">{children}</span>
        <span
          aria-hidden="true"
          className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
        >
          →
        </span>
      </Link>
      <GlassFilter id={filterId} scale={BUTTON_GLASS_FILTER_SCALE} />
    </>
  );
}
