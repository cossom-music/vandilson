import Link from "next/link";
import HomeHero from "@/components/HomeHero";
import Reveal from "@/components/Reveal";
import { artist, homeHighlights, releases, socials } from "@/content";

export default function HomePage() {
  const latest = releases[0];

  return (
    <>
      <HomeHero />

      {/* Último lançamento */}
      <section className="relative mx-auto max-w-6xl px-6 py-24">
        <div className="grid items-center gap-12 md:grid-cols-2">
          <Reveal>
            <div
              className={`aspect-square w-full rounded-2xl bg-gradient-to-br ${latest.gradient} p-1 shadow-[0_0_80px_rgba(232,193,90,0.12)]`}
            >
              <div className="flex h-full w-full flex-col items-center justify-center gap-2 rounded-xl bg-night-900/80">
                <span className="text-xs uppercase tracking-[0.35em] text-gold-400">
                  {latest.type} · {latest.year}
                </span>
                <span className="px-6 text-center font-display text-3xl text-cream">
                  {latest.title}
                </span>
                <span className="mt-2 text-xs text-mist/60">capa oficial em breve</span>
              </div>
            </div>
          </Reveal>

          <div>
            <Reveal>
              <p className="text-xs uppercase tracking-[0.35em] text-gold-400">
                {homeHighlights.latest.label}
              </p>
              <h2 className="mt-3 font-display text-4xl text-cream md:text-5xl">
                {latest.title}
              </h2>
              <p className="mt-6 max-w-md leading-relaxed text-mist">
                {homeHighlights.latest.description}
              </p>
              <div className="mt-8 flex flex-wrap gap-4">
                {socials
                  .filter((s) => ["Spotify", "YouTube", "Apple Music"].includes(s.label))
                  .map((s) => (
                    <a
                      key={s.label}
                      href={s.url}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="rounded-full border border-white/15 px-6 py-2.5 text-sm text-cream transition-colors hover:border-gold-400 hover:text-gold-400"
                    >
                      {s.label}
                    </a>
                  ))}
              </div>
            </Reveal>
            <Reveal delay={0.15}>
              <div className="mt-10 h-px w-full bg-gradient-to-r from-gold-600/60 to-transparent" />
              <p className="mt-6 max-w-md leading-relaxed text-mist">
                {homeHighlights.bioTeaser}
              </p>
              <Link
                href="/sobre"
                className="mt-4 inline-block text-sm text-gold-400 underline-offset-4 hover:underline"
              >
                Ler biografia completa →
              </Link>
            </Reveal>
            <Reveal delay={0.25}>
              <p className="mt-10 text-xs text-mist/50">
                {artist.firstName} {artist.lastName} — {artist.tagline}
              </p>
            </Reveal>
          </div>
        </div>
      </section>
    </>
  );
}
