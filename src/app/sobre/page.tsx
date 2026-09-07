import type { Metadata } from "next";
import SectionHeading from "@/components/SectionHeading";
import Reveal from "@/components/Reveal";
import { artist, shows } from "@/content";

export const metadata: Metadata = {
  title: "Sobre",
  description: "Biografia e percurso de Vandilson Neto.",
};

export default function SobrePage() {
  return (
    <div className="mx-auto max-w-6xl px-6 pb-24 pt-32">
      <SectionHeading eyebrow="Biografia" title="Sobre" />

      <div className="mt-14 grid gap-12 md:grid-cols-[1fr_1.4fr]">
        <Reveal>
          <div className="aspect-[3/4] w-full rounded-2xl bg-gradient-to-br from-night-800 to-night-950 p-1">
            <div className="flex h-full w-full items-center justify-center rounded-xl border border-white/5">
              <div className="text-center">
                <div className="mx-auto h-24 w-24 rounded-full bg-night-700" />
                <p className="mt-4 text-xs text-mist/60">{artist.photoAlt}</p>
              </div>
            </div>
          </div>
        </Reveal>

        <div className="space-y-6">
          {artist.longBio.map((p, i) => (
            <Reveal key={i} delay={i * 0.08}>
              <p className="leading-relaxed text-mist">{p}</p>
            </Reveal>
          ))}

          <Reveal delay={0.2}>
            <h3 className="pt-6 font-display text-2xl text-cream">Próximos shows</h3>
            <ul className="mt-4 divide-y divide-white/5">
              {shows.map((s) => (
                <li key={`${s.date}-${s.city}`} className="flex items-center justify-between py-4">
                  <div>
                    <p className="text-cream">
                      {s.date} — {s.city}
                    </p>
                    <p className="text-sm text-mist">{s.venue}</p>
                  </div>
                  <span
                    className={`rounded-full px-3 py-1 text-xs ${
                      s.status === "À venda"
                        ? "bg-silver-500/10 text-silver-300"
                        : s.status === "Esgotado"
                          ? "bg-red-500/10 text-red-400"
                          : "bg-white/5 text-mist"
                    }`}
                  >
                    {s.status}
                  </span>
                </li>
              ))}
            </ul>
          </Reveal>
        </div>
      </div>
    </div>
  );
}
