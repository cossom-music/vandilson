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
 *
 * O ref devolvido TEM de ser anexado a um elemento DOM (ref={scopeRef}),
 * caso contrário o contexto fica com scope inválido ("Invalid scope" no console)
 * e os seletores/gatilhos resolvem mal.
 */
export function useGsapContext(
  setup: (ctx: { reduced: boolean; scope: HTMLElement | null }) => void,
  deps: unknown[] = [],
) {
  const scopeRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const reduced =
      typeof window !== "undefined" &&
      window.matchMedia("(prefers-reduced-motion: reduce)").matches;

    // Proteção: um erro do GSAP nunca pode derrubar a página toda
    let ctx: ReturnType<typeof gsap.context> | undefined;
    try {
      ctx = gsap.context(
        () => setup({ reduced, scope: scopeRef.current }),
        scopeRef,
      );
    } catch (err) {
      console.warn("[gsap] contexto falhou (página continua funcional):", err);
    }
    return () => {
      try {
        ctx?.revert();
      } catch {
        /* ignore */
      }
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return scopeRef;
}

export { gsap, ScrollTrigger };
