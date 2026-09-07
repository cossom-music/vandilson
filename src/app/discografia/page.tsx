import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import ReleaseRow from "@/components/ReleaseRow";
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
        Um lançamento por fila — com tracklist, curiosidades e ficha técnica ao
        lado. Ouça em todas as plataformas: cada canção é um ponto no mapa.
      </p>

      <div className="mt-14 flex flex-col gap-6">
        {releases.map((r, i) => (
          <Reveal key={r.title} delay={i * 0.06}>
            <ReleaseRow release={r} index={i} />
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-16 rounded-2xl border border-white/10 bg-night-900/60 p-8 text-center">
          <p className="font-display text-2xl text-cream">Player completo em breve</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-mist">
            Aqui ficará o embed oficial do Spotify/YouTube do artista. Os links
            acima já levam às plataformas.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
