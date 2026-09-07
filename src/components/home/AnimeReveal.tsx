"use client";

import { useEffect, useLayoutEffect, useRef, type ReactNode } from "react";
import { animate } from "@/lib/anime";

// Evita o aviso de SSR do useLayoutEffect mantendo o comportamento no browser
const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Revela o conteúdo ao entrar no viewport usando anime.js v4.
 * O conteúdo é renderizado visível (SEO/no-JS) e escondido antes do paint
 * apenas quando o JS corre e o movimento não é reduzido.
 */
export default function AnimeReveal({
  children,
  className,
  delay = 0,
  y = 28,
}: {
  children: ReactNode;
  className?: string;
  /** Atraso extra em ms, para efeitos cascata. */
  delay?: number;
  y?: number;
}) {
  const ref = useRef<HTMLDivElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;

    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    el.style.opacity = "0";

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            animate(el, {
              opacity: [0, 1],
              y: [y, 0],
              duration: 900,
              delay,
              ease: "outExpo",
            });
            break;
          }
        }
      },
      { threshold: 0.18, rootMargin: "0px 0px -8% 0px" },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [delay, y]);

  return (
    <div ref={ref} className={className}>
      {children}
    </div>
  );
}
