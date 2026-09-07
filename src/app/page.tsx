import HomeIntro from "@/components/home/HomeIntro";
import OrbitSystem from "@/components/home/OrbitSystem";
import AnimeReveal from "@/components/home/AnimeReveal";
import RevealTitle from "@/components/home/RevealTitle";
import SobrePanels from "@/components/SobrePanels";
import StarField from "@/components/home/StarField";
import { homeSections, contact } from "@/content";

export default function HomePage() {
  return (
    <>
      {/* Campo estelar global — um canvas fixo atrás de todo o conteúdo,
          subtil em toda a página; os reforços locais vivem nas secções. */}
      <StarField />

      {/* Ato 1–2 — globo (mergulho → fade out) e Discografia (fade in), num viewport fixo */}
      <HomeIntro />

      {/*
        Ato 3 — Sintonia. A secção fica *sticky*: quando o utilizador chega
        ao fim dela, ela "para" no ecrã e a secção seguinte (Sobre + Agenda)
        sobe por cima — o efeito de painéis sobrepostos, em vez de a página
        parecer descer.
      */}
      <section
        id="home-contact"
        className="sticky top-0 z-0 border-t border-white/5 bg-night-950 py-24 md:py-32"
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
        Ato 4 — Sobre + Agenda. Com fundo sólido e z-index acima da Sintonia,
        esta secção *sobe por cima* da Sintonia parada — o scroll parece
        trazer a próxima secção para cima, e não a página descer.
      */}
      <section className="relative z-10 bg-night-950 pt-24 md:pt-32">
        <div className="mx-auto max-w-6xl px-6 pb-28">
          <SobrePanels />
        </div>
      </section>
    </>
  );
}
