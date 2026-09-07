import HomeIntro from "@/components/home/HomeIntro";
import AnimeReveal from "@/components/home/AnimeReveal";
import RevealTitle from "@/components/home/RevealTitle";
import { homeSections, contact } from "@/content";

export default function HomePage() {
  return (
    <>
      {/* Ato 1–2 — globo (mergulho → fade out) e Discografia (fade in), num viewport fixo */}
      <HomeIntro />

      {/* Ato 3 — Contacto: apenas o e-mail, sem página própria */}
      <section
        id="home-contact"
        className="relative border-t border-white/5 bg-night-950 py-28 md:py-40"
      >
        {/* Luz prateada subtil no fundo (continuidade monocromática) */}
        <div className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_60%_45%_at_50%_105%,rgba(198,202,208,0.08)_0%,rgba(74,78,86,0.04)_45%,transparent_70%)]" />

        <div className="relative mx-auto max-w-6xl px-6">
          <AnimeReveal>
            <p className="text-xs uppercase tracking-[0.35em] text-silver-500">
              {homeSections.contact.eyebrow}
            </p>
          </AnimeReveal>

          <RevealTitle
            text={homeSections.contact.title}
            className="mt-3 font-display text-6xl leading-none text-white md:text-8xl"
          />

          <AnimeReveal delay={150}>
            <p className="mt-8 max-w-xl leading-relaxed text-mist">
              {homeSections.contact.intro}
            </p>
          </AnimeReveal>

          <AnimeReveal delay={250}>
            <a
              href={`mailto:${contact.email}`}
              className="contact-email mt-10 inline-block font-display text-2xl text-white md:text-4xl"
            >
              {contact.email}
            </a>
          </AnimeReveal>
        </div>
      </section>
    </>
  );
}
