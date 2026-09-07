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
  // overflow-x-clip: o anel do 1.º planeta (150% da largura) sangra para
  // fora do viewport em mobile e criava overflow horizontal — clipamos na
  // borda do ecrã (mesmo padrão do HomeOutro). Em md+ o anel cabe no viewport.
  return (
    <div className="mx-auto max-w-6xl overflow-x-clip px-6 pb-24 pt-32 md:overflow-x-visible">
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
    </div>
  );
}
