"use client";

import { animate } from "@/lib/anime";
import { useSiteContent } from "@/components/SiteContentProvider";
import { useEffect, useRef } from "react";

/**
 * Rodapé monocromático — sem newsletter (a conversão do site é conhecer o
 * artista, não captar e-mails). O contacto é o e-mail, em destaque tipográfico.
 */
export default function Footer() {
  const { artist, socials, contact } = useSiteContent();
  const emailRef = useRef<HTMLAnchorElement>(null);

  // anime.js v4 — sublinhado do e-mail desenha-se ao entrar no ecrã
  useEffect(() => {
    if (typeof window === "undefined") return;
    if (window.matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const el = emailRef.current;
    if (!el) return;

    const observer = new IntersectionObserver(
      ([entry]) => {
        if (!entry.isIntersecting || !el) return;
        animate(el, {
          opacity: [0, 1],
          y: [12, 0],
          duration: 700,
          ease: "outExpo",
        });
        observer.disconnect();
      },
      { threshold: 0.3 },
    );
    observer.observe(el);
    return () => observer.disconnect();
  }, []);

  return (
    <footer className="border-t border-white/5 bg-night-950">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-16 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-display text-2xl text-cream">{artist.name}</p>
          <p className="mt-2 max-w-md text-sm text-mist">{artist.tagline}</p>

          <p className="mt-8 text-xs uppercase tracking-[0.25em] text-silver-600">
            Contacto
          </p>
          <a
            ref={emailRef}
            href={`mailto:${contact.email}`}
            className="contact-email mt-2 inline-block font-display text-xl text-cream md:text-2xl"
          >
            {contact.email}
          </a>
        </div>

        <div className="flex flex-col gap-6 md:items-end">
          <nav className="flex gap-6">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-mist transition-colors hover:text-white"
              >
                {s.label}
              </a>
            ))}
          </nav>
          <p className="text-xs text-mist/60">
            © {new Date().getFullYear()} {artist.name}. Todos os direitos reservados.
          </p>
        </div>
      </div>
    </footer>
  );
}
