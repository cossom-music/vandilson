"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { useSiteContent } from "@/components/SiteContentProvider";

/**
 * HUB DE ESCOLHA (Modelo 4 · Carta de Trajetória)
 *
 * Surge no fim da transição da variante dawn (homepage /): em vez de revelar
 * a secção seguinte (Discografia), apresenta os destinos como WAYPOINTS numa
 * rota pontilhada
 * numa carta de trajetória — o usuário escolhe para onde navegar.
 *
 * Elementos (do modelo aprovado em _temp/design-demos/choice-hub-modelos.html):
 *   · rota SVG pontilhada com CURVAS ACENTUADAS (não uma reta diagonal);
 *   · marcador "TU ESTÁS AQUI" no início da rota;
 *   · cada destino = waypoint (anel + nome + coordenada fictícia α/β/γ);
 *   · destinos alimentados do CMS quando possível (Discografia/Agenda/Sintonia
 *     com contagens reais de lançamentos e shows futuros);
 *   · prefer-reduced-motion: rota e marcadores aparecem sem animação.
 *
 * Os waypoints são os mesmos destinos do site: /discografia (rota interna),
 * #home-contact (Sintonia, na própria homepage) e a agenda (#home-contact —
 * a Agenda vive na secção Sobre, que sobe por cima da Sintonia).
 */

/**
 * HUB DE ESCOLHA (Modelo 4 · Carta de Trajetória) — SEM LINHAS.
 * Apenas os planetas-destino posicionados na carta, por ordem de leitura:
 * 1º Ouvir (topo-direita), 2º Sintonia (esquerda), 3º Biografia
 * (baixo-direita), 4º Agenda (baixo-centro) — mais o ponto de partida
 * "TU ESTÁS AQUI".
 */
type Waypoint = {
  href: string;
  name: string;
  coord: string;
  sub?: string;
  accent?: boolean;
  /** Posição em coordenadas do viewBox 100×160 — a rota passa exatamente aqui. */
  x: number;
  y: number;
  /** Tamanho do mini-planeta do waypoint (px) — maior = mais peso no rumo. */
  size: number;
  /** Cores do mini-planeta (radial-gradient, luz vinda de cima-esquerda). */
  planet: string;
  /** Lado da etiqueta relativamente ao planeta — "left" nos waypoints
   *  encostados à borda direita, para a etiqueta nunca sair do ecrã. */
  side?: "left" | "right";
  /** Posição x alternativa para MOBILE (largura < 768px) — puxa o
   *  waypoint para a direita/centro em ecrãs estreitos. */
  mobileX?: number;
};

/**
 * Waypoints — SEM linhas (removidas a pedido). A ordem de leitura é
 * 1º Ouvir, 2º Sintonia, 3º Biografia, 4º Agenda: Sintonia ocupa a
 * posição da esquerda (onde estava a Biografia), Biografia a de
 * baixo-direita (onde estava a Agenda) e Agenda a de baixo-centro
 * (onde estava a Sintonia). Ouvir mantém o topo-direita.
 */
/**
 * Espaçamento VERTICAL UNIFORME: os 4 planetas distribuídos em alturas
 * EQUIDISTANTES (y = 46, 78, 110, 142 — passo de 32 unidades). As posições
 * x alternam esquerda/direita em ziguezague, mas a altura é igual entre
 * todos — é isto que dá o ritmo uniforme de leitura.
 */
