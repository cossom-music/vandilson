"use client";

/**
 * anime.js v4 (https://animejs.com) — helper centralizado.
 *
 * API v4: imports nomeados (`animate`, `stagger`, `createTimeline`, …),
 * durações/delays em milissegundos e easings como strings ("outQuad", "inOutExpo").
 * Documentação: https://animejs.com/documentation
 */
import { animate } from "animejs";

export { animate, stagger, createTimeline, utils } from "animejs";

/** Instância devolvida por `animate` (para `.cancel()`, `.pause()`, etc.). */
export type AnimationInstance = ReturnType<typeof animate>;

/** Respeita a preferência de movimento reduzido do utilizador. */
export function prefersReducedMotion(): boolean {
  return (
    typeof window !== "undefined" &&
    window.matchMedia("(prefers-reduced-motion: reduce)").matches
  );
}
