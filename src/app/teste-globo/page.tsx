"use client";

import GlassGlobe from "@/components/earth/GlassGlobe";
import { earthZoom } from "@/lib/earthZoom";

/**
 * Página de teste do globo de vidro Three.js — ecrã cheio, sem GSAP.
 * O botão simula o scroll para validar o dolly da câmara.
 */
export default function TesteGloboPage() {
  return (
    <main className="relative min-h-[100svh] bg-night-950 text-cream">
      <GlassGlobe className="h-[100svh] w-full" />

      {/* Controlo manual do dolly */}
      <div className="absolute bottom-6 left-1/2 z-20 flex -translate-x-1/2 flex-wrap justify-center gap-3">
        <button
          type="button"
          onClick={() => (earthZoom.progress.value = 0)}
          className="rounded-full border border-white/20 bg-night-900/80 px-5 py-2 text-sm backdrop-blur"
        >
          Câmara afastada
        </button>
        <button
          type="button"
          onClick={() => (earthZoom.progress.value = 0.5)}
          className="rounded-full border border-white/20 bg-night-900/80 px-5 py-2 text-sm backdrop-blur"
        >
          Meio mergulho
        </button>
        <button
          type="button"
          onClick={() => (earthZoom.progress.value = 1)}
          className="rounded-full bg-white px-5 py-2 text-sm font-medium text-night-950"
        >
          Dentro do globo
        </button>
      </div>
    </main>
  );
}
