"use client";

import { animate } from "@/lib/anime";
import { useSiteContent } from "@/components/SiteContentProvider";
import { useEffect, useRef } from "react";
import { usePathname } from "next/navigation";

/**
 * Rodapé monocromático — sem newsletter (a conversão do site é conhecer o
 * artista, não captar e-mails). O contacto é o e-mail, em destaque tipográfico.
 */
export default function Footer() {
  const { artist, socials, contact } = useSiteContent();
  const emailRef = useRef<HTMLAnchorElement>(null);
  // O admin tem o seu próprio shell (AdminShell) — sem rodapé público.
  const isAdmin = usePathname().startsWith("/admin");

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

  if (isAdmin) return null;

  return (
    /* relative z-10: na homepage a Sintonia é pinada pelo GSAP (position:
       fixed) e, com a Agenda removida da secção Sobre, o pin já não chega
       a soltar antes do fim da página — sem isto, a Sintonia fixa pintava
       POR CIMA do footer estático. Sobre (z-10) e footer (z-10) cobrem-na
       como as restantes secções sólidas. */
    <footer className="relative z-10 border-t border-white/5 bg-night-950">
      {/* MOBILE — versão compacta própria: tudo em coluna única, respiros
          curtos e socials como pílulas centradas. O footer deixa de ser um
          bloco alto com muito vazio (o telemóvel não tem espaço a desperdiçar).
      */}
      <div className="px-6 pb-24 pt-10 md:hidden">
        <p className="text-center font-display text-xl text-cream">{artist.name}</p>
        <p className="mx-auto mt-1.5 max-w-xs text-center text-[13px] leading-relaxed text-mist">
          {artist.tagline}
        </p>

        <a
          ref={emailRef}
          href={`mailto:${contact.email}`}
          className="contact-email mt-5 block text-center font-display text-lg text-cream"
        >
          {contact.email}
        </a>

        {/* Socials — pílulas centradas, mais fáceis de tocar do que links soltos */}
        <nav className="mt-6 flex flex-wrap justify-center gap-2">
          {socials
            .filter((s) => s.visible !== false && s.url)
            .map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="rounded-full border border-white/10 px-4 py-1.5 text-[12px] text-mist transition-colors hover:border-white/30 hover:text-white"
              >
                {s.label}
              </a>
            ))}
        </nav>

        <p className="mt-6 text-center text-[11px] text-mist/50">
          © {new Date().getFullYear()} {artist.name}
        </p>
      </div>

      {/* DESKTOP — mesma estrutura, mais compacta: pt-12/pb-16 (antes
          pt-16/pb-28), respiros internos encurtados. O pb-16 mantém folga
          para o player «Em Órbita» fixo no fundo sem parecer vazio. */}
      <div className="mx-auto hidden max-w-6xl grid-cols-[1.2fr_1fr] gap-10 px-6 pb-16 pt-12 md:grid">
        <div>
          <p className="font-display text-2xl text-cream">{artist.name}</p>
          <p className="mt-2 max-w-md text-sm text-mist">{artist.tagline}</p>

          <p className="mt-6 text-xs uppercase tracking-[0.25em] text-silver-600">
            Contacto
          </p>
          <a
            href={`mailto:${contact.email}`}
            className="contact-email mt-1.5 inline-block font-display text-xl text-cream"
          >
            {contact.email}
          </a>
        </div>

        <div className="flex flex-col items-end justify-between gap-6">
          <nav className="flex gap-6">
            {socials
              .filter((s) => s.visible !== false && s.url)
              .map((s) => (
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
