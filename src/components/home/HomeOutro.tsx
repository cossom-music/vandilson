"use client";

import { useGsapContext, ScrollTrigger } from "@/lib/gsap";
import OrbitSystem from "@/components/home/OrbitSystem";
import AnimeReveal from "@/components/home/AnimeReveal";
import RevealTitle from "@/components/home/RevealTitle";
import SobrePanels from "@/components/SobrePanels";
import { useSiteContent } from "@/components/SiteContentProvider";

/**
 * Fim da homepage — dois painéis empilhados:
 *
 *   · SINTONIA é PINADA no topo do ecrã quando lá chega (GSAP ScrollTrigger,
 *     `pin: true` — position: fixed gerido pelo GSAP, imune às fragilidades
 *     do position: sticky com overflow em ancestrais);
 *   · SOBRE + AGENDA sobe por cima: `pinSpacing: false` não adiciona o
 *     espaçador habitual, por isso a secção seguinte desliza sobre a secção
 *     pinada em vez de a empurrar para baixo;
 *   · o pin solta exatamente quando o topo da Sobre atinge o topo do ecrã —
 *     a Sintonia está nessa altura totalmente coberta, e a transição de
 *     volta para o fluxo é impercetível (as posições coincidem).
 *
 * O resultado é o que foi pedido: o topo da Sintonia fica FIXO no topo da
 * tela e é a secção seguinte que sobe até o cobrir por completo.
 * prefers-reduced-motion: sem pin — as secções fluem normalmente.
 */
export default function HomeOutro() {
  const { homeSections, contact } = useSiteContent();
  const scopeRef = useGsapContext(({ reduced, scope }) => {
    if (!scope || reduced) return;
    const sintonia = scope.querySelector<HTMLElement>("[data-sintonia]");
    const sobre = scope.querySelector<HTMLElement>("[data-sobre]");
    if (!sintonia || !sobre) return;

    ScrollTrigger.create({
      trigger: sintonia,
      start: "top top", // fixa quando o topo da secção chega ao topo do ecrã
      endTrigger: sobre,
      end: "top top", // solta quando a Sobre cobre o ecrã inteiro
      pin: true,
      pinSpacing: false,
      anticipatePin: 1,
    });
  }, []);

  return (
    <div ref={scopeRef}>
      {/*
        Ato 3 — Sintonia: o artista no centro, as redes em órbita, o e-mail
        como booking. FICARÁ FIXA no topo pelo pin do ScrollTrigger.
      */}
      <section
        id="home-contact"
        data-sintonia
        className="relative overflow-x-clip border-t border-white/5 bg-night-950 py-24 md:py-32"
      >
        {/* Reforço estelar local — atrás do sistema de órbitas */}
        <div
          aria-hidden="true"
          className="star-layer star-layer--orbit pointer-events-none absolute inset-0"
        />
        <div className="relative mx-auto max-w-6xl px-6">
          <AnimeReveal className="text-center">
            <p className="text-xs uppercase tracking-[0.35em] text-silver-500">
              {homeSections.contact.eyebrow}
            </p>
          </AnimeReveal>

          <RevealTitle
            text={homeSections.contact.title}
            className="mt-3 text-center font-display text-4xl leading-none text-white md:text-6xl"
          />

          {/* Sistema de órbitas — uma rede por anel, sol prateado ao centro */}
          <div className="mt-4 md:mt-6">
            <OrbitSystem />
          </div>

          {/* Booking — o e-mail continua a ser o ponto de contacto */}
          <AnimeReveal delay={200} className="mt-2 text-center">
            <p className="text-[10px] uppercase tracking-[0.35em] text-silver-700">
              Booking · Imprensa · Colaborações
            </p>
            <a
              href={`mailto:${contact.email}`}
              className="contact-email mt-3 inline-block font-display text-2xl text-white md:text-4xl"
            >
              {contact.email}
            </a>
          </AnimeReveal>
        </div>
      </section>

      {/*
        Ato 4 — Sobre + Agenda. Fundo sólido + z-index acima: sobe POR CIMA
        da Sintonia fixada — o scroll traz a próxima secção para cima.
        .rise-shadow projeta uma sombra para cima a partir do topo, para a
        fronteira com a Sintonia (mesma cor de fundo) ficar legível.
      */}
      <section
        data-sobre
        className="rise-shadow relative z-10 bg-night-950 pt-24 md:pt-32"
      >
        <div className="mx-auto max-w-6xl px-6 pb-28">
          <SobrePanels />
        </div>
      </section>
    </div>
  );
}