const WAYPOINTS: Waypoint[] = [
  {
    // Ouvir = a secção da própria homepage (não a página /discografia)
    href: "#home-music", name: "Ouvir", coord: "os lançamentos",
    x: 78, y: 46, size: 30,
    // Planeta azul-prateado (consistente com os planetas da Discografia)
    planet: "radial-gradient(circle at 32% 28%, #b8c4dd 0%, #5a6a8a 42%, #10141f 82%)",
  },
  {
    // Planeta à DIREITA do texto (side: "left" inverte a ordem da row)
    href: "#home-contact", name: "Sintonia", coord: "contacto",
    // Mobile: encostada mais à direita (40) — desktop mantém 22
    // Mesma dimensão da Biografia/Agenda (24)
    x: 22, mobileX: 40, y: 78, size: 24, side: "left",
    // Planeta prateado pequeno
    planet: "radial-gradient(circle at 32% 28%, #e8ecf2 0%, #9aa3b2 46%, #23262c 86%)",
  },
  {
    href: "#home-biografia", name: "Biografia", coord: "a história",
    x: 78, y: 110, size: 24, side: "left",
    // Planeta âmbar — eco do dawn (o acento da variante)
    planet: "radial-gradient(circle at 32% 28%, #ffe6c0 0%, #d99a4e 44%, #2a1706 84%)",
  },
  {
    // Agenda → o PAINEL da agenda (#home-agenda), não o topo da secção Sobre
    // Mobile: encostada mais à direita (40) — desktop mantém 22
    href: "#home-agenda", name: "Agenda", coord: "em cena", accent: true,
    x: 22, mobileX: 40, y: 142, size: 24,
    // Planeta dourado — o show é o acento quente da carta
    planet: "radial-gradient(circle at 32% 28%, #ffe9c8 0%, #ffb65e 40%, #3a2208 84%)",
  },
];

/**
 * NOTA DE ARQUITETURA — dois palcos sticky:
 * Na dawn a página tem DOIS palcos sticky irmãos: o do herói (globo → hub
 * de escolha) e o da Ouvir. A secção Ouvir (#home-music) é REAL no fluxo
 * do documento, por isso a âncora nativa funciona: ao clicar, o browser
 * desce até ao palco dela e a timeline GSAP do palco anima a pilha com o
 * scroll — sem JavaScript de navegação.
 */

