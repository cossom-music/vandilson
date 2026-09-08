"use client";

import { useMemo } from "react";
import { useSiteContent } from "@/components/SiteContentProvider";

/**
 * ReleasePlanet — um lançamento como um PLANETA SÓLIDO:
 *
 *   · corpo SÓLIDO com um tom mínimo próprio (aços frios/quentes muito
 *     dessaturados — nada de cores vivas, a paleta continua prata/preto);
 *   · CONTINENTES em dot-matrix (o mesmo motivo do globo do herói),
 *     únicos por planeta — gerados de forma determinística a partir do
 *     nome (sem Math.random → SSR e cliente idênticos, zero hidratação);
 *   · DIMENSÕES IGUAIS: todos os planetas partilham o mesmo diâmetro
 *     (a variabilidade ficou apenas no tom, continentes e luz);
 *   · iluminação: terminador escuro do lado oposto à luz + limbo prateado;
 *   · rotação lenta contínua dos continentes (duração e sentido próprios);
 *   · anel (tipo Saturno) no lançamento mais recente — desenhado em duas
 *     metades para ENVELOPAR o planeta: a parte de trás fica atrás do
 *     corpo, a parte da frente passa à frente (como na realidade).
 */
export default function ReleasePlanet({
  title,
  year,
  type,
  index,
  image = null,
  size = "md",
  className = "",
}: {
  title: string;
  year: string;
  type: string;
  index: number;
  /** URL da capa real — quando existe, a capa vira a superfície do planeta. */
  image?: string | null;
  /** md = homepage (pilha), lg = página /discografia */
  size?: "md" | "lg";
  className?: string;
}) {
  // Distintividade determinística — cada planeta é único, mas o SSR e o
  // cliente geram exatamente os mesmos valores.
  const planet = useMemo(() => {
    let h = 0;
    for (let i = 0; i < title.length; i++) h = (h * 31 + title.charCodeAt(i)) >>> 0;
    // LCG determinístico a partir do hash — sequência estável
    let s = h || 1;
    const rand = () => {
      s = (s * 1664525 + 1013904223) >>> 0;
      return s / 4294967296;
    };

    // Tom sólido mínimo — 4 aços dessaturados, todos escuros e "site"
    const tints = ["#232a33", "#2a2825", "#22282a", "#282530"];
    const tint = tints[Math.floor(rand() * tints.length)];

    // Continentes: 4–6 blobs, cada um um aglomerado de pontos dot-matrix
    const blobs = 4 + Math.floor(rand() * 3);
    const dots: { x: number; y: number; r: number }[] = [];
    for (let b = 0; b < blobs; b++) {
      const cx = 12 + rand() * 76; // % do mapa
      const cy = 18 + rand() * 64;
      const spread = 7 + rand() * 13; // raio do continente em %
      const count = 14 + Math.floor(rand() * 16);
      for (let d = 0; d < count; d++) {
        // Distribuição gaussiana aproximada (soma de 2 uniformes)
        const gx = (rand() + rand() - 1) * spread;
        const gy = (rand() + rand() - 1) * spread * 0.75;
        const x = cx + gx;
        const y = cy + gy;
        if (x < 3 || x > 97 || y < 5 || y > 95) continue;
        dots.push({
          x: Math.round(x * 10) / 10,
          y: Math.round(y * 10) / 10,
          r: Math.round((0.9 + rand() * 0.9) * 100) / 100,
        });
      }
    }

    return {
      tint,
      dots,
      // Ângulo da luz (terminador): a luz vem de direções diferentes
      lightDeg: 200 + rand() * 140,
      // Rotação inicial dos continentes
      spotRot: Math.round(rand() * 360),
      // Duração da rotação: 60–110 s — lenta, meditativa, própria
      spinDuration: 60 + rand() * 50,
      // Direção da rotação
      spinReverse: rand() > 0.6,
    };
  }, [title]);

  // O anel (tipo Saturno) fica no lançamento mais recente — index 0
  const hasRing = index === 0;

  // Iluminação estática: brilho do lado da luz, sombra no terminador.
  const shade = `radial-gradient(circle at ${Math.round(planet.lightDeg)}deg, rgba(255,255,255,0.10) 0%, rgba(255,255,255,0.03) 30%, rgba(0,0,0,0) 48%, rgba(0,0,0,0.42) 82%, rgba(0,0,0,0.6) 100%)`;

  return (
    <div className={`group relative flex items-center justify-center ${className}`}>
      {/* ── Anel — metade de TRÁS (fica atrás do corpo do planeta) ── */}
      {hasRing && (
        <span
          aria-hidden="true"
          className="planet-ring planet-ring--back pointer-events-none absolute left-1/2 top-1/2 z-0 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}

      {/* O planeta — corpo SÓLIDO no tom próprio, dimensão fixa.
          Com capa real (image): a capa enche o disco (object-cover) e os
          continentes dot-matrix ficam ocultos — a iluminação/terminador
          mantém-se por cima para o planeta continuar a "assentar" no site. */}
      <div
        className="planet-body relative z-10 flex aspect-square items-center justify-center overflow-hidden rounded-full"
        style={{
          background: planet.tint,
          boxShadow: `0 0 ${size === "lg" ? 26 : 16}px rgba(198,202,208,0.18), inset 0 0 ${size === "lg" ? 20 : 12}px rgba(0,0,0,0.45)`,
        }}
      >
        {/* Continentes em dot-matrix — rotação lenta contínua (GPU) */}
        {!image && (
          <svg
            aria-hidden="true"
            className={`planet-spots pointer-events-none absolute inset-0 h-full w-full ${planet.spinReverse ? "planet-spin-reverse" : "planet-spin"}`}
            viewBox="0 0 100 100"
            preserveAspectRatio="none"
            style={{
              transform: `rotate(${planet.spotRot}deg)`,
              animationDuration: `${planet.spinDuration.toFixed(0)}s`,
              animationDelay: `${((-planet.spotRot / 360) * planet.spinDuration).toFixed(1)}s`,
            }}
          >
            {planet.dots.map((d, i) => (
              <circle
                key={i}
                cx={d.x}
                cy={d.y}
                r={d.r}
                fill="rgba(216,219,224,0.22)"
              />
            ))}
          </svg>
        )}

        {/* Capa real — enche o disco quando existe imagem */}
        {image && (
          // eslint-disable-next-line @next/next/no-img-element -- capas de utilizador no CMS; next/image exige domínios configurados
          <img
            src={image}
            alt={`Capa de ${title}`}
            className="pointer-events-none absolute inset-0 h-full w-full object-cover"
            loading="lazy"
          />
        )}

        {/* Terminador + limbo — estático (a luz não gira com o planeta) */}
        <span
          aria-hidden="true"
          className="pointer-events-none absolute inset-0 rounded-full"
          style={{
            background: shade,
            boxShadow: `inset 0 0 ${size === "lg" ? 14 : 8}px rgba(232,236,242,0.25)`,
          }}
        />

        {/* Texto — centralizado, legível sobre o corpo sólido */}
        <div className="relative z-10 flex flex-col items-center gap-1 px-3 text-center">
          <span className="text-[10px] uppercase tracking-[0.3em] text-silver-400">
            {type} · {year}
          </span>
          <span
            className={`font-display text-white ${size === "lg" ? "text-2xl" : "text-base md:text-lg"}`}
            style={{ textShadow: "0 1px 8px rgba(0,0,0,0.6)" }}
          >
            {title}
          </span>
        </div>
      </div>

      {/* ── Anel — metade da FRENTE (passa À FRENTE do corpo) ── */}
      {hasRing && (
        <span
          aria-hidden="true"
          className="planet-ring planet-ring--front pointer-events-none absolute left-1/2 top-1/2 z-20 opacity-70 transition-opacity duration-300 group-hover:opacity-100"
        />
      )}
    </div>
  );
}

/** Links de plataformas (usados na página /discografia, por baixo do planeta). */
export function ReleasePlanetLinks() {
  const { socials } = useSiteContent();
  const urlFor = (label: string) => socials.find((s) => s.label === label && s.visible !== false)?.url ?? "#";

  return (
    <div className="mt-4 flex gap-3 text-xs text-mist">
      {["Spotify", "YouTube", "Apple Music"].map((label) => (
        <span key={label} className="flex items-center gap-3">
          {label !== "Spotify" && <span className="text-white/20">·</span>}
          <a
            href={urlFor(label)}
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
