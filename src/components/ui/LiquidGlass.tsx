"use client";

/**
 * Liquid Glass — efeito "liquid glass" (estilo kokonutui, MIT) sem
 * dependências novas, em duas variantes:
 *
 *   · <LiquidGlassLink>   — envolve um <Link> do Next.js (navegação);
 *   · <LiquidGlassButton> — <button> nativo (ações/formulários), com
 *     estado `loading` e `type` seguro (default "button").
 *
 * Como funciona: um filtro SVG (feTurbulence → feDisplacementMap) aplicado
 * via `backdrop-filter: url(#id)` refracta o que está atrás do elemento,
 * e uma pilha de sombras internas brancas simula as arestas de vidro.
 *
 * Fallback: Safari não suporta url() em backdrop-filter — aí usa blur simples.
 */

import Link from "next/link";
import React from "react";

/* ------------------------- internos partilhados --------------------------- */

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

/** Classes base comuns às duas variantes. */
const GLASS_BASE_CLASS =
  "group relative inline-flex items-center justify-center gap-3 rounded-full border border-white/10 bg-white/[0.04] px-8 py-3.5 text-sm font-medium text-white transition-transform duration-200 outline-none focus-visible:ring-2 focus-visible:ring-white/40 active:scale-[0.97] hover:scale-[1.04] motion-reduce:transition-none motion-reduce:active:scale-100 motion-reduce:hover:scale-100";

interface GlassLayersProps {
  filterId: string;
}

/**
 * As camadas de vidro (arestas, refração, brilho de hover) — idênticas
 * para Link e Button; os filhos ficam por cima (z-10).
 */
function GlassLayers({ filterId }: GlassLayersProps) {
  return (
    <>
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
    </>
  );
}

/* ------------------------------ Link -------------------------------------- */

export type LiquidGlassLinkProps = React.ComponentProps<typeof Link> & {
  /**
   * ID determinístico para o filtro SVG. Opcional — mas em páginas com
   * hidratação sensível é preferível passar um ID fixo (o useId do React
   * depende da posição na árvore e pode divergir entre SSR e cliente em
   * dev com bundles misturados).
   */
  filterId?: string;
};

/**
 * Link com efeito liquid glass — escala no hover, comprime no toque.
 * Respeita prefers-reduced-motion (sem escala).
 */
export function LiquidGlassLink({
  className = "",
  children,
  filterId: filterIdProp,
  ...props
}: LiquidGlassLinkProps) {
  const useIdValue = React.useId();
  const filterId = filterIdProp ?? useIdValue;

  return (
    <>
      <Link
        {...props}
        className={`${GLASS_BASE_CLASS} ${className}`}
      >
        <GlassLayers filterId={filterId} />
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

/* ------------------------------ Button ------------------------------------ */

export type LiquidGlassButtonProps = React.ButtonHTMLAttributes<HTMLButtonElement> & {
  /** Mostra o spinner e desativa o botão (use em submits assíncronos). */
  loading?: boolean;
  /** ID determinístico para o filtro SVG (ver LiquidGlassLink). */
  filterId?: string;
};

/**
 * Botão com efeito liquid glass — para ações e formulários.
 * `type` é "button" por defeito (evita submits acidentais dentro de <form>);
 * passe explicitamente type="submit" quando for o CTA de um formulário.
 */
export function LiquidGlassButton({
  className = "",
  children,
  loading = false,
  disabled,
  type = "button",
  filterId: filterIdProp,
  ...props
}: LiquidGlassButtonProps) {
  const useIdValue = React.useId();
  const filterId = filterIdProp ?? useIdValue;

  return (
    <>
      <button
        {...props}
        type={type}
        disabled={disabled ?? loading}
        aria-busy={loading || undefined}
        className={`${GLASS_BASE_CLASS} ${
          loading ? "cursor-wait opacity-80" : ""
        } ${className}`}
      >
        <GlassLayers filterId={filterId} />
        {loading && (
          <span
            aria-hidden="true"
            className="relative z-10 h-4 w-4 shrink-0 animate-spin rounded-full border border-white/30 border-t-white motion-reduce:animate-none"
          />
        )}
        <span className="relative z-10">{children}</span>
        {!loading && (
          <span
            aria-hidden="true"
            className="relative z-10 transition-transform duration-300 group-hover:translate-x-1 motion-reduce:transition-none motion-reduce:group-hover:translate-x-0"
          >
            →
          </span>
        )}
      </button>
      <GlassFilter id={filterId} scale={BUTTON_GLASS_FILTER_SCALE} />
    </>
  );
}

/** Import por omissão = Link (retrocompatível com os usos existentes). */
export default LiquidGlassLink;
