"use client";

import { useMemo } from "react";
import { socials } from "@/content";

/**
 * ReleasePlanet — um lançamento como um PLANETA: círculo com corpo de vidro
 * escuro e limbo prateado (a mesma assinatura do sol da Sintonia e do
 * eclipse do Sobre), mas cada planeta é diferente:
 *
 *   · tamanho próprio (planetas não têm todos o mesmo raio);
 *   · fase do limbo própria (a luz vem de ângulos diferentes);
 *   · anel opcional (tipo Saturno) — o mais recente leva anel;
 *   · manchas de superfície únicas, geradas de forma determinística a partir
 *     do nome (sem Math.random → sem desvio de hidratação).
 *
 * Usado na homepage (pilha de planetas) e na página /discografia.
 */
export default function ReleasePlanet({
  title,
  year,
  type,
  index,
  size = "md",
  className = "",
}: {
  title: string;
  year: string;
  type: string;
  index: number;
  /** md = homepage (pilha), lg = página /discografia */
  size?: "md" | "lg";
  className?: string;
}) {
  // Distintividade determinística — cada planeta é único, mas o SSR e o
  // cliente geram exatamente os mesmos valores (sem Math.random).
  const planet = useMemo(() => {
    let h = 0;
    for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    const rand = (slot: number) => ((h >> (slot * 5)) % 1000) / 1000;
    return {
      // Diâmetro relativo: entre 78% e 100% do tamanho da célula
      sizePct: 78 + rand(0) * 22,
      // Ângulo da luz (fase do limbo): a luz vem de direções diferentes
      lightDeg: 200 + rand(1) * 140,
      // Rotação das manchas de superfície
      spotRot: rand(2) * 360,
      // Intensidade do limbo (0.55–0.95)
      rimStrength: 0.55 + rand(3) * 0.4,
      // Duração da rotação da superfície: 60–110 s — lenta, meditativa,
      // e diferente por planeta (como dias de duração distintos)
      spinDuration: 60 + rand(4) * 50,
      // Direção da rotação (planetas reais giram em sentidos diferentes)
      spinReverse: rand(5) > 0.6,
    };
  }, [title]);

  // O anel (tipo Saturno) fica no lançamento mais recente — index 0
  const hasRing = index === 0;

  const body = `radial-gradient(circle at ${Math.round(planet.lightDeg)}deg, rgba(13,15,18,0.95) 0%, rgba(13,15,18,0.75) 48%, rgba(198,202,208,${(0.28 * planet.rimStrength).toFixed(3)}) 76%, rgba(232,236,242,${(0.9 * planet.rimStrength).toFixed(3)}) 97%, rgba(255,255,255,${planet.rimStrength.toFixed(3)}) 100%)`;

  return (
    <div className={`group relative ${className}`}>
      {/* Anel — elipse tracejada que atravessa o planeta (o mais recente) */}
      {hasRing && (
        <span
          aria-hidden="true"
          className="planet-ring pointer-events-none absolute left-1/2 top-1/2 z-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}

      {/* O planeta */}
      <div
        className="relative z-10 mx-auto flex aspect-square items-center justify-center rounded-full"
        style={{
          width: `${planet.sizePct.toFixed(1)}%`,
          background: body,
          boxShadow: `0 0 ${size === "lg" ? 26 : 16}px rgba(198,202,208,${(0.14 + planet.rimStrength * 0.12).toFixed(3)}), inset 0 0 ${size === "lg" ? 18 : 10}px rgba(0,0,0,0.55)`,
        }}
      >
        {/* Manchas de superfície — textura única, em rotação lenta contínua
            (composited: só transform, custo ~zero). O delay negativo faz
            cada planeta começar num ponto diferente da sua rotação. */}
        <span
          aria-hidden="true"
          className={`planet-spots pointer-events-none absolute inset-0 rounded-full ${planet.spinReverse ? "planet-spin-reverse" : "planet-spin"}`}
          style={{
            transform: `rotate(${Math.round(planet.spotRot)}deg)`,
            animationDuration: `${planet.spinDuration.toFixed(0)}s`,
            animationDelay: `${(-planet.spotRot / 360 * planet.spinDuration).toFixed(1)}s`,
          }}
        />

        {/* Texto — centralizado, legível sobre o corpo escuro */}
        <div className="relative z-10 flex flex-col items-center gap-1 px-3 text-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-silver-500">
            {type} · {year}
          </span>
          <span
            className={`font-display text-white ${size === "lg" ? "text-2xl" : "text-base md:text-lg"}`}
          >
            {title}
          </span>
        </div>
      </div>
    </div>
  );
}

/** Links de plataformas (usados na página /discografia, por baixo do planeta). */
export function ReleasePlanetLinks() {
  return (
    <div className="mt-4 flex gap-3 text-xs text-mist">
      {["Spotify", "YouTube", "Apple Music"].map((label) => (
        <span key={label} className="flex items-center gap-3">
          {label !== "Spotify" && <span className="text-white/20">·</span>}
          <a
            href={socials.find((s) => s.label === label)?.url}
            target="_blank"
            rel="noopener noreferrer"
            className="transition-colors hover:text-white"
          >
            {label}
          </a>
        </span>
      ))}
    </div>
  );
}
