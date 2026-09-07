"use client";

import { useEffect, useLayoutEffect, useRef } from "react";
import { animate, stagger } from "@/lib/anime";

const useIsoLayoutEffect = typeof window !== "undefined" ? useLayoutEffect : useEffect;

/**
 * Título dividido em palavras, reveladas palavra a palavra com
 * anime.js v4 (`stagger`) quando entra no viewport.
 */
export default function RevealTitle({
  text,
  className,
}: {
  text: string;
  className?: string;
}) {
  const ref = useRef<HTMLHeadingElement>(null);

  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el) return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;

    const words = el.querySelectorAll<HTMLElement>("[data-word]");
    words.forEach((w) => (w.style.opacity = "0"));

    const io = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            io.disconnect();
            animate(words, {
              opacity: [0, 1],
              y: [26, 0],
              rotateX: [-35, 0],
              duration: 850,
              delay: stagger(90),
              ease: "outExpo",
            });
            break;
          }
        }
      },
      { threshold: 0.3 },
    );
    io.observe(el);
    return () => io.disconnect();
  }, [text]);

  return (
    <h2 ref={ref} className={className}>
      {text.split(" ").map((word, i) => (
        <span key={`${word}-${i}`} data-word className="inline-block will-change-transform">
          {word}
          {i < text.split(" ").length - 1 ? "\u00A0" : ""}
        </span>
      ))}
    </h2>
  );
}
