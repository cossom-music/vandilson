"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { artist } from "@/content";

const links = [
  { href: "/", label: "Início" },
  { href: "/discografia", label: "Discografia" },
  { href: "/sobre", label: "Sobre" },
];

/**
 * Na homepage o header só aparece depois de o utilizador fazer scroll
 * (imersiveão total com o globo no arranque, como no animejs.com).
 * Nas restantes páginas está sempre visível.
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

  const visible = !isHome || scrolled;

  return (
    <AnimatePresence>
      {visible && (
        <motion.header
          key="header"
          initial={{ y: -72, opacity: 0 }}
          animate={{ y: 0, opacity: 1 }}
          exit={{ y: -72, opacity: 0 }}
          transition={{ duration: 0.55, ease: [0.16, 1, 0.3, 1] }}
          className="fixed inset-x-0 top-0 z-50 border-b border-white/5 bg-night-950/70 backdrop-blur-md"
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
              aria-label="Abrir menu"
              aria-expanded={open}
              onClick={() => setOpen((v) => !v)}
              className="flex h-10 w-10 flex-col items-center justify-center gap-1.5 md:hidden"
            >
              <span
                className={`h-px w-6 bg-cream transition-transform ${open ? "translate-y-[3.5px] rotate-45" : ""}`}
              />
              <span
                className={`h-px w-6 bg-cream transition-transform ${open ? "-translate-y-[3.5px] -rotate-45" : ""}`}
              />
            </button>
          </div>

          <AnimatePresence>
            {open && (
              <motion.nav
                initial={{ height: 0, opacity: 0 }}
                animate={{ height: "auto", opacity: 1 }}
                exit={{ height: 0, opacity: 0 }}
                transition={{ duration: 0.25 }}
                className="overflow-hidden border-t border-white/5 bg-night-950/95 md:hidden"
              >
                <div className="flex flex-col gap-1 px-6 py-4">
                  {links.map((l) => (
                    <Link
                      key={l.href}
                      href={l.href}
                      onClick={() => setOpen(false)}
                      className={`py-2 text-base ${
                        pathname === l.href ? "text-white" : "text-mist"
                      }`}
                    >
                      {l.label}
                    </Link>
                  ))}
                </div>
              </motion.nav>
            )}
          </AnimatePresence>
        </motion.header>
      )}
    </AnimatePresence>
  );
}
