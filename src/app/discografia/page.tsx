import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import ReleasePlanet, { ReleasePlanetLinks } from "@/components/ReleasePlanet";
import { releases } from "@/content";

export const metadata: Metadata = {
  title: "Discografia",
  description:
    "Discografia de Vandilson Neto — singles, EPs e álbuns em todas as plataformas.",
};

export default function DiscografiaPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <SectionHeading eyebrow="Discografia" title="Discografia" />

      <p className="mt-4 max-w-xl text-mist">
        Ouça em todas as plataformas — cada canção é um ponto no mapa.
      </p>

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {releases.map((r, i) => (
          <Reveal key={r.title} delay={i * 0.08}>
            <article className="group">
              <div className="aspect-square w-full transition-transform duration-300 group-hover:-translate-y-2">
                <ReleasePlanet
                  index={i}
                  size="lg"
                  title={r.title}
                  type={r.type}
                  year={r.year}
                  className="h-full w-full"
                />
              </div>
              <ReleasePlanetLinks />
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-16 rounded-2xl border border-white/10 bg-night-900/60 p-8 text-center">
          <p className="font-display text-2xl text-cream">Player completo em breve</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-mist">
            Aqui ficará o embed oficial do Spotify/YouTube do artista. Os links acima já levam
            às plataformas.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
