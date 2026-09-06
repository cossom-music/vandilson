"use client";

import { useState } from "react";
import { motion } from "framer-motion";
import { artist, socials } from "@/content";
import { subscribeToNewsletter } from "@/lib/newsletter";

export default function Footer() {
  const [email, setEmail] = useState("");
  const [state, setState] = useState<"idle" | "loading" | "ok" | "error" | "unconfigured">("idle");

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setState("loading");
    const res = await subscribeToNewsletter(email);
    setState(res.ok ? "ok" : res.reason === "unconfigured" ? "unconfigured" : "error");
    if (res.ok) setEmail("");
  }

  return (
    <footer className="border-t border-white/5 bg-night-950">
      <div className="mx-auto grid max-w-6xl gap-12 px-6 py-14 md:grid-cols-[1.2fr_1fr]">
        <div>
          <p className="font-display text-2xl text-cream">{artist.name}</p>
          <p className="mt-2 max-w-md text-sm text-mist">{artist.tagline}</p>

          <form onSubmit={onSubmit} className="mt-6 max-w-md">
            <label htmlFor="newsletter-email" className="text-xs uppercase tracking-[0.2em] text-gold-400">
              Newsletter
            </label>
            <div className="mt-2 flex overflow-hidden rounded-full border border-white/10 focus-within:border-gold-500">
              <input
                id="newsletter-email"
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="O seu e-mail"
                className="w-full bg-transparent px-5 py-3 text-sm text-cream placeholder:text-mist/50 focus:outline-none"
              />
              <button
                type="submit"
                disabled={state === "loading"}
                className="shrink-0 bg-gold-500 px-6 text-sm font-medium text-night-950 transition-colors hover:bg-gold-400 disabled:opacity-60"
              >
                {state === "loading" ? "A enviar…" : "Subscrever"}
              </button>
            </div>

            {state === "ok" && (
              <motion.p
                initial={{ opacity: 0, y: 4 }}
                animate={{ opacity: 1, y: 0 }}
                className="mt-3 text-sm text-gold-300"
              >
                Obrigado! Está subscrito. 🌍
              </motion.p>
            )}
            {state === "error" && (
              <p className="mt-3 text-sm text-red-400">
                Algo falhou. Tente novamente em instantes.
              </p>
            )}
            {state === "unconfigured" && (
              <p className="mt-3 text-sm text-mist">
                As newsletters ainda não estão ativas — configure o Supabase (NEXT_PUBLIC_SUPABASE_URL e
                NEXT_PUBLIC_SUPABASE_ANON_KEY).
              </p>
            )}
          </form>
        </div>

        <div className="flex flex-col gap-6 md:items-end">
          <nav className="flex gap-6">
            {socials.map((s) => (
              <a
                key={s.label}
                href={s.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-mist transition-colors hover:text-gold-400"
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
