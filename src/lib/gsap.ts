"use client";

import { useEffect, useRef } from "react";
import gsap from "gsap";
import { ScrollTrigger } from "gsap/ScrollTrigger";

if (typeof window !== "undefined") {
  gsap.registerPlugin(ScrollTrigger);
}

/**
 * Hook utilitário: cria um contexto GSAP com ScrollTrigger registado,
 * faz revert automático no unmount e respeita prefers-reduced-motion.
 */
export function useGsapContext(
  setup: (ctx: { reduced: boolean }) => void,
  deps: unknown[] = [],
) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    const ctx = gsap.context(() => setup({ reduced }), scopeRef);
    return () => ctx.revert();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scopeRef;
}

export { gsap, ScrollTrigger };