export default function ChoiceHub() {
  const rootRef = useRef<HTMLDivElement>(null);
  const [revealed, setRevealed] = useState(false);
  const [isMobile, setIsMobile] = useState(false);
  const waypoints = WAYPOINTS;

  // MOBILE (largura < 768px): usa mobileX de cada waypoint (posição
  // alternativa para ecrãs estreitos). Atualiza ao rodar/resize.
  useEffect(() => {
    const mq = window.matchMedia("(max-width: 767px)");
    const apply = () => setIsMobile(mq.matches);
    apply();
    mq.addEventListener("change", apply);
    return () => mq.removeEventListener("change", apply);
  }, []);

  // Entrada: os planetas surgem em sequência — respeitando reduced motion.
  useEffect(() => {
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) {
      setRevealed(true);
      return;
    }
    const t = setTimeout(() => setRevealed(true), 400);
    return () => clearTimeout(t);
  }, []);

  return (
    <div
      ref={rootRef}
      className="relative mx-auto flex h-full w-full max-w-6xl flex-col items-center justify-center px-6 pt-24 md:pt-28"
    >
      {/* Eyebrow + título — no FLUXO (não absolute): nunca sai do ecrã,
          mesmo em desktops baixos onde a carta ocupa quase toda a altura. */}
      <div className="pointer-events-none shrink-0 text-center">
        <p className="text-[10px] uppercase tracking-[0.35em] text-silver-700">
          Carta de trajetória
        </p>
        <h2 className="mt-2 font-display text-4xl leading-none text-white md:text-5xl">
          Rota seguinte
        </h2>
      </div>

      {/* A carta — SEMPRE dentro da largura do ecrã: max-w limita pelo lado
          horizontal (o bug do mobile: aspect-100/160 com h-76% dava mapa de
          386px num ecrã de 375px), e flex-1 dá-lhe a altura restante. */}
      <div className="relative mt-4 aspect-[100/160] h-auto max-h-full w-full max-w-[min(100%,56svh)] flex-1 min-h-0">
        {/* SEM SVG — só os planetas posicionados sobre a carta. */}

        {/* Partida — "TU ESTÁS AQUI" como PLANETA (o ponto de partida
            da leitura), com etiqueta à direita. Mobile: encostado mais à
            direita (22%) para respirar da borda esquerda. */}
        <span
          className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2"
          style={{ left: isMobile ? "22%" : "12%", top: "15%" }}
        >
          <span
            className="relative block h-[16px] w-[16px] rounded-full"
            style={{
              background:
                "radial-gradient(circle at 32% 28%, #f2f5f9 0%, #aeb6c2 45%, #2c3037 85%)",
              boxShadow: "-4px 3px 8px rgba(0,0,0,0.7), 0 0 10px rgba(255,255,255,0.14)",
            }}
          />
          <span className="whitespace-nowrap text-[10px] tracking-[0.24em] text-silver-500">
            TU ESTÁS AQUI
          </span>
        </span>

        {/* Waypoints — botões reais (navegação) */}
        {waypoints.map((wp, i) => (
          <Link
            key={wp.name}
            href={wp.href}
            aria-label={`Navegar para ${wp.name}`}
            className="group absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2.5"
            style={{
              left: `${(isMobile && wp.mobileX) || wp.x}%`,
              top: `${(wp.y / 160) * 100}%`,
              opacity: revealed ? 1 : 0,
              transform: `translate(-50%, -50%) translateY(${revealed ? 0 : 10}px)`,
              transition: `opacity 0.7s ease ${0.15 + i * 0.18}s, transform 0.7s cubic-bezier(0.22,1,0.36,1) ${0.15 + i * 0.18}s`,
              flexDirection: wp.side === "left" ? "row-reverse" : "row",
              textAlign: wp.side === "left" ? "right" : "left",
            }}
          >
            {/* Mini-planeta do waypoint — esfera com luz própria (como os
                planetas da Discografia), a crescer no hover. */}
            <span
              className="relative block shrink-0 rounded-full transition-transform duration-500 group-hover:scale-110"
              style={{
                width: wp.size,
                height: wp.size,
                background: wp.planet,
                boxShadow:
                  "-6px 5px 12px rgba(0,0,0,0.75), 0 0 14px rgba(255,255,255,0.10)",
              }}
            >
              {/* Anel orbital fino — eco da linguagem de órbitas do site.
                  ROTATION LENTA: o wrapper roda (duracao variável por
                  índice, direção alternada); o anel interno mantém a
                  inclinação/elipse, por isso a rotação é do conjunto. */}
              <span
                aria-hidden="true"
                className="absolute inset-0 rounded-full"
                style={{
                  animation: `orbit-spin ${9 + i * 3}s linear infinite ${i % 2 ? "reverse" : "normal"}`,
                }}
              >
                <span
                  className="absolute rounded-full border"
                  style={{
                    inset: -5,
                    borderColor: wp.accent
                      ? "rgba(255,182,94,0.30)"
                      : "rgba(169,173,181,0.18)",
                    transform: "rotate(-16deg) scaleY(0.34)",
                  }}
                />
              </span>
            </span>
            {/* Bloco de texto — alinhamento segue o LADO DO PLANETA:
                planeta à esquerda → texto alinhado à esquerda; planeta à
                direita → texto alinhado à direita. Em ambos os casos o
                bordo alinhado encosta ao planeta. */}
            <span style={{ textAlign: wp.side === "left" ? "right" : "left" }}>
              {/* Nome grande e legível — era text-[11px]/md:text-xs,
                  subiu para text-sm/md:text-base para as opções lerem-se
                  à primeira (o tap target também cresce com a fonte). */}
              <span className="block whitespace-nowrap text-sm uppercase tracking-[0.22em] text-white md:text-base">
                {wp.name}
              </span>
              <span className="mt-0.5 block whitespace-nowrap text-[10px] tracking-[0.1em] text-silver-700 md:text-[11px]">
                {wp.coord}
              </span>
            </span>
          </Link>
        ))}
      </div>

      {/* Hint do fundo */}
      <p className="pointer-events-none absolute bottom-5 left-0 right-0 text-center text-[9px] uppercase tracking-[0.3em] text-silver-700">
        define o rumo · missão 02
      </p>
    </div>
  );
}
