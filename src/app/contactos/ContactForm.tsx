"use client";

import { useActionState } from "react";
import { motion, AnimatePresence } from "framer-motion";
import { submitContact, type ContactState } from "./actions";

const initial: ContactState = { status: "idle" };

const inputClass =
  "w-full rounded-xl border border-white/10 bg-night-900/60 px-4 py-3 text-sm text-cream placeholder:text-mist/50 focus:border-gold-500 focus:outline-none";

export default function ContactForm() {
  const [state, formAction, pending] = useActionState(submitContact, initial);

  return (
    <form action={formAction} className="space-y-5">
      <div className="grid gap-5 md:grid-cols-2">
        <div>
          <label htmlFor="name" className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist">
            Nome
          </label>
          <input id="name" name="name" required className={inputClass} placeholder="O seu nome" />
        </div>
        <div>
          <label htmlFor="email" className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist">
            E-mail
          </label>
          <input
            id="email"
            name="email"
            type="email"
            required
            className={inputClass}
            placeholder="o.seu@email.com"
          />
        </div>
      </div>

      <div>
        <label htmlFor="category" className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist">
          Assunto
        </label>
        <select id="category" name="category" className={inputClass}>
          <option value="Booking">Booking / Contratação</option>
          <option value="Imprensa">Imprensa</option>
          <option value="Colaboração">Colaboração</option>
          <option value="Geral">Geral</option>
        </select>
      </div>

      <div>
        <label htmlFor="message" className="mb-2 block text-xs uppercase tracking-[0.2em] text-mist">
          Mensagem
        </label>
        <textarea
          id="message"
          name="message"
          required
          rows={6}
          minLength={10}
          className={inputClass}
          placeholder="Conte-nos sobre o evento, data, local…"
        />
      </div>

      {/* Honeypot anti-spam — invisível para humanos */}
      <input
        type="text"
        name="company"
        tabIndex={-1}
        autoComplete="off"
        className="hidden"
        aria-hidden="true"
      />

      <AnimatePresence mode="wait">
        {state.status === "ok" && (
          <motion.p
            key="ok"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-gold-500/30 bg-gold-500/10 px-4 py-3 text-sm text-gold-300"
          >
            Mensagem enviada. Obrigado pelo contacto! 🌍
          </motion.p>
        )}
        {state.status === "invalid" && (
          <motion.p
            key="invalid"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            Verifique o nome, e-mail e mensagem (mínimo 10 caracteres).
          </motion.p>
        )}
        {state.status === "error" && (
          <motion.p
            key="error"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-red-500/30 bg-red-500/10 px-4 py-3 text-sm text-red-300"
          >
            Algo falhou do nosso lado. Tente novamente.
          </motion.p>
        )}
        {state.status === "unconfigured" && (
          <motion.p
            key="unconfigured"
            initial={{ opacity: 0, y: 6 }}
            animate={{ opacity: 1, y: 0 }}
            className="rounded-xl border border-white/10 bg-white/5 px-4 py-3 text-sm text-mist"
          >
            O formulário ainda não está ativo — configure o Supabase (NEXT_PUBLIC_SUPABASE_URL e
            NEXT_PUBLIC_SUPABASE_ANON_KEY) para receber mensagens.
          </motion.p>
        )}
      </AnimatePresence>

      <motion.button
        type="submit"
        disabled={pending}
        whileHover={{ scale: 1.02 }}
        whileTap={{ scale: 0.98 }}
        className="rounded-full bg-gold-500 px-8 py-3 text-sm font-medium text-night-950 transition-opacity disabled:opacity-60"
      >
        {pending ? "A enviar…" : "Enviar mensagem"}
      </motion.button>
    </form>
  );
}
