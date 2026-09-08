"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { artist, contact } from "@/content";

const links = [
  { href: "/", label: "Início" },
  { href: "/discografia", label: "Discografia" },
];

const EASE = [0.16, 1, 0.3, 1] as const;

/**
 * Na homepage o header só aparece depois de o utilizador fazer scroll
 * (imersão total com o globo no arranque, como no animejs.com).
 * Nas restantes páginas está sempre visível.
 *
 * Menu mobile (md:hidden): takeover de ecrã inteiro "Órbita" — o artista
 * é o sol ao centro e as rotas orbitam-no, como na secção Sintonia.
 * Fechar: hamburger→X, ESC, ou tocar num link.
 */
export default function Header() {
  const pathname = usePathname();
  const [open, setOpen] = useState(false);
  const isHome = pathname === "/";
  const [scrolled, setScrolled] = useState(false);

  useEffect(() => {
    if (!isHome) return;
    const onScroll = () => setScrolled(window.scrollY > 24);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, [isHome]);

  // ESC fecha o drawer — e o scroll da página trava enquanto está aberto
  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setOpen(false);
    };
    document.addEventListener("keydown", onKey);
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prev;
    };
  }, [open]);

  const visible = !isHome || scrolled;

  // Sempre MONTADO e fixo no topo — só desliza para fora no topo da
  // homepage. Montar/desmontar (AnimatePresence) no primeiro scroll causava
  // um salto visível no mobile (e podia coincidir com o refresh do
  // ScrollTrigger) — agora é só transform + opacity, custo zero.
  return (
    <>
    <motion.header
      initial={{ y: -72, opacity: 0 }}
      animate={visible ? { y: 0, opacity: 1 } : { y: -72, opacity: 0 }}
      transition={{ duration: 0.55, ease: EASE }}
      className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-night-950/70 backdrop-blur-md"
      aria-hidden={!visible}
    >
      <div className="mx-auto flex h-16 max-w-6xl items-center justify-between px-6">
        <Link
          href="/"
          className="font-display text-lg tracking-wide text-cream transition-colors hover:text-white"
          onClick={() => setOpen(false)}
        >
          {artist.name}
        </Link>

        <nav className="hidden items-center gap-8 md:flex">
          {links.map((l) => {
            const active = pathname === l.href;
            return (
              <Link
                key={l.href}
                href={l.href}
                className={`text-sm tracking-wide transition-colors ${
                  active ? "text-white" : "text-mist hover:text-cream"
                }`}
              >
                {l.label}
                {active && (
                  <motion.span
                    layoutId="nav-underline"
                    className="mt-1 block h-px bg-silver-300"
                  />
                )}
              </Link>
            );
          })}
        </nav>

        <button
          type="button"
          aria-label={open ? "Fechar menu" : "Abrir menu"}
          aria-expanded={open}
          onClick={() => setOpen((v) => !v)}
          className="relative z-50 flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
        >
          <span
            className={`h-px w-6 bg-cream transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
          />
          <span
            className={`h-px w-6 bg-cream transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
          />
        </button>
      </div>
    </motion.header>

    {/* ── Takeover "Órbita" — menu mobile de ecrã inteiro ──
        FORA do <header>: o header é animado com transform + backdrop-blur,
        o que o torna containing block de filhos `fixed` — o drawer ficava
        espremido contra a barra de 64px em vez de cobrir o ecrã. */}
    <AnimatePresence>
        {open && (
          <motion.div
            key="menu-orbit"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.35, ease: EASE }}
            className="menu-orbit fixed inset-0 z-40 md:hidden"
            role="dialog"
            aria-modal="true"
            aria-label="Menu de navegação"
          >
            {/* Sol — o artista no centro do sistema */}
            <motion.div
              initial={{ scale: 0.4, opacity: 0 }}
              animate={{ scale: 1, opacity: 1 }}
              transition={{ duration: 0.7, delay: 0.15, ease: EASE }}
              className="absolute left-1/2 top-[46%] -translate-x-1/2 -translate-y-1/2"
            >
              <div className="menu-orbit-sun flex h-20 w-20 items-center justify-center">
                <span className="font-display text-lg text-white">VN</span>
              </div>
            </motion.div>

            {/* Órbitas tracejadas — elipses rotacionadas, como na Sintonia */}
            <svg
              aria-hidden="true"
              className="pointer-events-none absolute left-1/2 top-[46%] h-[470px] w-[340px] -translate-x-1/2 -translate-y-1/2"
              viewBox="0 0 340 470"
              fill="none"
            >
              <ellipse
                className="menu-orbit-ring menu-orbit-ring--dashed"
                cx="170"
                cy="235"
                rx="150"
                ry="200"
                transform="rotate(-14 170 235)"
              />
              <ellipse
                className="menu-orbit-ring"
                cx="170"
                cy="235"
                rx="95"
                ry="130"
                transform="rotate(12 170 235)"
              />
            </svg>

            {/* Corpos de navegação — cada rota é um corpo em órbita */}
            <div className="absolute inset-0">
              {links.map((l, i) => {
                const active = pathname === l.href;
                // Um corpo por linha de órbita — posicionados por pontos
                // EXATOS das elipses (SVG 340×470, centro a 50%/46%), para
                // "assentar" na linha tracejada em qualquer viewport:
                // outer (rx150 ry200, −14°) @ t=300° → (+31, −186)
                // inner (rx95 ry130, +12°) @ t=120° → (−70, +100)
                // +28px vertical: centra a ESFERA na linha (a coluna tem
                // rótulo + legenda abaixo, o centro dela fica mais alto).
                const spots = [
                  { left: "calc(50% + 31px)", top: "calc(46% - 158px)" },
                  { left: "calc(50% - 70px)", top: "calc(46% + 128px)" },
                ];
                const spot = spots[i] ?? { left: "50%", top: "50%" };
                return (
                  <motion.div
                    key={l.href}
                    initial={{ scale: 0.4, opacity: 0 }}
                    animate={{ scale: 1, opacity: 1 }}
                    transition={{ duration: 0.6, delay: 0.4 + i * 0.12, ease: EASE }}
                    className="menu-orbit-node absolute -translate-x-1/2 -translate-y-1/2"
                    style={spot}
                  >
                    <Link
                      href={l.href}
                      onClick={() => setOpen(false)}
                      aria-current={active ? "page" : undefined}
                      className="flex flex-col items-center gap-2.5"
                    >
                      <span
                        className={`menu-orbit-ball text-[9px] tracking-[0.1em] text-silver-300 ${
                          active ? "menu-orbit-ball--active" : ""
                        }`}
                      >
                        {String(i + 1).padStart(2, "0")}
                      </span>
                      <span className="font-display text-base text-cream">
                        {l.label}
                      </span>
                      <span className="text-[9px] uppercase tracking-[0.2em] text-silver-600">
                        {active ? "Estás aqui" : `Órbita 0${i + 1}`}
                      </span>
                    </Link>
                  </motion.div>
                );
              })}
            </div>

            {/* Booking — o e-mail continua a ser o ponto de contacto */}
            <motion.div
              initial={{ opacity: 0, y: 12 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.6, delay: 0.6, ease: EASE }}
              className="absolute inset-x-0 bottom-10 text-center"
            >
              <p className="text-[9px] uppercase tracking-[0.3em] text-silver-700">
                Booking
              </p>
              <a
                href={`mailto:${contact.email}`}
                className="contact-email mt-1.5 inline-block font-display text-xl text-cream"
                onClick={() => setOpen(false)}
              >
                {contact.email}
              </a>
            </motion.div>
          </motion.div>
        )}
      </AnimatePresence>
    </>
  );
}
