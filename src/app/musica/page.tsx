import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import { releases, socials } from "@/content";

export const metadata: Metadata = {
  title: "Música",
  description:
    "Discografia de Vandilson Neto — singles, EPs e álbuns em todas as plataformas.",
};

export default function MusicaPage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <SectionHeading eyebrow="Discografia" title="Música" />

      <p className="mt-4 max-w-xl text-mist">
        Ouça em todas as plataformas — cada canção é um ponto no mapa.
      </p>

      <div className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-4">
        {releases.map((r, i) => (
          <Reveal key={r.title} delay={i * 0.08}>
            <article className="group">
              <div
                className={`aspect-square w-full rounded-2xl bg-gradient-to-br ${r.gradient} p-1 transition-transform duration-300 group-hover:-translate-y-2`}
              >
                <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-night-900/80">
                  <span className="text-xs uppercase tracking-[0.3em] text-gold-400">
                    {r.type} · {r.year}
                  </span>
                  <span className="px-4 text-center font-display text-2xl text-cream">
                    {r.title}
                  </span>
                </div>
              </div>
              <div className="mt-4 flex gap-3 text-xs text-mist">
                <a
                  href={socials.find((s) => s.label === "Spotify")?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400"
                >
                  Spotify
                </a>
                <span className="text-white/20">·</span>
                <a
                  href={socials.find((s) => s.label === "YouTube")?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400"
                >
                  YouTube
                </a>
                <span className="text-white/20">·</span>
                <a
                  href={socials.find((s) => s.label === "Apple Music")?.url}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="hover:text-gold-400"
                >
                  Apple Music
                </a>
              </div>
            </article>
          </Reveal>
        ))}
      </div>

      <Reveal delay={0.2}>
        <div className="mt-16 rounded-2xl border border-white/10 bg-night-900/60 p-8 text-center">
          <p className="font-display text-2xl text-cream">
            Player completo em breve
          </p>
          <p className="mx-auto mt-2 max-w-md text-sm text-mist">
            Aqui ficará o embed oficial do Spotify/YouTube do artista. Os links acima já levam
            às plataformas.
          </p>
        </div>
      </Reveal>
    </div>
  );
}
